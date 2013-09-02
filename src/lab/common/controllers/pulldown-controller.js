/*global require, define, $ */

define(function () {

  var metadata      = require('common/controllers/interactive-metadata'),
      validator     = require('common/validator'),
      disablable    = require('common/controllers/disablable'),
      SelectBoxView = require('common/views/select-box-view');

      require('common/jquery-plugins');

  return function PulldownController(component, scriptingAPI, interactivesController, model) {
        // Public API.
    var controller,
        // Options definitions from component JSON definition.
        options,
        view,
        $element;

    function updatePulldown() {
      view.update(model.properties[component.property]);
    }

    function initialize() {
      var parent = interactivesController.interactiveContainer,
          i, len;

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.pulldown, component);
      // Validate pulldown options too.
      options = component.options;
      for (i = 0, len = options.length; i < len; i++) {
        options[i] = validator.validateCompleteness(metadata.pulldownOption, options[i]);
      }

      view = new SelectBoxView({
        id: component.id,
        options: options,
        label: component.label,
        labelOn: component.labelOn,
        onChange: function(option) {
          if (option.action) {
            scriptingAPI.makeFunctionInScriptContext(option.action)();
          } else if (option.loadModel) {
            model.stop();
            interactivesController.loadModel(option.loadModel);
          } else if (option.value !== undefined) {
            model.properties[component.property] = option.value;
          }
        }
      });

      $element = view.render(parent);

      $element
        .addClass("interactive-pulldown")
        .addClass("component");

      if (component.tooltip) {
        $element.attr("title", component.tooltip);
      }

      disablable(controller, component);
    }

    // Public API.
    controller = {
      modelLoadedCallback: function (model) {
        // Connect pulldown with model's property if its name is defined.
        if (component.property !== undefined) {
          // Register listener for property.
          model.addObserver(component.property, updatePulldown);
          // Perform initial pulldown setup.
          updatePulldown();
        }
      },

      // Returns view container.
      getViewContainer: function () {
        return $element;
      },

      // Returns serialized component definition.
      serialize: function () {
        var i, len, $options;
        if (component.property === undefined) {
          // When property binding is not defined, we need to keep track
          // which option is currently selected.
          $options = $element.find('option');
          for (i = 0, len = options.length; i < len; i++) {
            if ($($options[i]).prop("selected")) {
              options[i].selected = true;
            } else {
              delete options[i].selected;
            }
          }
        }
        // Note that 'options' array above is a reference to component.options array.
        // Every thing is updated, return a copy.
        return $.extend(true, {}, component);
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});
