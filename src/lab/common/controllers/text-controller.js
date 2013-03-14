/*global define */

define(function (require) {

  var markdown             = require('markdown'),
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
