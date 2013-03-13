/*global define, $ */

define(function (require) {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  /**
   * Basic class for all interactive components.
   *
   * @constructor
   * @param {string} type Component type, should match definition in interactive metadata.
   * @param {Object} component Component JSON definition.
   * @param {ScriptingAPI} scriptingAPI
   */
  function InteractiveComponent(type, component, scriptingAPI) {
    var onClickFunction;

    /**
     * Validated component definition.
     * @type {Object}
     */
    this.component = validator.validateCompleteness(metadata[type], component);
    /**
     * The most outer element. Subclasses should append content to this element.
     * @type {jQuery}
     */
    this.$element = $('<div>').attr("id", component.id).addClass("component");

    // Optionally setup dimensions of the most outer component.
    // Only when metadata and component JSON specifies width and height
    // properties.
    if (this.component.width) {
      this.$element.css("width", this.component.width);
    }
    if (this.component.height) {
      this.$element.css("height", this.component.height);
    }

    // optionally add onClick handler. If components such as buttons and sliders
    // start inheriting from InteractiveComponent, we should think further on this.
    if (this.component.onClick) {
      if (typeof this.component.onClick !== "function") {
        // Create function from the string or array of strings.
        onClickFunction = scriptingAPI.makeFunctionInScriptContext(this.component.onClick);
      } else {
        // Just assign ready function.
        onClickFunction = this.component.onClick;
      }
      this.$element.on("click", onClickFunction);
      // Also add a special class indicating that this text node is a clickable.
      this.$element.addClass("clickable");
    }

    // optionally add new css classes
    if (this.component.classes && this.component.classes.length) {
      this.$element.addClass(this.component.classes.join(" "))
    }

    // optionally add tooltip as title text
    if (this.component.tooltip) {
      this.$element.attr("title", this.component.tooltip)
    }
  }

  /**
   * @return {jQuery} The most outer element.
   */
  InteractiveComponent.prototype.getViewContainer = function() {
    return this.$element;
  };

  /**
   * @return {Object} Serialized component definition.
   */
  InteractiveComponent.prototype.serialize = function() {
    return this.component;
  };

  return InteractiveComponent;
});
