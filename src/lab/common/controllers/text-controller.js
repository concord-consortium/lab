/*global define */

import $__common_markdown_to_html from 'common/markdown-to-html';
import $__common_inherit from 'common/inherit';
import $__common_controllers_interactive_component from 'common/controllers/interactive-component';

var markdownToHTML = $__common_markdown_to_html,
  inherit = $__common_inherit,
  InteractiveComponent = $__common_controllers_interactive_component;

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

TextController.prototype.modelLoadedCallback = function() {
  TextController.superClass._modelLoadedCallback.call(this);
};

export default TextController;
