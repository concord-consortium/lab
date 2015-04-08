/*global define */

define(function (require) {

  var inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component');

  /**
   * Simplest component controller which just inherits from InteractiveComponent, simply
   * creating a div element. Component can have dimensions, css classes and on onClick
   * function.
   * @param {Object} component Component JSON definition.
   * @param {ScriptingAPI} scriptingAPI
   * @param {InteractiveController} controller
   */
  function DivController(component, scriptingAPI, controller) {
    // Call super constructor.
    InteractiveComponent.call(this, "div", component, scriptingAPI, controller);
    var content = component.content;
    if (content && content.join) {
      content = content.join("\n");
    }
    this.$element.append(content);
  }
  inherit(DivController, InteractiveComponent);

  return DivController;
});
