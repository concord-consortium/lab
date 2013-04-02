/*global define, $, model */

define(function (require) {

  var Thermometer  = require('cs!common/components/thermometer'),
      mustache     = require('mustache'),
      thermoterTpl = require('text!common/controllers/thermometer.tpl'),
      metadata     = require('common/controllers/interactive-metadata'),
      validator    = require('common/validator');
      require('common/jquery-plugins');

  /**
    An 'interactive thermometer' object, that wraps a base Thermometer with a label for use
    in Interactives.

    Properties are:

     modelLoadedCallback:  Standard interactive component callback, called as soon as the model is loaded.
     getViewContainer:     DOM element containing the Thermometer div and the label div.
     getView:              Returns base Thermometer object, with no label.
  */
  return function ThermometerController(component, scriptingAPI, interactivesController) {
    var units,
        offset,
        scale,
        digits,

        labelIsReading,
        fitWidth,
        $thermometer, $bottomLabel, $elem, $labelsContainer,

        thermometerComponent,
        controller,

        updateLabel = function (temperature) {
          temperature = scale * temperature + offset;
          $bottomLabel.text(temperature.toFixed(digits) + " " + units);
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
    function initialize() {
      var reading, labelText, maxLength, longestLabelIdx, view,
          labels, max, min, i, len;

      component = validator.validateCompleteness(metadata.thermometer, component);
      reading = component.reading;
      units = reading.units;
      offset = reading.offset;
      scale  = reading.scale;
      digits = reading.digits;

      labelIsReading = component.labelIsReading;
      labelText = labelIsReading ? "" : "Thermometer";

      // Calculate view.
      view = {
        id: component.id,
        labelText: labelIsReading ? "" : "Thermometer"
      };
      // Calculate tick labels positions.
      labels = component.labels;
      min = component.min;
      max = component.max;
      maxLength = -Infinity;
      view.labels = [];
      for (i = 0, len = labels.length; i < len; i++) {
        view.labels.push({
          label: labels[i].label,
          position: (labels[i].value * scale + offset - min) / (max - min) * 100
        });
        if (labels[i].label.length > maxLength) {
          maxLength = labels[i].label.length;
          longestLabelIdx = i;
        }
      }
      // Render view.
      $elem = $(mustache.render(thermoterTpl, view));
      // Save useful references.
      $thermometer = $elem.find(".thermometer");
      $bottomLabel = $elem.find(".label");
      $labelsContainer = $elem.find(".labels-container");


      maxLength = $elem.measure(function() {
        return this.width() / parseFloat(this.css("font-size"));
      }, ".value-label:eq(" + longestLabelIdx + ")", interactivesController.interactiveContainer);

      $labelsContainer.css("width", maxLength + "em");

      // Support custom dimensions. Implementation may seem unclear,
      // but the goal is to provide most obvious behavior for authors.
      // We can simply set height of the most outer container.
      // Thermometer will adjusts itself appropriately.
      $elem.css("height", component.height);
      // Width is more tricky.
      fitWidth = false;
      if (!/%$/.test(component.width)) {
        // When it's ems or px, its enough to set thermometer width.
        $thermometer.css("width", component.width);
      } else {
        // Whet it's defined in %, set width of the most outer container
        // to that value and thermometer should use all available space
        // (100% or 100% - labels width).
        $elem.css("width", component.width);
        fitWidth = true;
      }

      thermometerComponent = new Thermometer($thermometer, null, min, max);
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
      },

      resize: function () {
        var thermometerHeight = $elem.height() - $bottomLabel.height();
        $thermometer.height(thermometerHeight);
        $labelsContainer.height(thermometerHeight);

        if (fitWidth) {
          // When user set width in % what means that the most outer container
          // width is adjusted and thermometer tries to use maximum available
          // space.
          $thermometer.width($elem.width() - $labelsContainer.width());
        }
      },

      // Returns serialized component definition.
      serialize: function () {
        // Return the initial component definition.
        // Displayed value is always defined by the model,
        // so it shouldn't be serialized.
        return component;
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});
