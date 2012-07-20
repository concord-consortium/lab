/*globals energy2d: false, GL: false */
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
    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    // GPGPU helpers.
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
    solve_program = new GL.Shader(basic_vertex,
      '\
      uniform sampler2D data1;\
      uniform sampler2D data2;\
      uniform vec2 grid;\
      uniform float hx;\
      uniform float hy;\
      uniform float inv_timestep;\
      varying vec2 coord;\
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
            gl_FragColor = vec4(new_val, t_data.gba);\
          } else {\
            gl_FragColor = vec4(tb_val, t_data.gba);\
          }\
        } else {\
          gl_FragColor = t_data;\
        }\
      }'),
    // Apply boundary.
    apply_boundary_program = new GL.Shader(basic_vertex,
      '\
      uniform sampler2D data1;\
      \
      uniform vec2 grid;\
      \
      uniform float flux;\
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
        if (flux == 0.0) {\
          /* Temperature at border */\
          if (coord.x < grid.x) {\
            gl_FragColor = vec4(vN, data.gba);\
          } else if (coord.x > 1.0 - grid.x) {\
            gl_FragColor = vec4(vS, data.gba);\
          } else if (coord.y < grid.y) {\
            gl_FragColor = vec4(vW, data.gba);\
          } else if (coord.y > 1.0 - grid.y) {\
            gl_FragColor = vec4(vE, data.gba);\
          } else {\
            gl_FragColor = data;\
          }\
        } else {\
          /* Flux at border */\
          float new_temp;\
          vec2 dx = vec2(grid.x, 0.0);\
          vec2 dy = vec2(0.0, grid.y);\
          if (coord.x < grid.x) {\
            new_temp = texture2D(data1, coord + dx).r;\
              + vN * delta_y / data.a;\
            gl_FragColor = vec4(new_temp, data.gba);\
          } else if (coord.x > 1.0 - grid.x) {\
            new_temp = texture2D(data1, coord - dx).r;\
              - vS * delta_y / data.a;\
            gl_FragColor = vec4(new_temp, data.gba);\
          } else if (coord.y < grid.y) {\
            new_temp = texture2D(data1, coord + dy).r;\
              - vW * delta_x / data.a;\
            gl_FragColor = vec4(new_temp, data.gba);\
          } else if (coord.y > 1.0 - grid.y) {\
            new_temp = texture2D(data1, coord - dy).r;\
              + vE * delta_x / data.a;\
            gl_FragColor = vec4(new_temp, data.gba);\
          } else {\
            gl_FragColor = data;\
          }\
        \
        }\
      }'),
      // Copy single channel of texture.
    copy_t_t0_program = new GL.Shader(basic_vertex,
      '\
      uniform sampler2D data1;\
      varying vec2 coord;\
      void main() {\
        vec4 data = texture2D(data1, coord);\
        gl_FragColor = vec4(data.r, data.r, data.b, data.a);\
      }'),

    applyBoundary = function (t_tex) {
      var uniforms = {
        grid: grid_vec
      };

      if (boundary.temperature_at_border) {
        // Use float instead of bools due to Chrome bug.
        uniforms.flux = 0.0;
        uniforms.vN = boundary.temperature_at_border.upper;
        uniforms.vS = boundary.temperature_at_border.lower;
        uniforms.vW = boundary.temperature_at_border.left;
        uniforms.vE = boundary.temperature_at_border.right;

        gpgpu.executeProgram(
          apply_boundary_program,
          [data1_tex],
          uniforms,
          data1_tex
        );
      } else if (boundary.flux_at_border) {
        // Use float instead of bools due to Chrome bug.
        uniforms.flux = 1.0;
        uniforms.vN = boundary.flux_at_border.upper;
        uniforms.vS = boundary.flux_at_border.lower;
        uniforms.vW = boundary.flux_at_border.left;
        uniforms.vE = boundary.flux_at_border.right;
        uniforms.delta_x = delta_x;
        uniforms.delta_y = delta_y;

        gpgpu.executeProgram(
          apply_boundary_program,
          [data1_tex],
          uniforms,
          data1_tex
        );
      }
    };

  return {
    solve: function (convective) {
      var
        uniforms = {
          grid: grid_vec,
          hx: 0.5 / (delta_x * delta_x),
          hy: 0.5 / (delta_y * delta_y),
          inv_timestep: 1.0 / timestep,
          // Texture units.
          data1: 0,
          data2: 1
        },
        // Textures. 
        // Their order have to match texture units declaration above!
        textures = [
          data1_tex,
          data2_tex
        ],
        k;

      // Store previous values.
      gpgpu.executeProgram(
        copy_t_t0_program,
        [data1_tex],
        {},
        data1_tex
      );

      for (k = 0; k < relaxation_steps; k += 1) {
        gpgpu.executeProgram(
          solve_program,
          textures,
          uniforms,
          data1_tex
        );

        applyBoundary(data1_tex);
      }
      // Synchronize. It's not required but it 
      // allows to measure time (for optimization).
      gpgpu.tryFinish();
    }
  };
};
