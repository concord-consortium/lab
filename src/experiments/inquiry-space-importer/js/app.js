/*globals defineClass extendClass grapher */

if (typeof ISImporter === 'undefined') ISImporter = {};


ISImporter.sensors = {

  distance: new ISImporter.GoIOApplet({
    otmlPath: '/distance.otml',
    listenerPath: 'ISImporter.sensors.distance',
    appletId: 'distance-sensor'
  }),

  temperature: new ISImporter.GoIOApplet({
    otmlPath: '/temperature.otml',
    listenerPath: 'ISImporter.sensors.temperature',
    appletId: 'temperature-sensor'
  }),

  light: new ISImporter.GoIOApplet({
    otmlPath: '/light.otml',
    listenerPath: 'ISImporter.sensors.light',
    appletId: 'light-sensor'
  })
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
      points      : [ [0,0],[10,10],[15,5] ],
      circleRadius: false,
      dataChange  : false
    });
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


ISImporter.main = function() {
  ISImporter.graphController.initGraph();
  window.graph = ISImporter.graphController.graph;
};

$(document).ready(function() {
  ISImporter.main();
});
