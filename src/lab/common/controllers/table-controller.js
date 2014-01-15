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
        tableData,
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
      tableData = $.extend(true, [], component.tableData);
      headerData = $.extend(true, [], component.headerData);

      view = new TableView({
        id: component.id,
        title: component.title,
        columns: columns,
        tableData: tableData,
        formatters: formatters,
        visibleRows: component.visibleRows,
        width: component.width,
        height: component.height,
        tooltip: component.tooltip,
        klasses: [ "interactive-table", "component" ]
      });

      $element = view.render(parent);
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
        dataPoints: [],
        type: 'dataSet'
      };
      dataSet = new DataSet(componentData, interactivesController);
    }

    function loadDataSet () {
      if (lookUpDataSetById()) {
        return;
      }
      makeDataSet();
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
        formatters: formatters,
        tableData: tableData
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
      var ptr = model.stepCounter();
      if (tableData.length > ptr-1) {
        tableData.length = ptr;
        rowIndex = ptr;
        updateTable();
      }
    }

    /**
      Causes the table to move the "current" pointer to the current model step.
      This desaturates the table region corresponding to times after the current point.
    */
    function redrawCurrentStepPointer() {
      view.clearSelection();
      view.addSelection(model.stepCounter()+1);
    }

    function sampleAddedHandler(evt) {
      if (component.addNewRows) {
        view.appendDataRow(evt.data, rowIndex);
        rowIndex++;
      } else {
        view.replaceDataRow(evt.data, rowIndex);
      }
    }

    function registerDataListeners() {
      listeningPool.listen(dataSet, DataSet.Events.SAMPLE_ADDED, sampleAddedHandler);

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
        dataSet.resetData();
        headerData = $.extend(true, [], component.headerData);
        rowIndex = 0;
        updateTable();
      }
    }

    // Public API.
    controller = {
      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        model = interactivesController.getModel();
        // if (component.streamDataFromModel) {
          registerDataListeners();
        // }
        dataSet.modelLoadedCallback();
        listeningPool.listen(model, 'reset', modelResetHandler);

        if (component.clearDataOnReset) {
          modelResetHandler();
        } else {
          updateTable();
        }
      },

      resize: function () {
        if (view) view.resize();
      },

      getData: function(propArray) {
        var i, row, index, j, result = [], rowResult;
        for(i = 0; i < tableData.length; i++) {
          row = tableData[i];
          rowResult = [];
          for(j = 0; j < propArray.length; j++) {
            index = component.propertyColumns.indexOf(propArray[j]);
            if(component.indexColumn) {
              index++;
            }
            rowResult.push(row[index]);
          }
          result.push(rowResult);
        }
        return [result];
      },

      /**
        Used when manually adding a row of property values to the table.
      */
      appendDataPropertiesToComponent: appendPropertyRow,

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
        result.tableData = tableData;
        return result;
      }
    };

    initialize();

    // Return Public API object.
    return controller;
  };
});
