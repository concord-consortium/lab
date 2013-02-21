/*global define $ model */

define(function () {

  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator');

  return function NumericOutputController(component, scriptingAPI) {
    var propertyName,
        label,
        units,
        displayValue,
        $numericOutput,
        $label,
        $number,
        $units,
        propertyDescription,
        controller,

        renderValue = function () {
          var value = model.get(propertyName);
          if (displayValue) {
            $number.text(displayValue(value));
          } else {
            $number.text(value);
          }
        };

    //
    // Initialization.
    //
    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.numericOutput, component);
    propertyName = component.property;
    label = component.label;
    units = component.units;
    displayValue = component.displayValue;

    // Setup view.
    $label  = $('<span class="label"></span>');
    $number = $('<span class="value"></span>');
    $units  = $('<span class="units"></span>');
    if (label) { $label.html(label); }
    if (units) { $units.html(units); }
    $numericOutput = $('<div class="numeric-output">').attr('id', component.id)
        .append($label)
        .append($number)
        .append($units);

    // Each interactive component has to have class "component".
    $numericOutput.addClass("component");

    if (displayValue) {
      displayValue = scriptingAPI.makeFunctionInScriptContext('value', displayValue);
    }

    // Public API.
    controller = {
      // This callback should be trigger when model is loaded.
      modelLoadedCallback: function () {
        if (propertyName) {
          propertyDescription = model.getPropertyDescription(propertyName);
          if (propertyDescription) {
            if (!label) { $label.html(propertyDescription.label); }
            if (!units) { $units.html(propertyDescription.units); }
          }
          renderValue();
          model.addPropertiesListener([propertyName], renderValue);
        }
      },

      // Returns view container. Label tag, as it contains checkbox anyway.
      getViewContainer: function () {
        return $numericOutput;
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
