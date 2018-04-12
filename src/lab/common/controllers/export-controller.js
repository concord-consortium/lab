/*global define*/
/*jslint boss: true*/

define(function (require) {

  var codapInterface = require('import-export/codap-interface');
  var BasicDialog = require('common/controllers/basic-dialog');
  var DispatchSupport = require('common/dispatch-support');
  var _ = require('underscore');

  function modalAlert(title, message, buttons, i18n) {
    var dialog = new BasicDialog({
      width: "60%",
      modal: true,
      id: 'exporter-modal-alert',
      title: title,
      buttons: buttons
    }, i18n);

    dialog.setContent(message);
    dialog.open();
  }

  // Handles CODAP data export. Also, defines a few new log events which are sent to parent when export is possible.
  // In such case it's using generic logAction method, but in practice LogController will talk to CODAP too.
  function ExportController(interactivesController) {
    var dispatch = new DispatchSupport(),
        spec,
        perRun,
        perTick,
        selectionComponents,
        perTickValues,
        controller,
        model,

        // used to compare initial parameters to parameters at export
        initialPerRunData,

        // Are we waiting for timeseries data, or just sending "parent level" data to one table?
        shouldExportTimeSeries = false,

        // Is the exporter set up and ready to allow the model to export data? The difference
        // between this and canExportData is that canExportData merely exposes the fact that we
        // are embedded in CODAP or some other target for our exported data. However
        // modelCanExportData indicates that the export controller has been initialized and is
        // attached to the current model.
        modelCanExportData = false,

        // Has exportData been called for this model since the last load or reset event?
        isUnexportedDataPresent = false,

        // Whether user needs to confirm (ok/cancel) if discarding data. Set by "don't ask again"
        // checkbox when discarding data the first time`
        askAboutDataDiscard = true,

        isInitialized = false;

    function getDataPoint() {
      var ret = [], i, len;

      for (i = 0, len = perTick.length; i < len; i++) {
        ret.push(model.get(perTick[i]));
      }
      return ret;
    }

    function resetData() {
      perTickValues = [getDataPoint()];
    }

    function appendDataPoint() {
      perTickValues.push(getDataPoint());
      // indicate that latest data hasn't been exported
      isUnexportedDataPresent = true;
    }

    function removeDataAfterStepPointer() {
      // Account for initial data, which corresponds to stepCounter == 0
      perTickValues.length = model.stepCounter() + 1;
    }

    function logAction(action, state) {
      var data;
      if (state) {
        // Convert list of labels and values into plain JS object.
        data = {};
        for (var i = 0; i < state.labels.length; i++) {
          data[state.labels[i]] = state.values[i];
        }
      }
      interactivesController.logAction(action, data);
    }

    function shouldHandleDataDiscard() {
      // If there's no unexported data, or we're not in the DG environment, never mind.
      return ExportController.canExportData() &&
        askAboutDataDiscard &&
        shouldExportTimeSeries &&
        isUnexportedDataPresent;
    }

    // Called when a model is about to be reset or reloaded, there is unexported data, and the user
    // has not asked to ignore data discard
    function handleDataDiscard(resetRequest) {

      // Yuck (UI in the controller layer), but here we go.
      modalAlert(
        "Discard data?",
        "<p>Pressing New Run without pressing Analyze Data will discard the current data. " +
        "Set up a new run without saving the data first?</p>" +
          "<input type='checkbox' id='dont-ask' name='dont-ask'></input>"+
          "<label for='dont-ask'>Don't show this message again</label>" , [
          {
            id: 'button-cancel',
            text: "Go back",
            click: function() {
              askAboutDataDiscard = ! $('#dont-ask').is(':checked');
              $(this).remove();
              resetRequest.cancel();
            }
          },
          {
            id: 'button-reset',
            text: "Discard the data",
            click: function() {
              logAction('DiscardedData', getCurrentPerRunData());
              askAboutDataDiscard = ! $('#dont-ask').is(':checked');
              $(this).remove();
              resetRequest.proceed();
            }
          }
        ],
        interactivesController.i18n
      );
    }

    // Called when exporting data; detects changes to per-run parameters since the model's initial
    // 'play' event and returns in a changelist form ready to be exported to the DG log.
    function getChangedParameterValues() {
      if (!initialPerRunData) {
        return false;
      }

      var currentPerRunData = getCurrentPerRunData();
      var changesList = { values: [], labels: [] };
      var anyChanged = false;

      currentPerRunData.values.forEach(function(currentValue, i) {
        var initialValue = initialPerRunData.values[i];
        var parameter = currentPerRunData.labels[i];
        var changed = initialValue !== currentValue;

        changesList.labels.push(parameter + ' changed?');
        changesList.values.push(changed);
        anyChanged = anyChanged || changed;

        changesList.labels.push(parameter + ' (start of run)');
        changesList.values.push(initialValue);

        changesList.labels.push(parameter + ' (sent to CODAP)');
        changesList.values.push(currentValue);
      });

      return anyChanged ? changesList : false;
    }

    function registerModelListeners() {
      // Namespace listeners to '.exportController' so we can eventually remove them all at once
      model.on('tick.exportController', appendDataPoint);
      model.on('reset.exportController', resetData);
      model.on('play.exportController', function() {
        removeDataAfterStepPointer();
        // Save the per-run parameters we see now -- we'll log if a user changes any parameters
        // before exporting the data
        if (!initialPerRunData) {
          initialPerRunData = getCurrentPerRunData();
        }
      });
      model.on('invalidation.exportController', removeDataAfterStepPointer);
    }

    function willResetModelHandler(modelToBeReset, resetRequest) {

      if (modelToBeReset !== model || !shouldHandleDataDiscard()) {
        // false lets interactives controller know it should not wait for a response from us
        return false;
      }

      // There's unexported data and we're supposed to ask the user about it.

      // put up the message and aynchronously wait for a response indicating whether or not to
      // continue with the reset.
      handleDataDiscard(resetRequest);

      // Let interactives controller know it should await our response
      return true;
    }

    function registerInteractiveListeners() {
      interactivesController.on('modelLoaded.exportController', function(cause) {
        handleModelInitialization('modelLoaded', cause);
      });

      interactivesController.on('modelReset.exportController', function(cause) {
        handleModelInitialization('modelReset', cause);
      });
      // Currently there is no need to namespace these particular listeners, because interactive
      // controller uses a *special* on() method that doesn't just delegate to d3.dispatch; in fact
      // it doesn't understand namespacing!
      interactivesController.on('willResetModel', willResetModelHandler);
    }

    function handleModelInitialization(eventName, cause) {

      function handleModelLoaded() {
        model = interactivesController.getModel();

        function propertyExists(p) {
          // (Don't write 'model.properties.hasOwnProperty' because we should eventually *remove*
          // hasOwnProperty and other Object.prototype methods from model.properties' prototype
          // chain -- as it stands there appears to be a model property called 'hasOwnPropety'.)
          return Object.prototype.hasOwnProperty.call(model.properties, p);
        }

        perRun  = (spec.perRun || []).filter(propertyExists);
        if (spec.perTick == null || spec.perTick.length === 0) {
          shouldExportTimeSeries = false;
          perTick = [];
        } else {
          shouldExportTimeSeries = true;
          perTick = ['displayTime'].concat(spec.perTick.filter(propertyExists));
        }

        resetData();
        registerModelListeners();

        if (cause === 'new-run') {
          logAction("SetUpNewRun");
        }

        initialPerRunData = null;
        isUnexportedDataPresent = false;
        if (controller.canExportData()) {
          modelCanExportData = true;
          dispatch.modelCanExportData();
        }
      }

      modelCanExportData = false;

      // Don't accumulate data or logs until we know we know there is somewhere to send the data.
      // (Note that CODAP, if present, will announce itself before the model can be started by the
      // user, so there should not be data loss.)
      if (controller.canExportData()) {
        handleModelLoaded();
      } else {
        controller.on('canExportData.export-controller', handleModelLoaded);
      }
    }

    function getCurrentPerRunData() {
      var state = {};

      state.labels = [];
      state.values = [];

      for (var i = 0; i < perRun.length; i++) {
        state.labels[i] = getLabelForProperty(perRun[i]);
        state.values[i] = model.get(perRun[i]);
      }
      return state;
    }

    function getLabelForProperty(property) {
      var desc  = model.getPropertyDescription(property),
          label = desc && desc.getLabel(),
          units = desc && desc.getUnitAbbreviation(),
          ret   = "";

      if (label && label.length > 0) {
        ret += label;
      } else {
        ret += property;
      }

      if (units && units.length > 0) {
        ret += " (";
        ret += units;
        ret += ")";
      }
      return ret;
    }

    function getCodapAttrForProperty(property) {
      var desc  = model.getPropertyDescription(property),
          label = desc && desc.getLabel(),
          unit = desc && desc.getUnitAbbreviation();
      return {
        name: label && label.length > 0 ? label : property,
        unit: unit && unit.length > 0 ? unit : undefined
      };
    }

    controller = {

      // This just indicates the presence or absence of a technical means to export data (i.e.,
      // whether or not there is CODAP or some other data sink is present and listening for data)
      canExportData: function() {
        return ExportController.canExportData();
      },

      modelCanExportData: function() {
        return modelCanExportData;
      },

      // This indicates whether the default UI should allow data export. (This is advisory; custom
      // scripts can choose to call exportData() while ignoring this value)
      // Currently,
      //   * if the interactive's exports spec omits timeseries data, data can always be exported
      //   * if the interactive's exports spec includes timeseries data, the model must have been
      //     run, and it must now be stopped.
      dataAreAvailableForExport: function() {
        return ! shouldExportTimeSeries || (model.properties.hasPlayed && model.isStopped() && isUnexportedDataPresent);
      },

      isUnexportedDataPresent: function() {
        return isUnexportedDataPresent;
      },

      init: function(_spec) {
        spec = _spec;
        selectionComponents = (spec.selectionComponents || []).slice();

        isInitialized = true;
      },

      selectedData: function() {
        var i, component, domain, min = Infinity, max = -Infinity, outputData = [];

        if ( ! isInitialized ) {
          throw new Error("ExportController: selectData() was called before controller was initialized.");
        }

        for (i = 0; i < selectionComponents.length; i++) {
          component = interactivesController.getComponent(selectionComponents[i]);
          if (component && component.selectionDomain) {
            domain = component.selectionDomain();
            if (domain !== null && domain.length === 2) {
              if (min > domain[0]) {
                min = domain[0];
              }
              if (max < domain[1]) {
                max = domain[1];
              }
            }
          }
        }

        if (min < Infinity || max > -Infinity) {
          // filter the data to only that data which fails within this domain
          outputData = perTickValues.filter(function(point) {
            return point[0] > min && point[0] < max;
          });
        } else {
          outputData = perTickValues;
        }
        return outputData;
      },

      exportData: function() {
        var perRunPropertyLabels = [],
            perRunPropertyValues = [],
            perTickLabels = [],
            changedParameters,
            i;

        if ( ! isInitialized ) {
          throw new Error("ExportController: exportData() was called before controller was initialized.");
        }

        logAction("ExportedModel", getCurrentPerRunData());

        changedParameters = getChangedParameterValues();

        // Create a separate log event for the act of having changed parameters
        if (changedParameters) {
          logAction("ParameterChangeBetweenStartAndExport", changedParameters);
        }

        for (i = 0; i < perRun.length; i++) {
          perRunPropertyLabels[i] = getCodapAttrForProperty(perRun[i]);
          perRunPropertyValues[i] = model.get(perRun[i]);
        }

        for (i = 0; i < perTick.length; i++) {
          perTickLabels[i] = getCodapAttrForProperty(perTick[i]);
        }

        codapInterface.exportData(perRunPropertyLabels, perRunPropertyValues, perTickLabels, this.selectedData());

        // all data was just exported
        isUnexportedDataPresent = false;
      }
    };

    // Setup

    codapInterface.init({
      title: interactivesController.get('title'),
      aspectRatio: interactivesController.get('aspectRatio')
    });

    // Issue an 'canExportData' event when canExportData() flips from false to true.
    // Issue 'modelCanExportData' when modelCanExportData() flips
    dispatch.mixInto(controller);
    dispatch.addEventTypes('canExportData', 'modelCanExportData');

    // Make sure we emit event if canExportData becomes true. Assume codap connects only once.
    codapInterface.codapDidConnect = function() {
      if ( ExportController.canExportData() ) {
        dispatch.canExportData();
      }
    };

    registerInteractiveListeners();

    return controller;
  }

  // "Class method" (want to be able to call this before instantiating)
  ExportController.canExportData = function() {
    return codapInterface.canExportData();
  };

  return ExportController;
});