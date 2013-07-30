/*global define, $ */

define(function () {
  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component');

  function ButtonController(component, scriptingAPI, interactivesController) {
    // Call super constructor.
    InteractiveComponent.call(this, "button", component, scriptingAPI, interactivesController);
    this.$element.addClass("interactive-button");
    $('<button>')
        .html(component.text)
        .on("click", scriptingAPI.makeFunctionInScriptContext(component.action))
        .appendTo(this.$element);
  }
  inherit(ButtonController, InteractiveComponent);

  return ButtonController;
});
