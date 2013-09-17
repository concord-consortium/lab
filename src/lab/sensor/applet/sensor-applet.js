/*global define: false $:false */
/*jshint unused: false*/

define(function(require) {

  var miniClass = require('common/mini-class'),
      EventEmitter = require('./mini-event-emitter'),
      errors = require('./errors'),
      labConfig = require('lab.config'),
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
  */
  SensorApplet = miniClass.defineClass({
    // Before appending the applet, set this value with the path to an object that will receive applet callbacks.
    listenerPath: '',

    // Before appending the applet, set this to the sensor type
    // supported values are:
    //   "temperature"
    //   "light"
    //   "force"
    //   "co2"
    //   "o2"
    //   "ph"
    //   "distance"
    measurementType: '',

    // supported values are:
    //  "labquest"
    //  "golink"
    deviceType: '',

    // Packet of information about the sensor type. See
    // src/lab/senosr/applet/sensor-definitions.js
    sensorDefinition: null,

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
         'codebase="', this.getCodebase(), '" ',
         'width="1px" ',
         'height="1px" ',
         'MAYSCRIPT="true" ',
       '>',
          '<param name="MAYSCRIPT" value="true" />',
          '<param name="evalOnInit" value="' + this.listenerPath + '.appletIsReadyCallback()" />',
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
         'codebase="', this.getCodebase(), '" ',
         'width="150px" ',
         'height="150px" ',
         'style="position: absolute; ',
                'left: ' + ($('body').width() / 2 - 75) +'px; ',
                'top: ' + ($('body').height() / 2 - 75) +'px;" ',
         'MAYSCRIPT="true" ',
       '>',
          '<param name="MAYSCRIPT" value="true" />',
          '<param name="evalOnInit" value="' + this.listenerPath + '.testAppletIsReadyCallback()" />',
        '</applet>'
      ].join('');
    },

    /**
      Returns true if the correct device type is connected.

      NOTE: This will throw if the applet hasn't been initialized yet (which occurs asynchronously
      after the <applet> tag is appended to the DOM).
    */
    isSensorConnected: function() {
      var attachedSensors;
      var i;

      // Note this appears only to return a meaningful result when first called. After that, it
      // returns the same value for a given deviceType, even if the device has been unplugged from
      // the USB port.
      if (!this.appletInstance.isInterfaceConnected(this.deviceType)) {
        return false;
      }

      try {
        attachedSensors = this.appletInstance.getAttachedSensors(this.deviceType) || [];
      } catch (e) {
        // isInterfaceConnected is not a wholly reliable check, and calling getAttachedSensors with
        // the wrong deviceType may throw (?).
        return false;
      }
      for (i = 0; i < attachedSensors.length; i++) {
        if (this.appletInstance.getTypeConstantName(attachedSensors[i].getType()) === this.sensorDefinition.typeConstantName) {
          return true;
        }
      }
      return false;
    },

    _state: 'not appended',

    getCodebase: function() {
      return labConfig.actualRoot + "jnlp";
    },

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
    append: function(callback) {
      if (this.getState() !== 'not appended') {
        throw new Error("Can't call append() when sensor applet has left 'not appended' state");
      }
      console.log("appending test applet");
      this.$testAppletContainer =
        this._appendHTML(this.appletId + " -test-applet-container", this.getTestAppletHTML());
      this._state = 'test applet appended';
      this._waitForTestApplet();
      this._appendCallback = callback;
    },

    _appendHTML: function(containerId, html) {
      var appletContainer = $('#' + containerId );

      if(!appletContainer.length){
        appletContainer = $("<div id='" + containerId + "'/>").appendTo('body');
      }

      appletContainer.append(html);
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
          self.$appletContainer = self._appendHTML(this.appletId + "-container", self.getHTML());
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
          var req;
          // remove test applet
          self.$testAppletContainer.html("");
          if (self.getState() === 'appended') {
            self._state = 'applet ready';
          }

          self.appletInstance = $('#'+self.appletId)[0];

          // Get a SensorRequest object for this measurement type
          req = self.appletInstance.getSensorRequest(self.measurementType);
          // Try to initialize the sensor for the correct device and measurement type (e.g., goio,
          // distance). Java will callback to initSensorInterfaceComplete on success or error.
          self.appletInstance.initSensorInterface(self.listenerPath, self.deviceType, [req]);
        },
        fail: function () {
          self._appendCallback(new errors.AppletInitializationError("Timed out waiting for sensor applet to initialize."));
        }
      });
    },

    readSensor: function() {
      var values;
      if (this.getState() !== 'stopped') {
        throw new Error("Tried to read the sensor value from non-stopped state '" + this.getState() + '"');
      }

      // because of IE multi threading applet behavior we need to track our state before calling
      // the applet
      this._state = 'reading sensor';
      if (this.isSensorConnected()) {
        values = this.appletInstance.getConfiguredSensorsValues(this.deviceType);
        this._state = 'stopped';
        if (!values || values.length === 0) {
          throw new Error("readSensor: no sensor values to report");
        }
      } else {
        this._state = 'stopped';
        throw new errors.SensorConnectionError("readSensor: sensor is not connected");
      }
      return values[0];
    },

    start: function() {
      var self = this;
      if (this.getState() === 'reading sensor') {
        console.log("start called while waiting for a sensor reading");

        // because of IE multi threading we might we waiting for a reading from the sensor still
        // so we try waiting for little while before giving up

        // this will cause a infinite loop of the applet blocks forever
        // however that is what happens in normal browsers anyhow
        setTimeout(function(){
          self.start();
        }, 100);
      }

      if (this.getState() !== 'stopped') {
        throw new Error("Tried to start the applet from non-stopped state '" + this.getState() + '"');
      }
      // in IE a slow call to an applet will result in other javascript being executed while waiting
      // for the applet. So we need to keep track of our state before calling Java.
      this._state = 'starting';

      // Remain in state 'stopped' if sensor is not connected. This is because we want the user to
      // be able to click 'start' again after plugging in the sensor. Changing to a different state
      // would require having some way to detect when to leave that state. We lack a way to
      // automatically detect that the sensor has been plugged in, and we don't want to force the
      // user to tell us.
      if (!this.isSensorConnected()) {
        this._state = 'stopped';
        throw new errors.SensorConnectionError("Device reported the requested sensor type was not attached.");
      }

      this.appletInstance.startCollecting();
      this._state = 'started';
    },

    stop: function() {
      if (this.getState() === 'started') {
        this._state = 'stopped';
        this.appletInstance.stopCollecting();
      }
    },

    remove: function() {
      if (this.getState() !== 'not appended') {
        this.$appletContainer.html("");
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
      var self = this;
      setTimeout(function () {
        data = data || [];
        for (var i = 0, len = data.length; i < len; i++) {
          self.emit('data', data[i]);
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
    }
  });

  miniClass.mixin(SensorApplet.prototype, EventEmitter);

  return SensorApplet;
});
