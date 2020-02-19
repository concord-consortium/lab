
import _ from 'underscore';

var fields = ["computationalInputs", "computationalOutputs", "studentInputs"];

function columnLabelWithUnits(col) {
  return col.units ? col.label + " (" + col.units + ")" : col.label;
}

export default {
  importRun: function(data, run) {
    if (typeof data === 'string') data = JSON.parse(data);

    return {
      perRunLabels: _.flatten(fields.map(function(field) {
        return data.description[field];
      })).map(columnLabelWithUnits),

      perRunValues: _.flatten(fields.map(function(field) {
        return data.runs[run][field];
      })),

      perTickLabels: data.description.timeSeriesData.map(columnLabelWithUnits),

      // Just a fancy way of copying the nested arrays
      perTickValues: data.runs[run].timeSeriesData.map(function(list) {
        return list.map(_.identity);
      })
    };
  },

  numberOfRuns: function(data) {
    if (typeof data === 'string') data = JSON.parse(data);
    return data.runs.length;
  },

  timeStamps: function(data) {
    if (typeof data === 'string') data = JSON.parse(data);
    return _.pluck(data.runs, 'timeStamp');
  },

  runHavingTimeStamp: function(data, timeStamp) {
    if (typeof data === 'string') data = JSON.parse(data);

    // Would be nice to have a generator expression/lazy-list equivalent, so we could use 'pluck'
    // and 'indexOf' without having to iterate over all runs before filtering the first one.

    for (var i = 0; i < data.runs.length; i++) {
      if (data.runs[i].timeStamp === timeStamp) {
        return i;
      }
    }
    return null;

  }

};
