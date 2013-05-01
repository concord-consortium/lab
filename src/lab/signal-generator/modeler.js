/*global define: false d3: false*/

define(function(require) {

  var PropertySupport      = require('common/property-support'),
      PropertyDescription  = require('md2d/models/property-description'),
      RunningAverageFilter = require('cs!md2d/models/running-average-filter'),

      unitsDefinition = {
        units: {
          time: {
            name: "second",
            pluralName: "seconds",
            symbol: "s",
            displayValue: {
              unitsPerBaseUnit: 1e-3,
              pluralName: "picoseconds",
              name: "picosecond",
              symbol: "ps"
            }
          }
        }
      };

  return function Model(initialProperties) {
    var propertySupport = new PropertySupport({
          types: ['parameter', 'output']
        }),

        isStopped = true,
        dispatch = d3.dispatch('play', 'stop', 'tick', 'reset', 'stepForward', 'stepBack', 'seek', 'invalidation'),
        interval,
        intervalLength = 16, // ms
        time = 0,
        stepCounter = 0,
        invalidatingChangeNestingLevel = 0,
        filteredOutputs = [],
        model;

    function invalidatingChangePreHook() {
      invalidatingChangeNestingLevel++;
      if (invalidatingChangeNestingLevel === 1) {
        propertySupport.storeComputedProperties();
        propertySupport.deleteComputedPropertyCachedValues();
        propertySupport.enableCaching = false;
      }
    }

    function invalidatingChangePostHook() {
      invalidatingChangeNestingLevel--;
      if (invalidatingChangeNestingLevel === 0) {
        propertySupport.enableCaching = true;
        propertySupport.notifyChangedComputedProperties();
        updateFilteredOutputs();
      }
    }

    function makeInvalidatingChange(closure) {
      invalidatingChangePreHook();
      closure();
      invalidatingChangePostHook();
    }

    function updateFilteredOutputs() {
      filteredOutputs.forEach(function(output) {
        output.addSample();
      });
    }

    function tick() {
      stepCounter++;
      time += (0.001 * intervalLength * model.properties.timeScale);

      propertySupport.deleteComputedPropertyCachedValues();
      propertySupport.notifyAllComputedProperties();
      updateFilteredOutputs();

      dispatch.tick();
    }

    model = {
      resetTime: function() {
        makeInvalidatingChange(function() {
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

      is_stopped: function() {
        return isStopped;
      },

      stepCounter: function() {
        return stepCounter;
      },

      //
      // The following are essentially copied from MD2D modeler, and should moved to a common module
      //

      addPropertiesListener: function(properties, callback) {
        if (typeof properties === 'string') {
          model.addObserver(properties, callback);
        } else {
          properties.forEach(function(property) {
            model.addObserver(property, callback);
          });
        }
      },

      defineParameter: function(key, descriptionHash, setter) {
        var descriptor = {
              type: 'parameter',
              includeInHistoryState: true,
              invokeSetterAfterBulkRestore: false,
              description: new PropertyDescription(unitsDefinition, descriptionHash),
              beforeSetCallback: invalidatingChangePreHook,
              afterSetCallback: invalidatingChangePostHook
            };

        // In practice, some parameters are meant only to be observed, and have no setter
        if (setter) {
          descriptor.set = function(value) {
            setter.call(model, value);
          };
        }
        propertySupport.defineProperty(key, descriptor);
      },

      defineOutput: function(key, descriptionHash, getter) {
        propertySupport.defineProperty(key, {
          type: 'output',
          writable: false,
          get: getter,
          includeInHistoryState: false,
          description: new PropertyDescription(unitsDefinition, descriptionHash)
        });
      },

      defineFilteredOutput: function(key, description, filteredPropertyKey, type, period) {
        var filter, initialValue;

        if (type === "RunningAverage") {
          filter = new RunningAverageFilter(period);
        } else {
          throw new Error("FilteredOutput: unknown filter type " + type + ".");
        }

        // Add initial sample
        initialValue = model.properties[key];
        if (initialValue === undefined || isNaN(Number(initialValue))) {
          throw new Error("FilteredOutput: property is not a valid numeric value or it is undefined.");
        }
        filter.addSample(model.properties.time, initialValue);

        filteredOutputs.push({
          addSample: function() {
            filter.addSample(model.properties.time, model.properties[filteredPropertyKey]);
          }
        });

        // Extend description to contain information about filter
        description.property = filteredPropertyKey;
        description.type = type;
        description.period = period;

        model.defineOutput(key, description, function () {
          return filter.calculate();
        });
      }
    };

    propertySupport.mixInto(model);

    propertySupport.defineProperty('controlButtons');
    propertySupport.defineProperty('showClock');

    // Settable, but have no dependencies
    propertySupport.defineProperty('frequency');
    propertySupport.defineProperty('timeScale');

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
      return Math.cos(2 * Math.PI * model.properties.frequency * model.properties.time);
    });

    propertySupport.setRawValues({
      controlButtons: initialProperties.viewOptions.controlButtons,
      showClock: initialProperties.viewOptions.showClock,
      timeScale: 1,
      frequency: 1
    });

    return model;
  };
});
