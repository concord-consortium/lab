/*global define: false $:false */
/*jshint unused: false*/

define(function(require) {

  var miniClass = require('common/mini-class'),
      EventEmitter = require('./mini-event-emitter'),
      errors = require('./errors'),
      labConfig = require('lab.config'),
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

    _state: 'not appended',
    _isInAppletCallback: false,

    testAppletReadyInterval: 100,

    getCodebase: function() {
      return labConfig.actualRoot + "jnlp";
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

    getState: function() {
      return this._state;
    },

    getIsInAppletCallback: function() {
      return this._isInAppletCallback;
    },

    startAppletCallback: function() {
      if (this.getIsInAppletCallback()) {
        throw new Error("SensorApplet.startAppletCallback was called without previous endAppletCallback call");
      }
      this._isInAppletCallback = true;
    },

    endAppletCallback: function() {
      if (!this.getIsInAppletCallback()) {
        throw new Error("SensorApplet.endAppletCallback was called without previous startAppletCallback call");
      }
      this._isInAppletCallback = false;
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

          * The sensor applet was appended, but never initializes (we time out waiting for its
            methods to become callable from Javascript).  In this case, application code may want to
            remove the applet and try calling 'append' again later.

          * The sensor applet reports that the wrong sensor type is attached. In this case,
            the applet is known to be loaded, and the application code may want to notify the user,
            and call 'initializeSensor' when the user indicates the sensor is plugged in. If
            initializeSensor returns true, the applet is ready to collect data.

        We don't yet handle the case that the test applet initializes correctly but never calls the
        'sensorsReady' callback. If that happens, 'callback' will never be invoked.
    */
    append: function(callback) {
      if (this.getState() !== 'not appended') {
        throw new Error("Can't call append() when sensor applet has left 'not appended' state");
      }
      this._appendTestAppletHTML();
      this._appendCallback = callback;
    },

    _appendTestAppletHTML: function() {
      console.log("appending test applet");
      this.$testAppletContainer = this._findOrCreateDiv(this.appletId + " -test-applet-container");
      this.$testAppletContainer.append( this.getTestAppletHTML() );
      this._state = 'test applet appended';
      this._waitForTestApplet();
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
          self._appendHTML( self.getHTML() );
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
          self.$testAppletContainer.html("");
          if (self.getState() === 'appended') {
            self._state = 'applet ready';
          }

          self.appletInstance = $('#'+self.appletId)[0];
          self.initializeSensor();
        },
        fail: function () {
          self._appendCallback(new errors.AppletInitializationError("Timed out waiting for sensor applet to initialize."));
        }
      });
    },

    readSensor: function() {
      if (this.getState() !== 'stopped') {
        throw new Error("Tried to read the sensor value from non-stopped state '" + this.getState() + '"');
      }
      return this._readSensor();
    },

    start: function() {
      if (this.getState() !== 'stopped') {
        throw new Error("Tried to start the applet from non-stopped state '" + this.getState() + '"');
      }

      // Remain in state 'stopped' if sensor is not connected. This is because we want the user to
      // be able to click 'start' again after plugging in the sensor. Changing to a different state
      // would require having some way to detect when to leave that state. We lack a way to
      // automatically detect that the sensor has been plugged in, and we don't want to force the
      // user to tell us.
      if (!this.isSensorConnected()) {
        throw new errors.SensorConnectionError("Device reported the requested sensor type was not attached.");
      }

      this._startSensor();
      this._state = 'started';
    },

    stop: function() {
      if (this.getState() === 'started') {
        this._state = 'stopped';
        this._stopSensor();
      }
    },

    remove: function() {
      var self = this;

      function remove() {
        if (self.getState() !== 'not appended') {
          self._removeApplet();
          self._state = 'not appended';
        }
      }

      if (this.getIsInAppletCallback()) {
        window.setTimeout(function() { remove(); }, 10);
      }
      else {
        remove();
      }
    },

    _findOrCreateDiv: function(id) {
      var $element = $('#' + id );
      if(!$element.length){
        $element = $("<div id='" + id + "'/>").appendTo('body');
      }
      return $element;
    },

    _appendHTML: function(html) {
      this.$appletContainer = this._findOrCreateDiv(this.appletId + "-container");
      this.$appletContainer.append(html);
    },

    _removeApplet: function() {
      this.$appletContainer.html("");
    },

    getHTML: function() {
      throw new Error("Override this method!");
    },

    testAppletReady: function() {
      throw new Error("Override this method!");
    },

    _startSensor: function() {
      throw new Error("Override this method!");
    },

    _stopSensor: function () {
      throw new Error("Override this method!");
    }

  });

  miniClass.mixin(SensorApplet.prototype, EventEmitter);

  return SensorApplet;
});
