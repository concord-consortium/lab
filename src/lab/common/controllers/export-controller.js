/*global define*/
/*jslint boss: true*/

define(function (require) {

  var dgExporter = require('import-export/dg-exporter');
  var BasicDialog = require('common/controllers/basic-dialog');
  var DispatchSupport = require('common/dispatch-support');
  var _ = require('underscore');

  function modalAlert(message, buttons, i18n) {
    var dialog = new BasicDialog({
      width: "60%",
      modal: true,
      buttons: buttons
    }, i18n);

    dialog.setContent(message);
    dialog.open();
  }

  function ExportController(spec, interactivesController) {
    var perRun  = (spec.perRun || []).slice(),
        perTick = ['displayTime'].concat(spec.perTick.slice()),
        selectionComponents = (spec.selectionComponents || []).slice(),
        dispatch = new DispatchSupport(),
        perTickValues,
        controller,
        model,

        // Data that is saved just before an about-to-be-reset model is reset. This data is what
        // will be logged, so that we don't lose information about the state the user put the model
        // into before resetting.
        savedPerRunData,

        // used to compare initial parameters to parameters at export
        initialPerRunData,

        // Has exportData been called for this model since the last load or reset event?
        isUnexportedDataPresent = false;

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

    function logAction(action, state, additionalData) {
      var logString = "User " + action + ".";
      var data;

      if (state) {
        data = {
          fields: state.perRunPropertyLabels,
          values: state.perRunPropertyValues
        };
      }

      if (additionalData) {
        data = _.extend(data || {}, additionalData);
      }

      if (data) {
        logString += " Per-run Settings and Data: ";
        logString += JSON.stringify(data);
      }

      ExportController.logAction(logString);
    }

    function shouldHandleDataDiscard() {
      // If there's no unexported data, or we're not in the DG environment, never mind.
      return ExportController.canExportData() && isUnexportedDataPresent;
    }

    // Called when a model is about to be reset or reloaded, and there is unexported data in a DG
    // environment.
    function handleDataDiscard(resetRequest) {

      // Yuck, but here we go.
      modalAlert(
        "<p>You're setting up a new run without saving your data. Please indicate why:</p>" +
        "<form id='export-alert-form'>" +
        "  <p><input type='radio' name='reason' value='trying-things-out'>Just trying things out.</input></p>" +
        "  <p><input type='radio' name='reason' value='experiment-worked-not-satisfied'>Experiment worked, but not satisfied with the data.</input></p>" +
        "  <p><input type='radio' name='reason' value='something-went-wrong'>Something went wrong during the experiment.</input></p>" +
        "  <p><input type='radio' name='reason' value='other'>Other.</input></p>" +
        "</form>", {
        OK: function() {
          logAction('discarded data', getCurrentPerRunData(), {
            reasonCode: $(this).find('input[name=reason]:checked').val()
          });
          $(this).remove();
          resetRequest.proceed();
        },
        Cancel: function() {
          $(this).remove();
          resetRequest.cancel();
        }
      }, interactivesController.i18n);
    }

    // Called when exporting data; detects changes to per-run parameters since the model's initial
    // 'play' event and returns in a changelist form ready to be exported to the DG log.
    function getChangedParameterValues() {
      if (!initialPerRunData) {
        return [];
      }

      var currentPerRunData = getCurrentPerRunData();
      var changed = [];

      currentPerRunData.perRunPropertyValues.forEach(function(currentValue, i) {
        var initialValue = initialPerRunData.perRunPropertyValues[i];
        if (currentValue !== initialValue) {
          changed.push({
            field:         initialPerRunData.perRunPropertyLabels[i],
            valueAtStart:  initialValue,
            valueExported: currentValue
          });
        }
      });

      return changed;
    }

    function registerModelListeners() {
      // Namespace listeners to '.exportController' so we can eventually remove them all at once
      model.on('tick.exportController', appendDataPoint);
      model.on('reset.exportController', resetData);
      model.on('play.exportController', function() {
        removeDataAfterStepPointer();
        logAction("started the model", getCurrentPerRunData());
        // Save the per-run parameters we see now -- we'll log if a user changes any parameters
        // before exporting the data
        if (!initialPerRunData) {
          initialPerRunData = getCurrentPerRunData();
        }
      });
      model.on('invalidation.exportController', removeDataAfterStepPointer);

      model.on('willReset.exportController', function() {
        savedPerRunData = getCurrentPerRunData();
      });
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
      model = interactivesController.getModel();
      resetData();
      registerModelListeners();

      if (eventName === 'modelLoaded') {
        if (cause === 'reload') {
          logAction("reloaded the model", savedPerRunData);
        } else if (cause === 'new-run') {
          logAction("set up a new run", savedPerRunData);
        } else {
          logAction("loaded a model");
        }
      } else if (eventName === 'modelReset') {
        if (cause === 'new-run') {
          logAction("set up a new run", savedPerRunData);
        } else {
          logAction("reset the model", savedPerRunData);
        }
      }

      initialPerRunData = null;
      savedPerRunData = null;
      isUnexportedDataPresent = false;
    }

    function getCurrentPerRunData() {
      var state = {};

      state.perRunPropertyLabels = [];
      state.perRunPropertyValues = [];

      for (var i = 0; i < perRun.length; i++) {
        state.perRunPropertyLabels[i] = getLabelForProperty(perRun[i]);
        state.perRunPropertyValues[i] = model.get(perRun[i]);
      }
      return state;
    }

    function getLabelForProperty(property) {
      var desc  = model.getPropertyDescription(property),
          label = desc.getLabel(),
          units = desc.getUnitAbbreviation(),
          ret   = "";

      if (label.length > 0) {
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

    controller = {

      canExportData: function() {
        return ExportController.canExportData();
      },

      isUnexportedDataPresent: function() {
        return isUnexportedDataPresent;
      },

      selectedData: function() {
        var i, component, domain, min = Infinity, max = -Infinity, outputData = [];

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

        changedParameters = getChangedParameterValues();

        logAction("exported the model", getCurrentPerRunData(), {
          changedParameters: changedParameters
        });

        // Create a separate log event for the act of having changed parameters
        if (changedParameters.length > 0) {
          logAction("changed parameters between start and export", null, {
            changedParameters: changedParameters
          });
        }

        perRunPropertyLabels[0] = "Row";
        perRunPropertyValues[0] = null;

        for (i = 0; i < perRun.length; i++) {
          perRunPropertyLabels[i+1] = getLabelForProperty(perRun[i]);
          perRunPropertyValues[i+1] = model.get(perRun[i]);
        }

        for (i = 0; i < perTick.length; i++) {
          perTickLabels[i] = getLabelForProperty(perTick[i]);
        }

        dgExporter.exportData(perRunPropertyLabels, perRunPropertyValues, perTickLabels, this.selectedData());
        dgExporter.openTable();

        // all data was just exported
        isUnexportedDataPresent = false;
      }
    };

    // Setup

    dgExporter.init();

    // Issue an 'canExportData' event when canExportData() flips from false to true.
    dispatch.mixInto(controller);
    dispatch.addEventTypes('canExportData');

    // Make sure we emit event if canExportData becomes true. Assume codap connects only once.
    dgExporter.codapDidConnect = function() {
      if ( ExportController.canExportData() ) {
        dispatch.canExportData();
      }
    };

    registerInteractiveListeners();

    return controller;
  }

  // "Class method" (want to be able to call this before instantiating)
  ExportController.canExportData = function() {
    return dgExporter.canExportData();
  };

  ExportController.logAction = function() {
    dgExporter.logAction.apply(dgExporter, arguments);
  };

  return ExportController;
});