/*global define $ model */

define(function (require) {

  var Thermometer = require('cs!common/components/thermometer');

  /**
    An 'interactive thermometer' object, that wraps a base Thermometer with a label for use
    in Interactives.

    Properties are:

     modelLoadedCallback:  Standard interactive component callback, called as soon as the model is loaded.
     getViewContainer:     DOM element containing the Thermometer div and the label div.
     getView:              Returns base Thermometer object, with no label.
  */
  return function ThermometerController(component) {
    var $thermometer = $('<div>').attr('id', component.id),

        reading = component.reading,
        units = "K",
        offset = 0,
        scale = 1,
        digits = 0,

        labelIsReading = !!component.labelIsReading,
        labelText = labelIsReading ? "" : "Thermometer",
        $label = $('<p class="label">').text(labelText).width('6em'),
        $elem = $('<div class="interactive-thermometer">')
                .append($thermometer)
                .append($label),

        thermometerComponent = new Thermometer($thermometer, null, component.min, component.max),
        controller,

        updateLabel = function (temperature) {
          temperature = scale * temperature + offset;
          $label.text(temperature.toFixed(digits) + " " + units);
        },

        // Updates thermometer using model property. Used in modelLoadedCallback.
        // Make sure that this function is only called when model is loaded.
        updateThermometer = function () {
          var t = model.get('targetTemperature');
          thermometerComponent.add_value(t);
          if (labelIsReading) updateLabel(t);
        };

    //
    // Initialization.
    //
    if (reading) {
      if (reading.units  !== undefined) units  = reading.units;
      if (reading.offset !== undefined) offset = reading.offset;
      if (reading.scale  !== undefined) scale  = reading.scale;
      if (reading.digits !== undefined) digits = reading.digits;
    }

    // Public API.
    controller = {
      // No modelLoadeCallback is defined. In case of need:
      modelLoadedCallback: function () {
        // TODO: update to observe actual system temperature once output properties are observable
        model.addPropertiesListener('targetTemperature', function() {
          updateThermometer();
        });
        thermometerComponent.resize();
        updateThermometer();
      },

      // Returns view container.
      getViewContainer: function () {
        return $elem;
      },

      getView: function () {
        return thermometerComponent;
      }
    };
    // Return Public API object.
    return controller;
  };
});
