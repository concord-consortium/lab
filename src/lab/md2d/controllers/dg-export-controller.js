/*global define model*/
/*jslint boss: true*/

define(function (require) {

  var dgExporter = require('common/dg-exporter');

  return function dgExportController(spec) {
    var parameters = spec.parameters.slice(),
        outputs    = ['timeInPs'].concat(spec.outputs.slice()),
        outputValues,
        controller;

    function getDataPoint() {
      var ret = [], i, len;

      for (i = 0, len = outputs.length; i < len; i++) {
        ret.push(model.get(outputs[i]));
      }
      return ret;
    }

    function resetData() {
      outputValues = [getDataPoint()];
    }

    function appendDataPoint() {
      outputValues.push(getDataPoint());
    }

    function removeDataAfterStepPointer() {
      // Account for initial data, which corresponds to stepCounter == 0
      outputValues.length = model.stepCounter() + 1;
    }

    function registerModelListeners() {
      // Namespace listeners to '.dgExportController' so we can eventually remove them all at once
      model.on('tick.dgExportController', appendDataPoint);
      model.on('reset.dgExportController', resetData);
      model.on('play.dgExportController', removeDataAfterStepPointer);
      model.on('invalidation.dgExportController', removeDataAfterStepPointer);
    }

    function getLabelForProperty(property) {
      var desc = model.getPropertyDescription(property),
          ret = "";

      if (desc.label && desc.label.length > 0) {
        ret += desc.label;
      } else {
        ret += property;
      }

      if (desc.units && desc.units.length > 0) {
        ret += " (";
        ret += desc.units;
        ret += ")";
      }
      return ret;
    }

    return controller = {
      modelLoadedCallback: function() {
        // Show time in picoseconds by default b/c ps are the time unit used by the standard graph.
        model.defineOutput('timeInPs', {
          label: "Time",
          units: "ps"
        }, function() {
          return model.get('time')/1000;
        });

        resetData();
        registerModelListeners();
      },

      exportData: function() {
        var parameterLabels = [],
            parameterValues = [],
            outputLabels = [],
            i;

        for (i = 0; i < parameters.length; i++) {
          parameterLabels[i] = getLabelForProperty(parameters[i]);
          parameterValues[i] = model.get(parameters[i]);
        }

        for (i = 0; i < outputs.length; i++) {
          outputLabels[i] = getLabelForProperty(outputs[i]);
        }

        dgExporter.exportData(parameterLabels, parameterValues, outputLabels, outputValues);
      }
    };
  };
});