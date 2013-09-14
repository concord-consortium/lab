/*global define, $ */

define(function () {
  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component'),

      buttonControllerCount = 0;

  function ButtonController(component, interactivesController) {
    this._actionClickFunction = function () { };
    this._nameSpace = "button" + (++buttonControllerCount);
    // Call super constructor.
    InteractiveComponent.call(this, "button", component, interactivesController);
    this.$element.addClass("interactive-button");
    this.button = $('<button>')
        .html(component.text)
        .appendTo(this.$element);
  }

  inherit(ButtonController, InteractiveComponent);

  ButtonController.prototype.modelLoadedCallback = function () {
    ButtonController.superClass._modelLoadedCallback.call(this);
  };

  return ButtonController;
});
