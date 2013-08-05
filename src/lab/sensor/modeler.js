/*global define: false, d3: false $: true */

define(function(require) {

  var PropertySupport      = require('common/property-support'),
      PropertyDescription  = require('common/property-description'),
      RunningAverageFilter = require('cs!common/running-average-filter'),
      validator            = require('common/validator'),
      metadata             = require('./metadata'),
      unitsDefinition      = require('./units-definition'),
      appletClasses        = require('./applet/applet-classes'),
      appletErrors         = require('./applet/errors'),
      sensorDefinitions    = require('./applet/sensor-definitions'),
      BasicDialog          = require('common/controllers/basic-dialog'),
      ExportController     = require('common/controllers/export-controller');

  function simpleAlert(message, buttons) {
    var dialog = new BasicDialog({
          width: "60%",
          buttons: buttons
        });

    dialog.setContent(message);
    dialog.open();
  }

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
        didStop = false,
        sensorIsReady = false,
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

    function removeApplet() {
      applet.removeListeners('data');
      applet.removeListeners('deviceUnplugged');
      applet.removeListeners('sensorUnplugged');

      applet.remove();
      makeInvalidatingChange(function() {
        sensorIsReady = false;
      });
    }

    function appendApplet() {
      applet.on('data', appletDataCallback);
      applet.on('deviceUnplugged', function() { handleUnplugged('device'); });
      applet.on('sensorUnplugged', function() { handleUnplugged('sensor'); });

      applet.append(function(error) {
        if (error) {
          if (error instanceof appletErrors.JavaLoadError) {
            handleLoadingFailure("It appears that Java applets cannot run in your browser. If you are able to fix this, reload the page to use the sensor");
          } else if (error instanceof appletErrors.AppletInitializationError) {
            handleLoadingFailure("The sensor applet appears not to be loading. If you are able to fix this, reload the page to use the sensor");
          } else if (error instanceof appletErrors.SensorConnectionError) {
            handleSensorConnectionError();
          } else {
            handleLoadingFailure("There was an unexpected error when connecting to the sensor.");
          }
          return;
        }

        makeInvalidatingChange(function() {
          sensorIsReady = true;
        });
      });
    }

    function handleSensorConnectionError() {
      removeApplet();
      simpleAlert("The " + model.properties.sensorName + " does not appear to be attached. Try re-attaching it, and then click \"Try Again\".", {
        "Try Again" : function() {
          $(this).dialog("close");
          // This is a workaround: currently, the applet itself does not appear to respond to its
          // initialization methods if the sensor was not connected when the applet started up.
          appendApplet();
        },
        Cancel: function() {
          $(this).dialog("close");
        }
      });
    }

    function handleLoadingFailure(message) {
      removeApplet();
      simpleAlert(message, {
        OK: function() {
          $(this).dialog("close");
        }
      });
    }

    function handleUnplugged(what) {
      removeApplet();
      model.stop();
      ExportController.logAction("User unplugged the " + what + " (" + model.properties[what+'Name'] + ").");
      simpleAlert("The " + model.properties[what+'Name'] + " was unplugged. Try plugging it back in, and then click \"Try Again\".", {
        "Try Again": function() {
          $(this).dialog("close");
          appendApplet();
        },
        Cancel: function() {
          $(this).dialog("close");
        }
      });
    }

    function setSensorType(_sensorType) {
      var AppletClass;

      if (sensorType === _sensorType) {
        return;
      }
      sensorType = _sensorType;

      if (applet) {
        removeApplet();
      }

      samplesPerSecond = sensorDefinitions[sensorType].samplesPerSecond;
      AppletClass = appletClasses[sensorDefinitions[sensorType].appletClass];

      applet = window.Lab.sensor[sensorType] = new AppletClass({
        listenerPath: 'Lab.sensor.' + sensorType,
        measurementType: sensorDefinitions[sensorType].measurementType,
        appletId: sensorType+'-sensor'
      });

      appendApplet();
    }

    function appletDataCallback(d) {
      stepCounter++;

      time += (1 / samplesPerSecond);

      // Whaaa? Accessing 'window' seems to prevent a strange bug in which Safari 6.0 stops updating
      // time after 3.7s. Hard to debug because accessing console, window, or Web Inspector makes
      // the problem go away!
      window.__bizarreSafariFix = 1;

      sensorReading = d;

      propertySupport.deleteComputedPropertyCachedValues();
      propertySupport.notifyAllComputedProperties();
      updateFilteredOutputs();

      dispatch.tick();
    }

    model = {

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      start: function() {
        if (!model.properties.isPlayable) {
          return;
        }

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

        // Needed in order to recompute isPlaying. FIXME: need a better paradigm for standard
        // MVC style properties that don't flow from model physics.
        makeInvalidatingChange(function() {
          didStop = true;
        });
      },

      isStopped: function() {
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

    // TODO. Need a better way for the model to be able to have a property which it can set the
    // value of at arbitrary times, but which is read-only to client code. Outputs aren't quite
    // the right solution because the invalidation stuff is really about time and physics-based
    // invalidation.

    model.defineOutput('sensorName', {
      label: "Sensor Name"
    }, function() {
      return sensorDefinitions[sensorType].sensorName;
    });

    model.defineOutput('deviceName', {
      label: "Sensor Interface Device Name"
    }, function() {
      return sensorDefinitions[sensorType].deviceName;
    });

    // TODO. We need a way to make "model-writable" read only properties. custom getters could
    model.defineOutput('isPlayable', {
      label: "Playable"
    }, function() {
      return !didStop && sensorIsReady;
    });

    // Kick things off by doing this explicitly:
    setSensorType(model.properties.sensorType);

    return model;
  };
});
