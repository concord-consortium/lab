//     sensor.js 0.1.0
//     (c) 2010 The Concord Consortium
//     created by Stephen Bannasch
//     sensor.js may be freely distributed under the LGPL license.

(function() {

// Initial Setup
// -------------

// The top-level namespace. All public classes will be attached to sensor.

var sensor = {};
var root = this;

// Current version of the library. Keep in sync with `package.json`.
sensor.VERSION = '0.1.0';

// sensor.AppletGrapher
// -----------------

// Create a new grapher.
//
// Parameters:
//
// - **applet**: the actual java sensor applet element
// - **container**: a div that contains the element referenced by the graph object
// - **graph**: a graph object to send data to
// - **sensor_type**: a string containing 'motion', 'light', or 'temperature'
// - **listener_str**: a string consisting of the variable the new applet grapher
//   is being assigned to followed by '.JsListener()'.
// - **appletReadyCallback**: optional function to call when applet is ready
//
// Here's an example:
//
//     var a = document.getElementById("sensor-applet");
//     var g =  document.getElementById("graph");
//     var st = 'temperature';
//     ag = new sensor.AppletGrapher(a, g, st, "ag.JsListener()");

sensor.AppletGrapher = function(applet, container, graph, sensorConfig, sampleInterval, listener_str, appletReadyCallback) {
  this.applet = applet;
  this.container = container;
  this.graph = graph;
  this.time = 0;
  this.sampleInterval = sampleInterval;
  this.sensorConfig = sensorConfig;
  this.listener_str = listener_str;
  this.applet_ready = false;
  this.AddButtons();
  this.appletInitializationTimer = false;
  this.appletReadyCallback = appletReadyCallback;
  this.StartAppletInitializationTimer();
};


// Setup a timer to check every 250 ms to see if the Java applet
// has finished loading and is initialized.
sensor.AppletGrapher.prototype.StartAppletInitializationTimer = function() {
  var self = this;
  window.setTimeout (function()  { self.InitSensorInterface(); }, 250);
};

sensor.AppletGrapher.prototype.EnumerateSensors = function() {
  var sensors = this.applet.getAttachedSensors(this.sensorConfig.deviceType);
  var text = "";
  if (sensors !== null && sensors.length > 0) {
    var values = [];
    try {
      values = this.applet.getAttachedSensorsValues(this.sensorConfig.deviceType);
    } catch(e) {
      console.log("problem enumeratingSensors getting values " + e);
    }
    text += "(";
    for (var i = 0; i < sensors.length; i++) {
      var name = sensors[i].getName();
      if (name === null) {
        name = this.applet.getTypeConstantName(sensors[i].getType());
      }
      text += name + " [ " + values[i].toFixed(2) + " ], ";
    }
    text = text.substr(0,text.length-2) + ")";
  }
  return text;
};

// Wait until the applet is loaded and initialized before enabling
// the data collection buttons.
sensor.AppletGrapher.prototype.InitSensorInterface = function() {
  var self = this;

  // Try to call initSensorInterface, but note:
  //
  //  1. appletInstance may not have initialized yet
  //  2. 'probing' for initialization via the js idiom:
  //      `appletInstance.initSensorInterface && appletInstance.initSensorInterface();`
  //      actually throws an error in IE even AFTER
  //      `appletInstance.initSensorInterface` is ready to call, because
  //      IE thinks that it's an error to access a java method as
  //      a property instead of calling it.

  try {
    self.applet_ready = self.applet && !!self.applet.getSensorRequest('manual');
    console.log("Applet ready: " + self.applet_ready);
  } catch (e) {
    // Do nothing--we'll try again in the next timer interval.
  }
  var connectStatus = document.getElementById("connect-status");
  if(self.applet_ready && self.applet.isInterfaceConnected(self.sensorConfig.deviceType)) {
    console.log("Applet was ready");
    connectStatus.innerHTML = "Device connected! " + self.EnumerateSensors();
    var sensor, sensorReq;
    var sensors = [];
    for (var i = 0; i < self.sensorConfig.sensors.length; i++) {
      sensor = self.sensorConfig.sensors[i];
      sensorReq = self.applet.getSensorRequest(sensor.type);
      if (sensor.type == 'manual') {
        sensorReq.setDisplayPrecision(sensor.precision);
        sensorReq.setRequiredMin(sensor.min);
        sensorReq.setRequiredMax(sensor.max);
        sensorReq.setStepSize(sensor.stepSize);
        sensorReq.setType(sensor.type);
        sensorReq.setPort(0); // port is ignored for now
      }
      sensors.push(sensorReq);
    }
    self.applet.initSensorInterface(self.listener_str, self.sensorConfig.deviceType, sensors);
    self.startButton.className = "active";
    if(self.appletInitializationTimer) {
      clearInterval(self.appletInitializationTimer);
      self.appletInitializationTimer = false;
    }
    if (typeof this.appletReadyCallback === 'function') {
      this.appletReadyCallback();
    }
  } else if (self.applet_ready) {
    // The applet is ready, but the device is not connected
    connectStatus.innerHTML = "Device not connected!";
    self.startButton.className = "inactive";
    if(!self.appletInitializationTimer) {
      self.appletInitializationTimer = window.setInterval(function() { self.InitSensorInterface(); }, 1000);
    }
  } else {
    self.startButton.className = "inactive";
    if(!self.appletInitializationTimer) {
      self.appletInitializationTimer = window.setInterval(function() { self.InitSensorInterface(); }, 250);
    }
  }
};

// This is the JavaScript function that the Java applet calls when data is ready.
sensor.AppletGrapher.prototype.JsListener = function() {
  var self = this,
      newdata = [],
      i;
  return {
    // called whenever data is received in the sensor. data is an array of floats
    dataReceived: function(type, count, data) {
      if (type === 1000) {
        newdata = [];
        if (count > 1) {
          for(i= 0; i < count; i++) {
            newdata.push(data[i]);
            self.time += this.sampleInterval;
          }
        } else {
          newdata = [data[0]];
          self.time += this.sampleInterval;
        }
        self.graph.addSamples(newdata);
      }
    },
    sensorsReady: function() {
    }
  };
};

// Add the **Start**, **Stop**, and **Clear** buttons.
sensor.AppletGrapher.prototype.AddButtons = function() {
  var ul = document.createElement('ul');
  ul.className = "sensorbuttons";
  this.container.appendChild(ul);

  //
  // Start Button
  //
  this.startButton = document.createElement('a');
  if (this.applet_ready) {
    this.startButton.className = "active";
  } else {
    this.startButton.className = "inactive";
  }
  this.AddButton(ul, this.startButton, 'Start');
  sensor.AppletGrapher.prototype.startButtonHandler = function() {
    var self = this;
    return function() {
      if (!self.applet_ready) {
        self.InitSensorInterface();
      }
      self.applet.startCollecting();
      self.startButton.className = "inactive";
      self.stopButton.className = "active";
      return true;
    };
  };
  this.startButton.onclick = this.startButtonHandler();

  //
  // Stop Button
  //
  this.stopButton = document.createElement('a');
  this.stopButton.className = "inactive";
  this.AddButton(ul, this.stopButton,  'Stop');
  sensor.AppletGrapher.prototype.stopButtonHandler = function() {
    var self = this;
    return function() {
      self.applet.stopCollecting();
      self.stopButton.className = "inactive";
      self.startButton.className = "active";
      self.clearButton.className = "active";
      return true;
    };
  };
  this.stopButton.onclick = this.stopButtonHandler();

  //
  // Clear Button
  //
  this.clearButton = document.createElement('a');
  this.clearButton.className = "inactive";
  this.AddButton(ul, this.clearButton, 'Clear');

  sensor.AppletGrapher.prototype.clearButtonHandler = function() {
    var self = this;
    return function() {
      applet.stopCollecting();
      self.graph.resetSamples([[]]);
      self.time = 0;
      self.graph.reset();
      self.clearButton.className = "inactive";
      return true;
    };
  };
  this.clearButton.onclick = this.clearButtonHandler();
};

// Add a single button.
sensor.AppletGrapher.prototype.AddButton = function(list, button, name) {
  li = document.createElement('li');
  list.appendChild(li);
  button.classname = 'sensor_button';
  button.innerHTML = name;
  li.appendChild(button);
  return button;
};

// export namespace
if (root !== 'undefined') root.sensor = sensor;
})();
