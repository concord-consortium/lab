/*global define: false */

define(function(require) {

  var LabModelerMixin         = require('common/lab-modeler-mixin'),
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
        times = [],
        stepCounter = 0,
        timesIndex = -1,
        model;

    function constrain(angle) {
      return angle - 2 * Math.PI * Math.floor(angle / (2 * Math.PI));
    }

    function angle(time) {
      return constrain(phase + 2 * Math.PI * model.properties.frequency * time);
    }

    function getIndexWithDefault(array, index, defaultValue) {
      return index < 0 ? defaultValue : array[index];
    }

    model = {

      tick: function () {
        var intervalLength = 1000 / model.properties.modelSampleRate;
        var lastTime = getIndexWithDefault(times, times.length - 1, 0);

        times.push(lastTime + 0.001 * intervalLength * model.properties.timeScale);

        stepCounter++;

        if (stepCounter % model.properties.sampleBatchLength === 0) {
          while (timesIndex < times.length - 1) {
            timesIndex++;
            model.updateAllOutputProperties();
            dispatch.tick();
          }
        }
      },

      stepCounter: function() {
        return stepCounter;
      },

      reset: function() {
        dispatch.reset();
        // TODO
      }

    };

    dispatch.addEventTypes("tick");
    dispatch.addEventTypes('reset');

    labModelerMixin.mixInto(model);

    model.on('play.model', model.makeInvalidatingChange);
    model.on('stop.model', model.makeInvalidatingChange);

    model.defineOutput('isPlayable', {
      label: "Playable"
    }, function() {
      return model.isReady && model.isStopped();
    });

    model.defineOutput('hasPlayed', {
      label: "has Played"
    }, function() {
      return model.hasPlayed;
    });

    model.defineOutput('timePerTick', {
      label: "Model time per tick",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return 1 / model.properties.modelSampleRate * model.properties.timeScale;
    });

    model.defineOutput('time', {
      label: "Time",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return getIndexWithDefault(times, timesIndex, 0);
    });

    model.defineOutput('displayTime', {
      label: "Time",
      unitType: 'time',
      format: '.2f'
    }, function() {
      return getIndexWithDefault(times, timesIndex, 0);
    });

    model.defineOutput('signalValue', {
      label: "Signal Value",
      format: '.2f'
    }, function() {
      var time = getIndexWithDefault(times, timesIndex, 0);
      return Math.cos(angle(time));
    });

    model.defineOutput('angle', {
      label: "Angle",
      unitType: 'angle',
      format: '.2f'
    }, function() {
      var time = getIndexWithDefault(times, timesIndex, 0);
      return angle(time);
    });

    return model;
  };
});
