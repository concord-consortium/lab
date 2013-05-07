/*global define: false, d3: false */

define(function(require) {

  var PropertySupport      = require('common/property-support'),
      PropertyDescription  = require('common/property-description'),
      RunningAverageFilter = require('cs!common/running-average-filter'),
      validator            = require('common/validator'),
      metadata             = require('./metadata'),
      unitsDefinition      = require('./units-definition'),
      appletClasses        = require('./applet/applet-classes'),
      sensorDefinitions    = require('./applet/sensor-definitions');


  return function Model(initialProperties) {
    var propertySupport = new PropertySupport({
          types: ['mainProperty', 'viewOption', 'parameter', 'output']
        }),

        viewOptions,
        mainProperties,
        isStopped = true,
        dispatch = d3.dispatch('play', 'stop', 'tick', 'reset', 'stepForward', 'stepBack', 'seek', 'invalidation'),
        sensorType,
        applet,
        samplesPerSecond,
        time = 0,
        sensorReading,
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

    function setSensorType(_sensorType) {
      var AppletClass;

      if (sensorType === _sensorType) {
        return;
      }

      sensorType = _sensorType;

      if (applet) {
        applet.removeListeners('data');
        applet.remove();
      }

      samplesPerSecond = sensorDefinitions[sensorType].samplesPerSecond;
      AppletClass = appletClasses[sensorDefinitions[sensorType].appletClass];

      applet = new AppletClass({
        listenerPath: 'Lab.sensor.' + sensorType,
        measurementType: sensorDefinitions[sensorType].measurementType,
        appletId: sensorType+'-sensor'
      });
      window.Lab.sensor[sensorType] = applet;

      applet.append();
      applet.on('data', appletDataCallback);
    }

    function appletDataCallback(d) {
      stepCounter++;

      time += (1 / samplesPerSecond);
      sensorReading = d;

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
        if (applet) {
          applet.start();
        }
        dispatch.play();
      },

      stop: function() {
        isStopped = true;
        if (applet) {
          applet.stop();
        }
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

    // Need to define a globally-accessible 'listenerPath' for the sensor to evaluate
    if (window.Lab === undefined) {
      window.Lab = {};
    }
    window.Lab.sensor = {};

    propertySupport.mixInto(model);

    customSetters = {
      sensorType: setSensorType
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

    model.defineOutput('sensorReading', {
      label: "Sensor Reading",
      format: '.2f'
    }, function() {
      return sensorReading;
    });

    // Kick things off by doing this explicitly:
    setSensorType(model.properties.sensorType);

    return model;
  };
});
