/*global define: false */

define(function(require) {

  var LabModelerMixin         = require('common/lab-modeler-mixin'),
      validator               = require('common/validator'),
      metadata                = require('models/signal-generator/metadata'),

      unitsDefinition = {
        units: {
          time: {
            name: "second",
            pluralName: "seconds",
            symbol: "s"
          },
          frequency: {
            name: "Hertz",
            pluralName: "Hertz",
            symbol: "Hz"
          },
          angle: {
            name: "radian",
            pluralName: "radians",
            symbol: "rad"
          }
        }
      };

  return function Model(initialProperties) {
    var customSetters = {
          // Ensure that phase + (time * angular frequency) remains unchanged when the frequency changes.
          // This makes for continuous signals.
          frequency: function (newFrequency) {
            if (lastFrequency !== undefined) {
              phase = constrain(phase + 2 * Math.PI * (lastFrequency - newFrequency) * model.properties.time);
            }
            lastFrequency = newFrequency;
          }
        },

        labModelerMixin = new LabModelerMixin({
          metadata: metadata,
          setters: customSetters,
          unitsDefinition: unitsDefinition,
          initialProperties: initialProperties
        }),
        dispatch = labModelerMixin.dispatchSupport,

        lastFrequency,
        phase = 0,
        time = 0,
        stepCounter = 0,
        model;

    function constrain(angle) {
      return angle - 2 * Math.PI * Math.floor(angle / (2 * Math.PI));
    }

    model = {

      tick: function () {
        var intervalLength = 1000 / model.properties.modelSampleRate;

        stepCounter++;
        time += (0.001 * intervalLength * model.properties.timeScale);

        model.updateAllOutputProperties();

        dispatch.tick();
      },

      stepCounter: function() {
        return stepCounter;
      },

      reset: function() {
        dispatch.reset();
        // TODO
      }

    };

    labModelerMixin.mixInto(model);
    dispatch.addEventTypes("tick");
    dispatch.addEventTypes('reset');

    model.defineOutput('time', {
      label: "Time",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return time;
    });

    model.defineOutput('displayTime', {
      label: "Time",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return time;
    });

    model.defineOutput('signalValue', {
      label: "Signal Value",
      format: '.2f'
    }, function() {
      return Math.cos(model.properties.angle);
    });

    model.defineOutput('angle', {
      label: "Angle",
      unitType: 'angle',
      format: '.2f'
    }, function() {
      var angle = phase + 2 * Math.PI * model.properties.frequency * model.properties.time;
      return constrain(angle);
    });

    return model;
  };
});
