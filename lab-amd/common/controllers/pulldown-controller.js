/*global define $ model*/

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function PulldownController(component, scriptingAPI, interactivesController) {
        // Public API.
    var controller,
        // DOM elements.
        $pulldown, $option,
        // Options definitions from component JSON definition.
        options,
        // List of jQuery objects wrapping <select> elements.
        $options = [];

    // Updates pulldown using model property. Used in modelLoadedCallback.
    // Make sure that this function is only called when:
    // a) model is loaded,
    // b) pulldown is bound to some property.
    function updatePulldown() {
      // Clear current selection.
      $pulldown.val([]);
      // Try to set a new value.
      $pulldown.val(model.get(component.property));
    }

    function initialize() {
      var i, len, option;

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.pulldown, component);
      // Validate pulldown options too.
      options = component.options;
      for (i = 0, len = options.length; i < len; i++) {
        options[i] = validator.validateCompleteness(metadata.pulldownOption, options[i]);
      }

      $pulldown = $('<select>').attr('id', component.id);
      // Each interactive component has to have class "component".
      $pulldown.addClass("component");

      for (i = 0, len = options.length; i < len; i++) {
        option = options[i];
        $option = $('<option>').html(option.text);
        $options.push($option);
        if (option.disabled) {
          $option.prop("disabled", option.disabled);
        }
        if (option.selected) {
          $option.prop("selected", option.selected);
        }
        if (option.value) {
          $option.prop("value", option.value);
        }
        $pulldown.append($option);
      }

      $pulldown.change(function() {
        var index = $(this).prop('selectedIndex'),
            action = component.options[index].action;

        if (action){
          scriptingAPI.makeFunctionInScriptContext(action)();
        } else if (component.options[index].loadModel){
          model.stop();
          interactivesController.loadModel(component.options[index].loadModel);
        } else if (option.value !== undefined) {
          model.set(component.property, options[index].value);
        }
      });
    }

    // Public API.
    controller = {
      modelLoadedCallback: function () {
        // Connect pulldown with model's property if its name is defined.
        if (component.property !== undefined) {
          // Register listener for property.
          model.addPropertiesListener([component.property], updatePulldown);
          // Perform initial pulldown setup.
          updatePulldown();
        }
      },

      // Returns view container.
      getViewContainer: function () {
        return $pulldown;
      },

      // Returns serialized component definition.
      serialize: function () {
        var i, len;
        if (component.property === undefined) {
          // When property binding is not defined, we need to keep track
          // which option is currently selected.
          for (i = 0, len = options.length; i < len; i++) {
            if ($options[i].prop("selected")) {
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
