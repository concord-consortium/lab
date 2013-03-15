/*global define, $ */

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
    var text, $element;
    // Call super constructor.
    InteractiveComponent.call(this, "text", component, scriptingAPI);
    // Setup custom class.
    this.$element.addClass("interactive-text");
    // Ensure that common typography for markdown-generated content is used.
    this.$element.addClass("markdown-typography");
    // Use markdown to parse the 'text' content.
    text = $.isArray(this.component.text) ? this.component.text : [this.component.text];
    $element = this.$element;
    $.each(text, function (idx, val) {
      $element.append(markdown.toHTML(val));
    });
  }
  inherit(TextController, InteractiveComponent);

  return TextController;
});
