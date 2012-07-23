/*globals defineClass extendClass */

if (typeof ISImporter === 'undefined') ISImporter = {};

/**
  Base SensorApplet class appends the appropriate HTML to the DOM.
*/
ISImporter.SensorApplet = defineClass({
  doStuff1: function() {
    console.log("doing stuff 1 as SensorApplet");
  },
  doStuff2: function() {
    console.log("doing stuff 2 as SensorApplet");
  }
});

ISImporter.GoIOApplet = extendClass(ISImporter.SensorApplet, {
  doStuff1: function() {
    console.log("doing stuff 1 as GoIOApplet");
    this.constructor.__super__.doStuff1.apply(this, arguments);
  }
});


ISImporter.main = function() {

  distanceSensor = new ISImporter.GoIOApplet({
    otmlString: 'distance'
  }),

  temperatureSensor = new ISImporter.GoIOApplet({
    otmlString: 'temperature'
  }),

  lightSensor = new ISImporter.GoIOApplet({
    otmlString: 'light'
  });

};


$(document).ready(function() {
  ISImporter.main();
});
