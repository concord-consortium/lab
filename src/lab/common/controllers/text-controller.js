/*global define */

define(function (require) {

  var markdownToHTML       = require('common/markdown-to-html'),
      inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component');

  /**
   * Text controller.
   * It supports markdown (syntax: http://daringfireball.net/projects/markdown/syntax).
   *
   * @constructor
   * @extends InteractiveComponent
   * @param {Object} component Component JSON definition.
   * @param {ScriptingAPI} scriptingAPI
   * @param {InteracitveController} interacitveController
   */
  function TextController(component, interactivesController) {
    // Call super constructor.
    InteractiveComponent.call(this, "text", component, interactivesController);
    // Setup custom class.
    this.$element.addClass("interactive-text");
    // Use markdown to parse the 'text' content.
    this.$element.append(markdownToHTML(this.component.text));
  }
  inherit(TextController, InteractiveComponent);

  TextController.prototype.modelLoadedCallback = function () {
    TextController.superClass._modelLoadedCallback.call(this);
  };

  return TextController;
});
