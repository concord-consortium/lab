/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

// WebGL Status.
// Presents available WebGL features.
//
// getHTMLElement() method returns JQuery object with DIV that contains status.

define(function (require) {
  'use strict';
  var
    // Dependencies.
    $ = require('jquery'),
    context = require('gpu/context'),
    Texture = require('gpu/texture');

  return function WebGLStatusView(html_id) {
    var
      DEFAULT_ID = 'energy2d-webgl-status',

      $WebGL_status_div,
      $solvers_p,
      $error_p,
      $features_ul,

      // Energy2D modeler.
      energy2d_modeler,
      // List of WebGL features.
      features,

      //
      // Private methods.
      //
      initHTMLelement = function () {
        $WebGL_status_div = $('<div />');
        $WebGL_status_div.attr('id', html_id || DEFAULT_ID);
        $WebGL_status_div.append('<h2>WebGL status</h2>');
        $solvers_p = $('<p />');
        $WebGL_status_div.append($solvers_p);
        $features_ul = $('<ul />');
        $WebGL_status_div.append($features_ul);
        $error_p = $('<p />');
        $error_p.css('color', 'orange');
        $WebGL_status_div.append($error_p);
      },

      testFeatures = function () {
        var gl, temp_texture;
        // Clear features lists.
        features = {};
        // 1. WebGL main tests.
        try {
          gl = context.getWebGLContext();
          features['WebGL context'] = true;
        } catch (e) {
          features['WebGL context'] = false;
          // WebGL is not available, so don't test other features.
          return;
        }

        // 2. OES_texture_float.
        if (gl.getExtension('OES_texture_float')) {
          features['OES_texture_float extension'] = true;
        } else {
          features['OES_texture_float extension'] = false;
        }

        // 3. Float texture as render target.
        //    Test it only if float textures are available.
        if (features['OES_texture_float extension']) {
          temp_texture = new Texture(1, 1, { type: gl.FLOAT, format: gl.RGBA, filter: gl.LINEAR });
          temp_texture.setAsRenderTarget();
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
            features['FLOAT texture as render target'] = true;
          } else {
            features['FLOAT texture as render target'] = false;
          }
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
      },

      render = function () {
        var name, $val, $line, error;
        // Render status of GPU solvers.
        $solvers_p.html('Energy2D GPU solvers: ');
        if (energy2d_modeler.isWebGLActive()) {
          $val = $('<span>active</span>');
          $val.css('color', 'green');
        } else {
          $val = $('<span>inactive</span>');
          $val.css('color', 'orange');
        }
        $solvers_p.append($val);

        // Render WebGL features lists.
        $features_ul.html('');
        for (name in features) {
          if (features.hasOwnProperty(name)) {
            if (features[name]) {
              $val = $('<span>available</span>');
              $val.css('color', 'green');
            } else {
              $val = $('<span>not available</span>');
              $val.css('color', 'red');
            }
            $line = $('<li>' + name + ': </li>');
            $line.append($val);
            $features_ul.append($line);
          }
        }

        // Render errors.
        $error_p.html('');
        error = energy2d_modeler.getWebGLError();
        if (error !== undefined) {
          $error_p.append(error);
        }
      },

      //
      // Public API.
      //
      WebGL_status_view = {
        bindModel: function (model) {
          energy2d_modeler = model;
        },

        updateAndRender: function () {
          // Test and update WebGL features.
          testFeatures();
          // Render status.
          render();
        },

        getHTMLElement: function () {
          return $WebGL_status_div;
        }
      };

    // One-off initialization.
    initHTMLelement();

    return WebGL_status_view;
  };
});
