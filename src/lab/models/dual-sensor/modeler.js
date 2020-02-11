/*global define: false, d3: false $: true */

import $__common_property_support from 'common/property-support';
import $__common_property_description from 'common/property-description';
import $__common_filters_running_average_filter from 'common/filters/running-average-filter';
import $__common_validator from 'common/validator';
import $____metadata from './metadata';
import $__sensor_applet from 'sensor-applet';
import $__models_sensor_common_i__n_sensor_definitions from 'models/sensor-common/i18n-sensor-definitions';
import $__lab_config from 'lab.config';
import $__models_sensor_common_notifier from 'models/sensor-common/notifier';
import $__common_controllers_export_controller from 'common/controllers/export-controller';

var PropertySupport = $__common_property_support,
  PropertyDescription = $__common_property_description,
  RunningAverageFilter = $__common_filters_running_average_filter,
  validator = $__common_validator,
  metadata = $____metadata,
  sensorApplet = $__sensor_applet,
  unitsDefinition = sensorApplet.unitsDefinition,
  getSensorDefinitions = $__models_sensor_common_i__n_sensor_definitions,
  labConfig = $__lab_config,
  Notifier = $__models_sensor_common_notifier,
  ExportController = $__common_controllers_export_controller;

export default function Model(initialProperties, opt) {
  var propertySupport = new PropertySupport({
      types: ['mainProperty', 'viewOption', 'parameter', 'output']
    }),

    i18n = opt.i18n,
    notifier = new Notifier(i18n),

    viewOptions,
    mainProperties,
    isStopped = true,
    needsReload = false,
    dispatch = d3.dispatch('play', 'stop', 'tick', 'tickStart', 'willReset', 'reset', 'stepForward',
      'stepBack', 'seek', 'invalidation'),
    initialSensorType,
    sensorType,
    sensorType2,
    applet,
    isSensorReady = false,
    isSensorInitializing = false,
    sensorPollsPerSecond = 1,
    sensorPollingIntervalID,
    samplesPerSecond = 10,
    time,
    rawSensorValue,
    rawSensorValue2,
    stepCounter,
    didCollectData,
    isTaring,
    isTaring2,
    isSensorTareable,
    isSensorTareable2,
    initialTareValue,
    invalidatingChangeNestingLevel = 0,
    filteredOutputs = [],
    customSetters,
    model;

  var defaultSensorReadingDescriptionHash = {
    label: i18n.t("sensor.measurements.sensor_reading"),
    unitAbbreviation: "-",
    format: '.2f',
    min: 0,
    max: 1
  };
  var sensorDefinitions = getSensorDefinitions(i18n);

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
      descriptor.description = new PropertyDescription(unitsDefinition, {
        unitType: unitType
      });
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
      applet.on('deviceUnplugged', function() {
        handleUnplugged('device');
      });
      applet.on('sensorUnplugged', function() {
        handleUnplugged('sensor');
      });

      applet.append($('body'), function(error) {

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
    notifier.alert(i18n.t("sensor.messages.sensor_not_attached", {
      sensor_name: model.properties.sensorName
    }), buttons);
  }

  function handleLoadingFailure(message) {
    removeApplet();
    notifier.alert(message, {
      OK: function() {
        $(this).remove();
        model.reload();
      }
    });
  }

  function handleUnplugged(what) {
    removeApplet();
    model.stop();
    ExportController.logAction("Unplugged" + model.properties[what + 'Name']);
    var buttons = {};
    buttons[i18n.t("sensor.messages.try_again")] = function() {
      $(this).dialog("close");
      appendApplet();
    };
    buttons[i18n.t("sensor.messages.cancel")] = function() {
      $(this).dialog("close");
    };
    notifier.alert(i18n.t("sensor.messages.sensor_or_device_unplugged", {
      sensor_or_device_name: model.properties[what + 'Name']
    }), buttons);
  }

  function startPollingSensor() {
    if (sensorPollingIntervalID) {
      clearInterval(sensorPollingIntervalID);
    }
    var handleSensorValues = function(error, values) {
      if (error) {
        if (error instanceof sensorApplet.AlreadyReadingError) {
          // Don't worry about it -- we just overlapped another call to readSensor
        } else if (error instanceof sensorApplet.SensorConnectionError) {
          clearInterval(sensorPollingIntervalID);
          handleSensorConnectionError();
        } else {
          clearInterval(sensorPollingIntervalID);
          throw error;
        }
      } else {
        makeInvalidatingChange(function() {
          rawSensorValue = values[0];
          rawSensorValue2 = values[1];
          if (isTaring) {
            model.properties.tareValue = rawSensorValue;
            isTaring = false;
          }
          if (isTaring2) {
            model.properties.tareValue2 = rawSensorValue2;
            isTaring2 = false;
          }
        });
      }
    };
    sensorPollingIntervalID = setInterval(function() {
      applet.readSensor(handleSensorValues);
    }, 1000 / sensorPollsPerSecond);
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
    rawSensorValue2 = undefined;
    didCollectData = false;
    isSensorTareable = false;
    isSensorTareable2 = false;
    isTaring = false;
    isTaring2 = false;
  }

  function setupApplet() {
    if (sensorType && sensorType2) {
      var sensorDefinition = sensorDefinitions[sensorType],
        sensorDefinition2 = sensorDefinitions[sensorType2],
        AppletClass = sensorApplet[sensorDefinition.appletClass];

      applet = window.Lab.sensor[sensorType + sensorType2] = new AppletClass({
        listenerPath: 'Lab.sensor.' + sensorType + sensorType2,
        sensorDefinitions: [sensorDefinition, sensorDefinition2],
        appletId: sensorType + sensorType2 + '-sensor',
        codebase: labConfig.rootUrl + "/jars/lab-sensor-applet-interface-dist"
      });

      appendApplet();
    }

  }

  function updateSamplesPerSecond() {
    if (sensorType && sensorType2) {
      var sensorDefinition = sensorDefinitions[sensorType],
        sensorDefinition2 = sensorDefinitions[sensorType2];

      samplesPerSecond = Math.max(sensorDefinition.samplesPerSecond, sensorDefinition2.samplesPerSecond);
    }
  }

  function setSensorType(_sensorType) {
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
      measurementType = sensorDefinition.measurementType;
      isSensorTareable = sensorDefinition.tareable;
      updateSamplesPerSecond();

      setupApplet();

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

  function setSensorType2(_sensorType) {
    var sensorDefinition;
    var description;
    var measurementType;

    if (sensorType2 === _sensorType) {
      return;
    }

    if (sensorType2) {
      // drop the tare value if we're changing from one sensor type to another!
      model.properties.tareValue2 = 0;
    }

    sensorType2 = _sensorType;
    rawSensorValue2 = undefined;

    if (applet) {
      removeApplet();
    }

    if (sensorType2) {
      sensorDefinition = sensorDefinitions[sensorType2];
      measurementType = sensorDefinition.measurementType;
      isSensorTareable2 = sensorDefinition.tareable;
      updateSamplesPerSecond();

      setupApplet();

      // Update the description of the main 'sensorReading' output
      description = new PropertyDescription(unitsDefinition, {
        label: sensorDefinition.measurementName,
        unitType: measurementType,
        min: sensorDefinition.minReading,
        max: sensorDefinition.maxReading
      });

      propertySupport.setPropertyDescription('sensorReading2', description);

      // Override collectionTime  only if it wasn't set on the model definition
      if (model.properties.collectionTime == null) {
        model.properties.collectionTime = sensorDefinition.maxSeconds;
      }
    } else if (model.properties.hasOwnProperty('sensorReading2')) {
      // no sensor type
      description = new PropertyDescription(unitsDefinition, defaultSensorReadingDescriptionHash);
      propertySupport.setPropertyDescription('sensorReading2', description);
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
    rawSensorValue2 = d[1];
    // Once we collect data for a given sensor, don't allow changingn the sensor typea
    if (!didCollectData) {
      model.freeze('sensorType');
      model.freeze('sensorType2');
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

      applet.start(function(error, isStarted) {
        if (error) {
          if (error instanceof sensorApplet.SensorConnectionError) {
            handleSensorConnectionError();
          }
        } else if (isStarted) {
          makeInvalidatingChange(function() {
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

    tare2: function() {
      if (!isStopped) {
        throw new Error("Sensor model: tare() called on a non-stopped model.");
      }
      if (sensorPollingIntervalID != null && rawSensorValue2 != null) {
        model.properties.tareValue2 = rawSensorValue2;
      } else {
        makeInvalidatingChange(function() {
          isTaring2 = true;
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
      model.unfreeze('sensorType');
      model.unfreeze('sensorType2');
      model.properties.sensorType = initialSensorType;
      model.properties.sensorType2 = initialSensorType;

      dispatch.reset();
    },

    reload: function() {
      model.stop();
      makeInvalidatingChange(function() {
        needsReload = true;
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

      model.defineOutput(key, description, function() {
        return filter.calculate();
      });
    },

    serialize: function() {
      return "";
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
    sensorType: setSensorType,
    sensorType2: setSensorType2
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

  model.defineOutput('sensorReading2', defaultSensorReadingDescriptionHash, function() {
    if (rawSensorValue2 == null) {
      return rawSensorValue2;
    }
    return rawSensorValue2 - model.properties.tareValue2;
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

  model.defineOutput('sensorName2', {
    label: "Sensor Name"
  }, function() {
    return sensorDefinitions[sensorType2].sensorName;
  });

  model.defineOutput('deviceName', {
    label: "Sensor Interface Device Name"
  }, function() {
    return sensorDefinitions[sensorType].deviceName;
  });

  model.defineOutput('deviceName2', {
    label: "Sensor Interface Device Name"
  }, function() {
    return sensorDefinitions[sensorType2].deviceName;
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

  model.defineOutput('isTaring2', {
    label: "Waiting for a tare value?"
  }, function() {
    return isTaring2;
  });

  model.defineOutput('canTare', {
    label: "Can set a tare value?"
  }, function() {
    return isStopped && !didCollectData && isSensorTareable && !isTaring;
  });

  model.defineOutput('canTare2', {
    label: "Can set a tare value?"
  }, function() {
    return isStopped && !didCollectData && isSensorTareable2 && !isTaring2;
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
  setSensorType2(model.properties.sensorType2);

  return model;
};
