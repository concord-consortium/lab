/*jshint eqnull: true */
/*global define */

define(function(require) {

  var console = require('common/console');

  return {
    gameName: 'Next Gen MW',
    parentCollectionName: 'Parameters',
    childCollectionName: 'Time Series',

    // TODO: Not entirely sure if these are required. Is perhaps the 'dimensions' property of the
    // 'initGame' command optional?
    width:  100,
    height: 100,

    nMetadataLabels: 0,
    metadataLabelPositions: {},

    init: function(width, height) {
      this.width = width;
      this.height = height;
    },

    mockDGController: {
      doCommand: function(obj) {
        console.log("action: ", obj.action);
        console.log("args: ", obj.args);
        return { caseID: 0 };
      }
    },

    getDGGameController: function() {
      if (!(window.parent) || (!window.parent.DG)) {
        return this.mockDGController;
      }
      return window.parent.DG.currGameController;
    },

    doCommand: function(name, args) {
      var controller = this.getDGGameController();

      return controller.doCommand({
        action: name,
        args: args
      });
    },

    exportData: function(parameterLabels, parameters, timeSeriesLabels, timeSeries) {
      var label,
          value,
          position,
          metadataLabels = [],
          metadataValues = [],
          dataLabels = [],
          parentCase,
          parentCollectionValues,
          i;

      // Extract metadata in the forms needed for export, ie values need to be an array of values,
      // labels need to be an array of {name: label} objects.
      // Furthermore note that during a DG session, the value for a given label needs to be in the
      // same position in the array every time the DG collection is 'created' (or reopened as the
      // case may be.)

      // TODO: This was useful for the free-form InquirySpace Importer; is it useful for data from
      // Next Gen MW models?
      for (i = 0; i < parameters.length; i++) {
        label = parameterLabels[i];
        value = parameters[i];

        if ( this.metadataLabelPositions[label] == null ) {
          this.metadataLabelPositions[label] = this.nMetadataLabels++;
        }
        position = this.metadataLabelPositions[label];

        metadataLabels[position] = { name: label };
        metadataValues[position] = value;
      }

      // Extract list of data column labels into form needed for export (needs to be an array of
      // name: label objects)
      for (i = 0; i < timeSeriesLabels.length; i++) {
        dataLabels.push({ name: timeSeriesLabels[i] });
      }

      // Export.

      // Step 1. Tell DG we're a "game".
      this.doCommand('initGame', {
        name: this.gameName,
        dimensions: { width: this.width, height: this.height }
      });

      // Step 2. Create a parent table. Each row will have the value of each of the parameters,
      // plus the number of time series points that are being exported for combination of
      // parameter values.
      // (It seems to be ok to call this multiple times with the same collection name, e.g., for
      // multiple exports during a single DG session.)
      this.doCommand('createCollection', {
        name: this.parentCollectionName,
        attrs: [{name: 'Number of Readings'}].concat(metadataLabels),
        childAttrName: 'contents'
      });

      // Step 3. Create a table to be the child of the parent table; each row of the child
      // has a single time series reading (time, property1, property2...)
      // (Again, it seems to be ok to call this for the same table multiple times per DG session)
      this.doCommand('createCollection', {
        name: this.childCollectionName,
        attrs: dataLabels
      });

      // Step 4. Open a row in the parent table. This will contain the individual time series
      // readings as children.
      parentCollectionValues = [timeSeries.length].concat(metadataValues);
      parentCase = this.doCommand('openCase', {
        collection: this.parentCollectionName,
        values: parentCollectionValues
      });

      // Step 5. Create rows in the child table for each data point. Using 'createCases' we can
      // do this inline, so we don't need to call openCase, closeCase for each row.
      this.doCommand('createCases', {
        collection: this.childCollectionName,
        values: timeSeries,
        parent: parentCase.caseID,
        log: false
      });

      // Step 6. Close the case.
      this.doCommand('closeCase', {
        collection: this.parentCollectionName,
        values: parentCollectionValues,
        caseID: parentCase.caseID
      });
    }
  };
});
