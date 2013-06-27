/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false, $: false*/

// WebGL Status.
// Presents available WebGL features.
//
// getHTMLElement() method returns JQuery object with DIV that contains status.

define(function (require) {
  'use strict';
  var
    // Dependencies.
    CheckboxController = require('common/controllers/checkbox-controller'),
    context            = require('energy2d/gpu/context'),
    Texture            = require('energy2d/gpu/texture'),

    GET_WEBGL = '<p><a href="http://get.webgl.org" target="_blank">Click to learn more about WebGL.</a></p>';

  return function WebGLStatusView(html_id) {
    var
      DEFAULT_ID = 'energy2d-webgl-status',

      $div,
      $webgl_icon,
      $status_wrapper,
      $status,

      webgl_checkbox = new CheckboxController({
        "type": "checkbox",
        "id": "webgl-status-checkbox",
        "text": "WebGL-accelerated solvers",
        "property": "use_WebGL"
      }),
      $checkbox = webgl_checkbox.getViewContainer(),

      // Energy2D modeler.
      energy2d_modeler,
      // List of WebGL features.
      features,
      WebGLContext,
      extensions,

      //
      // Private methods.
      //
      initHTMLelement = function () {
        var $closeBtn;

        $div = $('<div />');
        $div.attr('id', html_id || DEFAULT_ID);
        $status_wrapper = $('<div id="status-wrapper"/>');
        $status_wrapper.appendTo($div);
        $status = $('<div />');
        $status.appendTo($status_wrapper);

        $closeBtn = $('<a id="hide-webgl-status" class="button"><i class="icon-remove"></i></a>');
        $closeBtn.on('click', hide);
        $closeBtn.appendTo($status_wrapper);

        $checkbox.appendTo($status_wrapper);

        $webgl_icon = $('<a id="show-webgl-status" class="button"><i class="icon-bolt"></i></a>');
        $webgl_icon.on('click', show);
        $webgl_icon.appendTo($div);

        $status_wrapper.hide();
      },

      show = function () {
        $webgl_icon.hide();
        $status_wrapper.fadeIn();
      },

      hide = function () {
        $webgl_icon.fadeIn();
        $status_wrapper.fadeOut();
      },

      testFeatures = function () {
        var gl, temp_texture;
        WebGLContext = false;
        extensions = false;
        features = {};
        // 1. WebGL main tests.
        try {
          gl = context.getWebGLContext();
          WebGLContext = true;
        } catch (e) {
          // WebGL is not available, so don't test other features.
          return;
        }

        extensions = true;
        // 2. OES_texture_float.
        if (gl.getExtension('OES_texture_float')) {
          features['OES_texture_float'] = true;
        } else {
          features['OES_texture_float'] = false;
          extensions = false;
        }

        // 3. Float texture as render target.
        //    Test it only if float textures are available.
        if (features['OES_texture_float']) {
          temp_texture = new Texture(1, 1, { type: gl.FLOAT, format: gl.RGBA, filter: gl.LINEAR });
          temp_texture.setAsRenderTarget();
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
            features['OES_texture_float as render target'] = true;
          } else {
            features['OES_texture_float as render target'] = false;
            extensions = false;
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
      },

      //
      // Public API.
      //
      WebGL_status_view = {
        bindModel: function (model) {
          energy2d_modeler = model;
          // Actually this function should be named 'bindModel(model)'.
          webgl_checkbox.modelLoadedCallback();
        },

        render: function () {
          var modelCompatible = energy2d_modeler.isWebGLCompatible(),
              content;

          $status.empty();

          // WebGL + extensions availably message.
          if (WebGLContext && extensions) {
            $status.append('<p>Your browser <span class="happy">supports</span> WebGL and all required extensions!</p>');
          } else if (WebGLContext && !extensions) {
            $status.append('<p>Your browser <span class="happy">supports</span> WebGL, however not all required extensions are available:</p>');
            Object.keys(features).forEach(function (key) {
              var ext = features[key] ? '<span class="happy"><i class="icon-ok"></i></span>' : '<span class="sad"><i class="icon-remove"></i></span>';
              $status.append('<p class="extension">' + ext + ' ' + key + '</p>');
            });
            $status.append(GET_WEBGL);
          } else if (!WebGLContext) {
            $status.append('<p>Sorry, your browser <span class="sad">does not support</span> WebGL.');
            $status.append(GET_WEBGL);
          }

          // Model compatibility message.
          if (modelCompatible) {
            content = 'This model is <span class="happy">compatible</span> with WebGL-accelerated physics solvers';
            if (energy2d_modeler.isWebGLActive()) {
              content += ' and they are <span class="happy">active</span>.';
            } else {
              content += ', but they are <span class="sad">inactive</span>.';
              if (WebGLContext && extensions) {
                content += ' Enable them to speed up simulation:';
              }
            }
            $status.append('<p>' + content + '</p>');
          } else {
            $status.append('<p>Unfortunately, some features used in this model are <span class="sad">incompatible</span> ' +
                           'with WebGL-accelerated physics solvers.</p>');
          }

          // WebGL solvers checkbox.
          if (!WebGLContext || !extensions || !modelCompatible) {
            // If any test failed hide the checkbox.
            $checkbox.hide();
          }

          // WebGL icon tooltip message and color.
          if (!WebGLContext || !extensions || !modelCompatible) {
            content = 'WebGL unavailable.';
            $webgl_icon.addClass("sad");
          } else if (!energy2d_modeler.isWebGLActive()) {
            content = 'WebGL available, but inactive.';
          } else {
            content = 'WebGL available and active.';
            $webgl_icon.addClass("happy");
          }
          content += ' Click for detailed information.';
          $webgl_icon.attr('title', content);


          // Whole panel.
          if (energy2d_modeler.properties.use_WebGL && !energy2d_modeler.isWebGLActive()) {
            // Display panel when user requested WebGL, but it wasn't
            // initialized correctly.
            show();
          }
        },

        getHTMLElement: function () {
          return $div;
        }
      };

    // One-off initialization.
    initHTMLelement();
    testFeatures();

    return WebGL_status_view;
  };
});
