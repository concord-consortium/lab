/*global define $ model*/

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function PulldownController(component, scriptingAPI, interactivesController) {
        // List of jQuery objects wrapping <select> elements.
    var $options = [],
        $pulldown, $option,
        options, option,
        controller,
        i, len;

    // Updates radio using model property. Used in modelLoadedCallback.
    // Make sure that this function is only called when:
    // a) model is loaded,
    // b) radio is bound to some property.
    function updatePulldown() {
      var value = model.get(component.property);
      for (i = 0, len = options.length; i < len; i++) {
        if (options[i].value === value) {
          $options[i].attr("selected", true);
        }
      }
    }

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
        $option.attr("disabled", option.disabled);
      }
      if (option.selected) {
        $option.attr("selected", option.selected);
      }
      $pulldown.append($option);
    }

    $pulldown.change(function() {
      var index = $(this).prop('selectedIndex'),
          action = component.options[index].action,
          i, len;

      // Update component definition only if there is no property binding.
      if (component.property === undefined) {
        for (i = 0, len = options.length; i < len; i++) {
          delete options[i].selected;
        }
        options[index].selected = true;
      }

      if (action){
        scriptingAPI.makeFunctionInScriptContext(action)();
      } else if (component.options[index].loadModel){
        model.stop();
        interactivesController.loadModel(component.options[index].loadModel);
      } else if (option.value !== undefined) {
        model.set(component.property, options[index].value);
      }
    });

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
        // Return compoment definition. It's always valid,
        // as selected option is updated during 'change' callback.
        return $.extend(true, {}, component);
      }
    };
    // Return Public API object.
    return controller;
  };
});
