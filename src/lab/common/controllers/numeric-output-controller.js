/*global define, $ */

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator'),
      NumericOutputView = require('common/views/numeric-output-view');

  return function NumericOutputController(component, scriptingAPI, interactivesController) {
    var propertyName,
        label,
        units,
        displayValue,
        view,
        $element,
        propertyDescription,
        controller,
        model;

    function renderValue() {
      var value = model.properties[propertyName];

      if (displayValue) {
        value = displayValue(value);
      }
      view.update(value);
    }

    //
    // Initialization.
    //
    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.numericOutput, component);

    propertyName = component.property;
    units = component.units;
    label = component.label;
    displayValue = component.displayValue;

    view = new NumericOutputView({
      id: component.id,
      units: units,
      label: label
    });

    $element = view.render();

    // Each interactive component has to have class "component".
    $element.addClass("component");

    // Add class defining component orientation - "horizontal" or "vertical".
    $element.addClass(component.orientation);

    // Custom dimensions.
    $element.css({
      width: component.width,
      height: component.height
    });

    if (displayValue) {
      displayValue = scriptingAPI.makeFunctionInScriptContext('value', displayValue);
    }

    if (component.tooltip) {
      $element.attr("title", component.tooltip);
    }

    // Public API.
    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        model = interactivesController.getModel();
        if (propertyName) {
          propertyDescription = model.getPropertyDescription(propertyName);
          if (propertyDescription) {
            if (!label) { view.updateLabel(propertyDescription.getLabel()); }
            if (!units) { view.updateUnits(propertyDescription.getUnitAbbreviation()); }
          }
          renderValue();
          model.addObserver(propertyName, renderValue);
        }
      },

      // Returns view container. Label tag, as it contains checkbox anyway.
      getViewContainer: function () {
        return $element;
      },

      // Returns serialized component definition.
      serialize: function () {
        // Return the initial component definition.
        // Numeric output component doesn't have any state, which can be changed.
        // It's value is defined by underlying model.
        return $.extend(true, {}, component);
      }
    };
    // Return Public API object.
    return controller;
  };
});
