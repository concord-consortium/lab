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
   */
  function InteractiveComponent(type, component) {
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
