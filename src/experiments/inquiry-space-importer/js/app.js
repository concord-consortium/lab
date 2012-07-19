/*globals $ _mixin: true _extends: true ISImporter: true */

if (typeof ISImporter === 'undefined') ISImporter = {};

_mixin = function(dest, src) {
  var hasProp = {}.hasOwnProperty,
      key;

  for (key in src) {
    if (hasProp.call(src, key)) dest[key] = src[key];
  }
};

_extends = function(child, parent) {
  var hasProp = {}.hasOwnProperty,
      key;

  for (key in parent) {
    if (hasProp.call(parent, key)) child[key] = parent[key];
  }

  function ctor() {
    this.constructor = child;
  }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  return child;
};


ISImporter.SensorApplet = (function() {
  function SensorApplet() {}

  _mixin(SensorApplet.prototype, {
    doStuff1: function() {
      console.log("doing stuff 1 as SensorApplet");
    },
    doStuff2: function() {
      console.log("doing stuff 2 as SensorApplet");
    }
  });

  return SensorApplet;
}());


ISImporter.GoIOApplet = (function() {
  function GoIOApplet() {}
  _extends(GoIOApplet, ISImporter.SensorApplet);
  _mixin(GoIOApplet.prototype, {
    doStuff1: function() {
      console.log("doing stuff 1 as GoIOApplet");
      this.constructor.__super__.doStuff1.apply(this, arguments);
    }
  });
  return GoIOApplet;
}());



ISImporter.main = function() {
  // var distanceSensor = new ISImporter.GoIOApplet({
  //   otmlString: 'distance'
  // }),

  // temperatureSensor = new ISImporter.GoIOApplet({
  //   otmlString: 'temperature'
  // }),

  // lightSensor = new ISImporter.GoIOApplet({
  //   otmlString: 'light'
  // });


  window.base = new ISImporter.SensorApplet(),
  window.derived = new ISImporter.GoIOApplet();

};


$(document).ready(function() {
  ISImporter.main();
});
