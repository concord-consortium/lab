/*global define, $*/

define(function (require) {
  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator'),
      TableView = require('common/views/table-view'),
      ListeningPool = require('common/listening-pool'),
      DataSet   = require('common/controllers/data-set'),
      tableControllerCount = 0;

  return function TableController(component, interactivesController) {
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
      var parent = interactivesController.interactiveContainer,
          i;

      model = interactivesController.getModel();

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.table, component);

      properties = component.propertyColumns.slice();
      // dataTable has object-based properties, which dataSet doesn't support yet
      for (i = 0; i < properties.length; i++) {
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
        width: component.width,
        height: component.height,
        tooltip: component.tooltip,
        klasses: [ "interactive-table", "component" ]
      }, controller);

      $element = view.render(parent);

      // This will load serialized data (passed as "initialData") into the data set if available.
      // Otherwise data set will be just cleared. It will also call dataResetHandler(), so view
      // will be immediately updated.
      dataSet.resetData();
    }

    // In the future, we expect datasets to be defined in the interactive json
    function lookUpDataSetById () {
      if (properties.dataSetId) {
        dataSet = interactivesController.getComponent(properties.dataSetId);
      }
      return false;
    }

    // Legacy path: The dataset is defined as part of the graph controller.
    function makeDataSet () {
      var componentData = {
        properties: properties.slice(),
        streamDataFromModel: component.streamDataFromModel,
        clearOnModelReset: component.clearOnModelLoad,
        xProperty: component.xProperty,
        clearOnModelLoad: component.clearOnModelLoad,
        id: component.id + "autoDataSet",
        initialData: component.tableData,
        type: 'dataSet'
      };
      dataSet = new DataSet(componentData, interactivesController);
    }

    function loadDataSet () {
      if (lookUpDataSetById()) {
        return;
      }
      makeDataSet();

      // Register DataSet listeners.
      listeningPool.listen(dataSet, DataSet.Events.SAMPLE_ADDED, sampleAddedHandler);
      listeningPool.listen(dataSet, DataSet.Events.DATA_RESET, dataResetHandler);
    }

    function generateColumnTitlesAndFormatters() {
      var i, propertyName, columnDesc, propertyDescription, propertyTitle, unitAbrev;
      var editable, format;

      columns = [];
      formatters = [];

      if (component.indexColumn) {
        columns.push({name: "#", editable: false});
        formatters.push(d3.format("f"));
      }

      for(i = 0; i < component.propertyColumns.length; i++) {
        propertyTitle = null;
        editable = false;
        format = '.3r';

        if (typeof component.propertyColumns[i] === "string") {
          columnDesc = {name: component.propertyColumns[i]};
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
        columns.push({name: propertyTitle, editable: editable});
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

    function replacePropertyRow() {
      dataSet.replaceDataPoint();
    }

    /**
      Removes all data from the table that correspond to steps following
      the current step pointer.
      This is used when a change is made that invalidates the future data.
    */
    function removeDataAfterStepPointer() {
      // var ptr = model.stepCounter();
      // if (tableData.length > ptr-1) {
      //   tableData.length = ptr;
      //   rowIndex = ptr;
      //   updateTable();
      // }
    }

    /**
      Causes the table to move the "current" pointer to the current model step.
      This desaturates the table region corresponding to times after the current point.
    */
    function redrawCurrentStepPointer() {
      view.clearSelection();
      view.addSelection(model.stepCounter()+1);
    }

    function handleNewDataRow(dataRow, index) {
      if (component.indexColumn) {
        dataRow.unshift(rowIndex++);
      }
      if (component.addNewRows) {
        view.appendDataRow(dataRow, index);
      } else {
        view.replaceDataRow(dataRow, index);
      }
    }

    function sampleAddedHandler(evt) {
      handleNewDataRow(evt.data, evt.data[0][0]);
    }

    function dataResetHandler(evt) {
      // Interates through the data and appends points, as if the data were coming in as new.
      var newDataSeriesArry = evt.data;
      var cols = newDataSeriesArry.length;
      var dataPoint;

      view.clear();

      if (!newDataSeriesArry || !cols) {
        return;
      }

      for (var i = 0, ii = newDataSeriesArry[0].length; i < ii; i++) {
        dataPoint = [];
        for (var j = 0; j < cols; j++) {
          dataPoint.push(newDataSeriesArry[j][i]);
        }
        handleNewDataRow(dataPoint, dataPoint[0][0]);
      }
    }

    function registerModelListeners() {
      listeningPool.listen(model, 'reset', modelResetHandler);
      /** -- Old methods not yet converted to new dataset

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

    function modelResetHandler() {
      if (component.clearDataOnReset) {
        clearTable();
      }
    }

    function clearTable() {
      headerData = $.extend(true, [], component.headerData);
      rowIndex = 0;
      updateTable();
      dataSet.resetData();
    }

    // Public API.
    controller = {
      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        model = interactivesController.getModel();
        registerModelListeners();
        dataSet.modelLoadedCallback();

        if (component.clearDataOnReset) {
          clearTable();
        } else {
          updateTable();
        }
      },

      resize: function () {
        if (view) view.resize();
      },

      getData: function(propArray) {
        // TODO: no idea why wrapping array is needed (backward compatibility)...
        return [dataSet.getPropertiesValues(propArray)];
      },

      /**
        Used when manually adding a row of property values to the table.
      */
      appendDataPropertiesToComponent: appendPropertyRow,

      addDataToCell: function (rowIndex, colIndex, val) {
        var property = properties[colIndex];
        dataSet.editDataPoint(rowIndex, property, val);
      },

      getDataInCell: function (rowIndex, colIndex) {
        var property = properties[colIndex];
        return  dataSet.getDataPointForXValue(rowIndex, property);
      },

      // Returns view container.
      getViewContainer: function () {
        return $element;
      },

      // Returns the view object.
      getView: function() {
        return view;
      },

      // Returns serialized component definition.
      serialize: function () {
        // start with the initial component definition.
        var result = $.extend(true, {}, component);
        // add headerData and tableData
        result.headerData = columns;
        result.tableData = dataSet.serialize();
        return result;
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});
