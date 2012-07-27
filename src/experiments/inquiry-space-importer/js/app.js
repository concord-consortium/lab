/*globals defineClass extendClass grapher */

if (typeof ISImporter === 'undefined') ISImporter = {};

var graph;

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


ISImporter.main = function() {
  graph = grapher.graph('#graph', {
    title       : "Sensor Graph",
    xlabel      : "Time (s)",
    xmin        : 0,
    xmax        : 60,
    ylabel      : "Y Axis",
    ymin        : 0,
    ymax        : 40,
    points      : [],
    circleRadius: false,
    dataChange  : false
  });
  graph.data([[0,0],[10,10],[15,5]]);
};

$(document).ready(function() {
  ISImporter.main();
});
