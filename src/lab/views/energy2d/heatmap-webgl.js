/*globals lab: false, energy2d: false, $: false */
/*jslint indent: 2, browser: true, es5: true */
//
// lab/views/energy2d/heatmap-webgl.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Heatmap WebGL view.
//
// It uses HTML5 Canvas and WebGL for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap texture using bindHeapmapTexture(heatmap_tex).
// To render the heatmap use renderHeatmapTexture() method. 
// Set size of the heatmap using CSS rules.
energy2d.views.makeHeatmapWebGLView = function (html_id) {
  'use strict';
  var
    // Dependencies:
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,
    // - GLSL sources.
    glsl = lab.glsl,

    // Shader sources. One of Lab build steps converts sources to the JavaScript file.
    GLSL_PREFIX    = 'src/lab/views/energy2d/heatmap-webgl-glsl/',
    basic_vs       = glsl[GLSL_PREFIX + 'basic.vs.glsl'],
    temp_to_hsv_fs = glsl[GLSL_PREFIX + 'temp-to-hsv.fs.glsl'],

    // Get WebGL context.
    gl = gpu.init(),
    // GLSL Render program.
    render_program = new gpu.Shader(basic_vs, temp_to_hsv_fs),
    // Plane used for rendering.
    plane = gpu.Mesh.plane({ coords: true }),

    DEFAULT_ID = 'energy2d-heatmap-webgl-view',

    $heatmap_canvas,
    canvas_width,
    canvas_height,

    heatmap_tex,
    min_temp = 0,
    max_temp = 50,

    // 
    // Private methods.
    //
    initHTMLelement = function () {
      $heatmap_canvas = $(gl.canvas);
      $heatmap_canvas.attr('id', html_id || DEFAULT_ID);
    },

    // Make sure that no FBO is bound and viewport has proper dimensions
    // (it's not obvious as this context is also used for GPGPU calculations).
    setupRenderTarget = function () {
      // All GPGPU operations should do it after they are finished, but it's a double check.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      // This is necessary, as GPGPU operations modify viewport size.
      gl.viewport(0, 0, canvas_width, canvas_height);
    },

    //
    // Public API.
    //
    heatmap_view = {
      // Render heat map on the canvas.
      renderHeatmap: function () {

        if (!heatmap_tex) {
          throw new Error("Heatmap: bind heatmap texture before rendering.");
        }
        // Follow size of the canvas defined by CSS rules.
        if (canvas_width !== $heatmap_canvas.width() || canvas_height !== $heatmap_canvas.height()) {
          this.updateCanvasSize();
        }

        setupRenderTarget();

        gl.clear(gl.COLOR_BUFFER_BIT);
        heatmap_tex.bind(0);
        render_program.draw(plane);
        heatmap_tex.unbind(0);
      },

      updateCanvasSize: function () {
        canvas_width = $heatmap_canvas.width();
        canvas_height = $heatmap_canvas.height();
        $heatmap_canvas.attr('width', canvas_width);
        $heatmap_canvas.attr('height', canvas_height);
      },

      // Bind heatmap to the view.
      bindHeatmapTexture: function (new_heatmap_tex) {
        heatmap_tex = new_heatmap_tex;
      },

      getHTMLElement: function () {
        return $heatmap_canvas;
      },

      setMinTemperature: function (v) {
        min_temp = v;
        render_program.uniforms({
          min_temp: min_temp
        });
      },
      setMaxTemperature: function (v) {
        max_temp = v;
        render_program.uniforms({
          max_temp: max_temp
        });
      }
    };

  // One-off initialization.
  // Set render program uniforms.
  render_program.uniforms({
    texture: 0,
    max_hue: 255,
    min_temp: min_temp,
    max_temp: max_temp
  });
  // Setup texture coordinates.
  plane.coords = [[1, 0], [1, 1], [0, 0], [0, 1]];
  // Update buffers.
  plane.compile();

  initHTMLelement();

  return heatmap_view;
};
