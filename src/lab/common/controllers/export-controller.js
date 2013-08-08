/*global define, model*/
/*jslint boss: true*/

define(function (require) {

  var dgExporter = require('import-export/dg-exporter');

  var ExportController = function exportController(spec) {
    var perRun  = (spec.perRun || []).slice(),
        perTick = ['displayTime'].concat(spec.perTick.slice()),
        runNumber = 1,
        perTickValues,
        controller;

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
    }

    function removeDataAfterStepPointer() {
      // Account for initial data, which corresponds to stepCounter == 0
      perTickValues.length = model.stepCounter() + 1;
    }

    function logAction(action) {
      var logString,
          perRunPropertyLabels = [],
          perRunPropertyValues = [],
          i;

      for (i = 0; i < perRun.length; i++) {
        perRunPropertyLabels[i] = getLabelForProperty(perRun[i]);
        perRunPropertyValues[i] = model.get(perRun[i]);
      }

      logString = "User " + action + " model. ";
      logString += "Per-run Settings and Data: ";
      logString += JSON.stringify({
        action: action,
        type: "model",
        fields: perRunPropertyLabels,
        values: perRunPropertyValues
      });

      ExportController.logAction(logString);
    }

    function registerModelListeners() {
      // Namespace listeners to '.exportController' so we can eventually remove them all at once
      model.on('tick.exportController', appendDataPoint);
      model.on('reset.exportController', resetData);
      model.on('play.exportController', removeDataAfterStepPointer);
      model.on('invalidation.exportController', removeDataAfterStepPointer);

      model.on('play.exportController', function() {
        logAction('started');
      });

      model.on('willReset.exportController', function() {
        logAction('reset');
      });

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

    return controller = {

      modelLoadedCallback: function() {
        resetData();
        registerModelListeners();
      },

      exportData: function() {
        var perRunPropertyLabels = [],
            perRunPropertyValues = [],
            perTickLabels = [],
            i;

        logAction('exported');
        perRunPropertyLabels[0] = "Run";
        perRunPropertyValues[0] = runNumber++;

        for (i = 0; i < perRun.length; i++) {
          perRunPropertyLabels[i+1] = getLabelForProperty(perRun[i]);
          perRunPropertyValues[i+1] = model.get(perRun[i]);
        }

        for (i = 0; i < perTick.length; i++) {
          perTickLabels[i] = getLabelForProperty(perTick[i]);
        }

        dgExporter.exportData(perRunPropertyLabels, perRunPropertyValues, perTickLabels, perTickValues);
        dgExporter.openTable();
      }
    };
  };

  // "Class method" (want to be able to call this before instantiating)
  // Do we have a sink
  ExportController.isExportAvailable = function() {
    return dgExporter.isExportAvailable();
  };

  ExportController.logAction = function() {
    dgExporter.logAction.apply(dgExporter, arguments);
  };

  return ExportController;
});