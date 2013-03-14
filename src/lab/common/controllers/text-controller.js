/*global define */

define(function (require) {

  var markdown             = require('markdown'),
      inherit              = require('common/inherit'),
      InteractiveComponent = require('common/controllers/interactive-component');

  // These lines aren't joke... Markdown library in node.js environment
  // provides a different namespace than in the browser (one level higher).
  // So, in node.js go one level deeper to ensure that we use the same API in
  // both divorcements and automated tests work fine.
  if (markdown.markdown) {
    markdown = markdown.markdown;
  }

  /**
   * Text controller.
   *
   * @constructor
   * @extends InteractiveComponent
   * @param {Object} component Component JSON definition.
   * @param {ScriptingAPI} scriptingAPI
   */
  function TextController(component, scriptingAPI) {
    // Call super constructor.
    InteractiveComponent.call(this, "text", component, scriptingAPI);
    // Setup custom class.
    this.$element.addClass("interactive-text");
    // Use markdown to parse the 'text' content.
    this.$element.append(markdown.toHTML(this.component.text));
  }
  inherit(TextController, InteractiveComponent);

  return TextController;
});
