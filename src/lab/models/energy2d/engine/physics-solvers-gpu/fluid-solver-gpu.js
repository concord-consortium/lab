/*globals lab: false, energy2d: false */
/*jslint indent: 2, node: true, browser: true, es5: true */
//
// lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-gpu.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  RELAXATION_STEPS = 10,
  GRAVITY = 0,

  BUOYANCY_AVERAGE_ALL = 0,
  BUOYANCY_AVERAGE_COLUMN = 1;

exports.makeFluidSolverGPU = function (model) {
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
    GLSL_PREFIX = 'src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/',
    basic_vs                 = glsl[GLSL_PREFIX + 'basic.vs.glsl'],
    maccormack_step1_fs      = glsl[GLSL_PREFIX + 'maccormack-step1.fs.glsl'],
    maccormack_step2_fs      = glsl[GLSL_PREFIX + 'maccormack-step2.fs.glsl'],
    apply_uv_boundary_fs     = glsl[GLSL_PREFIX + 'apply-uv-boundary.fs.glsl'],
    set_obstacle_boundary_fs = glsl[GLSL_PREFIX + 'set-obstacle-boundary.fs.glsl'],
    set_obstacle_velocity_fs = glsl[GLSL_PREFIX + 'set-obstacle-velocity.fs.glsl'],
    uv_to_u0v0_fs            = glsl[GLSL_PREFIX + 'uv-to-u0v0.fs.glsl'],

    // ========================================================================
    // GLSL Shaders:
    // - MacCormack advection, first step.
    maccormack_step1_program      = new gpu.Shader(basic_vs, maccormack_step1_fs),
    maccormack_step2_program      = new gpu.Shader(basic_vs, maccormack_step2_fs),
    apply_uv_boundary_program     = new gpu.Shader(basic_vs, apply_uv_boundary_fs),
    set_obstacle_boundary_program = new gpu.Shader(basic_vs, set_obstacle_boundary_fs),
    set_obstacle_velocity_program = new gpu.Shader(basic_vs, set_obstacle_velocity_fs),
    uv_to_u0v0_program            = new gpu.Shader(basic_vs, uv_to_u0v0_fs),
    // ========================================================================

    // Simulation arrays provided by model.
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
    // texture 3: 
    // - R: uWind
    // - G: vWind
    // - B: undefined
    // - A: undefined
    data3_tex = model.getSimulationTexture(3),

    // Basic simulation parameters.
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    model_options          = model.getModelOptions(),
    timestep               = model_options.timestep,
    thermal_buoyancy       = model_options.thermal_buoyancy,
    buoyancy_approximation = model_options.buoyancy_approximation,
    viscosity              = model_options.background_viscosity,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    relaxationSteps = RELAXATION_STEPS,
    gravity = GRAVITY,

    // Convenience variables.   
    i2dx  = 0.5 / delta_x,
    i2dy  = 0.5 / delta_y,
    idxsq = 1.0 / (delta_x * delta_x),
    idysq = 1.0 / (delta_y * delta_y),

    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    grid_vec = [1 / ny, 1 / nx],

    // Textures sets.
    data_2_array = [data2_tex],
    data_1_2_array = [data1_tex, data2_tex],
    data_1_2_3_array = [data1_tex, data2_tex, data3_tex],

    init = function () {
      var uniforms;

      // MacCormack step 1 and 2 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        tx: 0.5 * timestep / delta_x,
        ty: 0.5 * timestep / delta_y
      };
      maccormack_step1_program.uniforms(uniforms);
      maccormack_step2_program.uniforms(uniforms);

      // Apply UV boundary uniforms.
      uniforms = {
        // Texture units.
        data2_tex: 0,
        // Uniforms.
        grid: grid_vec,
      };
      apply_uv_boundary_program.uniforms(uniforms);

      // Set obstacle boundary uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
      };
      set_obstacle_boundary_program.uniforms(uniforms);

      // Set obstacle velocity uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        data3_tex: 2,
        // Uniforms.
        grid: grid_vec,
      };
      set_obstacle_velocity_program.uniforms(uniforms);

    },

    macCormack = function () {
      // Step 1.
      gpgpu.executeProgram(
        maccormack_step1_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
      // Step 2.
      gpgpu.executeProgram(
        maccormack_step2_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary again.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
    },

    fluid_solver_gpu = {
      solve: function () {
        // Synchronize. It's not required but it 
        // allows to measure time (for optimization).
        gpgpu.tryFinish();
      }
    };

  // One-off initialization.
  init();

  return fluid_solver_gpu;
};
