/*global define: false, d3: false*/

define(function(require) {

  var LabModelerMixin         = require('common/lab-modeler-mixin'),
      validator               = require('common/validator'),
      metadata                = require('signal-generator/metadata'),

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
          unitsDefinition: unitsDefinition
        }),
        propertySupport = labModelerMixin.propertySupport,

        viewOptions,
        mainProperties,
        isStopped = true,
        dispatch = d3.dispatch('play', 'stop', 'tick', 'reset', 'stepForward', 'stepBack', 'seek', 'invalidation'),
        interval,
        intervalLength = 16, // ms
        lastFrequency,
        phase = 0,
        time = 0,
        stepCounter = 0,
        model;

    function tick() {
      stepCounter++;
      time += (0.001 * intervalLength * model.properties.timeScale);

      model.updateAllOutputProperties();

      dispatch.tick();
    }

    function constrain(angle) {
      return angle - 2 * Math.PI * Math.floor(angle / (2 * Math.PI));
    }

    model = {
      resetTime: function() {
        model.makeInvalidatingChange(function() {
          time = 0;
        });
      },

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      start: function() {
        isStopped = false;
        interval = setInterval(tick, intervalLength);
        dispatch.play();
      },

      stop: function() {
        isStopped = true;
        clearInterval(interval);
        dispatch.stop();
      },

      isStopped: function() {
        return isStopped;
      },

      stepCounter: function() {
        return stepCounter;
      }
    };

    labModelerMixin.mixInto(model);

    mainProperties = validator.validateCompleteness(metadata.mainProperties, initialProperties);
    propertySupport.setRawValues(mainProperties);

    viewOptions = validator.validateCompleteness(metadata.viewOptions, initialProperties.viewOptions || {});
    propertySupport.setRawValues(viewOptions);

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
