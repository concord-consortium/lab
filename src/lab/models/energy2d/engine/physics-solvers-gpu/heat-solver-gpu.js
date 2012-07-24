/*globals energy2d: false */
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
    // Energy2D GPU utilities.
    gpu = energy2d.utils.gpu,
    // Request GPGPU utilities. It's a singleton instance.
    // Should be previously initialized by core model.
    gpgpu = energy2d.utils.gpu.gpgpu,

    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options = model.getModelOptions(),
    timestep = model_options.timestep,
    boundary = model_options.boundary,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    relaxation_steps = RELAXATION_STEPS,

    // Simulation arrays provided by model.
    // texture[0] contains: t, t0, tb, conductivity.
    // texture[1] contains: q, capacity, density, fluidity.
    data1_tex = model.getSimulationTexture(0),
    data2_tex = model.getSimulationTexture(1),

    // Convenience variables.  
    textures = [data1_tex, data2_tex],
    grid_vec = [1 / ny, 1 / nx],

    //
    // GLSL Shaders.
    // They perform simulation steps on the textures.
    //
    // This vertex shader is common for all GLSL programs.
    basic_vertex =
    '\
    varying vec2 coord;\
    void main() {\
      coord = gl_Vertex.xy * 0.5 + 0.5;\
      gl_Position = vec4(gl_Vertex.xy, 0.0, 1.0);\
    }',
    // Main solver.
    solve_program = new gpu.Shader(basic_vertex,
      '\
      varying vec2 coord;\
      uniform vec2 grid;\
      uniform sampler2D data1;\
      uniform sampler2D data2;\
      uniform float hx;\
      uniform float hy;\
      uniform float inv_timestep;\
      /* Boundary conditions uniforms */\
      uniform float enforce_temp;\
      uniform float vN;\
      uniform float vS;\
      uniform float vW;\
      uniform float vE;\
      void main() {\
        vec4 t_data = texture2D(data1, coord);\
        if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\
            coord.y > grid.y && coord.y < 1.0 - grid.y) {\
          \
          vec2 dx = vec2(grid.x, 0.0);\
          vec2 dy = vec2(0.0, grid.y);\
          float tb_val = t_data.b;\
          /*\
           * Check if tb_val is NaN. isnan() function is not available\
           * in OpenGL ES GLSL, so use some tricks. IEEE 754 spec defines\
           * that NaN != NaN, however this seems to not work on Windows.\
           * So, also check if the value is outside [-3.4e38, 3.4e38] (3.4e38\
           * is close to 32Float max value), as such values are not expected.\
           */\
          if (tb_val != tb_val || tb_val < -3.4e38 || tb_val > 3.4e38) {\
            vec4 params = texture2D(data2, coord);\
            vec4 data_m_dy = texture2D(data1, coord - dy);\
            vec4 data_p_dy = texture2D(data1, coord + dy);\
            vec4 data_m_dx = texture2D(data1, coord - dx);\
            vec4 data_p_dx = texture2D(data1, coord + dx);\
            float sij = params.g * params.b * inv_timestep;\
            float rij = t_data.a;\
            float axij = hx * (rij + data_m_dy.a);\
            float bxij = hx * (rij + data_p_dy.a);\
            float ayij = hy * (rij + data_m_dx.a);\
            float byij = hy * (rij + data_p_dx.a);\
            float new_val = (t_data.g * sij + params.r\
                           + axij * data_m_dy.r\
                           + bxij * data_p_dy.r\
                           + ayij * data_m_dx.r\
                           + byij * data_p_dx.r)\
                          / (sij + axij + bxij + ayij + byij);\
            t_data.r = new_val;\
          } else {\
            t_data.r = tb_val;\
          }\
        } else if (enforce_temp == 1.0) {\
          /* Temperature at border boundary conditions */\
          if (coord.x < grid.x) {\
            t_data.r = vN;\
          } else if (coord.x > 1.0 - grid.x) {\
            t_data.r = vS;\
          } else if (coord.y < grid.y) {\
            t_data.r = vW;\
          } else if (coord.y > 1.0 - grid.y) {\
            t_data.r = vE;\
          }\
        }\
        gl_FragColor = t_data;\
      }'),
    // Apply boundary.
    apply_boundary_program = new gpu.Shader(basic_vertex,
      '\
      uniform sampler2D data1;\
      uniform vec2 grid;\
      uniform float vN;\
      uniform float vS;\
      uniform float vW;\
      uniform float vE;\
      uniform float delta_x;\
      uniform float delta_y;\
      \
      varying vec2 coord;\
      void main() {\
        vec4 data = texture2D(data1, coord);\
        \
        /* Flux at border */\
        vec2 dx = vec2(grid.x, 0.0);\
        vec2 dy = vec2(0.0, grid.y);\
        if (coord.x < grid.x) {\
          data.r = texture2D(data1, coord + dx).r;\
            + vN * delta_y / data.a;\
        } else if (coord.x > 1.0 - grid.x) {\
          data.r = texture2D(data1, coord - dx).r;\
            - vS * delta_y / data.a;\
        } else if (coord.y < grid.y) {\
          data.r = texture2D(data1, coord + dy).r;\
            - vW * delta_x / data.a;\
        } else if (coord.y > 1.0 - grid.y) {\
          data.r = texture2D(data1, coord - dy).r;\
            + vE * delta_x / data.a;\
        }\
        gl_FragColor = data;\
      }'),
      // Copy single channel of texture.
    copy_t_t0_program = new gpu.Shader(basic_vertex,
      '\
      uniform sampler2D data1;\
      varying vec2 coord;\
      void main() {\
        vec4 data = texture2D(data1, coord);\
        data.g = data.r;\
        gl_FragColor = data;\
      }'),


    init = function () {
      var uniforms;

      // Solver program uniforms.
      uniforms = {
        grid: grid_vec,
        enforce_temp: 0.0,
        hx: 0.5 / (delta_x * delta_x),
        hy: 0.5 / (delta_y * delta_y),
        inv_timestep: 1.0 / timestep,
        // Texture units.
        data1: 0,
        data2: 1
      };
      solve_program.uniforms(uniforms);

      if (boundary.temperature_at_border) {
        uniforms = {
          grid: grid_vec,
          enforce_temp: 1.0,
          vN:  boundary.temperature_at_border.upper,
          vS:  boundary.temperature_at_border.lower,
          vW:  boundary.temperature_at_border.left,
          vE:  boundary.temperature_at_border.right
        };
        // Integrate boundary conditions with solver program.
        // This is optimization that allows to limit render-to-texture calls.
        solve_program.uniforms(uniforms);
      } else if (boundary.flux_at_border) {
        uniforms = {
          grid: grid_vec,
          vN: boundary.flux_at_border.upper,
          vS: boundary.flux_at_border.lower,
          vW: boundary.flux_at_border.left,
          vE: boundary.flux_at_border.right,
          delta_x: delta_x,
          delta_y: delta_y
        };
        // Flux boundary conditions can't be integrated into solver program.
        apply_boundary_program.uniforms(uniforms);
      }
    },

    heat_solver_gpu = {
      solve: function (convective) {
        var k;

        // Store previous values.
        gpgpu.executeProgram(
          copy_t_t0_program,
          [data1_tex],
          data1_tex
        );

        for (k = 0; k < relaxation_steps; k += 1) {
          gpgpu.executeProgram(
            solve_program,
            textures,
            data1_tex
          );

          if (boundary.flux_at_border) {
            // Additional program for boundary conditions
            // is required only for flux at border.
            gpgpu.executeProgram(
              apply_boundary_program,
              [data1_tex],
              data1_tex
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
