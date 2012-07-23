/*globals energy2d, $, GL */
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
    gpu = energy2d.utils.gpu,
    // end.
    DEFAULT_ID = 'energy2d-heatmap-webgl-view',

    $heatmap_canvas,
    canvas_width,
    canvas_height,

    heatmap_tex,
    min_temp = 0,
    max_temp = 50,

    // WebGL context provided by the gpu module.
    gl,
    // Plane used for rendering.
    plane,
    // GLSL render program.
    render_program,
    // Vertex shader source.
    vertex_shader =
    '\
    varying vec2 coord;\
    void main() {\
      coord = gl_TexCoord.xy;\
      gl_Position = vec4(gl_Vertex.xyz, 1.0);\
    }',

    fragment_shader =
    '\
    uniform sampler2D texture;\
    varying vec2 coord;\
    uniform float max_hue;\
    uniform float max_temp;\
    uniform float min_temp;\
    vec3 HSVToRGB(float h, float s, float v) {\
      /* Make sure our arguments stay in-range */\
      h = max(0., min(360., h));\
      s = max(0., min(100., s));\
      v = max(0., min(100., v));\
      \
      /*\
      We accept saturation and value arguments from 0 to 100 because that is\
      how Photoshop represents those values. Internally, however, the\
      saturation and value are calculated from a range of 0 to 1. We make\
      That conversion here.\
      */\
      s /= 100.;\
      v /= 100.;\
      \
      if (s == 0.) {\
        /* Achromatic (grey) */\
        return vec3(v, v, v);\
      }\
      \
      h /= 60.; /* sector 0 to 5 */\
      int i = int(floor(h));\
      float f = h - float(i); /* factorial part of h */\
      float p = v * (1. - s);\
      float q = v * (1. - s * f);\
      float t = v * (1. - s * (1. - f));\
      \
      if (i == 0)\
        return vec3(v, t, p);\
      \
      if (i == 1)\
        return vec3(q, v, p);\
      \
      if (i == 2)\
        return vec3(p, v, t);\
      \
      if (i == 3)\
        return vec3(p, q, v);\
      \
      if (i == 4)\
        return vec3(t, p, v);\
      \
      if (i == 5)\
        return vec3(v, p, q);\
    }\
    void main() {\
      float temp = texture2D(texture, coord).r;\
      float scale = max_hue / (max_temp - min_temp);\
      float hue = max_hue - scale * (temp - min_temp);\
      gl_FragColor = vec4(HSVToRGB(hue, 100., 90.), 1.0);\
    }',

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
        render_program.uniforms({
          texture: 0,
          max_hue: 255,
          min_temp: min_temp,
          max_temp: max_temp
        }).draw(plane);
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
      },
      setMaxTemperature: function (v) {
        max_temp = v;
      }
    };

  // One-off initialization.
  // Get WebGL context.
  gl = gpu.gl;
  // Create GLSL program for rendering.
  render_program = new gpu.Shader(vertex_shader, fragment_shader);
  // Create and setup plane.
  plane = gpu.Mesh.plane({ coords: true });
  // Setup texture coordinates.
  plane.coords = [[1, 0], [1, 1], [0, 0], [0, 1]];
  plane.compile();

  initHTMLelement();

  return heatmap_view;
};
