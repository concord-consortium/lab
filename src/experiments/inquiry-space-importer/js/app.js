/*globals defineClass extendClass */

if (typeof ISImporter === 'undefined') ISImporter = {};

ISImporter.main = function() {

  distanceSensor = new ISImporter.GoIOApplet({
    otmlPath: '/distance.otml',
    listenerPath: 'distanceSensor'
  }),

  temperatureSensor = new ISImporter.GoIOApplet({
    otmlPath: '/temperature.otml',
    listenerPath: 'temperatureSensor'
  }),

  lightSensor = new ISImporter.GoIOApplet({
    otmlPath: '/light.otml',
    listenerPath: 'lightSensor'
  });

};


$(document).ready(function() {
  ISImporter.main();
});
