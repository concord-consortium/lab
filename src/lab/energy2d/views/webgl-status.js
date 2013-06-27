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
    context = require('energy2d/gpu/context'),
    Texture = require('energy2d/gpu/texture'),

    GET_WEBGL = '<p><a href="http://get.webgl.org" target="_blank">Click to learn more about WebGL.</a></p>';

  return function WebGLStatusView(html_id) {
    var
      DEFAULT_ID = 'energy2d-webgl-status',

      $div,
      $webgl_icon,
      $status_wrapper,
      $status,

      // Energy2D modeler.
      energy2d_modeler,
      // List of WebGL features.
      features,
      WebGLAvailable,
      extensionsAvailable,

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

        $webgl_icon = $('<a id="show-webgl-status" class="button" title="Click to show WebGL status"><i class="icon-bolt"></i></a>');
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
        WebGLAvailable = false;
        extensionsAvailable = false;
        features = {};
        // 1. WebGL main tests.
        try {
          gl = context.getWebGLContext();
          WebGLAvailable = true;
        } catch (e) {
          // WebGL is not available, so don't test other features.
          return;
        }

        extensionsAvailable = true;
        // 2. OES_texture_float.
        if (gl.getExtension('OES_texture_float')) {
          features['OES_texture_float'] = true;
        } else {
          features['OES_texture_float'] = false;
          extensionsAvailable = false;
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
            extensionsAvailable = false;
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
        },

        render: function () {
          $status.empty();
          if (WebGLAvailable && extensionsAvailable) {
            $status.append('<p>Your browser <span class="happy">supports</span> WebGL and all required extensions!</p>');
          } else if (WebGLAvailable && !extensionsAvailable) {
            $status.append('<p>Your browser <span class="happy">supports</span> WebGL, however not all required extensions are available:</p>');
            Object.keys(features).forEach(function (key) {
              var ext = features[key] ? '<span class="happy"><i class="icon-ok"></i></span>' : '<span class="sad"><i class="icon-remove"></i></span>';
              $status.append('<p class="extension">' + ext + ' ' + key + '</p>');
            });
          } else if (!WebGLAvailable) {
            $status.append('<p>Sorry, your browser <span class="sad">does not support</span> WebGL.');
          }
          if (energy2d_modeler.isWebGLActive()) {
            $status.append('<p>Energy2D WebGL-accelerated solvers are <span class="happy">enabled</span>.');
          } else {
            $status.append('<p>Energy2D WebGL-accelerated solvers are <span class="sad">disabled</span>.');
            if (WebGLAvailable && extensionsAvailable) {
              $status.append('<p>Toggle <b>use_WebGL</b> model option to speed up simulation.');
            }
          }
          if (!WebGLAvailable || !extensionsAvailable) {
            $status.append(GET_WEBGL);
          }

          if (energy2d_modeler.properties.use_WebGL && !energy2d_modeler.isWebGLActive()) {
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
