/*global define, $, model*/

define(function (require) {
  var metadata  = require('common/controllers/interactive-metadata'),
      validator = require('common/validator'),
      TableView = require('common/views/table-view'),
      tableControllerCount = 0;

  return function TableController(component, scriptingAPI, interactivesController) {
        // Public API.
    var controller,
        // Options definitions from component JSON definition.
        options,
        view,
        $element,
        rowIndex,
        columns,
        formatters,
        tableData,
        namespace = "tableController" + (++tableControllerCount);

    function initialize() {
      var parent = interactivesController.interactiveContainer,
          i, len,propertyName, propertyDescription, propertyTitle;

      // Validate component definition, use validated copy of the properties.
      component = validator.validateCompleteness(metadata.table, component);

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
        visibleRows: component.visibleRows
      });

      $element = view.render(parent);

      $element
        .addClass("interactive-table")
        .addClass("component");

      if (component.tooltip) {
        $element.attr("title", component.tooltip);
      }
    }

    function generateColumnTitlesAndFormatters() {
      var i, len, propertyName, propertyDescription, propertyTitle, unitAbrev;

      columns = [];
      formatters = [];

      if (component.indexColumn) {
        columns.push("#");
        formatters.push(d3.format("f"));
      }

      for(i = 0; i < component.propertyColumns.length; i++) {
        if (typeof model !== 'undefined') {
          propertyName = component.propertyColumns[i];
          propertyDescription = model.getPropertyDescription(propertyName);
          if (propertyDescription) {
            propertyTitle = propertyDescription.getLabel();
            unitAbrev = propertyDescription.getUnitAbbreviation();
            if (unitAbrev) {
              propertyTitle += ' (' + unitAbrev + ')';
            }
            columns.push(propertyTitle);
            // formatters.push(propertyDescription.format);
            formatters.push(d3.format('.2r'));
          } else {
            columns.push(component.propertyColumns[i]);
            formatters.push(d3.format('.2r'));
          }
        } else {
          columns.push(component.propertyColumns[i]);
          formatters.push(d3.format('.2r'));
        }
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
      var i, rowData = [];
      if (component.addNewRows) {
        rowIndex++;
      }
      if (component.indexColumn) {
        rowData.push(rowIndex);
      }
      for(i = 0; i < component.propertyColumns.length; i++) {
        rowData.push(model.get(component.propertyColumns[i]));
      }
      if (component.addNewRows) {
        tableData.push(rowData);
        view.appendDataRow(rowData, rowIndex);
      } else {
        tableData[tableData.length-1] = rowData;
        view.replaceDataRow(rowData, 1);
      }
    }

    function registerModelListeners() {
      // Namespace listeners to '.tableController' so we can eventually remove them all at once
      model.on('tick.'+namespace, appendPropertyRow);
      model.on('invalidation.'+namespace, function() {
        appendPropertyRow();
      });
    }

    // Public API.
    controller = {
      /**
        Called by the interactives controller when the model finishes loading.
      */
      modelLoadedCallback: function() {
        tableData = $.extend(true, [], component.tableData);
        headerData = $.extend(true, [], component.headerData);
        updateTable();
        if (component.streamDataFromModel) {
          registerModelListeners()
        }
      },

      /**
        Called by the interactives controller when the model is reset.
      */
      modelResetCallback: function() {
        if (component.clearDataOnReset) {
          tableData = $.extend(true, [], component.tableData);
          headerData = $.extend(true, [], component.headerData);
          updateTable();
        }
      },

      /**
        Used when manually adding a row of property values to the table.
      */
      appendDataPropertiesToComponent: appendPropertyRow,

      // Returns view container.
      getViewContainer: function () {
        return $element;
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
