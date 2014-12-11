/*global define: false */

define(function(require) {

  var LabModelerMixin       = require('common/lab-modeler-mixin'),
      PropertyDescription   = require('common/property-description'),
      metadata              = require('./metadata'),
      StateMachine          = require('common/state-machine'),
      sensorConnectorInterface = require('sensor-connector-interface'),
      unitsDefinition       = require('./units-definition'),
      getSensorDefinitions  = require('models/sensor-common/i18n-sensor-definitions-connector'),
      Notifier             = require('models/sensor-common/notifier');

  return function Model(initialProperties, opt) {
    var i18n = opt.i18n,
        notifier = new Notifier(i18n),

        labModelerMixin,
        propertySupport,
        dispatch,
        stateMachine,
        timeColumn,
        dataColumn,
        dataColumn2,
        selectedSensor,
        selectedSensor2,
        sensorName,
        sensorName2,
        isStopped,
        needsReload,
        time,
        rawSensorValue,
        rawSensorValue2,
        liveSensorValue,
        liveSensorValue2,
        stepCounter,
        isPlayable,
        canTare,
        canTare2,
        canControl,
        hasMultipleSensors,
        isSensorTareable,
        isSensorTareable2,
        message,
        statusErrors,
        displayTimePropertyDescription,
        model;

    var defaultSensorReadingDescription = {
          label: i18n.t("sensor.measurements.sensor_reading"),
          unitAbbreviation: "-",
          format: '.2f',
          min: 0,
          max: 10
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

    // Updates min, max of displayTime to be [0..actualDuration]
    function updateDisplayTimeRange() {
      if (model.properties.actualDuration == null || model.properties.actualDuration == Infinity) {
        return;
      }
      updatePropertyRange('displayTime', 0, model.properties.actualDuration);
    }

    function setSensorReadingDescription() {
      var sensorDefinition;
      var description;

      if (dataColumn) {
        sensorDefinition = sensorDefinitions[dataColumn.units];

        if (sensorDefinition) {
          description = {
            label: sensorDefinition.measurementName,
            format: '.2f',
            min: sensorDefinition.minReading,
            max: sensorDefinition.maxReading
          };
          if (unitsDefinition.units[sensorDefinition.measurementType]) {
            description.unitType = sensorDefinition.measurementType;
          } else {
            description.unitAbbreviation = dataColumn.units;
          }
          isSensorTareable = sensorDefinition.tareable;
          sensorName = sensorDefinition.sensorName || (dataColumn.units + " " + i18n.t("sensor.names.sensor"));
        } else {
          description = {
            label: dataColumn.name || i18n.t("sensor.measurements.sensor_reading"),
            unitAbbreviation: dataColumn.units,
            format: '.2f',
            min: 0,
            max: 10
          };
          isSensorTareable = true;
          sensorName = dataColumn.units + " " + i18n.t("sensor.names.sensor");
        }
      } else {
        description = defaultSensorReadingDescription;
        isSensorTareable = false;
        sensorName = i18n.t("sensor.names.no_sensor");
      }

      propertySupport.setPropertyDescription('sensorReading',
        new PropertyDescription(unitsDefinition, description));
      propertySupport.setPropertyDescription('liveSensorReading',
        new PropertyDescription(unitsDefinition, description));
    }

    function setSensorReadingDescription2() {
      var sensorDefinition;
      var description;

      if (dataColumn2) {
        sensorDefinition = sensorDefinitions[dataColumn2.units];

        if (sensorDefinition) {
          description = {
            label: sensorDefinition.measurementName,
            format: '.2f',
            min: sensorDefinition.minReading,
            max: sensorDefinition.maxReading
          };
          if (unitsDefinition.units[sensorDefinition.measurementType]) {
            description.unitType = sensorDefinition.measurementType;
          } else {
            description.unitAbbreviation = dataColumn2.units;
          }
          isSensorTareable2 = sensorDefinition.tareable;
          sensorName2 = sensorDefinition.sensorName || (dataColumn.units + " " + i18n.t("sensor.names.sensor"));
        } else {
          description = {
            label: dataColumn2.name || i18n.t("sensor.measurements.sensor_reading"),
            unitAbbreviation: dataColumn2.units,
            format: '.2f',
            min: 0,
            max: 10
          };
          isSensorTareable2 = true;
          sensorName2 = dataColumn2.units + " " + i18n.t("sensor.names.sensor");
        }
      } else {
        description = defaultSensorReadingDescription;
        isSensorTareable2 = false;
        sensorName2 = i18n.t("sensor.names.no_sensor");
      }

      propertySupport.setPropertyDescription('sensorReading2',
        new PropertyDescription(unitsDefinition, description));
      propertySupport.setPropertyDescription('liveSensorReading2',
        new PropertyDescription(unitsDefinition, description));
    }

    function initializeStateVariables() {
      isStopped = true;
      canControl = sensorConnectorInterface.canControl;
      hasMultipleSensors = false;
      // Set selectedSensor if it hasn't been set yet
      if (typeof(selectedSensor) === "undefined" || selectedSensor === null) {
        selectedSensor = { index: 1 };
      }
      if (typeof(selectedSensor2) === "undefined" || selectedSensor2 === null) {
        selectedSensor2 = { index: 2 };
      }
      stepCounter = 0;
      time = 0;
      statusErrors = 0;
      rawSensorValue = undefined;
      rawSensorValue2 = undefined;
      liveSensorValue = undefined;
      liveSensorValue2 = undefined;
      timeColumn = undefined;
      dataColumn = undefined;
      dataColumn2 = undefined;
    }

    function checkColumnAgainstSelected(dataset, idx) {
        var colCandidate = dataset.columns[idx];
        if (colCandidate && colCandidate.units === selectedSensor.units) {
          selectedSensor.index = idx;
          return true;
        }
        return false;
    }

    function checkColumnAgainstSelected2(dataset, idx) {
        var colCandidate = dataset.columns[idx];
        if (colCandidate && colCandidate.units === selectedSensor2.units) {
          selectedSensor2.index = idx;
          return true;
        }
        return false;
    }

    function hasCollectableSensors(dataset) {
      if (dataset.columns.length < 2) {
        return false;
      }
      if (dataset.columns.length === 2 && !dataset.columns[1].name && !dataset.columns[1].units) {
        return false;
      }
      return true;
    }

    function setColumn() {
      var dataset = sensorConnectorInterface.datasets[0];
      var newDataColumn, newDataColumn2, sIdx;

      hasMultipleSensors = dataset.columns.length > 2;

      // The sensor connector always has column 0 as time
      timeColumn = dataset.columns[0];
      if (sensorConnectorInterface.hasAttachedInterface) {
        if (hasCollectableSensors(dataset) && hasMultipleSensors) {
          if (canControl) {
            message = i18n.t("sensor.messages.ready");
          } else if (sensorConnectorInterface.inControl.clientName) {
            message = i18n.t("sensor.messages.ready_nocontrol", { controlling_client: sensorConnectorInterface.inControl.clientName });
          } else {
            message = i18n.t("sensor.messages.ready_nocontrol_noname");
          }
          isPlayable = true;
        } else {
          message = i18n.t("sensor.messages.no_sensors");
          isPlayable = false;
        }

        // TODO When we want to support multiple sensors, this will have to change.
        // Select the column chosen by the user
        sIdx = selectedSensor.index;
        if (sIdx >= dataset.columns.length && dataset.columns.length > 1) {
          // we seem to be pointing past the number of columns there are. reset to that last column.
          sIdx = dataset.columns.length - 1;
        }
        newDataColumn = dataset.columns[sIdx];
        if (newDataColumn && selectedSensor.units && newDataColumn.units !== selectedSensor.units) {
          // our selected column seems to have changed out from under us.
          // If a sensor was added to the device, it could be one column higher
          if (checkColumnAgainstSelected(dataset, sIdx+1)) {
            newDataColumn = dataset.columns[sIdx+1];
          } else if (sIdx > 1 && checkColumnAgainstSelected(dataset, sIdx-1)) {
            // it wasn't the one after. let's check the one before.
            newDataColumn = dataset.columns[sIdx-1];
          } else {
            // it seems to be none of them. Reset the selected sensor to the first one.
            newDataColumn = dataset.columns[1];
            selectedSensor.index = 1;
          }
        }

        // select the column chosen by the user for the second sensor
        sIdx = selectedSensor2.index;
        if (sIdx >= dataset.columns.length && dataset.columns.length > 2) {
          // we seem to be pointing past the number of columns there are. reset to that last column.
          sIdx = dataset.columns.length - 1;
        }
        newDataColumn2 = dataset.columns[sIdx];
        if (newDataColumn2 && selectedSensor2.units && newDataColumn2.units !== selectedSensor2.units) {
          // our selected column seems to have changed out from under us.
          // If a sensor was added to the device, it could be one column higher
          if (checkColumnAgainstSelected2(dataset, sIdx+1)) {
            newDataColumn2 = dataset.columns[sIdx+1];
          } else if (sIdx > 1 && checkColumnAgainstSelected2(dataset, sIdx-1)) {
            // it wasn't the one after. let's check the one before.
            newDataColumn2 = dataset.columns[sIdx-1];
          } else {
            // it seems to be none of them. Reset the selected sensor to the first one.
            newDataColumn2 = dataset.columns[2];
            selectedSensor2.index = 2;
          }
        }
      } else {
        message = i18n.t("sensor.messages.no_devices");
        isPlayable = false;
      }

      if (newDataColumn && !newDataColumn.name && !newDataColumn.units) {
        // If we don't have a sensor name and units, assume it's not really a sensor
        newDataColumn = null;
      }

      if (newDataColumn2 && !newDataColumn2.name && !newDataColumn2.units) {
        // If we don't have a sensor name and units, assume it's not really a sensor
        newDataColumn2 = null;
      }

      dataColumn = newDataColumn;
      if (dataColumn) {
        selectedSensor.units = dataColumn.units;
      }
      setSensorReadingDescription();

      dataColumn2 = newDataColumn2;
      if (dataColumn2) {
        selectedSensor2.units = dataColumn2.units;
      }
      setSensorReadingDescription2();

      if ( ! dataColumn ) {
        liveSensorValue = undefined;
      }
      if ( ! dataColumn2 ) {
        liveSensorValue2 = undefined;
      }
    }

    function handleData() {
      if (!timeColumn || !dataColumn || !dataColumn2) {
        return;
      }

      var numberOfValues = Math.min(Math.min(timeColumn.data.length, dataColumn.data.length), dataColumn2.data.length);
      for (; stepCounter < numberOfValues; stepCounter++) {
        time = timeColumn.data[stepCounter];

        if (time > model.properties.actualDuration) {
          // Stop, but continue to process any data received (if for no other reason than that
          // subsequent steps aren't happy until data up to the latest timestamp was received)
          model.stop();
        }
        rawSensorValue = dataColumn.data[stepCounter];
        rawSensorValue2 = dataColumn2.data[stepCounter];
        model.updateAllOutputProperties();
        dispatch.tick();
      }
    }

    function isAllColumnDataReceieved(column) {
      return column.receivedValuesTimeStamp >= column.requestedValuesTimeStamp;
    }

    function isAllDataReceived() {
      return isAllColumnDataReceieved(timeColumn) && (! dataColumn || isAllColumnDataReceieved(dataColumn)) && (! dataColumn2 || isAllColumnDataReceieved(dataColumn2));
    }

    function connectedSensors() {
      var sensors = [],
          dataset = sensorConnectorInterface.datasets[0],
          i;

      for (i=0; i < dataset.columns.length; i++) {
        sensors.push({units: dataset.columns[i].units, name: dataset.columns[i].name});
      }
      return sensors;
    }

    model = {

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      start: function() {
        handle('start');
      },

      stop: function() {
        handle('stop');
      },

      tare: function() {
        var oldPlayable = isPlayable;
        isPlayable = false;
        handle('tare');
        isPlayable = oldPlayable;
      },

      tare2: function() {
        var oldPlayable = isPlayable;
        isPlayable = false;
        handle('tare2');
        isPlayable = oldPlayable;
      },

      willReset: function() {
        dispatch.willReset();
      },

      reset: function() {
        handle('reset');
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

      connectedSensors: connectedSensors,
      getSelectedSensor: function() { return selectedSensor.index; },
      getSelectedSensor2: function() { return selectedSensor2.index; },
      setSelectedSensor: function(sensorIndex) {
        if (selectedSensor.index !== sensorIndex) {
          selectedSensor.index = sensorIndex;
          selectedSensor.units = null;
          model.properties.tareValue = 0; // Also reset our tare value
          setColumn();
        }
      },
      setSelectedSensor2: function(sensorIndex) {
        if (selectedSensor2.index !== sensorIndex) {
          selectedSensor2.index = sensorIndex;
          selectedSensor2.units = null;
          model.properties.tareValue2 = 0; // Also reset our tare value
          setColumn();
        }
      },

      serialize: function () { return ""; }
    };


    stateMachine = new StateMachine({

      notConnected: {
        enterState: function() {
          message = i18n.t("sensor.messages.not_connected");
          statusErrors = 0;
          if (location.protocol === 'https:') {
            sensorConnectorInterface.startPolling("https://localhost.ungerdesign.com:11181", model.properties.clientId, model.properties.clientName);
          } else {
            sensorConnectorInterface.startPolling("http://127.0.0.1:11180", model.properties.clientId, model.properties.clientName);
          }
          this.gotoState('connecting');
        }
      },

      connecting: {
        enterState: function() {
          message = i18n.t("sensor.messages.connecting");
          if (sensorConnectorInterface.isConnected) {
            this.gotoState('connected');
          }
        },

        statusErrored: function() {
          this.gotoState('initialConnectionFailure');
        },

        connectionTimedOut: function() {
          this.gotoState('initialConnectionFailure');
        },

        launchTimedOut: function() {
          this.gotoState('initialConnectionFailure');
        },

        statusReceived: function() {
          this.gotoState('connected');
        },

        sessionChanged: function() {
          // start a new session, stay connecting...
          sensorConnectorInterface.stopPolling();
          sensorConnectorInterface.startPolling();
        }
      },

      initialConnectionFailure: {
        enterState: function() {
          sensorConnectorInterface.stopPolling();
          message = i18n.t("sensor.messages.connection_failed");
          var dialog_msg = "sensor.messages.connection_failed_alert";
          if (sensorConnectorInterface.launchTimedOut) {
            dialog_msg = "sensor.messages.connection_failed_launch_failed_alert";
          }
          notifier.alert(i18n.t(dialog_msg, {
                                click_here_link: "<a target='_blank' style='color: #222299;' href='http://sensorconnector.concord.org/'>" +
                                                 i18n.t("sensor.messages.click_here") + "</a>"}),
          {
            OK: function() {
              $(this).dialog("close");
              handle('dismiss');
            }
          });
        },

        // Ignore these in this state
        statusErrored: function() {},
        connectionTimedOut: function() {},
        launchTimedOut: function() {},

        dismiss: function() {
          this.gotoState('notConnected');
        }
      },

      connected: {
        enterState: function() {
          message = i18n.t("sensor.messages.connected");
          canTare = true;
          canTare2 = true;
          isPlayable = true;
          isStopped = true;

          setColumn();

          if (canControl) {
            this.controlEnabled();
          } else {
            this.controlDisabled();
          }

          if (sensorConnectorInterface.isCollecting) {
            this.gotoState('started');
          }
        },

        leaveState: function() {
          canTare = false;
          canTare2 = false;
          isPlayable = false;
        },

        // Give some feedback on the currently selected column from which data will be collected.
        columnAdded: setColumn,
        columnRemoved: setColumn,
        columnTypeChanged: setColumn,
        columnMoved: setColumn,

        interfaceConnected: setColumn,
        interfaceRemoved: setColumn,

        tare: function() {
          if (dataColumn) {
            model.properties.tareValue = dataColumn.liveValue;
          }
        },

        tare2: function() {
          if (dataColumn2) {
            model.properties.tareValue2 = dataColumn2.liveValue;
          }
        },

        // User requests collection
        start: function() {
          // NOTE. Due to architecture switch mid-way, the sensorConnectorInterface layer is turning the
          // start request into a promise, and we're turning it back to events. The lower layer
          // could just ditch promises and emit the corresponding events with no harm. (The state
          // machine prevents almost every practical scenario where we'd see an out-of-date
          // startRequestFailure event while in a state that would respond to it.)
          sensorConnectorInterface.requestStart().catch(function() {
            handle('startRequestFailed');
          });
          this.gotoState('starting');
        },

        controlEnabled: function() {
          message = i18n.t("sensor.messages.connected");
        },

        controlDisabled: function() {
          if (sensorConnectorInterface.inControl.clientName) {
            message = i18n.t("sensor.messages.connected_start_sensorconnector", { controlling_client: sensorConnectorInterface.inControl.clientName });
          } else {
            message = i18n.t("sensor.messages.connected_start_sensorconnector_noname");
          }
        },

        sessionChanged: function() {
          sensorConnectorInterface.stopPolling();
          sensorConnectorInterface.startPolling();
          this.gotoState('connecting');
        },

        // Collection was started by a third party
        collectionStarted: function() {
          this.gotoState('started');
        }
      },

      starting: {
        enterState: function() {
          message = i18n.t("sensor.messages.starting_data_collection");
          isStopped = false;
          var self = this;
          this._startTimerId = setTimeout(5000, function() {
            self.gotoState('startRequestFailed');
          });
        },

        leaveState: function() {
          clearTimeout(this._startTimerId);
        },

        startRequestFailed: function() {
          this.gotoState('errorStarting');
        },

        collectionStarted: function() {
          this.gotoState('started');
        }
      },

      errorStarting: {
        enterState: function() {
          message = i18n.t("sensor.messages.error_starting_data_collection");
          isStopped = true;

          notifier.alert(i18n.t("sensor.messages.error_starting_data_collection_alert"), {
            OK: function() {
              $(this).dialog("close");
              handle('dismissErrorStarting');
            }
          });
        },

        collectionStarted: function() {
          this.gotoState('started');
        },

        dismissErrorStarting: function() {
          this.gotoState('connected');
        }
      },

      started: {
        enterState: function() {
          isStopped = false;
          setColumn();
          isPlayable = false;
          if (canControl) {
            message = i18n.t("sensor.messages.collecting_data");
          } else {
            message = i18n.t("sensor.messages.collecting_data_stop_sensorconnector");
          }

          // Check, just in case. Specifically, when errorStopping transitions here, collection
          // might have stopped in the meantime.
          if ( ! sensorConnectorInterface.isCollecting ) {
            this.gotoState('stopped');
          }

          if ( (! dataColumn)  || (! dataColumn2)) {
            this.gotoState('startedWithNoDataColumn');
          }
        },

        data: handleData,

        controlEnabled: function() {
          message = i18n.t("sensor.messages.collecting_data");
        },

        controlDisabled: function() {
          message = i18n.t("sensor.messages.collecting_data_stop_sensorconnector");
        },

        stop: function() {
          sensorConnectorInterface.requestStop().catch(function() {
            handle('stopRequestFailed');
          });
          this.gotoState('stopping');
        },

        collectionStopped: function() {
          this.gotoState('collectionStopped');
        }
      },

      // This can happen.
      startedWithNoDataColumn: {
        enterState: function() {
          message = i18n.t("sensor.messages.no_data");

          sensorConnectorInterface.requestStop();
          notifier.alert(i18n.t("sensor.messages.no_data_alert"), {
            OK: function() {
              $(this).dialog("close");
            }
          });
        },

        collectionStopped: function() {
          this.gotoState('stoppedWithNoDataColumn');
        }
      },

      stoppedWithNoDataColumn: {
        enterState: function() {
          if (isAllDataReceived()) {
            this.gotoState('connected');
          }
        },

        data: function() {
          if (isAllDataReceived()) {
            this.gotoState('connected');
          }
        }
      },

      stopping: {
        enterState: function() {
          message = i18n.t("sensor.messages.stopping_data_collection");
        },

        data: handleData,

        stopRequestFailed: function() {
          this.gotoState('errorStopping');
        },

        collectionStopped: function() {
          this.gotoState('collectionStopped');
        }
      },

      errorStopping: {
        enterState: function() {
          message = i18n.t("sensor.messages.error_stopping_data_collection");
          notifier.alert(i18n.t("sensor.messages.error_stopping_data_collection_alert"), {
            OK: function() {
              $(this).dialog("close");
              handle('dismissErrorStopping');
            }
          });
        },

        data: handleData,

        collectionStopped: function() {
          this.gotoState('collectionStopped');
        },

        dismissErrorStopping: function() {
          this.gotoState('started');
        }
      },

      // The device reports the stop of data collection before all data can be received.
      collectionStopped: {
        enterState: function() {
          message = i18n.t("sensor.messages.data_collection_stopped");
          if (isAllDataReceived()) {
            this.gotoState('collectionComplete');
          }
        },

        data: function() {
          handleData();
          if (isAllDataReceived()) {
            this.gotoState('collectionComplete');
          }
        }
      },

      collectionComplete: {
        enterState: function() {
          message = i18n.t("sensor.messages.data_collection_complete");
          isStopped = true;
          dispatch.stop();
        },

        reset: function() {
          initializeStateVariables();
          setSensorReadingDescription();
          setSensorReadingDescription2();
          this.gotoState('connecting');
          dispatch.reset();
        }
      },

      disconnected: {
        enterState: function() {
          message = i18n.t("sensor.messages.disconnected");
          sensorConnectorInterface.stopPolling();
          var self = this;
          setTimeout(function() {
            self.gotoState('notConnected');
          }, 2000);
        }
      }
    });

    // Automatically wrap all event handlers invocations with makeInvalidatingChange so that
    // outputs update from closure variable state automatically.
    function handle(eventName) {
      var args = Array.prototype.slice.call(arguments, 0);

      model.makeInvalidatingChange(function() {
        var handled = stateMachine.handleEvent.apply(stateMachine, args);

        if ( ! handled ) {
          // special handling of any events not handled by the current state:
          if (eventName === 'connectionTimedOut') {
            stateMachine.gotoState('disconnected');
          } else if (eventName === 'sessionChanged') {
            sensorConnectorInterface.stopPolling();
            stateMachine.gotoState('disconnected');
          } else if (eventName === 'statusErrored') {
            statusErrors++;
            if (statusErrors > 4) {
              stateMachine.gotoState('disconnected');
            }
          }
        }
      });
    }

    // At least for now, dispatch every interface event to the state machine.
    sensorConnectorInterface.on('*', function() {
      var args = Array.prototype.slice.call(arguments, 0);
      handle.apply(null, [this.event].concat(args));
    });

    // Also, handle "live values" every time they are received.
    sensorConnectorInterface.on('statusReceived', function() {
      if (dataColumn) {
        model.makeInvalidatingChange(function() {
          liveSensorValue = dataColumn.liveValue;
        });
      }
      if (dataColumn2) {
        model.makeInvalidatingChange(function() {
          liveSensorValue2 = dataColumn2.liveValue;
        });
      }
    });

    sensorConnectorInterface.on('controlEnabled',  function() {
      canControl = true;
    });

    sensorConnectorInterface.on('controlDisabled', function() {
      canControl = false;
    });

    labModelerMixin = new LabModelerMixin({
      metadata: metadata,
      setters: {},
      unitsDefinition: unitsDefinition,
      initialProperties: initialProperties,
      usePlaybackSupport: false
    });

    propertySupport = labModelerMixin.propertySupport;
    dispatch = labModelerMixin.dispatchSupport;
    dispatch.addEventTypes("tick", "play", "stop", "tickStart", "tickEnd");

    labModelerMixin.mixInto(model);

    initializeStateVariables();

    if (model.properties.useRandomClientId) {
      model.properties.clientId = Math.floor((1 + Math.random()) * 0x100000000).toString(16); // a 9-digit hex string that always starts with 1
    }

    model.addObserver('clientName', function() {
      sensorConnectorInterface.clientName = model.properties.clientName;
    });

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

    displayTimePropertyDescription = model.getPropertyDescription('displayTime');

    model.defineOutput('sensorReading', defaultSensorReadingDescription, function() {
      if (rawSensorValue == null) {
        return rawSensorValue;
      }
      return rawSensorValue - model.properties.tareValue;
    });

    model.defineOutput('sensorReading2', defaultSensorReadingDescription, function() {
      if (rawSensorValue2 == null) {
        return rawSensorValue2;
      }
      return rawSensorValue2 - model.properties.tareValue2;
    });

    /* Need custom implementation of duration options, because we don't use playbackSupport
      (and playbackSupport's implementation is designed for simulation models that have a
      fixed time per tick */

    model.defineOutput('durationOptions', {}, function() {
      return [1, 5, 10, 15, 20, 30, 45, 60];
    });

    model.formatTime = function(time) {
      return  displayTimePropertyDescription.format(time);
    };

    model.defineOutput('actualUseDuration', {}, labModelerMixin.computeActualUseDuration);

    model.defineOutput('actualDuration', {
      label: "Experiment duration",
      unitType: 'time',
      format: 'f'
    }, labModelerMixin.computeActualDuration);

    // Because sensorReading updates are batched and delivered much later than the live sensor value
    // from the sensor status response, we define a separate liveSensorReading output that can be
    // updated every time the status is polled.
    model.defineOutput('liveSensorReading', defaultSensorReadingDescription, function() {
      if (liveSensorValue == null) {
        return liveSensorValue;
      }
      return liveSensorValue - model.properties.tareValue;
    });

    model.defineOutput('liveSensorReading2', defaultSensorReadingDescription, function() {
      if (liveSensorValue2 == null) {
        return liveSensorValue2;
      }
      return liveSensorValue2 - model.properties.tareValue2;
    });

    model.defineOutput('sensorName', {
      label: "Sensor Name"
    }, function() {
      return sensorName;
    });

    model.defineOutput('sensorName2', {
      label: "2nd Sensor Name"
    }, function() {
      return sensorName2;
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
      return isPlayable;
    });

    model.defineOutput('hasPlayed', {
      label: "Has successfully collected data?"
    }, function() {
      return stepCounter > 0;
    });

    model.defineOutput('canTare', {
      label: "Can set a tare value?"
    }, function() {
      return canTare && isSensorTareable;
    });

    model.defineOutput('canTare2', {
      label: "Can set a tare value?"
    }, function() {
      return canTare2 && isSensorTareable2;
    });

    model.defineOutput('canControl', {
      label: "Can remotely start/stop the Sensor Connector?"
    }, function() {
      return canControl;
    });

    model.defineOutput('hasMultipleSensors', {
      label: "Are multiple sensors connected to the Sensor Connector?"
    }, function() {
      return hasMultipleSensors;
    });

    model.defineOutput('needsReload', {
      label: "Needs Reload?"
    }, function() {
      return needsReload;
    });

    model.defineOutput('message', {
      label: "User Message"
    }, function() {
      return message;
    });

    // Clean up state before we go
    // TODO
    model.on('willReset.model', function() {
      sensorConnectorInterface.stopPolling();
      if (sensorConnectorInterface.isCollecting) {
        sensorConnectorInterface.requestStop();
      }
    });

    model.addObserver('actualDuration', updateDisplayTimeRange);
    updateDisplayTimeRange();

    model.updateAllOutputProperties();
    stateMachine.gotoState('notConnected');

    return model;
  };
});
