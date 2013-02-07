/*global define */

define(function(require) {

  var _ = require('underscore'),
     fields = ["computationalInputs", "computationalOutputs", "studentInputs"];

  function columnLabelWithUnits(col) {
    return col.units ? col.label + " (" + col.units + ")" : col.label;
  }

  return {
    importRun: function(data, run) {
      if (typeof data === 'string') data = JSON.parse(data);

      return {
        perRunLabels: _.flatten(fields.map(function (field) {
          return data.description[field];
        })).map(columnLabelWithUnits),

        perRunValues: _.flatten(fields.map(function (field) {
          return data.runs[run][field];
        })),

        perTickLabels: data.description.timeSeriesData.map(columnLabelWithUnits),

        // Just a fancy way of copying the nested arrays
        perTickValues: data.runs[run].timeSeriesData.map(function (list) {
          return list.map(_.identity);
        })
      };
    },

    numberOfRuns: function(data) {
      if (typeof data === 'string') data = JSON.parse(data);
      return data.runs.length;
    }

  };
});
