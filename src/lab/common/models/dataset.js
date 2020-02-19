
var datasetCount = 0;

export default function Dataset(definition, model) {
  // Public API.
  var dataset,
    rowIndex,
    tableData,
    xProperty,
    properties,
    namespace = "dataset" + (++datasetCount);

  function initialize() {
    rowIndex = 0;
    tableData = [];
    registerModelListeners();
    xProperty = definition.timeSeries.xProperty;
    properties = definition.timeSeries.properties;
    appendPropertyRow();
  }

  function appendPropertyRow() {
    var i, rowData = [];
    rowIndex++;
    rowData.push(model.get(xProperty));
    for (i = 0; i < properties.length; i++) {
      rowData.push(model.get(properties[i]));
    }
    tableData.push(rowData);
  }

  function registerModelListeners() {
    // Namespace listeners to '.dataset'
    model.on('tick.' + namespace, function() {
      appendPropertyRow();
    });
  }

  // Public API.
  dataset = {

    getData: function(propArray) {
      function copy(array) {
        var ret = [];
        array.forEach(function(element) {
          ret.push(element);
        });
        return ret;
      }
      var i, row, index, j, result = [],
        rowResult;
      if (propArray === undefined) {
        return copy(tableData);
      } else {
        for (i = 0; i < tableData.length; i++) {
          row = tableData[i];
          rowResult = [];
          for (j = 0; j < propArray.length; j++) {
            index = definition.properties.indexOf(propArray[j]);
            rowResult.push(row[index]);
          }
          result.push(rowResult);
        }
        return [result];
      }
    },

    reset: function() {
      tableData = $.extend(true, [], definition.tableData);
      rowIndex = 0;
    },

    /**
      Used when manually adding a row of property values to the table.
    */
    appendPropertyRow: appendPropertyRow,

    // Returns serialized component definition.
    serialize: function() {
      // start with the initial dataset definition.
      var result = $.extend(true, {}, definition);
      // add tableData
      result.tableData = tableData;
      return result;
    }
  };

  initialize();

  // Return Public API object.
  return dataset;
};
