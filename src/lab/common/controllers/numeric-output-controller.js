/*global define, $ */

import $__common_controllers_interactive_metadata from 'common/controllers/interactive-metadata';
import $__common_validator from 'common/validator';
import $__common_controllers_help_icon_support from 'common/controllers/help-icon-support';
import $__common_views_numeric_output_view from 'common/views/numeric-output-view';

var metadata = $__common_controllers_interactive_metadata,
  validator = $__common_validator,
  helpIconSupport = $__common_controllers_help_icon_support,
  NumericOutputView = $__common_views_numeric_output_view;

export default function NumericOutputController(component, interactivesController) {
  var propertyName,
    label,
    units,
    displayValue,
    view,
    $element,
    propertyDescription,
    controller,
    model,
    scriptingAPI;

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
  model = interactivesController.getModel();
  scriptingAPI = interactivesController.getScriptingAPI();

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
    modelLoadedCallback: function() {
      if (model) {
        model.removeObserver(propertyName, renderValue);
      }
      model = interactivesController.getModel();
      scriptingAPI = interactivesController.getScriptingAPI();
      if (propertyName) {
        propertyDescription = model.getPropertyDescription(propertyName);
        if (propertyDescription) {
          if (!label) {
            view.updateLabel(propertyDescription.getLabel());
          }
          if (!units) {
            view.updateUnits(propertyDescription.getUnitAbbreviation());
          }
        }
        renderValue();
        model.addObserver(propertyName, renderValue);
      }
    },

    // Returns view container. Label tag, as it contains checkbox anyway.
    getViewContainer: function() {
      return $element;
    },

    resize: function() {
      view.resize();
      renderValue();
    },

    // Returns serialized component definition.
    serialize: function() {
      // Return the initial component definition.
      // Numeric output component doesn't have any state, which can be changed.
      // It's value is defined by underlying model.
      return $.extend(true, {}, component);
    }
  };

  // Support optional help icon.
  helpIconSupport(controller, component, interactivesController.helpSystem);

  // Return Public API object.
  return controller;
};
