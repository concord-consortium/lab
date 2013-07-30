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
  function TextController(component, scriptingAPI, interacitveController) {
    // Call super constructor.
    InteractiveComponent.call(this, "text", component, scriptingAPI, interacitveController);
    // Setup custom class.
    this.$element.addClass("interactive-text");
    // Ensure that common typography for markdown-generated content is used.
    this.$element.addClass("markdown-typography");
    // Use markdown to parse the 'text' content.
    this.$element.append(markdownToHTML(this.component.text));
  }
  inherit(TextController, InteractiveComponent);

  return TextController;
});
