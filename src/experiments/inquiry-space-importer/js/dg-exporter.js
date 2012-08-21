/*global console: true*/
if (typeof ISImporter === 'undefined') ISImporter = {};

if (typeof console === 'undefined') console = { log: function() {} };

ISImporter.DGExporter = {

  gameName: 'InquirySpace Importer',
  parentCollectionName: 'InquirySpace Sensor Data',
  childCollectionName: 'Sensor Readings',

  width: null,
  height: null,
  run: 1,

  init: function(width, height) {
    this.width = width;
    this.height = height;
    this.run = 1;
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
    var metadataLabels = [],
        metadataValues = [],
        dgCase,
        parentCollectionValues,
        i;

    // extract metadata in the forms needed for export.
    for (i = 0; i < metadata.length; i++) {
      metadataLabels.push({ name: metadata[i].label });
      metadataValues.push( metadata[i].value );
    }

    // Step 1. Tell DG we're a "game".
    this.doCommand('initGame', {
      name: this.gameName,
      dimensions: { width: this.width, height: this.height }
    });

    // Step 2. Create a parent collection each "row" of which has the metadata and run number
    // (It seems to be ok to call this multiple times in a single DG collection)
    this.doCommand('createCollection', {
      name: this.parentCollectionName,
      attrs: [{name: 'Run'}, {name: 'Sensor Type'}].concat(metadataLabels).concat({name: 'Number of Readings'}),
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
    parentCollectionValues = [this.run, sensorType].concat(metadataValues).concat(data.length);
    dgCase = this.doCommand('openCase', {
      collection: this.parentCollectionName,
      values: parentCollectionValues
    });

    // Step 5. Create cases in the child collection for each data point. Using 'createCases' we can
    // do this inline, so we don't need to call openCase, closeCase for each one.
    this.doCommand('createCases', {
      collection: this.childCollectionName,
      values: data,
      parent: dgCase.caseID,
      log: false
    });

    // Step 6. Close the case.
    this.doCommand('closeCase', {
      collection: this.parentCollectionName,
      values: parentCollectionValues,
      caseID: dgCase.caseID
    });

    // Finally, we've finished a "run"; increment the value,.
    this.run++;
  }
};
