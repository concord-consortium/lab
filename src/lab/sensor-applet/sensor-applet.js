/*global define: false $:false */
/*jshint unused: false*/

define(function(require) {

  var miniClass = require('common/mini-class'),
      EventEmitter = require('./mini-event-emitter'),
      errors = require('./errors'),
      console = require('common/console'),
      SensorApplet;

  function AppletWaiter(){
    var _timer = null,
        _opts = null;

    this.handleCallback = function (){
      console.log("handling callback from applet");
      // this is asynchronous because it will be called by Java
      setTimeout(function (){
        if (_timer === null) {
          console.log("applet called callback after timer expired");
          return;
        }
        window.clearInterval(_timer);
        _timer = null;
        _opts.success();
      }, 5);
    };

    this.wait = function(options){
      var attempts = 0,
          maxAttempts = options.times;

      _opts = options;

      _timer = window.setInterval(function() {
        attempts++;

        if (attempts > maxAttempts) {
          // failure
          window.clearInterval(_timer);
          _timer = null;
          options.fail();
        }
      }, options.interval);
    };
  }

  /**
    events:
      data
      deviceUnplugged
      sensorUnplugged

    states:
      not appended
      test applet appended
      appended
      applet ready
      stopped
      started

    api methods:
      getState          useful for tracking initialization
      append(callback)  initialize applet, checking for Java with test applet
      readSensor        read a single value
      start             start a collection
      stop              stop collection
      remove            remove applet

  */
  SensorApplet = miniClass.defineClass({
    // Before appending the applet, set this value with the path to an object that will receive applet callbacks.
    listenerPath: '',

    // Before appending the applet this should be set to a array of definitions from
    // senor-applet/sensor-definitions.js
    // FIXME: these should be updated to be device independent
    sensorDefinitions: null,

    // Before appending the applet, set this to the path or URL where jars can be found
    codebase: '',

    // supported values are:
    //  "labquest"
    //  "golink"
    deviceType: '',

    appletId:     'sensor-applet',
    classNames:   'applet sensor-applet',

    jarUrls:     ['com/sun/jna/jna.jar',
                  'org/concord/sensor/sensor.jar',
                  'org/concord/sensor/sensor-applets/sensor-applets.jar'],

    deviceSpecificJarUrls: [],

    code:         'org.concord.sensor.applet.SensorApplet',

    testAppletReadyInterval: 100,

    getHTML: function() {
      var allJarUrls = this.jarUrls.concat(this.deviceSpecificJarUrls);

      return [
       '<applet ',
         'id="',       this.appletId,         '" ',
         'class="',    this.classNames,       '" ',
         'archive="',  allJarUrls.join(', '), '" ',
         'code="',     this.code,             '" ',
         'codebase="', this.codebase, '" ',
         'width="1px" ',
         'height="1px" ',
         'MAYSCRIPT="true" ',
       '>',
          '<param name="MAYSCRIPT" value="true" />',
          '<param name="evalOnInit" value="' + this.listenerPath + '.appletIsReadyCallback()" />',
          '<param name="permissions" value="all-permissions" />',
        '</applet>'
      ].join('');
    },

    getTestAppletHTML: function() {
      return [
       '<applet ',
         'id="',       this.appletId,         '-test-applet" ',
         'class="applet test-sensor-applet" ',
         'code="org.concord.sensor.applet.DetectionApplet" ',
         'archive="org/concord/sensor/sensor-applets/sensor-applets.jar"',
         'codebase="', this.codebase, '" ',
         'width="150px" ',
         'height="150px" ',
         'style="position: absolute; ',
                'left: ' + ($('body').width() / 2 - 75) +'px; ',
                'top: ' + ($('body').height() / 2 - 75) +'px;" ',
         'MAYSCRIPT="true" ',
       '>',
          '<param name="MAYSCRIPT" value="true" />',
          '<param name="evalOnInit" value="' + this.listenerPath + '.testAppletIsReadyCallback()" />',
          '<param name="permissions" value="all-permissions" />',
        '</applet>'
      ].join('');
    },

    /**
      Passes true to the callback if the correct device type is connected.
    */
    isSensorConnected: function(callback) {
      var self = this, nextCallback, nextCallbackIdx;
      setTimeout(function() {
        nextCallback = function(connected) {
          // Note this appears only to return a meaningful result when first called. After that, it
          // returns the same value for a given deviceType, even if the device has been unplugged from
          // the USB port.
          if(!connected) {
            callback.call(self, false);
          } else {
            nextCallback = function() {
              var attachedSensors = JSON.parse(self.appletInstance.getCachedAttachedSensors());
              if (attachedSensors) {
                // FIXME we should use the applet configure method to check if the right sensors are attached
                // instead of doing this comparison here
                // For now this is skipped if there is more than one sensorDefinition
                if(self.sensorDefinitions.length === 1) {
                  for (var i = 0; i < attachedSensors.length; i++) {
                    if (self.appletInstance.getTypeConstantName(attachedSensors[i].type) ===
                          self.sensorDefinitions[0].typeConstantName) {
                      callback.call(self, true);
                      return;
                    }
                  }
                  callback.call(self, false);
                } else {
                  callback.call(self, true);
                }
              } else {
                callback.call(self, false);
              }
            };
            nextCallbackIdx = self.registerCallback(nextCallback);
            self.appletInstance.getAttachedSensors(self.deviceType, ""+nextCallbackIdx);
          }
        };
        nextCallbackIdx = self.registerCallback(nextCallback);
        self.appletInstance.isInterfaceConnected(self.deviceType, ""+nextCallbackIdx);
      });
    },

    _state: 'not appended',

    getState: function() {
      return this._state;
    },

    /**
      Append the applet to the DOM, and call callback when either:

        (1) The applet is configured and ready, with the correct device attached (it is ready to
            start collecting data immediately). The SensorApplet instance will be in the 'stopped'
            state.

        or:

        (2) An error occurs in the initialization process. An error object will be passed as the
            first argument to the callback (Node.js style).

        Currently, we detect three kinds of errors:

          * The Java plugin does not appear to be working (we time out waiting for a callback from
            our test applet). In this case, application code may want to remove the applet and try
            calling 'append' again later.

          * The sensor applet was appended, but never initializes (we time out waiting for a callback
            from the sensor applet).  In this case, application code may want to remove the applet
            and try calling 'append' again later.

          * The sensor applet reports that the wrong sensor type is attached. In this case,
            the applet is known to be loaded, and the application code may want to notify the user,
            and call 'initializeSensor' when the user indicates the sensor is plugged in. If
            If the callback is called with a null argument, the applet is ready to collect data.
    */
    append: function($loadingParent, callback) {
      if (this.getState() !== 'not appended') {
        throw new Error("Can't call append() when sensor applet has left 'not appended' state");
      }
      console.log("appending test applet");
      this.$testAppletContainer = this._appendHTML(this.appletId + "-test-applet-container",
                                                   this.getTestAppletHTML(),
                                                   $loadingParent);
      this._state = 'test applet appended';
      this._waitForTestApplet();
      this._appendCallback = callback;
    },

    _appendHTML: function(containerId, html, $parent) {
      var appletContainer = $('#' + containerId );

      if(!appletContainer.length){
        appletContainer = $("<div id='" + containerId + "'/>").appendTo($parent);
      }

      // using .append() actually creates some sort of internal reference to the applet,
      // which can cause problems calling applet methods later. Using .html() seems to avoid this.
      appletContainer.html(html);
      return appletContainer;
    },

    _testAppletWaiter: new AppletWaiter(),
    // this will be called by the test applet once it is initialized
    testAppletIsReadyCallback: function () {
      this._testAppletWaiter.handleCallback();
    },

    _waitForTestApplet: function() {
      var self = this;
      this._testAppletWaiter.wait({
        times: 30,
        interval: 1000,
        success: function() {
          self.$appletContainer = self._appendHTML(self.appletId + "-container",
                                                   self.getHTML(),
                                                   $('body'));
          self._state = 'appended';
          self._waitForApplet();
        },
        fail: function () {
          self._appendCallback(new errors.JavaLoadError("Timed out waiting for test applet to initialize."));
        }
      });
    },

    _appletWaiter: new AppletWaiter(),
    // this will be called by the applet once it is initialized
    appletIsReadyCallback: function () {
      this._appletWaiter.handleCallback();
    },

    _waitForApplet: function() {
      var self = this;
      this._appletWaiter.wait({
        times: 30,
        interval: 1000,
        success: function() {
          var requests = [];
          // remove test applet
          self.$testAppletContainer.html("");
          if (self.getState() === 'appended') {
            self._state = 'applet ready';
          }

          self.appletInstance = $('#'+self.appletId)[0];

          for(var i=0; i<self.sensorDefinitions.length; i++){
            // Get a SensorRequest object for this measurement type
            requests[i] =
              self.appletInstance.getSensorRequest(self.sensorDefinitions[i].measurementType);
          }

          // Try to initialize the sensor for the correct device and measurement type (e.g., goio,
          // distance). Java will callback to initSensorInterfaceComplete on success or error.
          self.appletInstance.initSensorInterface(self.listenerPath, self.deviceType, requests);
        },
        fail: function () {
          self._appendCallback(new errors.AppletInitializationError("Timed out waiting for sensor applet to initialize."));
        }
      });
    },

    // callback: function(error, values) {}
    readSensor: function(callback) {
      var self = this;
      if (this.getState() === 'reading sensor') {
        console.log("Already reading sensor in another thread...");
        callback.call(this, new errors.AlreadyReadingError("Already reading sensor in another thread"), null);
        return;
      }

      if (this.getState() !== 'stopped') {
        callback.call(this, new Error("Tried to read the sensor value from non-stopped state '" + this.getState() + '"'), null);
        return;
      }

      // because of IE multi threading applet behavior we need to track our state before calling
      // the applet
      this._state = 'reading sensor';
      this.isSensorConnected(function(connected) {
        if (connected) {
          var valuesCallback = function(values) {
            self._state = 'stopped';
            if (!values || values.length === 0) {
              callback.call(self, new Error("readSensor: no sensor values to report"), null);
            } else {
              callback.call(self, null, values);
            }
          };
          var callbackIdx = self.registerCallback(valuesCallback);
          self.appletInstance.getConfiguredSensorsValues(self.deviceType, ""+callbackIdx);
        } else {
          self._state = 'stopped';
          callback.call(self, new errors.SensorConnectionError("readSensor: sensor is not connected"), null);
        }
      });
    },

    // callback: function(error, isStarted) {}
    start: function(callback) {
      var self = this;
      if (this.getState() === 'reading sensor') {
        console.log("start called while waiting for a sensor reading");

        // because of IE multi threading we might we waiting for a reading from the sensor still
        // so we try waiting for little while before giving up

        // this will cause a infinite loop of the applet blocks forever
        // however that is what happens in normal browsers anyhow
        setTimeout(function(){
          self.start(callback);
        }, 100);
        return;
      }

      if (this.getState() !== 'stopped') {
        if (callback) {
          setTimeout(function(){
            callback.call(this, new Error("Tried to start the applet from non-stopped state '" + this.getState() + '"'), false);
          }, 5);
        }
        return;
      }
      // in IE a slow call to an applet will result in other javascript being executed while waiting
      // for the applet. So we need to keep track of our state before calling Java.
      this._state = 'starting';

      // Remain in state 'stopped' if sensor is not connected. This is because we want the user to
      // be able to click 'start' again after plugging in the sensor. Changing to a different state
      // would require having some way to detect when to leave that state. We lack a way to
      // automatically detect that the sensor has been plugged in, and we don't want to force the
      // user to tell us.
      this.isSensorConnected(function(connected) {
        if (!connected) {
          self._state = 'stopped';
          if (callback) {
            callback.call(self, new errors.SensorConnectionError("Device reported the requested sensor type was not attached."), null);
          }
        } else {
          self.appletInstance.startCollecting();
          self._state = 'started';
          if (callback) {
            callback.call(self, null, true);
          }
        }
      });
    },

    stop: function() {
      if (this.getState() === 'started') {
        this._state = 'stopped';
        this.appletInstance.stopCollecting();
      }
    },

    remove: function() {
      if (this.getState() !== 'not appended') {
        if (this.$appletContainer) {
          this.$appletContainer.html("");
        }
        if (this.$testAppletContainer) {
          this.$testAppletContainer.html("");
        }
        this._state = 'not appended';
      }
    },

    // applet callbacks
    // we don't want to block the applet and we don't want to execute any code
    // in the callback thread because things can break if javascript calls back to Java in
    // a callback
    initSensorInterfaceComplete: function(success) {
      var self = this;
      setTimeout(function() {
        if(success){
          self._state = 'stopped';
          self._appendCallback(null);
          self._appendCallback = null;
        } else {
          // state should remain 'applet ready'
          self._appendCallback(new errors.SensorConnectionError("Device reported the requested sensor type was not attached."));
        }
      }, 5);
    },

    dataReceived: function(type, count, data) {
      var self = this,
          // FIXME this is inefficient to make a new object each time
          dataSample = [],
          numberOfSensors = this.sensorDefinitions.length;
      setTimeout(function () {
        data = data || [];
        for (var sampleIndex = 0; sampleIndex < count; sampleIndex++) {
          for (var i = 0; i < numberOfSensors; i++) {
            dataSample[i] = data[sampleIndex*numberOfSensors + i];
          }
          self.emit('data', dataSample);
        }
      }, 5);
    },

    deviceUnplugged: function() {
      var self = this;
      window.setTimeout(function() {
        self.emit('deviceUnplugged');
      }, 5);
    },

    sensorUnplugged: function() {
      var self = this;
      console.log("received sensorUnplugged message; deviceType = " + this.deviceType);
      // the model code is not currently handle this callback correctly
      return;

      window.setTimeout(function() {
        self.emit('sensorUnplugged');
      }, 10);
    },

    callbackTable: [],
    registerCallback: function(callback) {
      // TODO We might want to set up a "reaper" function to error the callback if a certain
      // amount of time passes and the callback hasn't been called.
      this.callbackTable.push(callback);
      return this.callbackTable.length-1;
    },

    handleCallback: function(index, value) {
      var callback, self = this;
      if (typeof(index) === "string" && this[index]) {
        // assume this is meant to call a direct method on this class instance
        callback = this[index];
      } else if (this.callbackTable[index]) {
        callback = this.callbackTable[index];
        this.callbackTable[index] = null;
      }

      if (callback) {
        setTimeout(function() {
          callback.apply(self, value);
        }, 5);
      }
    }
  });

  miniClass.mixin(SensorApplet.prototype, EventEmitter);

  return SensorApplet;
});
