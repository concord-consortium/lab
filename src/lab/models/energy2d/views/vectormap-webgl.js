/*global define: false, $: false*/

// Vectormap WebGL view.
//
// It uses HTML5 Canvas and WebGL for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap texture using bindHeapmapTexture(vectormap_tex).
// To render the heatmap use renderVectormapTexture() method.
// Set size of the heatmap using CSS rules.

import $__models_energy_d_gpu_context from 'models/energy2d/gpu/context';
import $__models_energy_d_gpu_shader from 'models/energy2d/gpu/shader';
import $__models_energy_d_gpu_mesh from 'models/energy2d/gpu/mesh';
import $__text_models_energy_d_views_vectormap_webgl_glsl_vectormap_vs_glsl from 'models/energy2d/views/vectormap-webgl-glsl/vectormap.vs.glsl';
import $__text_models_energy_d_views_vectormap_webgl_glsl_vectormap_fs_glsl from 'models/energy2d/views/vectormap-webgl-glsl/vectormap.fs.glsl';

var
// Dependencies.
  context = $__models_energy_d_gpu_context,
  Shader = $__models_energy_d_gpu_shader,
  Mesh = $__models_energy_d_gpu_mesh,
  // Shader sources. One of Lab build steps converts sources to the JavaScript file.
  vectormap_vs = $__text_models_energy_d_views_vectormap_webgl_glsl_vectormap_vs_glsl,
  vectormap_fs = $__text_models_energy_d_views_vectormap_webgl_glsl_vectormap_fs_glsl;

export default function VectormapWebGLView(html_id) {
  var
  // Get WebGL context.
    gl = context.getWebGLContext(),
    // GLSL Render program.
    render_program = new Shader(vectormap_vs, vectormap_fs),
    // Plane used for rendering.
    arrows = new Mesh({
      coords: true,
      lines: true
    }),

    DEFAULT_ID = 'energy2d-vectormap-webgl-view',
    VECTOR_SCALE = 100,
    VECTOR_BASE_LEN = 8,
    ARROW_COLOR = [0.7, 0.7, 0.7, 1.0],

    $vectormap_canvas,
    canvas_width,
    canvas_height,

    vectormap_tex,
    grid_width,
    grid_height,
    spacing,

    enabled = true,

    //
    // Private methods.
    //
    initGeometry = function() {
      var i, j, idx, origin, coord,
        gdx = 2.0 / grid_width,
        gdy = 2.0 / grid_height,
        tdx = 1.0 / grid_width,
        tdy = 1.0 / grid_height;

      arrows.addVertexBuffer('origins', 'origin');
      arrows.vertices = [];
      arrows.origins = [];
      arrows.coords = [];
      arrows.lines = [];

      idx = 0;
      for (i = 1; i < grid_width - 1; i += spacing) {
        for (j = 1; j < grid_height - 1; j += spacing) {
          // Base arrows vertices. Origin, front and two wings. The unit is pixel.
          // Base length is 0.01 px - just for convenience (it distinguish front of the arrows from the origin).
          arrows.vertices.push([0, 0, 0], [0.01, 0, 0], [-3, 2, 0], [-3, -2, 0]);
          // All of these vertices have to know which vector they are representing.
          origin = [-1.0 + (i + 0.5) * gdx, 1.0 - (j + 0.5) * gdy, 0];
          arrows.origins.push(origin, origin, origin, origin);
          // Texture coordinates.
          coord = [(j + 0.5) * tdy, (i + 0.5) * tdx];
          arrows.coords.push(coord, coord, coord, coord);
          // Draw three lines. From origin to the fron of the arrows + two wings.
          arrows.lines.push([idx, idx + 1], [idx + 1, idx + 2], [idx + 1, idx + 3]);
          idx += 4;
        }
      }
      // Update buffers.
      arrows.compile();
    },

    initHTMLelement = function() {
      $vectormap_canvas = $(gl.canvas);
      $vectormap_canvas.attr('id', html_id || DEFAULT_ID);
    },

    // Make sure that no FBO is bound and viewport has proper dimensions
    // (it's not obvious as this context is also used for GPGPU calculations).
    setupRenderTarget = function() {
      // Ensure that FBO is null, as GPGPU operations which use FBOs also take place.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // This is necessary, as GPGPU operations can modify viewport size.
      gl.viewport(0, 0, canvas_width, canvas_height);
    },

    //
    // Public API.
    //
    vectormap_view = {
      // Render heat map on the canvas.
      renderVectormap: function() {
        if (!enabled) return;

        if (!vectormap_tex) {
          throw new Error("Vectormap: bind heatmap texture before rendering.");
        }

        setupRenderTarget();

        vectormap_tex.bind(0);
        render_program.draw(arrows, gl.LINES);
        vectormap_tex.unbind(0);
      },

      get enabled() {
        return enabled;
      },
      set enabled(v) {
        enabled = v;
      },

      resize: function() {
        canvas_width = $vectormap_canvas.width();
        canvas_height = $vectormap_canvas.height();
        $vectormap_canvas.attr('width', canvas_width);
        $vectormap_canvas.attr('height', canvas_height);
        // Render ara has dimensions from -1.0 to 1.0, so its width/height is 2.0.
        render_program.uniforms({
          scale: [2.0 / canvas_width, 2.0 / canvas_height]
        });
      },

      // Bind vectormap to the view.
      bindVectormapTexture: function(new_vectormap_tex, new_grid_width, new_grid_height, arrows_per_row) {
        vectormap_tex = new_vectormap_tex;
        grid_width = new_grid_width;
        grid_height = new_grid_height;
        spacing = Math.round(grid_width / arrows_per_row);

        initGeometry();
      },

      getHTMLElement: function() {
        return $vectormap_canvas;
      }
    };

  // One-off initialization.
  // Set render program uniforms.
  render_program.uniforms({
    // Texture units.
    vectormap_tex: 0,
    // Uniforms.
    base_length: VECTOR_BASE_LEN,
    vector_scale: VECTOR_SCALE,
    color: ARROW_COLOR
  });

  initHTMLelement();

  return vectormap_view;
};
