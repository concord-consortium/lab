/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false, Uint8Array: false, $: false */

// Heatmap WebGL view.
//
// It uses HTML5 Canvas and WebGL for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap texture using bindHeapmapTexture(heatmap_tex).
// To render the heatmap use renderHeatmapTexture() method.
// Set size of the heatmap using CSS rules.
define(function (require) {
  'use strict';
  var
    // Dependencies.
    context      = require('models/energy2d/gpu/context'),
    Texture      = require('models/energy2d/gpu/texture'),
    Shader       = require('models/energy2d/gpu/shader'),
    Mesh         = require('models/energy2d/gpu/mesh'),
    ColorPalette = require('models/energy2d/views/color-palette'),
    // Shader sources.
    basic_vs         = require('text!models/energy2d/views/heatmap-webgl-glsl/basic.vs.glsl'),
    temp_renderer_fs = require('text!models/energy2d/views/heatmap-webgl-glsl/temp-renderer.fs.glsl');

  return function HeatmapWebGLView(html_id) {
    var
      // Get WebGL context.
      gl = context.getWebGLContext(),
      // GLSL Render program.
      render_program = new Shader(basic_vs, temp_renderer_fs),
      // Plane used for rendering.
      plane = Mesh.plane({ coords: true }),
      // Color palette texture (init later).
      palette_tex,

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
        // Ensure that FBO is null, as GPGPU operations which use FBOs also take place.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        // This is necessary, as GPGPU operations can modify viewport size.
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

          setupRenderTarget();

          gl.clear(gl.COLOR_BUFFER_BIT);
          heatmap_tex.bind(0);
          palette_tex.bind(1);
          render_program.draw(plane);
          palette_tex.unbind(1);
          heatmap_tex.unbind(0);
        },

        resize: function () {
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
        },
        setColorPalette: function (id) {
          var rgb_array, len, tex_data, i, i4;
          rgb_array = new ColorPalette(id).getRGBArray();
          len = rgb_array.length;
          tex_data = new Uint8Array(len * 4);
          for (i = 0; i < len; i += 1) {
            i4 = i * 4;
            tex_data[i4]     = rgb_array[i][0];
            tex_data[i4 + 1] = rgb_array[i][1];
            tex_data[i4 + 2] = rgb_array[i][2];
            tex_data[i4 + 3] = 255;
          }
          palette_tex = new Texture(len, 1, { type: gl.UNSIGNED_BYTE, format: gl.RGBA, filter: gl.LINEAR });
          gl.bindTexture(gl.TEXTURE_2D, palette_tex.id);
          gl.texImage2D(gl.TEXTURE_2D, 0, palette_tex.format, len, 1, 0, palette_tex.format, palette_tex.type, tex_data);
        }
      };

    // One-off initialization.
    // Set the default color palette.
    heatmap_view.setColorPalette('DEFAULT');
    // Set render program uniforms.
    render_program.uniforms({
      // Texture units.
      heatmap_tex: 0,
      palette_tex: 1,
      // Uniforms.
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
});
