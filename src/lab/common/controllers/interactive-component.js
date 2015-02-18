/*global define, $ */

define(function (require) {

  var metadata        = require('common/controllers/interactive-metadata'),
      validator       = require('common/validator'),
      disablable      = require('common/controllers/disablable'),
      helpIconSupport = require('common/controllers/help-icon-support');

  /**
   * Basic class for all interactive components.
   *
   * @constructor
   * @param {string} type Component type, should match definition in interactive metadata.
   * @param {Object} component Component JSON definition.
   * @param {ScriptingAPI} scriptingAPI
   * @param {InteractivesController} interactivesController
   */
  function InteractiveComponent(type, component, interactivesController) {
    this._interactivesController = interactivesController;
    this._scriptingAPI = this._interactivesController.getScriptingAPI();
    this._model = this._interactivesController.getModel();

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

    if (this.component.disabled) {
      this.setDisabled(this.component.disabled);
    }

    this._optionallyAddOnClickHandlers();

    // optionally add new css classes
    if (this.component.classes && this.component.classes.length) {
      this.$element.addClass(this.component.classes.join(" "));
    }

    // optionally add tooltip
    if (this.component.tooltip) {
      this.$element.attr("title", this.component.tooltip);
    }

    // optionally add help icon
    helpIconSupport(this, this.component, this._interactivesController.helpSystem);
  }

  /**
   * Called when the Interactive Controller reloads the model ... creating a new model and scriptingAPI
   */
  InteractiveComponent.prototype._modelLoadedCallback = function () {
    this._scriptingAPI = this._interactivesController.getScriptingAPI();
    this._model = this._interactivesController.getModel();
    this._optionallyAddOnClickHandlers();
  };

  InteractiveComponent.prototype._updateClickHandler = function (script) {
    // always discard attached click handler
    this.$element.off("click."+this._nameSpace);
    // Create a new handler function from action or onClick in string form
    if (typeof script !== "function") {
      this._actionClickFunction = this._scriptingAPI.makeFunctionInScriptContext(script);
    } else {
      this._actionClickFunction = script;
    }
    var that = this;
    this.$element.on("click."+this._nameSpace, this._clickTargetSelector || null, function() {
      that._actionClickFunction();
    });
    // Also add a special class indicating that this text node is a clickable.
    this.$element.addClass("clickable");
  };

  InteractiveComponent.prototype._optionallyAddOnClickHandlers = function () {
    // Optionally add onClick or action handlers defined with strings in
    // onClick or action property of component.
    if (this.component.onClick !== undefined) {
      this._updateClickHandler(this.component.onClick);
    }
    if (this.component.action !== undefined) {
      this._updateClickHandler(this.component.action);
    }
  };

  InteractiveComponent.prototype.setAction = function (newAction) {
    // If we are passed a string or array of strings as the new action
    // save them in the action property of the component.
    if (typeof script !== "function") {
      this.component.action = newAction;
    }
    this._updateClickHandler(newAction);
  };

  InteractiveComponent.prototype.setOnClick = function (newOnClick) {
    if (this.component.onClick !== undefined) {
      this.component.onClick = newOnClick;
      this._updateClickHandler(this.component.onClick);
    }
  };

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

  // It will add .setDisabled() method to the prototype.
  disablable(InteractiveComponent.prototype);

  return InteractiveComponent;
});
