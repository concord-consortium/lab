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
   */
  function DivController(component, scriptingAPI) {

    // Call super constructor.
    InteractiveComponent.call(this, "div", component);

  }
  inherit(DivController, InteractiveComponent);

  return DivController;
});
