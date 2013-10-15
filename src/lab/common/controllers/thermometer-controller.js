/*global define, $ */

define(function (require) {

  var mustache       = require('mustache'),
      thermometerTpl = require('text!common/controllers/thermometer.tpl'),
      metadata       = require('common/controllers/interactive-metadata'),
      validator      = require('common/validator');
      require('common/jquery-plugins');

  /**
    An 'interactive thermometer' object, that wraps a base Thermometer with a label for use
    in Interactives.

    Properties are:

     modelLoadedCallback:  Standard interactive component callback, called as soon as the model is loaded.
     getViewContainer:     DOM element containing the Thermometer div and the label div.
     getView:              Returns base Thermometer object, with no label.
  */
  return function ThermometerController(component, interactivesController) {
    var units,
        digits,
        // Returns scaled value using provided 'scale' and 'offset' component properties.
        scaleFunc,
        // Returns value between 0% and 100% using provided 'min' and 'max' component properties.
        normalize,

        labelIsReading,
        fitWidth,
        $elem,
        $thermometer,
        $thermometerFill,
        $bottomLabel,
        $labelsContainer,

        controller,
        model,

        updateLabel = function (temperature) {
          temperature = scaleFunc(temperature);
          $bottomLabel.text(temperature.toFixed(digits) + " " + units);
        },

        // Updates thermometer using model property. Used in modelLoadedCallback.
        // Make sure that this function is only called when model is loaded.
        updateThermometer = function () {
          var t = model.get('targetTemperature');
          $thermometerFill.css("height", normalize(scaleFunc(t)));
          if (labelIsReading) updateLabel(t);
        };

    //
    // Initialization.
    //
    function initialize() {
      var reading, offset, scale,
          view, labelText, labels,
          longestLabelIdx, maxLength,
          max, min, i, len;

      model = interactivesController.getModel();

      component = validator.validateCompleteness(metadata.thermometer, component);
      reading = component.reading;
      units = reading.units;
      offset = reading.offset;
      scale  = reading.scale;
      digits = reading.digits;
      min = component.min;
      max = component.max;

      scaleFunc = function (val) {
        return scale * val + offset;
      };

      normalize = function (val) {
        return ((val - min) / (max - min) * 100) + "%";
      };

      labelIsReading = component.labelIsReading;
      labelText = labelIsReading ? "" : "Thermometer";

      // Calculate view.
      view = {
        id: component.id,
        labelText: labelIsReading ? "" : "Thermometer"
      };
      // Calculate tick labels positions.
      labels = component.labels;
      maxLength = -Infinity;
      view.labels = [];
      for (i = 0, len = labels.length; i < len; i++) {
        view.labels.push({
          label: labels[i].label,
          position: normalize(scaleFunc(labels[i].value))
        });
        if (labels[i].label.length > maxLength) {
          maxLength = labels[i].label.length;
          longestLabelIdx = i;
        }
      }
      // Render view.
      $elem = $(mustache.render(thermometerTpl, view));
      // Save useful references.
      $thermometer = $elem.find(".thermometer");
      $thermometerFill = $elem.find(".thermometer-fill");
      $bottomLabel = $elem.find(".label");
      $labelsContainer = $elem.find(".labels-container");

      // Calculate size of the "labels container" div.
      // It's used to ensure that wrapping DIV ($elem) has correct width
      // so layout system can work fine. We have to explicitly set its
      // width, as absolutely positioned elements (labels) are excluded
      // from the layout workflow.
      maxLength = $elem.measure(function() {
        // Calculate width of the longest label in ems (!).
        return (this.width() / parseFloat(this.css("font-size"))) + "em";
      }, ".value-label:eq(" + longestLabelIdx + ")", interactivesController.interactiveContainer);
      $labelsContainer.css("width", maxLength);

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
    }

    // Public API.
    controller = {
      // No modelLoadeCallback is defined. In case of need:
      modelLoadedCallback: function () {
        if (model) {
          model.removeObserver('targetTemperature', updateThermometer);
        }
        model = interactivesController.getModel();
        // TODO: update to observe actual system temperature once output properties are observable
        model.addPropertiesListener('targetTemperature', updateThermometer);
        updateThermometer();
      },

      // Returns view container.
      getViewContainer: function () {
        return $elem;
      },

      resize: function () {
        var thermometerHeight = $elem.height() - $bottomLabel.height();
        $thermometer.height(thermometerHeight);
        $labelsContainer.height(thermometerHeight);
        if (fitWidth) {
          // When user sets width in %, it means that the most outer container
          // width is equal to this value and thermometer shape should try to
          // use maximum available space.
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
