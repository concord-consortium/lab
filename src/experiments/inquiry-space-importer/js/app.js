/*globals defineClass extendClass grapher d3 */

if (typeof ISImporter === 'undefined') ISImporter = {};

// Hmm.
ISImporter.Object = defineClass();

ISImporter.sensors = {

  distance: {
    applet: new ISImporter.GoIOApplet({
      otmlPath: '/distance.otml',
      listenerPath: 'ISImporter.sensors.distance.applet',
      appletId: 'distance-sensor'
    })
  },

  temperature: {
    applet: new ISImporter.GoIOApplet({
      otmlPath: '/temperature.otml',
      listenerPath: 'ISImporter.sensors.temperature.applet',
      appletId: 'temperature-sensor'
    })
  },

  light: {
    applet: new ISImporter.GoIOApplet({
      otmlPath: '/light.otml',
      listenerPath: 'ISImporter.sensors.light.applet',
      appletId: 'light-sensor'
    })
  }
};


ISImporter.GraphController = defineClass({

  title: "Graph",
  yLabel: "Y Axis",
  xLabel: "X Axis",

  element: null,
  graph: null,
  dataset: null,

  setTitle: function() {},
  setYLabel: function() {},
  setDataset: function() {},

  initGraph: function() {
    this.graph = grapher.graph(this.element, {
      title       : this.title,
      xlabel      : this.xLabel,
      xmin        : 0,
      xmax        : 60,
      ylabel      : this.yLabel,
      ymin        : 0,
      ymax        : 40,
      points      : [],
      circleRadius: false,
      dataChange  : false
    }, "Select a sensor type");

    // allow title to be styled by CSS
    d3.select(this.element + ' text.title').style('font-size', null);
  },

  removeNotification: function() {
    this.graph.notify('');
  },

  resetGraph: function() {},

  showSelection: function() {},
  hideSelection: function() {},
  enableSelection: function() {},
  disableSelection: function() {},

  getSelectionDataset: function() {}
});


ISImporter.graphController = new ISImporter.GraphController({
  element: '#graph',
  title:   "Sensor Graph",
  xLabel:  "Time (s)"
});


ISImporter.appController = new ISImporter.Object({

  currentApplet: null,
  currentAppletReady: false,

  // could split interface controller from generic app container--but not yet.
  $sensorTypeSelector: null,

  initInterface: function() {
    var self = this,
        key;

    this.$sensorTypeSelector = $('#sensor-type-selector');

    for (key in ISImporter.sensors) {
      if (ISImporter.sensors.hasOwnProperty(key)) {
        this.addSensorTypeSelection(key, key);
      }
    }

    this.$sensorTypeSelector.on('change', function() {
      self.sensorTypeChanged();
    });
  },

  // initialization
  addSensorTypeSelection: function(value, text) {
    this.$sensorTypeSelector.append('<option value="' + value + '">' + text + '</option>');
  },

  setupGraph: function(title, yLabel, yMax, dataset) {},
  setupRealtimeDisplay: function(units) {},

  // events
  sensorTypeChanged: function() {
    var val = this.getSensorTypeSelection(),
        self = this;

    if (this.currentApplet === ISImporter.sensors[val].applet) {
      return;
    }

    if (this.currentApplet) this.currentApplet.remove();

    this.currentApplet = ISImporter.sensors[val].applet;
    this.currentAppletReady = false;
    this.currentApplet.on('sensorReady', function() {
      self.sensorAppletReady();
    });

    this.currentApplet.append();

    ISImporter.graphController.removeNotification();
  },

  metadataLabelChanged: function(fieldNum) {},
  metadataValueChanged: function(fieldNum) {},
  frequencyChanged: function() {},
  selectionChanged: function() {

  },

  sensorAppletReady: function() {
    if (this.currentAppletReady) return;
    this.currentAppletReady = true;

    console.log("Hello!");
  },

  startClicked: function() {},
  stopClicked: function() {},
  resetClicked: function() {},
  exportClicked: function() {},
  selectClicked: function() {},
  cancelClicked: function() {},

  // accessors
  getSensorTypeSelection: function() {
    return this.$sensorTypeSelector.val();
  },

  getMetadataLabel: function(fieldNum) {},
  getMetadataValue: function(fieldNum) {},
  getFrequency: function() {}

});

ISImporter.main = function() {
  ISImporter.graphController.initGraph();
  ISImporter.appController.initInterface();

  window.graph = ISImporter.graphController.graph;
};

$(document).ready(function() {
  ISImporter.main();
});
