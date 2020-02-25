 import Shader from 'models/energy2d/gpu/shader';
import gpgpu from 'models/energy2d/gpu/gpgpu';
import basic_vs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/basic.vs.glsl';
import maccormack_step1_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/maccormack-step1.fs.glsl';
import maccormack_step2_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/maccormack-step2.fs.glsl';
import apply_uv_boundary_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/apply-uv-boundary.fs.glsl';
import apply_u0v0_boundary_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/apply-u0v0-boundary.fs.glsl';
import set_obstacle_boundary_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/set-obstacle-boundary.fs.glsl';
import set_obstacle_velocity_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/set-obstacle-velocity.fs.glsl';
import uv_to_u0v0_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/uv-to-u0v0.fs.glsl';
import conserve_step1_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/conserve-step1.fs.glsl';
import conserve_step2_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/conserve-step2.fs.glsl';
import conserve_step3_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/conserve-step3.fs.glsl';
import diffuse_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/diffuse.fs.glsl';
import apply_buoyancy_fs from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-glsl/apply-buoyancy.fs.glsl';

var
// Dependencies. 
  // GPGPU utilities. It's a singleton instance.
  // It should have been previously initialized by core-model.
  
  // Shader sources. One of Lab build steps converts sources to JavaScript file.
  
  
  
  
  
  
  
  
  
  
  
  
  

  RELAXATION_STEPS = 10,
  GRAVITY = 0;

export const makeFluidSolverGPU = function(model) {
  var
  // ========================================================================
  // GLSL Shaders:
  // - MacCormack advection, first step.
    maccormack_step1_program = new Shader(basic_vs, maccormack_step1_fs),
    maccormack_step2_program = new Shader(basic_vs, maccormack_step2_fs),
    apply_uv_boundary_program = new Shader(basic_vs, apply_uv_boundary_fs),
    apply_u0v0_boundary_program = new Shader(basic_vs, apply_u0v0_boundary_fs),
    set_obstacle_boundary_program = new Shader(basic_vs, set_obstacle_boundary_fs),
    set_obstacle_velocity_program = new Shader(basic_vs, set_obstacle_velocity_fs),
    uv_to_u0v0_program = new Shader(basic_vs, uv_to_u0v0_fs),
    conserve_step1_program = new Shader(basic_vs, conserve_step1_fs),
    conserve_step2_program = new Shader(basic_vs, conserve_step2_fs),
    conserve_step3_program = new Shader(basic_vs, conserve_step3_fs),
    diffuse_program = new Shader(basic_vs, diffuse_fs),
    apply_buoyancy_program = new Shader(basic_vs, apply_buoyancy_fs),
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
    props = model.getModelOptions(),
    nx = props.grid_width,
    ny = props.grid_height,

    timeStep = props.timeStep,
    thermal_buoyancy = props.thermal_buoyancy,
    viscosity = props.background_viscosity,

    delta_x = props.model_width / props.grid_width,
    delta_y = props.model_height / props.grid_height,

    relaxation_steps = RELAXATION_STEPS,
    gravity = GRAVITY,

    // Convenience variables.
    i2dx = 0.5 / delta_x,
    i2dy = 0.5 / delta_y,
    idxsq = 1.0 / (delta_x * delta_x),
    idysq = 1.0 / (delta_y * delta_y),
    s = 0.5 / (idxsq + idysq),

    hx = timeStep * viscosity * idxsq,
    hy = timeStep * viscosity * idysq,
    dn = 1.0 / (1 + 2 * (hx + hy)),

    g = gravity * timeStep,
    b = thermal_buoyancy * timeStep,

    grid_vec = [1 / ny, 1 / nx],

    // Textures sets.
    data_2_array = [data2_tex],
    data_1_2_array = [data1_tex, data2_tex],
    data_0_1_2_array = [data0_tex, data1_tex, data2_tex],
    data_1_2_3_array = [data1_tex, data2_tex, data3_tex],

    init = function() {
      var uniforms;

      // MacCormack step 1 and 2 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        tx: 0.5 * timeStep / delta_x,
        ty: 0.5 * timeStep / delta_y
      };
      maccormack_step1_program.uniforms(uniforms);
      maccormack_step2_program.uniforms(uniforms);

      // Apply UV / U0V0 boundary uniforms.
      uniforms = {
        // Texture units.
        data2_tex: 0,
        // Uniforms.
        grid: grid_vec
      };
      apply_uv_boundary_program.uniforms(uniforms);
      apply_u0v0_boundary_program.uniforms(uniforms);

      // Set obstacle boundary uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec
      };
      set_obstacle_boundary_program.uniforms(uniforms);

      // Set obstacle velocity uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        data3_tex: 2,
        // Uniforms.
        grid: grid_vec
      };
      set_obstacle_velocity_program.uniforms(uniforms);

      // Conserve step 1 and 3 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        i2dx: i2dx,
        i2dy: i2dy
      };
      conserve_step1_program.uniforms(uniforms);
      conserve_step3_program.uniforms(uniforms);

      // Conserve step 2 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        s: s,
        idxsq: idxsq,
        idysq: idysq
      };
      conserve_step2_program.uniforms(uniforms);

      // Diffuse uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        hx: hx,
        hy: hy,
        dn: dn
      };
      diffuse_program.uniforms(uniforms);

      // Apply buoyancy uniforms.
      uniforms = {
        // Texture units.
        data0_tex: 0,
        data1_tex: 1,
        data2_tex: 2,
        // Uniforms.
        grid: grid_vec,
        g: g,
        b: b
      };
      apply_buoyancy_program.uniforms(uniforms);
    },

    applyBuoyancy = function() {
      gpgpu.executeProgram(
        apply_buoyancy_program,
        data_0_1_2_array,
        data2_tex
      );
    },

    macCormack = function() {
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

    conserve = function() {
      var k;
      // Step 1.
      gpgpu.executeProgram(
        conserve_step1_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_u0v0_boundary_program,
        data_2_array,
        data2_tex
      );
      // Set obstacle boundary.
      gpgpu.executeProgram(
        set_obstacle_boundary_program,
        data_1_2_array,
        data2_tex
      );
      // Relaxation.
      for (k = 0; k < relaxation_steps; k += 1) {
        // Step 2.
        gpgpu.executeProgram(
          conserve_step2_program,
          data_1_2_array,
          data2_tex
        );
      }
      // Step 3.
      gpgpu.executeProgram(
        conserve_step3_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
    },

    diffuse = function() {
      var k;
      // Copy UV to U0V0.
      gpgpu.executeProgram(
        uv_to_u0v0_program,
        data_2_array,
        data2_tex
      );
      // Relaxation.
      for (k = 0; k < relaxation_steps; k += 1) {
        // Step 2.
        gpgpu.executeProgram(
          diffuse_program,
          data_1_2_array,
          data2_tex
        );

        // Apply boundary.
        gpgpu.executeProgram(
          apply_uv_boundary_program,
          data_2_array,
          data2_tex
        );
      }
    },

    setObstacleVelocity = function() {
      gpgpu.executeProgram(
        set_obstacle_velocity_program,
        data_1_2_3_array,
        data2_tex
      );
    },

    copyUVtoU0V0 = function() {
      gpgpu.executeProgram(
        uv_to_u0v0_program,
        data_2_array,
        data2_tex
      );
    },

    fluid_solver_gpu = {
      solve: function() {
        if (thermal_buoyancy !== 0) {
          applyBuoyancy();
        }
        setObstacleVelocity();
        if (viscosity > 0) {
          diffuse();
          conserve();
          setObstacleVelocity();
        }
        copyUVtoU0V0();
        macCormack();
        conserve();
        setObstacleVelocity();
      }
    };

  // One-off initialization.
  init();

  return fluid_solver_gpu;
};
