/*globals lab: false, energy2d: false */
/*jslint indent: 2, node: true, browser: true, es5: true */
//
// lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-gpu.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  RELAXATION_STEPS = 10;

exports.makeHeatSolverGPU = function (model) {
  'use strict';
  var
    // Dependencies:
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,
    // - GPGPU utilities. It's a singleton instance.
    //   It should have been previously initialized by core-model.
    gpgpu = energy2d.utils.gpu.gpgpu,
    // - GLSL sources.
    glsl = lab.glsl,

    // Shader sources. One of Lab build steps converts sources to JavaScript file.
    GLSL_PREFIX   = 'src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/',
    basic_vs      = glsl[GLSL_PREFIX + 'basic.vs.glsl'],
    solver_fs     = glsl[GLSL_PREFIX + 'solver.fs.glsl'],
    force_flux_fs = glsl[GLSL_PREFIX + 'force-flux.fs.glsl'],
    t_to_t0       = glsl[GLSL_PREFIX + 't-to-t0.fs.glsl'],

    // ========================================================================
    // GLSL Shaders:
    // - Main solver.
    solver_program = new gpu.Shader(basic_vs, solver_fs),
    // - Force flux boundary.
    force_flux_program = new gpu.Shader(basic_vs, force_flux_fs),
    // - Copy single channel of texture (t to t0).
    t_to_t0_program = new gpu.Shader(basic_vs, t_to_t0),
    // ========================================================================

    // Basic simulation parameters.
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    model_options = model.getModelOptions(),
    timestep = model_options.timestep,
    boundary = model_options.boundary,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

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

    // Convenience variables.  
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
        inv_timestep: 1.0 / timestep
      };
      solver_program.uniforms(uniforms);

      if (boundary.temperature_at_border) {
        uniforms = {
          // Additional uniforms.
          enforce_temp: 1.0,
          vN:  boundary.temperature_at_border.upper,
          vS:  boundary.temperature_at_border.lower,
          vW:  boundary.temperature_at_border.left,
          vE:  boundary.temperature_at_border.right
        };
        // Integrate boundary conditions with solver program.
        // This is optimization that allows to limit render-to-texture calls.
        solver_program.uniforms(uniforms);
      } else if (boundary.flux_at_border) {
        uniforms = {
          // Texture units.
          data0_tex: 0,
          // Uniforms.
          grid: grid_vec,
          vN: boundary.flux_at_border.upper,
          vS: boundary.flux_at_border.lower,
          vW: boundary.flux_at_border.left,
          vE: boundary.flux_at_border.right,
          delta_x: delta_x,
          delta_y: delta_y
        };
        // Flux boundary conditions can't be integrated into solver program,
        // so use separate GLSL program.
        force_flux_program.uniforms(uniforms);
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
          if (boundary.flux_at_border) {
            // Additional program for boundary conditions
            // is required only for "flux at border" option.
            // If "temperature at border" is used, boundary
            // conditions are enforced by the solver program.
            gpgpu.executeProgram(
              force_flux_program,
              data_0_array,
              data0_tex
            );
          }
        }
        // Synchronize. It's not required but it 
        // allows to measure time (for optimization).
        gpgpu.tryFinish();
      }
    };
  // One-off initialization.
  init();
  return heat_solver_gpu;
};
