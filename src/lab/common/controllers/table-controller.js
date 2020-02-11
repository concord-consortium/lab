/*global define, $*/

import $__common_controllers_interactive_metadata from 'common/controllers/interactive-metadata';
import $__common_validator from 'common/validator';
import $__common_views_table_view from 'common/views/table-view';
import $__common_listening_pool from 'common/listening-pool';
import $__common_controllers_data_set from 'common/controllers/data-set';
import $__common_controllers_help_icon_support from 'common/controllers/help-icon-support';
var metadata = $__common_controllers_interactive_metadata,
  validator = $__common_validator,
  TableView = $__common_views_table_view,
  ListeningPool = $__common_listening_pool,
  DataSet = $__common_controllers_data_set,
  helpIconSupport = $__common_controllers_help_icon_support,
  tableControllerCount = 0;

export default function TableController(component, interactivesController) {
  // Public API.
  var controller,
    model,
    dataSet,
    listeningPool,
    view,
    $element,
    rowIndex,
    columns,
    formatters,
    headerData,
    properties,
    namespace = "tableController" + (++tableControllerCount);

  function initialize() {
    model = interactivesController.getModel();

    // Validate component definition, use validated copy of the properties.
    component = validator.validateCompleteness(metadata.table, component);

    properties = component.propertyColumns.slice();
    // dataTable has object-based properties, which dataSet doesn't support yet
    for (var i = 0; i < properties.length; i++) {
      if (properties[i].name) {
        properties[i] = properties[i].name;
      }
    }

    listeningPool = new ListeningPool(namespace);
    loadDataSet();

    generateColumnTitlesAndFormatters();
    rowIndex = 0;
    headerData = $.extend(true, [], component.headerData);

    view = new TableView({
      id: component.id,
      title: component.title,
      columns: columns,
      formatters: formatters,
      visibleRows: component.visibleRows,
      showBlankRow: component.showBlankRow,
      width: component.width,
      height: component.height,
      tooltip: component.tooltip,
      klasses: ["interactive-table", "component"]
    }, controller);

    $element = view.render();

    helpIconSupport(controller, component, interactivesController.helpSystem);

    // This will load serialized data (passed as "initialData") into the data set if available.
    // Otherwise data set will be just cleared. It will also call dataResetHandler(), so view
    // will be immediately updated.
    dataSet.resetData();
  }

  function loadDataSet() {
    // Get public data set (if its name is provided) or create own, private data set that will
    // be used only by this table.
    dataSet = component.dataSet ? interactivesController.getDataSet(component.dataSet) :
      new DataSet({
        name: component.id + "-autoDataSet",
        properties: properties.slice(),
        xProperty: component.xProperty,
        initialData: component.tableData,
        streamDataFromModel: component.streamDataFromModel,
        clearOnModelReset: component.clearOnModelReset
      }, interactivesController, true);

    // Register DataSet listeners.
    listeningPool.listen(dataSet, DataSet.Events.SAMPLE_ADDED, sampleAddedHandler);
    listeningPool.listen(dataSet, DataSet.Events.SAMPLE_CHANGED, sampleChangedHandler);
    listeningPool.listen(dataSet, DataSet.Events.DATA_RESET, dataResetHandler);
    listeningPool.listen(dataSet, DataSet.Events.DATA_TRUNCATED, dataTruncatedHandler);
    listeningPool.listen(dataSet, DataSet.Events.SELECTION_CHANGED, selectionChangedHandler);
  }

  function generateColumnTitlesAndFormatters() {
    var i, propertyName, columnDesc, propertyDescription, propertyTitle, unitAbrev;
    var editable, format;

    columns = [];
    formatters = [];

    if (component.indexColumn) {
      columns.push({
        name: "#",
        editable: false
      });
      formatters.push(d3.format("f"));
    }

    for (i = 0; i < component.propertyColumns.length; i++) {
      propertyTitle = null;
      editable = false;
      format = '.3r';

      if (typeof component.propertyColumns[i] === "string") {
        columnDesc = {
          name: component.propertyColumns[i]
        };
      } else {
        columnDesc = component.propertyColumns[i];
      }

      if (typeof model !== 'undefined') {
        propertyName = columnDesc.name;
        if (model.properties.hasOwnProperty(propertyName)) {
          propertyDescription = model.getPropertyDescription(propertyName);
          if (propertyDescription) {
            propertyTitle = propertyDescription.getLabel();
            unitAbrev = propertyDescription.getUnitAbbreviation();
            if (unitAbrev) {
              propertyTitle += ' (' + unitAbrev + ')';
            }
          }
        }
      }
      if (!propertyTitle) {
        propertyTitle = columnDesc.name;
        if (columnDesc.units) {
          propertyTitle += ' (' + columnDesc.units + ')';
        }
        editable = columnDesc.hasOwnProperty("editable") ? columnDesc.editable : true;
        format = columnDesc.hasOwnProperty("format") ? columnDesc.format : format;
      }
      columns.push({
        name: propertyTitle,
        editable: editable
      });
      formatters.push(d3.format(format));
    }
  }

  function updateTable() {
    generateColumnTitlesAndFormatters();
    view.updateTable({
      columns: columns,
      formatters: formatters
    });
  }

  function appendPropertyRow() {
    dataSet.appendDataPoint();
  }

  function selectionChangedHandler(evt) {
    var activeRow = evt.data;
    if (component.addNewRows) {
      view.clearSelection();
      view.addSelection(activeRow);
    } else {
      var data = dataSet.getData();
      view.replaceDataRow(nthRow(data, activeRow), 0);
    }
  }

  function data2row(dataPoint, index) {
    var dataRow = [];
    if (component.indexColumn) {
      if (index == null) {
        index = rowIndex;
      }
      dataRow.push(index);
    }
    properties.forEach(function(prop) {
      dataRow.push(dataPoint[prop]);
    });
    return dataRow;
  }

  function nthRow(data, index) {
    var dataRow = [];
    if (component.indexColumn) {
      dataRow.push(index);
    }
    properties.forEach(function(prop) {
      dataRow.push(data[prop][index]);
    });
    return dataRow;
  }

  function isEmpty(row) {
    for (var i = component.indexColumn ? 1 : 0, len = row.length; i < len; i++) {
      if (row[i] != null) return false;
    }
    return true;
  }

  function handleNewDataRow(dataPoint) {
    var dataRow = data2row(dataPoint);
    if (isEmpty(dataRow)) return;
    if (component.addNewRows) {
      view.appendDataRow(dataRow, rowIndex);
      rowIndex++;
    } else {
      view.replaceDataRow(dataRow, 0);
      rowIndex++;
    }
  }

  function sampleAddedHandler(evt) {
    handleNewDataRow(evt.data);
  }

  function sampleChangedHandler(evt) {
    var rowIndex = evt.data.index;
    var dataRow = data2row(evt.data.dataPoint, rowIndex);
    if (component.addNewRows) {
      view.replaceDataRow(dataRow, rowIndex);
    } else {
      view.replaceDataRow(dataRow, 0);
    }
  }

  function dataResetHandler(evt) {
    var data = evt.data;
    var length = dataSet.maxLength(properties);
    var dataRow;

    if (component.addNewRows) {
      var dataRows = [];
      rowIndex = 0;
      for (; rowIndex < length; rowIndex++) {
        dataRows.push(nthRow(data, rowIndex));
      }
      view.clear();
      view.appendDataRows(dataRows, 0);
    } else {
      dataRow = nthRow(data, length - 1);
      view.replaceDataRow(dataRow, 0);
      rowIndex = length;
    }
  }

  function dataTruncatedHandler(evt) {
    var dataLength = dataSet.maxLength(properties);
    rowIndex = dataLength;
    if (component.addNewRows) {
      view.removeDataRows(dataLength);
    } else {
      view.replaceDataRow(nthRow(evt.data, dataLength - 1), 0);
    }
  }

  function registerModelListeners() {
    /** -- Old methods not yet converted to new dataset

    Probably they shouldn't be converted at all. It's data set responsibility.

    model.on('stepBack.'+namespace, redrawCurrentStepPointer);
    model.on('stepForward.'+namespace, redrawCurrentStepPointer);
    model.on('seek.'+namespace, redrawCurrentStepPointer);
    model.on('play.'+namespace, function() {
      if (model.stepCounter() < tableData.length) {
        removeDataAfterStepPointer();
      }
    });
    model.on('invalidation.'+namespace, function() {
      replacePropertyRow();
    });

    **/
  }

  // Public API.
  controller = {
    /**
      Called by the interactives controller when the model finishes loading.
    */
    modelLoadedCallback: function() {
      model = interactivesController.getModel();
      registerModelListeners();
      updateTable();
    },

    resize: function() {
      if (view) view.resize();
    },

    getData: function(propArray) {
      var data = dataSet.getData();
      var result = {};
      propArray.forEach(function(prop) {
        result[prop] = data[prop];
      });
      return result;
    },

    /**
      Used when manually adding a row of property values to the table.
    */
    appendDataPropertiesToComponent: appendPropertyRow,

    addDataToCell: function(row, col, val) {
      // Index column is purely stored by view, it isn't present in DataSet.
      if (component.indexColumn) col--;
      var property = properties[col];

      if (row === rowIndex) {
        // Extend table when new non-empty data is added to "nonexistent" (in data model) row.
        if (val === "") return;
        var values = {};
        values[property] = val;
        dataSet.appendDataPoint(properties, values);
        return;
      }
      dataSet.editDataPoint(row, property, val);
    },

    getDataInCell: function(rowIndex, colIndex) {
      // Index column is purely stored by view, it isn't present in DataSet.
      if (component.indexColumn) colIndex--;
      var property = properties[colIndex];
      return dataSet.getPropertyValue(rowIndex, property);
    },

    // Returns view container.
    getViewContainer: function() {
      return $element;
    },

    // Returns the view object.
    getView: function() {
      return view;
    },

    // Returns serialized component definition.
    serialize: function() {
      // start with the initial component definition.
      var result = $.extend(true, {}, component);
      // add headerData and tableData
      result.headerData = columns;
      if (!component.dataSet) {
        // Include data directly in component definition only when no external data set is
        // referenced by table. When some external data set is used, it will serialize data.
        result.tableData = dataSet.serializeData();
      }
      return result;
    }
  };

  initialize();

  // Return Public API object.
  return controller;
};
