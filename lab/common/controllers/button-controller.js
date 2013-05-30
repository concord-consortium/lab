/*global define $ */

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function ButtonController(component, scriptingAPI, interactivesController) {
    var $button,
        controller;

    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.button, component);

    $button = $('<button>')
        .attr('tabindex', interactivesController.getNextTabIndex())
        .attr('id', component.id).html(component.text);
    // Each interactive component has to have class "component".
    $button.addClass("component");

    // Custom dimensions.
    $button.css({
      width: component.width,
      height: component.height
    });

    $button.click(scriptingAPI.makeFunctionInScriptContext(component.action));

    // Public API.
    controller = {
      // No modelLoadeCallback is defined. In case of need:
      // modelLoadedCallback: function () {
      //   (...)
      // },

      // Returns view container.
      getViewContainer: function () {
        return $button;
      },

      // Returns serialized component definition.
      serialize: function () {
        // Return the initial component definition.
        // Button doesn't have any state, which can be changed.
        return $.extend(true, {}, component);
      }
    };
    // Return Public API object.
    return controller;
  };
});
