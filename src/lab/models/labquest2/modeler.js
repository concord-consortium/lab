/*global define: false */

define(function(require) {

  var LabModelerMixin      = require('common/lab-modeler-mixin'),
      PropertyDescription  = require('common/property-description'),
      metadata             = require('./metadata'),
      StateMachine         = require('common/state-machine'),
      labquest2Interface   = require('labquest2-interface'),
      unitsDefinition      = require('./units-definition'),
      sensorDefinitions    = require('./sensor-definitions'),
      BasicDialog          = require('common/controllers/basic-dialog'),
      _ = require('underscore');

  // TODO move to view
  function simpleAlert(message, buttons) {
    var dialog = new BasicDialog({
          width: "60%",
          buttons: buttons
        });

    dialog.setContent(message);
    dialog.open();
  }

  var defaultSensorReadingDescription = {
      label: "Sensor Reading",
      unitAbbreviation: "-",
      format: '.2f',
      min: 0,
      max: 10
    };

  return function Model(initialProperties) {
    var labModelerMixin,
        propertySupport,
        dispatch,
        stateMachine,
        timeColumn,
        dataColumn,
        selectedSensor,
        sensorName,
        isStopped,
        needsReload,
        time,
        rawSensorValue,
        liveSensorValue,
        stepCounter,
        isPlayable,
        canConnect,
        canTare,
        canPossiblyTare,
        canControl,
        hasMultipleSensors,
        isSensorTareable,
        message,
        model;

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
          sensorName = sensorDefinition.sensorName;
        } else {
          description = {
            label: "Sensor Reading",
            unitAbbreviation: dataColumn.units,
            format: '.2f',
            min: 0,
            max: 10
          };
          isSensorTareable = true;
          sensorName = dataColumn.units + " sensor";
        }
      } else {
        description = defaultSensorReadingDescription;
        isSensorTareable = false;
        sensorName = "(no sensor)";
      }

      propertySupport.setPropertyDescription('sensorReading',
        new PropertyDescription(unitsDefinition, description));
      propertySupport.setPropertyDescription('liveSensorReading',
        new PropertyDescription(unitsDefinition, description));
    }

    function initializeStateVariables() {
      isStopped = true;
      canConnect = false;
      canControl = labquest2Interface.canControl;
      hasMultipleSensors = false;
      selectedSensor = -1;
      stepCounter = 0;
      time = 0;
      rawSensorValue = undefined;
      liveSensorValue = undefined;
      timeColumn = undefined;
      dataColumn = undefined;
    }

    function setColumn() {
      var dataset = labquest2Interface.datasets[0];
      var newDataColumn;

      hasMultipleSensors = dataset.columns.length > 2;

      timeColumn = _.find(dataset.columns, function(column) {
        return column.units === 's';
      });

      // Select the column chosen by the user
      if (selectedSensor == -1) {
        newDataColumn = _.find(dataset.columns, function(column) {
          return column.units !== 's';
        });
      } else {
        newDataColumn = dataset.columns[selectedSensor];
      }

      if (dataColumn !== newDataColumn) {
        dataColumn = newDataColumn;
        setSensorReadingDescription();
      }
      if ( ! dataColumn ) {
        liveSensorValue = undefined;
      }
    }

    function handleData() {
      if (!timeColumn || !dataColumn) {
        return;
      }

      var numberOfValues = Math.min(timeColumn.data.length, dataColumn.data.length);
      for (; stepCounter < numberOfValues; stepCounter++) {
        time = timeColumn.data[stepCounter];
        rawSensorValue = dataColumn.data[stepCounter];
        model.updateAllOutputProperties();
        dispatch.tick();
      }
    }

    function isAllColumnDataReceieved(column) {
      return column.receivedValuesTimeStamp >= column.requestedValuesTimeStamp;
    }

    function isAllDataReceived() {
      return isAllColumnDataReceieved(timeColumn) && (! dataColumn || isAllColumnDataReceieved(dataColumn));
    }

    function connectedSensors() {
      var sensors = [],
          dataset = labquest2Interface.datasets[0],
          i, unit;

      for (i=0; i < dataset.columns.length; i++) {
        sensors.push(dataset.columns[i].units);
      }
      return sensors;
    }

    model = {

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      connect: function(address) {
        handle('connect', address);
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
      getSelectedSensor: function() { return selectedSensor; },
      setSelectedSensor: function(sensorIndex) {
        if (selectedSensor != sensorIndex) {
          selectedSensor = sensorIndex;
          setColumn();
        }
      },

      serialize: function () { return ""; }
    };


    stateMachine = new StateMachine({

      notConnected: {
        enterState: function() {
          message = "Not connected.";
          canConnect = true;
        },

        leaveState: function() {
          canConnect = false;
        },

        connect: function(address) {
          labquest2Interface.startPolling(address);
          this.gotoState('connecting');
        }
      },

      connecting: {
        enterState: function() {
          message = "Connecting...";
          if (labquest2Interface.isConnected) {
            this.gotoState('connected');
          }
        },

        statusErrored: function() {
          this.gotoState('initialConnectionFailure');
        },

        connectionTimedOut: function() {
          this.gotoState('initialConnectionFailure');
        },

        statusReceived: function() {
          this.gotoState('connected');
        },

        sessionChanged: function() {
          // start a new session, stay connecting...
          labquest2Interface.stopPolling();
          labquest2Interface.startPolling();
        }
      },

      initialConnectionFailure: {
        enterState: function() {
          labquest2Interface.stopPolling();
          message = "Connection failed.";
          simpleAlert("Could not connect to the LabQuest2. Please make sure the address is correct and that the LabQuest2 can be reached from this computer", {
            OK: function() {
              $(this).dialog("close");
              handle('dismiss');
            }
          });
        },

        dismiss: function() {
          this.gotoState('notConnected');
        }
      },

      connected: {
        enterState: function() {
          message = "Connected.";
          canPossiblyTare = true;
          isPlayable = true;
          isStopped = true;

          setColumn();

          if (canControl) {
            this.controlEnabled();
          } else {
            this.controlDisabled();
          }

          if (labquest2Interface.isCollecting) {
            this.gotoState('started');
          }
        },

        leaveState: function() {
          canPossiblyTare = false;
          isPlayable = false;
        },

        // Give some feedback on the currently selected column from which data will be collected.
        columnAdded: setColumn,
        columnRemoved: setColumn,
        columnTypeChanged: setColumn,
        columnMoved: setColumn,

        tare: function() {
          if (dataColumn) {
            model.properties.tareValue = dataColumn.liveValue;
          }
        },

        // User requests collection
        start: function() {
          // NOTE. Due to architecture switch mid-way, the labquest2Interface layer is turning the
          // start request into a promise, and we're turning it back to events. The lower layer
          // could just ditch promises and emit the corresponding events with no harm. (The state
          // machine prevents almost every practical scenario where we'd see an out-of-date
          // startRequestFailure event while in a state that would respond to it.)
          labquest2Interface.requestStart().catch(function() {
            handle('startRequestFailed');
          });
          this.gotoState('starting');
        },

        controlEnabled: function() {
          message = "Connected.";
        },

        controlDisabled: function() {
          message = "Connected. Press start on your LabQuest2 to begin.";
        },

        sessionChanged: function() {
          labquest2Interface.stopPolling();
          labquest2Interface.startPolling();
          this.gotoState('connecting');
        },

        // Collection was started by a third party
        collectionStarted: function() {
          this.gotoState('started');
        }
      },

      starting: {
        enterState: function() {
          message = "Starting data collection...";
          isStopped = false;
          var self = this;
          this._startTimerId = setTimeout(3000, function() {
            self.gotoState('startRequestFailed');
          });
        },

        leaveState: function() {
          clearTimeout(this._startTimerId);
        },

        startRequestFailed: function() {
          this.gotoState('errorStarting');
        },

        stop: function() {
          this.gotoState('canceling');
        },

        collectionStarted: function() {
          this.gotoState('started');
        }
      },

      errorStarting: {
        enterState: function() {
          message = "Error starting data collection.";
          isStopped = true;

          simpleAlert("Could not start data collection. Make sure that (remote starting) is enabled", {
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
          if (canControl) {
            message = "Collecting data.";
          } else {
            message = "Collecting data. Press stop on your LabQuest2 to end.";
          }
          isStopped = false;
          setColumn();

          // Check, just in case. Specifically, when errorStopping transitions here, collection
          // might have stopped in the meantime.
          if ( ! labquest2Interface.isCollecting ) {
            this.gotoState('stopped');
          }

          if ( ! dataColumn ) {
            this.gotoState('startedWithNoDataColumn');
          }
        },

        data: handleData,

        controlEnabled: function() {
          message = "Collecting data.";
        },

        controlDisabled: function() {
          message = "Collecting data. Press stop on your LabQuest2 to end.";
        },

        stop: function() {
          labquest2Interface.requestStop().catch(function() {
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
          message = "No data is available.";

          labquest2Interface.requestStop();
          simpleAlert("The LabQuest does not appear to be reporting data for the plugged-in device", {
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

      canceling: {
        enterState: function() {
          message = "Canceling data collection...";
          isStopped = true;
        },

        data: handleData,

        cancelRequestFailed: function() {
          this.gotoState('errorCanceling');
        },

        collectionStarted: function() {
          labquest2Interface.requestStop().catch(function() {
            handle('cancelRequestFailed');
          });
        },

        collectionStopped: function() {
          this.gotoState('collectionStopped');
        }
      },

      errorCanceling: {
        enterState: function() {
          message = "Error canceling data collection.";
          simpleAlert("Could not cancel data collection. Make sure that (remote starting) is enabled", {
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

      stopping: {
        enterState: function() {
          message = "Stopping data collection...";
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
          message = "Error stopping data collection.";
          simpleAlert("Could not stop data collection. Make sure that (remote starting) is enabled", {
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
          message = "Data collection stopped.";
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
          message = "Data collection complete.";
          isStopped = true;
        },

        reset: function() {
          initializeStateVariables();
          setSensorReadingDescription();
          this.gotoState('connecting');
          dispatch.reset();
        }
      },

      disconnected: {
        enterState: function() {
          message = "Disconnected.";
          canConnect = true;
          labquest2Interface.stopPolling();
        },

        leaveState: function() {
          canConnect = false;
        },

        connect: function(address) {
          labquest2Interface.startPolling(address);
          this.gotoState('connecting');
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
          if (eventName === 'connectionTimedOut' ||
              eventName === 'sessionChanged') {
            stateMachine.gotoState('disconnected');
          }
        }
      });
    }

    // At least for now, dispatch every interface event to the state machine.
    labquest2Interface.on('*', function() {
      var args = Array.prototype.slice.call(arguments, 0);
      handle.apply(null, [this.event].concat(args));
    });

    // Also, handle "live values" every time they are received.
    labquest2Interface.on('statusReceived', function() {
      if (dataColumn) {
        model.makeInvalidatingChange(function() {
          liveSensorValue = dataColumn.liveValue;
          canTare = canPossiblyTare && dataColumn.data.length == 0;
        });
      }
    });

    labquest2Interface.on('controlEnabled',  function() {
      canControl = true;
    });

    labquest2Interface.on('controlDisabled', function() {
      canControl = false;
    });

    labModelerMixin = new LabModelerMixin({
      metadata: metadata,
      setters: {},
      unitsDefinition: unitsDefinition,
      initialProperties: initialProperties,
      usePlaybackSupport: false
    });

    labModelerMixin.mixInto(model);
    propertySupport = labModelerMixin.propertySupport;
    dispatch = labModelerMixin.dispatchSupport;
    dispatch.addEventTypes("tick", "play", "stop", "tickStart", "tickEnd");

    initializeStateVariables();

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

    model.defineOutput('sensorReading', defaultSensorReadingDescription, function() {
      if (rawSensorValue == null) {
        return rawSensorValue;
      }
      return rawSensorValue - model.properties.tareValue;
    });

    // Because sensorReading updates are batched and delivered much later than the live sensor value
    // from the sensor status response, we define a separate liveSensorReading output that can be
    // updated every time the status is polled.
    model.defineOutput('liveSensorReading', defaultSensorReadingDescription, function() {
      if (liveSensorValue == null) {
        return liveSensorValue;
      }
      return liveSensorValue - model.properties.tareValue;
    });

    model.defineOutput('sensorName', {
      label: "Sensor Name"
    }, function() {
      return sensorName;
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

    model.defineOutput('canConnect', {
      label: "Can begin connecting to the LabQuest2?"
    }, function() {
      return canConnect;
    });

    model.defineOutput('canControl', {
      label: "Can remotely start/stop the LabQuest2?"
    }, function() {
      return canControl;
    });

    model.defineOutput('hasMultipleSensors', {
      label: "Are multiple sensors connected to the LabQuest2?"
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
      labquest2Interface.stopPolling();
      labquest2Interface.requestStop();
    });

    model.updateAllOutputProperties();
    stateMachine.gotoState('notConnected');

    return model;
  };
});
