/*global define: false, $: true */

define(function(require) {

  var labConfig            = require('lab.config'),
      LabModelerMixin      = require('common/lab-modeler-mixin'),
      PropertyDescription  = require('common/property-description'),
      metadata             = require('./metadata'),
      sensorApplet         = require('sensor-applet'),
      unitsDefinition      = sensorApplet.unitsDefinition,
      getSensorDefinitions = require('models/sensor-common/i18n-sensor-definitions'),
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

  return function Model(initialProperties, opt) {
    var i18n = opt.i18n,

        labModelerMixin,
        propertySupport,
        dispatch,
        isStopped = true,
        needsReload = false,
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
        model;

    var defaultSensorReadingDescriptionHash = {
      label: i18n.t("sensor.measurements.sensor_reading"),
      unitAbbreviation: "-",
      format: '.2f',
      min: 0,
      max: 1
    };
    var sensorDefinitions = getSensorDefinitions(i18n);

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

      model.makeInvalidatingChange(function() {
        isSensorReady = false;
        isSensorInitializing = false;
      });
    }

    function appendApplet() {
      model.makeInvalidatingChange(function() {
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
            if (error instanceof sensorApplet.JavaLoadError) {
              handleLoadingFailure(i18n.t("sensor.messages.java_applet_error"));
            } else if (error instanceof sensorApplet.AppletInitializationError) {
              handleLoadingFailure(i18n.t("sensor.messages.java_applet_not_loading"));
            } else if (error instanceof sensorApplet.SensorConnectionError) {
              handleSensorConnectionError();
            } else {
              handleLoadingFailure(i18n.t("sensor.messages.unexpected_error"));
            }
            model.makeInvalidatingChange(function() {
              isSensorInitializing = false;
            });
            return;
          }

          model.makeInvalidatingChange(function() {
            isSensorReady = true;
            isSensorInitializing = false;
          });
        });
      }, 10);
    }

    function handleSensorConnectionError() {
      removeApplet();
      var buttons = {};
      buttons[i18n.t("sensor.messages.try_again")] = function() {
        $(this).dialog("close");
        // This is a workaround: currently, the applet itself does not appear to respond to its
        // initialization methods if the sensor was not connected when the applet started up.
        appendApplet();
      };
      buttons[i18n.t("sensor.messages.cancel")] = function() {
        $(this).remove();
        model.reload();
      };
      simpleAlert(i18n.t("sensor.messages.sensor_not_attached", {sensor_name: model.properties.sensorName}), buttons);
    }

    function handleLoadingFailure(message) {
      removeApplet();
      simpleAlert(message, {
        OK: function() {
          $(this).remove();
          model.reload();
        }
      });
    }

    function handleUnplugged(what) {
      removeApplet();
      model.stop();
      ExportController.logAction("User unplugged the " + what + " (" + model.properties[what+'Name'] + ").");
      var buttons = {};
      buttons[i18n.t("sensor.messages.try_again")] = function() {
        $(this).dialog("close");
        appendApplet();
      };
      buttons[i18n.t("sensor.messages.cancel")] = function() {
        $(this).dialog("close");
      };
      simpleAlert(i18n.t("sensor.messages.sensor_or_device_unplugged", {sensor_or_device_name: model.properties[what+'Name']}), buttons);
    }

    function startPollingSensor() {
      if (sensorPollingIntervalID) {
        clearInterval(sensorPollingIntervalID);
      }
      var handleSensorValues = function(error, values) {
        if (error) {
          if (error instanceof sensorApplet.AlreadyReadingError) {
            // Don't worry about it -- we just overlapped another call to readSensor
          } else if(error instanceof sensorApplet.SensorConnectionError){
            clearInterval(sensorPollingIntervalID);
            handleSensorConnectionError();
          } else {
            clearInterval(sensorPollingIntervalID);
            throw error;
          }
        } else {
          model.makeInvalidatingChange(function() {
            rawSensorValue = values[0];
            if (isTaring) {
              model.properties.tareValue = rawSensorValue;
              isTaring = false;
            }
          });
        }
      };
      sensorPollingIntervalID = setInterval(function() {
        applet.readSensor(handleSensorValues);
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
        AppletClass = sensorApplet[sensorDefinition.appletClass];
        isSensorTareable = sensorDefinition.tareable;

        applet = window.Lab.sensor[sensorType] = new AppletClass({
          listenerPath: 'Lab.sensor.' + sensorType,
          sensorDefinitions: [sensorDefinition],
          appletId: sensorType+'-sensor',
          codebase: labConfig.rootUrl + "/jars/lab-sensor-applet-interface-dist"
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
      model.updateAllOutputProperties();
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

        applet.start(function(error, isStarted) {
          if (error) {
            if (error instanceof sensorApplet.SensorConnectionError) {
              handleSensorConnectionError();
            }
          } else if (isStarted) {
            model.makeInvalidatingChange(function() {
              isStopped = false;
            });
            dispatch.play();
          }
        });
      },

      stop: function() {

        if (applet) {
          applet.stop();
        }
        model.makeInvalidatingChange(function() {
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
          model.makeInvalidatingChange(function() {
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

      reload: function() {
        model.stop();
        model.makeInvalidatingChange(function() {
          needsReload = true;
        });
      },

      isStopped: function() {
        return isStopped;
      },

      stepCounter: function() {
        return stepCounter;
      },

      serialize: function () { return ""; }
    };

    initializeStateVariables();

    // Need to define a globally-accessible 'listenerPath' for the sensor to evaluate
    if (window.Lab === undefined) {
      window.Lab = {};
    }
    window.Lab.sensor = {};

    labModelerMixin = new LabModelerMixin({
      metadata: metadata,
      setters: {
        sensorType: setSensorType
      },
      unitsDefinition: unitsDefinition,
      initialProperties: initialProperties,
      usePlaybackSupport: false
    });

    labModelerMixin.mixInto(model);
    propertySupport = labModelerMixin.propertySupport;
    dispatch = labModelerMixin.dispatchSupport;
    dispatch.addEventTypes("tick", "play", "stop", "tickStart", "tickEnd");

    // Remember thse values so that the model can be reset properly
    initialSensorType = model.properties.sensorType;
    initialTareValue = model.properties.tareValue;

    model.defineOutput('time', {
      label: i18n.t("sensor.measurements.time"),
      unitType: 'time',
      format: '.2f'
    }, function() {
      return time;
    });

    model.defineOutput('displayTime', {
      label: i18n.t("sensor.measurements.time"),
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

    model.defineOutput('needsReload', {
      label: "Needs Reload?"
    }, function() {
      return needsReload;
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
