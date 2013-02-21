/*global define $ model*/

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function PulldownController(component, scriptingAPI, interactivesController) {
    var $pulldown, $option,
        options, option,
        controller,
        i, len;

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

      // Update component definition.
      for (i = 0, len = options.length; i < len; i++) {
        delete options[i].selected;
      }
      options[index].selected = true;

      if (action){
        scriptingAPI.makeFunctionInScriptContext(action)();
      } else if (component.options[index].loadModel){
        model.stop();
        interactivesController.loadModel(component.options[index].loadModel);
      }
    });

    // Public API.
    controller = {
      // No modelLoadeCallback is defined. In case of need:
      // modelLoadedCallback: function () {
      //   (...)
      // },

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
