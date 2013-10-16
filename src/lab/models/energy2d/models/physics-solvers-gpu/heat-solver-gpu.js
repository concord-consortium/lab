/*global define: false*/

define(function (require, exports) {
  'use strict';
  var
    // Dependencies.
    Shader = require('models/energy2d/gpu/shader'),
    // GPGPU utilities. It's a singleton instance.
    // It should have been previously initialized by core-model.
    gpgpu  = require('models/energy2d/gpu/gpgpu'),
    // Shader sources.
    basic_vs            = require('text!models/energy2d/models/physics-solvers-gpu/heat-solver-glsl/basic.vs.glsl'),
    solver_fs           = require('text!models/energy2d/models/physics-solvers-gpu/heat-solver-glsl/solver.fs.glsl'),
    force_flux_t_fs     = require('text!models/energy2d/models/physics-solvers-gpu/heat-solver-glsl/force-flux-t.fs.glsl'),
    force_flux_t0_fs    = require('text!models/energy2d/models/physics-solvers-gpu/heat-solver-glsl/force-flux-t.fs.glsl'),
    t_to_t0             = require('text!models/energy2d/models/physics-solvers-gpu/heat-solver-glsl/t-to-t0.fs.glsl'),
    maccormack_step1_fs = require('text!models/energy2d/models/physics-solvers-gpu/heat-solver-glsl/maccormack-step1.fs.glsl'),
    maccormack_step2_fs = require('text!models/energy2d/models/physics-solvers-gpu/heat-solver-glsl/maccormack-step2.fs.glsl'),

    RELAXATION_STEPS = 10;

  exports.makeHeatSolverGPU = function (model) {
    var
      // ========================================================================
      // GLSL Shaders:
      // - Main solver.
      solver_program           = new Shader(basic_vs, solver_fs),
      // - Force flux boundary (for T).
      force_flux_t_program     = new Shader(basic_vs, force_flux_t_fs),
      // - Force flux boundary (for T0).
      force_flux_t0_program    = new Shader(basic_vs, force_flux_t0_fs),
      // - Copy single channel of texture (t to t0).
      t_to_t0_program          = new Shader(basic_vs, t_to_t0),
      // - MacCormack advection step 1.
      maccormack_step1_program = new Shader(basic_vs, maccormack_step1_fs),
      // - MacCormack advection step 2.
      maccormack_step2_program = new Shader(basic_vs, maccormack_step2_fs),
      // ========================================================================

      // Basic simulation parameters.
      props = model.getModelOptions(),
      nx = props.grid_width,
      ny = props.grid_height,

      timeStep = props.timeStep,
      boundary = props.boundary,

      delta_x = props.model_width / props.grid_width,
      delta_y = props.model_height / props.grid_height,

      relaxation_steps = RELAXATION_STEPS,

      // Simulation textures provided by model.
      // texture 0:
      // - R: t
      // - G: t0
      // - B: tb
      // - A: conductivity
      data0_tex = model.getSimulationTexture(0),
      // texture 1:
      // - R: q
      // - G: capacity
      // - B: density
      // - A: fluidity
      data1_tex = model.getSimulationTexture(1),
      // texture 2:
      // - R: u
      // - G: v
      // - B: u0
      // - A: v0
      data2_tex = model.getSimulationTexture(2),

      // Convenience variables.
      data_0_1_2_array = [data0_tex, data1_tex, data2_tex],
      data_0_1_array = [data0_tex, data1_tex],
      data_0_array = [data0_tex],
      grid_vec = [1 / ny, 1 / nx],

      init = function () {
        var uniforms;

        // Solver program uniforms.
        uniforms = {
          // Texture units.
          data0_tex: 0,
          data1_tex: 1,
          // Uniforms.
          grid: grid_vec,
          enforce_temp: 0.0,
          hx: 0.5 / (delta_x * delta_x),
          hy: 0.5 / (delta_y * delta_y),
          inv_timeStep: 1.0 / timeStep
        };
        solver_program.uniforms(uniforms);

        // MacCormack step 1 program uniforms.
        uniforms = {
          // Texture units.
          data0_tex: 0,
          data1_tex: 1,
          data2_tex: 2,
          // Uniforms.
          grid: grid_vec,
          enforce_temp: 0.0,
          tx: 0.5 * timeStep / delta_x,
          ty: 0.5 * timeStep / delta_y
        };
        maccormack_step1_program.uniforms(uniforms);
        maccormack_step2_program.uniforms(uniforms);

        if (boundary.type === "temperature") {
          uniforms = {
            // Additional uniforms.
            enforce_temp: 1.0,
            vN:  boundary.upper,
            vS:  boundary.lower,
            vW:  boundary.left,
            vE:  boundary.right
          };
          // Integrate boundary conditions with other programs.
          // This is optimization that allows to limit render-to-texture calls.
          solver_program.uniforms(uniforms);
          maccormack_step1_program.uniforms(uniforms);
          maccormack_step2_program.uniforms(uniforms);
        } else if (boundary.type === "flux") {
          uniforms = {
            // Texture units.
            data0_tex: 0,
            // Uniforms.
            grid: grid_vec,
            vN: boundary.upper,
            vS: boundary.lower,
            vW: boundary.left,
            vE: boundary.right,
            delta_x: delta_x,
            delta_y: delta_y
          };
          // Flux boundary conditions can't be integrated into solver program,
          // so use separate GLSL programs.
          force_flux_t_program.uniforms(uniforms);
          force_flux_t0_program.uniforms(uniforms);
        }
      },

      macCormack = function () {
        // MacCormack step 1.
        gpgpu.executeProgram(
          maccormack_step1_program,
          data_0_1_2_array,
          data0_tex
        );
        if (boundary.type === "flux") {
          // Additional program for boundary conditions
          // is required only for "flux at border" option.
          // If "temperature at border" is used, boundary
          // conditions are enforced by the MacCormack program.
          gpgpu.executeProgram(
            force_flux_t0_program,
            data_0_array,
            data0_tex
          );
        }
        // MacCormack step 2.
        gpgpu.executeProgram(
          maccormack_step2_program,
          data_0_1_2_array,
          data0_tex
        );
        if (boundary.type === "flux") {
          // Additional program for boundary conditions
          // is required only for "flux at border" option.
          // If "temperature at border" is used, boundary
          // conditions are enforced by the MacCormack program.
          gpgpu.executeProgram(
            force_flux_t_program,
            data_0_array,
            data0_tex
          );
        }
      },

      heat_solver_gpu = {
        solve: function (convective) {
          var k;
          // Store previous values of t in t0.
          gpgpu.executeProgram(
            t_to_t0_program,
            data_0_array,
            data0_tex
          );
          for (k = 0; k < relaxation_steps; k += 1) {
            gpgpu.executeProgram(
              solver_program,
              data_0_1_array,
              data0_tex
            );
            if (boundary.type === "flux") {
              // Additional program for boundary conditions
              // is required only for "flux at border" option.
              // If "temperature at border" is used, boundary
              // conditions are enforced by the solver program.
              gpgpu.executeProgram(
                force_flux_t_program,
                data_0_array,
                data0_tex
              );
            }
          }
          if (convective) {
            macCormack();
          }
        }
      };
    // One-off initialization.
    init();
    return heat_solver_gpu;
  };
});
