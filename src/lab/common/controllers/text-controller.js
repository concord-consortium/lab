/*global define, $ */

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function TextController(component, scriptingAPI) {
        // Public API.
    var controller,
        // The most outer DIV containing whole component.
        $element,
        // <p> element with text content.
        $text,
        // Custom "onClick" script.
        onClickFunction;

    function initialize() {
      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.text, component);
      $element = $("<div>").attr("id", component.id);
      // Append class to the most outer container.
      $element.addClass("interactive-text");
      // Each interactive component has to have class "component".
      $element.addClass("component");
      // Append text content.
      $text = $("<p>").text(component.text).appendTo($element);
      // Add class defining style of the component ("basic" and "header" values supported,
      // please see: sass/lab/_interactice-components.sass).
      $text.addClass(component.style);
      // Process optional onClick script.
      if (component.onClick) {
        onClickFunction = scriptingAPI.makeFunctionInScriptContext(component.onClick);
        $text.on("click", onClickFunction);
        // Also add a special class indicating that this text node is a clickable.
        $text.addClass("clickable");
      }
      // Apply custom width and height.
      $element.css({
        width: component.width,
        height: component.height
      });
    }

    // Public API.
    controller = {
      // modelLoadedCallback is optional and unnecessary for this component.
      // modelLoadedCallback: function () {
      // },

      getViewContainer: function () {
        return $element;
      },

      // Returns serialized component definition.
      serialize: function () {
        return $.extend(true, {}, component);
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});
