/*global define: false d3: false*/

define(function(require) {

  var PropertySupport      = require('common/property-support'),
      PropertyDescription  = require('common/property-description'),
      RunningAverageFilter = require('cs!common/running-average-filter'),
      validator            = require('common/validator'),
      metadata             = require('./metadata'),
      unitsDefinition      = require('./units-definition');


  return function Model(initialProperties) {
    var propertySupport = new PropertySupport({
          types: ['mainProperty', 'viewOption', 'parameter', 'output']
        }),

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
        invalidatingChangeNestingLevel = 0,
        filteredOutputs = [],
        customSetters,
        model;

    //
    // The following function is essentially copied from MD2D modeler, and should moved to a common
    // module
    //
    function defineBuiltinProperty(key, type, setter) {
      var metadataForType,
          descriptor,
          propertyChangeInvalidates,
          unitType;

      if (type === 'mainProperty') {
        metadataForType = metadata.mainProperties;
      } else if (type === 'viewOption') {
        metadataForType = metadata.viewOptions;
      } else {
        throw new Error(type + " is not a supported built-in property type");
      }

      propertyChangeInvalidates = validator.propertyChangeInvalidates(metadataForType[key]);

      descriptor = {
        type: type,
        writable: validator.propertyIsWritable(metadataForType[key]),
        set: setter,
        includeInHistoryState: !!metadataForType[key].storeInTickHistory,
        validate: function(value) {
          return validator.validateSingleProperty(metadataForType[key], key, value, false);
        },
        beforeSetCallback: propertyChangeInvalidates ? invalidatingChangePreHook : undefined,
        afterSetCallback: propertyChangeInvalidates ? invalidatingChangePostHook : undefined
      };

      unitType = metadataForType[key].unitType;
      if (unitType) {
        descriptor.description = new PropertyDescription(unitsDefinition, { unitType: unitType });
      }

      propertySupport.defineProperty(key, descriptor);
    }

    function invalidatingChangePreHook() {
      if (invalidatingChangeNestingLevel === 0) {
        propertySupport.storeComputedProperties();
        propertySupport.deleteComputedPropertyCachedValues();
        propertySupport.enableCaching = false;
      }
      invalidatingChangeNestingLevel++;
    }

    function invalidatingChangePostHook() {
      invalidatingChangeNestingLevel--;
      updateFilteredOutputs();
      if (invalidatingChangeNestingLevel === 0) {
        propertySupport.enableCaching = true;
        propertySupport.notifyChangedComputedProperties();
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

    function constrain(angle) {
      return angle - 2 * Math.PI * Math.floor(angle / (2 * Math.PI));
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

    // Ensure that phase + (time * angular frequency) remains unchanged when the frequency changes.
    // This makes for continuous signals.
    customSetters = {
      frequency: function(newFrequency) {
        if (lastFrequency !== undefined) {
          phase = constrain(phase + 2 * Math.PI * (lastFrequency - newFrequency) * model.properties.time);
        }
        lastFrequency = newFrequency;
      }
    };

    mainProperties = validator.validateCompleteness(metadata.mainProperties, initialProperties);
    Object.keys(mainProperties).forEach(function(key) {
      defineBuiltinProperty(key, 'mainProperty', customSetters[key]);
    });
    propertySupport.setRawValues(mainProperties);

    viewOptions = validator.validateCompleteness(metadata.viewOptions, initialProperties.viewOptions || {});
    Object.keys(viewOptions).forEach(function(key) {
      defineBuiltinProperty(key, 'viewOption');
    });
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
