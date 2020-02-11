/*global define: false, $: false*/

// WebGL Status.
// Presents available WebGL features.
//
// getHTMLElement() method returns JQuery object with DIV that contains status.

import $__common_controllers_checkbox_controller from 'common/controllers/checkbox-controller';
import $__models_energy_d_gpu_gpgpu from 'models/energy2d/gpu/gpgpu';

var
// Dependencies.
  CheckboxController = $__common_controllers_checkbox_controller,
  gpgpu = $__models_energy_d_gpu_gpgpu,

  GET_WEBGL = '<p><a href="http://get.webgl.org" target="_blank">Click to learn more about WebGL.</a></p>';

export default function WebGLStatusView(html_id, model) {
  var
    DEFAULT_ID = 'e2d-webgl-status',
    $div,
    $webgl_icon,
    $status_wrapper,
    $status,
    webgl_checkbox,
    $checkbox,
    energy2d_modeler,
    WebGL_status_view,
    interactiveControllerProxy = {
      getModel: function() {
        return model;
      },
      getScriptingAPI: function() {
        return function() {};
      },
      getNextTabIndex: function() {
        return function() {};
      }
    };

  //
  // Private methods.
  //

  function initHTMLelement() {
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
  }

  function show() {
    $webgl_icon.hide();
    $status_wrapper.fadeIn();
  }

  function hide() {
    $webgl_icon.fadeIn();
    $status_wrapper.fadeOut();
  }

  function initialize() {
    // Second argument to new CheckboxController replicates part of an
    // interactiveController to generate the necessary API a checkbox
    // controller component needs
    webgl_checkbox = new CheckboxController({
      "type": "checkbox",
      "id": "webgl-status-checkbox",
      "text": "WebGL-accelerated physics engine",
      "property": "use_WebGL"
    }, interactiveControllerProxy);
    $checkbox = webgl_checkbox.getViewContainer();
    initHTMLelement();
  }

  //
  // Public API.
  //
  WebGL_status_view = {
    bindModel: function(model) {
      energy2d_modeler = model;
      interactiveControllerProxy.getModel = function() {
        return model;
      };
      webgl_checkbox.modelLoadedCallback(interactiveControllerProxy);
    },

    render: function() {
      var modelCompatible = energy2d_modeler.isWebGLCompatible(),
        feature = gpgpu.featuresInfo,
        requiredFeatures = true,
        optionalFeatures = true,
        initError = energy2d_modeler.properties.use_WebGL && !energy2d_modeler.isWebGLActive(),
        content;

      $status.empty();

      Object.keys(feature).forEach(function(name) {
        var f = feature[name];
        if (f.required && !f.available) {
          requiredFeatures = false;
        }
        if (!f.required && !f.available) {
          optionalFeatures = false;
        }
      });

      // WebGL + required extensions availability message.
      if (requiredFeatures && optionalFeatures) {
        $status.append('<p>Your browser <span class="happy">supports</span> WebGL as well as all required and optional extensions!</p>');
      } else if (requiredFeatures) {
        $status.append('<p>Your browser <span class="happy">supports</span> WebGL and all required extensions! However some ' +
          'optional extensions are unavailable:</p>');
        Object.keys(feature).forEach(function(name) {
          var f = feature[name],
            supported;
          if (!f.required) {
            supported = f.available ? '<span class="happy"><i class="icon-ok"></i></span>' : '<span class="sad"><i class="icon-remove"></i></span>';
            $status.append('<p class="extension">' + supported + ' ' + name + '</p>');
          }
        });
        $status.append('<p>WebGL rendering quality can be affected.</p>');
      } else if (feature['WebGL']) {
        $status.append('<p>Your browser <span class="happy">supports</span> WebGL, however not all required extensions are available:</p>');
        Object.keys(feature).forEach(function(name) {
          var f = feature[name],
            supported;
          if (f.required) {
            supported = f.available ? '<span class="happy"><i class="icon-ok"></i></span>' : '<span class="sad"><i class="icon-remove"></i></span>';
            $status.append('<p class="extension">' + supported + ' ' + name + '</p>');
          }
        });
        $status.append(GET_WEBGL);
      } else {
        $status.append('<p>Sorry, your browser <span class="sad">does not support</span> WebGL.');
        $status.append(GET_WEBGL);
      }

      // Model compatibility message.
      if (modelCompatible) {
        content = 'This model is <span class="happy">compatible</span> with WebGL-accelerated physics engine';
        if (energy2d_modeler.isWebGLActive()) {
          content += ' and it is <span class="happy">active</span>.';
        } else {
          content += ', but it is <span class="sad">inactive</span>.';
          if (initError) {
            content += ' Unfortunately, its initialization <span class="sad">failed</span>. Check the browser console for details.';
          } else if (requiredFeatures) {
            content += ' Enable it to speed up simulation:';
          }
        }
        $status.append('<p>' + content + '</p>');
      } else {
        $status.append('<p>Unfortunately, some features used in this model are <span class="sad">incompatible</span> ' +
          'with WebGL-accelerated physics engine.</p>');
      }

      // WebGL solvers checkbox.
      if (!requiredFeatures || !modelCompatible || initError) {
        // If any test failed hide the checkbox.
        $checkbox.hide();
      } else {
        $checkbox.show();
      }

      // WebGL icon tooltip message and color.
      if (initError) {
        content = 'WebGL initialization failed.';
        $webgl_icon.removeClass("happy");
        $webgl_icon.addClass("sad");
      } else if (!requiredFeatures || !modelCompatible) {
        content = 'WebGL unavailable.';
        $webgl_icon.removeClass("happy");
        $webgl_icon.addClass("sad");
      } else if (!energy2d_modeler.isWebGLActive()) {
        content = 'WebGL available, but inactive.';
        $webgl_icon.removeClass("happy");
        $webgl_icon.removeClass("sad");
      } else {
        content = 'WebGL available and active.';
        $webgl_icon.removeClass("sad");
        $webgl_icon.addClass("happy");
      }
      content += ' Click for detailed information.';
      $webgl_icon.attr('title', content);

      if (initError) {
        // Display panel when user requested WebGL, but it wasn't
        // initialized correctly.
        show();
      }
    },

    getHTMLElement: function() {
      return $div;
    }
  };

  // One-off initialization.
  initialize();

  return WebGL_status_view;
};
