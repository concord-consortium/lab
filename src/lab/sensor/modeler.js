/*global define: false, d3: false $: true */

define(function(require) {

  var PropertySupport      = require('common/property-support'),
      PropertyDescription  = require('common/property-description'),
      RunningAverageFilter = require('cs!common/filters/running-average-filter'),
      validator            = require('common/validator'),
      metadata             = require('./metadata'),
      unitsDefinition      = require('sensor-applet/units-definition'),
      appletClasses        = require('sensor-applet/applet-classes'),
      appletErrors         = require('sensor-applet/errors'),
      sensorDefinitions    = require('sensor-applet/sensor-definitions'),
      labConfig            = require('lab.config'),
      BasicDialog          = require('common/controllers/basic-dialog'),
      ExportController     = require('common/controllers/export-controller');

  // TODO. Obviously, this amounts to view-layer code in the model layer. Ultimately, we'd like to
  // have the interactives controller (or the controller layer)  manage requests to send messages to
  // the user, and additionally put the actual wording of the messages in a separate module, rather
  // than bury the message text in the model code.
  function simpleAlert(message, buttons) {
    var dialog = new BasicDialog({
          width: "60%",
          buttons: buttons
        });

    dialog.setContent(message);
    dialog.open();
  }

  var defaultSensorReadingDescriptionHash = {
      label: "Sensor Reading",
      unitAbbreviation: "-",
      format: '.2f',
      min: 0,
      max: 1
    };

  return function Model(initialProperties) {
    var propertySupport = new PropertySupport({
          types: ['mainProperty', 'viewOption', 'parameter', 'output']
        }),

        viewOptions,
        mainProperties,
        isStopped = true,
        dispatch = d3.dispatch('play', 'stop', 'tick', 'willReset', 'reset', 'stepForward',
                               'stepBack', 'seek', 'invalidation'),
        initialSensorType,
        sensorType,
        applet,
        isSensorReady = false,
        isSensorInitializing = false,
        sensorPollsPerSecond = 1,
        sensorPollingIntervalID,
        samplesPerSecond,
        time,
        rawSensorValue,
        stepCounter,
        didCollectData,
        isTaring,
        isSensorTareable,
        initialTareValue,
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
      } else {
        // A property with no units should at least have a label
        descriptor.description = new PropertyDescription(null, {
          label: metadataForType.label || key
        });
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

    function updatePropertyRange(property, min, max) {
      var descriptionHash;
      var description;

      descriptionHash = model.getPropertyDescription(property).getHash();
      descriptionHash.min = min;
      descriptionHash.max = max;

      description = new PropertyDescription(unitsDefinition, descriptionHash);
      propertySupport.setPropertyDescription(property, description);
    }

    // Updates min, max of displayTime to be [0..collectionTime]
    function updateDisplayTimeRange() {
      if (model.properties.collectionTime == null) {
        return;
      }
      updatePropertyRange('displayTime', 0, model.properties.collectionTime);
    }

    function removeApplet() {
      if (applet) {
        applet.removeListeners('data');
        applet.removeListeners('deviceUnplugged');
        applet.removeListeners('sensorUnplugged');

        applet.remove();
      }

      makeInvalidatingChange(function() {
        isSensorReady = false;
        isSensorInitializing = false;
      });
    }

    function appendApplet() {
      makeInvalidatingChange(function() {
        isSensorInitializing = true;
      });

      // Wrapped in a setTimeout to allow all property observers to finish their work before
      // actually firing up the applet, which freezes the UI and possibly blocks until the user
      // clicks through security dialogs to allow the applet to run.
      // TODO: A setImmediate shim (using window.postMessage) would be useful here.
      setTimeout(function() {
        applet.on('data', appletDataCallback);
        applet.on('deviceUnplugged', function() { handleUnplugged('device'); });
        applet.on('sensorUnplugged', function() { handleUnplugged('sensor'); });

        applet.append($('body'),function(error) {

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
            makeInvalidatingChange(function() {
              isSensorInitializing = false;
            });
            return;
          }

          makeInvalidatingChange(function() {
            isSensorReady = true;
            isSensorInitializing = false;
          });
        });
      }, 10);
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
          $(this).remove();
        }
      });
    }

    function handleLoadingFailure(message) {
      removeApplet();
      simpleAlert(message, {
        OK: function() {
          $(this).remove();
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

    function startPollingSensor() {
      if (sensorPollingIntervalID) {
        clearInterval(sensorPollingIntervalID);
      }

      sensorPollingIntervalID = setInterval(function() {
        makeInvalidatingChange(function() {
          try{
            rawSensorValue = applet.readSensor()[0];
          } catch(error) {
            clearInterval(sensorPollingIntervalID);
            if(error instanceof appletErrors.SensorConnectionError){
              handleSensorConnectionError();
            } else {
              throw error;
            }
            return;
          }
          if (isTaring) {
            model.properties.tareValue = rawSensorValue;
            isTaring = false;
          }
        });
      }, 1000/sensorPollsPerSecond);
    }

    function stopPollingSensor() {
      if (sensorPollingIntervalID) {
        clearInterval(sensorPollingIntervalID);
        sensorPollingIntervalID = null;
      }
    }

    function initializeStateVariables() {
      stepCounter = 0;
      time = 0;
      rawSensorValue = undefined;
      didCollectData = false;
      isSensorTareable = false;
      isTaring = false;
    }

    function setSensorType(_sensorType) {
      var AppletClass;
      var sensorDefinition;
      var description;
      var measurementType;

      if (sensorType === _sensorType) {
        return;
      }

      if (sensorType) {
        // drop the tare value if we're changing from one sensor type to another!
        model.properties.tareValue = 0;
      }

      sensorType = _sensorType;
      rawSensorValue = undefined;

      if (applet) {
        removeApplet();
      }

      if (sensorType) {
        sensorDefinition = sensorDefinitions[sensorType];
        samplesPerSecond = sensorDefinition.samplesPerSecond;
        measurementType = sensorDefinition.measurementType;
        AppletClass = appletClasses[sensorDefinition.appletClass];
        isSensorTareable = sensorDefinition.tareable;

        applet = window.Lab.sensor[sensorType] = new AppletClass({
          listenerPath: 'Lab.sensor.' + sensorType,
          sensorDefinitions: [sensorDefinition],
          appletId: sensorType+'-sensor',
          codebase: labConfig.actualRoot + "jnlp"
        });

        appendApplet();

        // Update the description of the main 'sensorReading' output
        description = new PropertyDescription(unitsDefinition, {
          label: sensorDefinition.measurementName,
          unitType: measurementType,
          min: sensorDefinition.minReading,
          max: sensorDefinition.maxReading
        });

        propertySupport.setPropertyDescription('sensorReading', description);

        // Override collectionTime  only if it wasn't set on the model definition
        if (model.properties.collectionTime == null) {
          model.properties.collectionTime = sensorDefinition.maxSeconds;
        }
      } else if (model.properties.hasOwnProperty('sensorReading')) {
        // no sensor type
        description = new PropertyDescription(unitsDefinition, defaultSensorReadingDescriptionHash);
        propertySupport.setPropertyDescription('sensorReading', description);
      }
    }

    function appletDataCallback(d) {
      stepCounter++;

      time += (1 / samplesPerSecond);

      // Whaaa? Accessing 'window' seems to prevent a strange bug in which Safari 6.0 stops updating
      // time after 3.7s. Hard to debug because accessing console, window, or Web Inspector makes
      // the problem go away!
      window.__bizarreSafariFix = 1;

      rawSensorValue = d[0];
      // Once we collect data for a given sensor, don't allow changingn the sensor typea
      if (!didCollectData) {
        model.freeze('sensorType');
      }

      didCollectData = true;

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

        try {
          applet.start();
        } catch (e) {
          if (e instanceof appletErrors.SensorConnectionError) {
            handleSensorConnectionError();
            return;
          } else {
            throw e;
          }
        }

        makeInvalidatingChange(function() {
          isStopped = false;
        });
        dispatch.play();
      },

      stop: function() {

        if (applet) {
          applet.stop();
        }
        makeInvalidatingChange(function() {
          isStopped = true;
        });
        dispatch.stop();
      },

      tare: function() {
        if (!isStopped) {
          throw new Error("Sensor model: tare() called on a non-stopped model.");
        }
        if (sensorPollingIntervalID != null && rawSensorValue != null) {
          model.properties.tareValue = rawSensorValue;
        } else {
          makeInvalidatingChange(function() {
            isTaring = true;
          });
        }
      },

      willReset: function() {
        dispatch.willReset();
      },

      reset: function() {
        model.stop();
        removeApplet();

        initializeStateVariables();
        model.properties.tareValue = initialTareValue;
        model.unfreeze('sensorType');
        model.properties.sensorType = initialSensorType;

        dispatch.reset();
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

    initializeStateVariables();

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

    // Remember thse values so that the model can be reset properly
    initialSensorType = model.properties.sensorType;
    initialTareValue = model.properties.tareValue;

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

    model.defineOutput('sensorReading', defaultSensorReadingDescriptionHash, function() {
      if (rawSensorValue == null) {
        return rawSensorValue;
      }
      return rawSensorValue - model.properties.tareValue;
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

    model.defineOutput('isStopped', {
      label: "Stopped?"
    }, function() {
      return isStopped;
    });

    // TODO. We need a way to make "model-writable" read only properties.
    model.defineOutput('isPlayable', {
      label: "Startable?"
    }, function() {
      return isSensorReady && !didCollectData;
    });

    model.defineOutput('hasPlayed', {
      label: "Has successfully collected data?"
    }, function() {
      return didCollectData;
    });

    model.defineOutput('shouldPollSensor', {
      label: "Polling Sensor?"
    }, function() {
      return model.properties.isPlayable && isStopped;
    });

    model.defineOutput('isSensorInitializing', {
      label: "Loading Sensor?"
    }, function() {
      return isSensorInitializing;
    });

    model.defineOutput('isTaring', {
      label: "Waiting for a tare value?"
    }, function() {
      return isTaring;
    });

    model.defineOutput('canTare', {
      label: "Can set a tare value?"
    }, function() {
      return isStopped && !didCollectData && isSensorTareable && !isTaring;
    });


    // Clean up state before we go -- failing to remove the applet from the page before switching
    // between 2 sensor types that use the same interface causes an applet exception.
    model.on('willReset.model', removeApplet);

    model.addObserver('shouldPollSensor', function() {
      if (model.properties.shouldPollSensor) {
        startPollingSensor();
      } else {
        stopPollingSensor();
      }
    });

    model.addObserver('collectionTime', updateDisplayTimeRange);
    updateDisplayTimeRange();

    // Kick things off by doing this explicitly:
    setSensorType(model.properties.sensorType);

    return model;
  };
});
