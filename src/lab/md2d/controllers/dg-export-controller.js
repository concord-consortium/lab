/*global define model*/
/*jslint boss: true*/

define(function (require) {

  var dgExporter = require('common/dg-exporter');

  return function dgExportController(spec) {
    var parameters = spec.parameters.slice(),
        outputs    = ['time'].concat(spec.outputs.slice()),
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

    return controller = {
      modelLoadedCallback: function() {
        resetData();
        registerModelListeners();
      },

      exportData: function() {
        var parameterValues = [],
            i;

        for (i = 0; i < parameters.length; i++) {
          parameterValues[i] = model.get(parameters[i]);
        }

        dgExporter.exportData(parameters, parameterValues, outputs, outputValues);
      }
    };
  };
});