/*global define, $ */

define(function () {
  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component');

  function ButtonController(component, scriptingAPI, interactivesController) {
    this.scriptingAPI = scriptingAPI;
    // Call super constructor.
    InteractiveComponent.call(this, "button", component, scriptingAPI, interactivesController);
    this.$element.addClass("interactive-button");
    this.button = $('<button>')
        .html(component.text)
        .on("click", scriptingAPI.makeFunctionInScriptContext(component.action))
        .appendTo(this.$element);
  }

  inherit(ButtonController, InteractiveComponent);

  ButtonController.prototype.setAction = function (newAction) {
    this.component.action = newAction;
    if (typeof this.component.action !== "function") {
      // Create function from the string or array of strings.
      this.button.on("click", this.scriptingAPI.makeFunctionInScriptContext(this.component.action));
    } else {
      this.button.on("click", this.component.action);
    }
  };

  return ButtonController;
});
