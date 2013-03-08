/*jshint eqnull: true */
/*global console: true */

if (typeof ISImporter === 'undefined') ISImporter = {};

if (typeof console === 'undefined') console = { log: function() {} };

ISImporter.DGExporter = {

  gameName: 'InquirySpace Importer',
  parentCollectionName: 'InquirySpace Sensor Data',
  childCollectionName: 'Sensor Readings',

  width: null,
  height: null,
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

  exportData: function(sensorType, data, metadata) {
    var label,
        value,
        position,
        metadataLabels = [],
        metadataValues = [],
        dgCase,
        parentCollectionValues,
        i;

    // Extract metadata in the forms needed for export, ie values need to be an array of values,
    // labels need to be an array of {name: label} objects.
    // Furthermore note that during a DG session, the value for a given label needs to be in the
    // same position in the array every time the DG collection is 'created' (or reopened as the
    // case may be.)
    for (i = 0; i < metadata.length; i++) {
      label = metadata[i].label;
      value = metadata[i].value;

      if ( this.metadataLabelPositions[label] == null ) {
        this.metadataLabelPositions[label] = this.nMetadataLabels++;
      }
      position = this.metadataLabelPositions[label];

      metadataLabels[position] = { name: label };
      metadataValues[position] = value;
    }

    // Step 1. Tell DG we're a "game".
    this.doCommand('initGame', {
      name: this.gameName,
      dimensions: { width: this.width, height: this.height }
    });

    // Step 2. Create a parent collection each "row" of which has the sensor type, num of readings,
    // and metadata items.
    // (It seems to be ok to call this multiple times in a single DG collection)
    this.doCommand('createCollection', {
      name: this.parentCollectionName,
      attrs: [{name: 'Sensor Type'}, {name: 'Number of Readings'}].concat(metadataLabels),
      childAttrName: 'contents'
    });

    // Step 3. Create a collection to be the child of the parent collection; each row of the child
    // has a single (time, value) sensor reading.
    this.doCommand('createCollection', {
      name: this.childCollectionName,
      attrs: [{name: 'Time'}, {name: 'Reading'}]
    });

    // Step 4. Open a case in the parent collection. This will contain the individual sensor readings
    // as children.
    parentCollectionValues = [sensorType, data.length].concat(metadataValues);
    dgCase = this.doCommand('openCase', {
      collection: this.parentCollectionName,
      values: parentCollectionValues
    });

    // Step 5. Create cases in the child collection for each data point. Using 'createCases' we can
    // do this inline, so we don't need to call openCase, closeCase for each one.
    this.doCommand('createCases', {
      collection: this.childCollectionName,
      values: data,
      parent: dgCase.caseID
    });

    // Step 6. Close the case.
    this.doCommand('closeCase', {
      collection: this.parentCollectionName,
      values: parentCollectionValues,
      caseID: dgCase.caseID
    });

    // Step 7. Create Table.
    this.doCommand('createComponent', {
      type: 'DG.TableView',
      log: false
    });
  },

  /**
    Call any time to log an event to DataGames
  */
  logAction: function(logString) {
    this.doCommand('logAction', {
      formatStr: logString
    });
  }
};
