/*global define model*/
/*jslint boss: true*/

define(function (require) {

  var dgExporter = require('common/dg-exporter');

  return function dgExportController(spec) {
    var perRun  = spec.perRun.slice(),
        perTick = ['timeInPs'].concat(spec.perTick.slice()),
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

        // put per-run parameters before per-run outputs
        function is(type) {
          return function(p) { return model.getPropertyType(p) === type; };
        }
        perRun = perRun.filter(is('parameter')).concat(perRun.filter(is('output')));

        resetData();
        registerModelListeners();
      },

      exportData: function() {
        var perRunPropertyLabels = [],
            perRunPropertyValues = [],
            perTickLabels = [],
            i;

        for (i = 0; i < perRun.length; i++) {
          perRunPropertyLabels[i] = getLabelForProperty(perRun[i]);
          perRunPropertyValues[i] = model.get(perRun[i]);
        }

        for (i = 0; i < perTick.length; i++) {
          perTickLabels[i] = getLabelForProperty(perTick[i]);
        }

        dgExporter.exportData(perRunPropertyLabels, perRunPropertyValues, perTickLabels, perTickValues);
      }
    };
  };
});