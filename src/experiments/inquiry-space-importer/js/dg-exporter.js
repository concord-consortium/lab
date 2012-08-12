if (typeof ISImporter === 'undefined') ISImporter = {};

if (typeof console === 'undefined') console = { log: function() {} };

ISImporter.DGExporter = {

  gameName: 'InquirySpace Importer',
  collectionName: 'Sensor Data',

  width: null,
  height: null,
  run: 1,

  init: function(width, height) {
    this.width = width;
    this.height = height;
    this.run = 1;
  },

  mockDGController: {
    doCommand: function(action, args) {
      console.log("action: ", action);
      console.log("args: ", args);
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
    var cases,
        metadataLabels = [],
        metadataValues = [],
        dgCase,
        i;

    // extract metadata in the forms needed for export.
    for (i = 0; i < metadata.length; i++) {
      metadataLabels.push({ name: metadata[i].label });
      metadataValues.push( metadata[i].value );
    }

    // Step 1. Tell DG we're a "game".
    this.doCommand( {
      action: 'initGame',
      args: {
        name: this.gameName,
        dimensions: { width: this.width, height: this.height }
      }
    });

    // Step 2. "parent collection kludge". See DataGames' Importer "game".
    this.doCommand('createCollection', {
      name: 'Import',
      attrs: [{name: 'cases'}],
      childAttrName: 'import'
    });

    // Step 3. Create Sensor Data collection
    this.doCommand('createCollection', {
      name: this.collectionName,
      attrs: [{name: 'run'}, {name: 'sensor type'}].concat(metadataLabels).concat([{ name: 'time' }, { name: 'reading' }])
    });

    // Step 4. Create "pseudo case"
    dgCase = this.doCommand('openCase', {
      collection: 'Import',
      values: ['pseudo-case']
    });

    // Step 5. Create cases for each data point.
    cases = [];
    for (i = 0; i < data.length; i++) {
      cases.push( [this.run, sensorType].concat(metadataValues).concat(data[i][0], data[i][1]) );
    }
    this.doCommand('createCases', {
      collection: this.collectionName,
      values: cases,
      parent: dgCase.caseID
    });
    this.run++;

    // Step 6. Close the case.
    this.doCommand('closeCase', {
      collection: 'Import',
      values: ['pseudo-case'],
      caseID: dgCase.caseID
    });
  }
};
