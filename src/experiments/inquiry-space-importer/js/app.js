/*globals $ console document _mixin: true _extends: true ISImporter: true */

if (typeof ISImporter === 'undefined') ISImporter = {};

/**
  Helpers for defining classical-OO style inheritance.
  Adapted from CoffeeScript implementation.
*/
_mixin = function(dest, src) {
  var hasProp = {}.hasOwnProperty,
      key;

  for (key in src) {
    if (hasProp.call(src, key)) dest[key] = src[key];
  }
};

_extends = function(child, parent) {
  _mixin(child, parent);

  function ctor() {
    this.constructor = child;
  }
  ctor.prototype  = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
};


defineClass = function(classProperties) {
  var ctor = function(instanceProperties) {
     _mixin(this, instanceProperties);
  };
  _mixin(ctor.prototype, classProperties);
  return ctor;
};

extendClass = function(baseClass, classProperties) {
  var ctor = function(instanceProperties) {
        _mixin(this, instanceProperties);
      };
  _extends(ctor, baseClass);
  _mixin(ctor.prototype, classProperties);
  return ctor;
};

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
