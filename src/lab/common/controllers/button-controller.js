/*global define, $ */

define(function () {
  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component'),

      buttonControllerCount = 0;

  function ButtonController(component, interactivesController) {
    this._actionClickFunction = function () { };
    this._nameSpace = "button" + (++buttonControllerCount);
    this._clickTargetSelector = 'button';
    // Call super constructor.
    InteractiveComponent.call(this, "button", component, interactivesController);
    this.$element.addClass("interactive-button");
    this.button = $('<button>')
        .html(component.text)
        .appendTo(this.$element);
    this.setAttributes = function(attrs) {
      // only support text changes right now
      if (attrs.text && typeof(attrs.text) !== "undefined") {
        this.button.html(attrs.text);
      }
    };
  }

  inherit(ButtonController, InteractiveComponent);

  ButtonController.prototype.modelLoadedCallback = function () {
    ButtonController.superClass._modelLoadedCallback.call(this);
  };

  ButtonController.prototype.enableLogging = function (logFunc) {
    var comp = this.component;
    this.$element.off("click." + this._nameSpace + "logging");
    this.$element.on("click." + this._nameSpace + "logging", this._clickTargetSelector, function () {
      logFunc('ButtonClicked', {id: comp.id, label: comp.text});
    });
  };

  return ButtonController;
});
