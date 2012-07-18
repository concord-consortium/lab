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
    conductivity_tex = model.getConductivityTexture(),
    capacity_tex     = model.getCapacityTexture(),
    density_tex      = model.getDensityTexture(),
    u_tex            = model.getUVelocityTexture(),
    v_tex            = model.getVVelocityTexture(),
    tb_tex           = model.getBoundaryTemperatureTexture(),
    fluidity_tex     = model.getFluidityTexture(),

    // Internal simulation texture.
    t0_tex = gpgpu.createTexture(),

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
      uniform sampler2D t;\
      uniform sampler2D t0;\
      uniform sampler2D tb;\
      uniform sampler2D q;\
      uniform sampler2D capacity;\
      uniform sampler2D density;\
      uniform sampler2D conductivity;\
      uniform vec2 grid;\
      uniform float hx;\
      uniform float hy;\
      uniform float inv_timestep;\
      varying vec2 coord;\
      void main() {\
        vec4 t_data = texture2D(t, coord);\
        if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\
            coord.y > grid.y && coord.y < 1.0 - grid.y) {\
          \
          vec2 dx = vec2(grid.x, 0.0);\
          vec2 dy = vec2(0.0, grid.y);\
          float tb_val = texture2D(tb, coord).r;\
          /* val != val means that val is NaN */\
          if (tb_val != tb_val) {\
            float sij = texture2D(capacity, coord).r * texture2D(density, coord).r * inv_timestep;\
            float rij = texture2D(conductivity, coord).r;\
            float axij = hx * (rij + texture2D(conductivity, coord - dy).r);\
            float bxij = hx * (rij + texture2D(conductivity, coord + dy).r);\
            float ayij = hy * (rij + texture2D(conductivity, coord - dx).r);\
            float byij = hy * (rij + texture2D(conductivity, coord + dx).r);\
            float new_val = (texture2D(t0, coord).r * sij + texture2D(q, coord).r\
                           + axij * texture2D(t, coord - dy).r\
                           + bxij * texture2D(t, coord + dy).r\
                           + ayij * texture2D(t, coord - dx).r\
                           + byij * texture2D(t, coord + dx).r)\
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
      uniform sampler2D t;\
      uniform sampler2D conductivity;\
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
        vec4 data = texture2D(t, coord);\
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
            new_temp = texture2D(t, coord + dx).r\
              + vN * delta_y / texture2D(conductivity, coord).r;\
            gl_FragColor = vec4(new_temp, data.gba);\
          } else if (coord.x > 1.0 - grid.x) {\
            new_temp = texture2D(t, coord - dx).r\
              - vS * delta_y / texture2D(conductivity, coord).r;\
            gl_FragColor = vec4(new_temp, data.gba);\
          } else if (coord.y < grid.y) {\
            new_temp = texture2D(t, coord + dy).r\
              - vW * delta_x / texture2D(conductivity, coord).r;\
            gl_FragColor = vec4(new_temp, data.gba);\
          } else if (coord.y > 1.0 - grid.y) {\
            new_temp = texture2D(t, coord - dy).r\
              + vE * delta_x / texture2D(conductivity, coord).r;\
            gl_FragColor = vec4(new_temp, data.gba);\
          } else {\
            gl_FragColor = data;\
          }\
        \
        }\
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
          [t_tex],
          uniforms,
          t_tex
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

        // Set texture units.
        uniforms.t = 0;
        uniforms.conductivity = 1;

        gpgpu.executeProgram(
          apply_boundary_program,
          [t_tex, conductivity_tex],
          uniforms,
          t_tex
        );
      }
    };

  return {
    solve: function (convective, t_tex, q_tex) {
      var
        uniforms = {
          grid: grid_vec,
          hx: 0.5 / (delta_x * delta_x),
          hy: 0.5 / (delta_y * delta_y),
          inv_timestep: 1.0 / timestep,
          // Texture units.
          t: 0,
          t0: 1,
          tb: 2,
          q: 3,
          capacity: 4,
          density: 5,
          conductivity: 6
        },
        // Textures. 
        // Their order have to match texture units declaration above!
        textures = [
          t_tex,
          t0_tex,
          tb_tex,
          q_tex,
          capacity_tex,
          density_tex,
          conductivity_tex
        ],
        k;

      // Store previous values.
      gpgpu.copyTexture(t_tex, t0_tex);

      for (k = 0; k < relaxation_steps; k += 1) {
        gpgpu.executeProgram(
          solve_program,
          textures,
          uniforms,
          t_tex
        );

        applyBoundary(t_tex);
      }
      // Synchronize. It's not required but it 
      // allows to measure time (for optimization).
      gpgpu.finish();
    }
  };
};
