/*global define: false */

define(function(require) {

  var LabModelerMixin       = require('common/lab-modeler-mixin'),
      PropertyDescription   = require('common/property-description'),
      metadata              = require('./metadata'),
      StateMachine          = require('common/state-machine'),
      sensorServerInterface = require('sensor-server-interface'),
      unitsDefinition       = require('./units-definition'),
      sensorDefinitions     = require('./sensor-definitions'),
      BasicDialog           = require('common/controllers/basic-dialog'),
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
        sensorName,
        isStopped,
        needsReload,
        time,
        rawSensorValue,
        liveSensorValue,
        stepCounter,
        isPlayable,
        canTare,
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

      console.log("resetting sensor description: ", description);
      propertySupport.setPropertyDescription('sensorReading',
        new PropertyDescription(unitsDefinition, description));
      propertySupport.setPropertyDescription('liveSensorReading',
        new PropertyDescription(unitsDefinition, description));
    }

    function initializeStateVariables() {
      isStopped = true;
      stepCounter = 0;
      time = 0;
      rawSensorValue = undefined;
      liveSensorValue = undefined;
      timeColumn = undefined;
      dataColumn = undefined;
    }

    function setColumn() {
      var dataset = sensorServerInterface.datasets[0];
      var newDataColumn;

      // The sensor server always has column 0 as time
      timeColumn = dataset.columns[0];

      // TODO When we want to support multiple sensors, this will have to change.
      newDataColumn = dataset.columns[1];

      dataColumn = newDataColumn;
      setSensorReadingDescription();

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
        handle('tare');
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

      serialize: function () { return ""; }
    };


    stateMachine = new StateMachine({

      notConnected: {
        enterState: function() {
          message = "Not connected.";
          sensorServerInterface.startPolling("127.0.0.1:11180");
          this.gotoState('connecting');
        }
      },

      connecting: {
        enterState: function() {
          message = "Connecting...";
          if (sensorServerInterface.isConnected) {
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
          sensorServerInterface.stopPolling();
          sensorServerInterface.startPolling();
        }
      },

      initialConnectionFailure: {
        enterState: function() {
          sensorServerInterface.stopPolling();
          message = "Connection failed.";
          simpleAlert("Could not connect to the Sensor Server. Please make sure that the Sensor Server application is running on your machine.", {
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
          canTare = true;
          isPlayable = true;
          isStopped = true;

          setColumn();

          if (sensorServerInterface.isCollecting) {
            this.gotoState('started');
          }
        },

        leaveState: function() {
          canTare = false;
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
          // NOTE. Due to architecture switch mid-way, the sensorServerInterface layer is turning the
          // start request into a promise, and we're turning it back to events. The lower layer
          // could just ditch promises and emit the corresponding events with no harm. (The state
          // machine prevents almost every practical scenario where we'd see an out-of-date
          // startRequestFailure event while in a state that would respond to it.)
          sensorServerInterface.requestStart().catch(function() {
            handle('startRequestFailed');
          });
          this.gotoState('starting');
        },

        sessionChanged: function() {
          sensorServerInterface.stopPolling();
          sensorServerInterface.startPolling();
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
          isStopped = false;
          setColumn();

          // Check, just in case. Specifically, when errorStopping transitions here, collection
          // might have stopped in the meantime.
          if ( ! sensorServerInterface.isCollecting ) {
            this.gotoState('stopped');
          }

          if ( ! dataColumn ) {
            this.gotoState('startedWithNoDataColumn');
          }
        },

        data: handleData,

        stop: function() {
          sensorServerInterface.requestStop().catch(function() {
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

          sensorServerInterface.requestStop();
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
        }
      }
    });

    // Automatically wrap all event handlers invocations with makeInvalidatingChange so that
    // outputs update from closure variable state automatically.
    function handle(eventName) {
      var args = Array.prototype.slice.call(arguments, 0);
      if (eventName !== "statusReceived") {
        console.log("handling event: " + eventName, args);
      }

      model.makeInvalidatingChange(function() {
        var handled = stateMachine.handleEvent.apply(stateMachine, args);

        if ( ! handled ) {
          // special handling of any events not handled by the current state:
          if (eventName === 'connectionTimedOut') {
            stateMachine.gotoState('disconnected');
          } else if (eventName === 'sessionChanged') {
            sensorServerInterface.stopPolling();
            stateMachine.gotoState('disconnected');
          }
        }
      });
    }

    // At least for now, dispatch every interface event to the state machine.
    sensorServerInterface.on('*', function() {
      var args = Array.prototype.slice.call(arguments, 0);
      handle.apply(null, [this.event].concat(args));
    });

    // Also, handle "live values" every time they are received.
    sensorServerInterface.on('statusReceived', function() {
      if (dataColumn) {
        model.makeInvalidatingChange(function() {
          liveSensorValue = dataColumn.liveValue;
        });
      }
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
      sensorServerInterface.stopPolling();
      sensorServerInterface.requestStop();
    });

    model.updateAllOutputProperties();
    stateMachine.gotoState('notConnected');

    return model;
  };
});
