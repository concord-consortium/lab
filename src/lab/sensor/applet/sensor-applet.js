/*global define: false $:false */
/*jshint unused: false*/

define(function(require) {

  var miniClass = require('common/mini-class'),
      EventEmitter = require('./mini-event-emitter'),
      errors = require('./errors'),
      labConfig = require('lab.config'),
      SensorApplet;

  function waitForTestFunction(test, intervalLength, maxAttempts, done, fail) {
    var attempts = 0,
        timer;

    timer = window.setInterval(function() {
      attempts++;
      if (test()) {
        window.clearInterval(timer);
        done();
      } else {
        if (attempts > maxAttempts) {
          window.clearInterval(timer);
          fail();
        }
      }
    }, intervalLength);
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
         'codebase="', this.getCodebase(), '" ',
         'width="150px" ',
         'height="150px" ',
         'style="position: absolute; ',
                'left: ' + ($('body').width() / 2 - 75) +'px; ',
                'top: ' + ($('body').height() / 2 - 75) +'px;" ',
         'MAYSCRIPT="true" ',
       '>',
          '<param name="MAYSCRIPT" value="true" />',
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
      $('body').append( this.getTestAppletHTML() );
      this.testAppletInstance = $('#'+this.appletId + "-test-applet")[0];
      this._state = 'test applet appended';
      this._waitForTestAppletReady();
    },

    _waitForTestAppletReady: function() {
      // TODO: require Function.prototype.bind shim? Or ignore b/c we require Safari >= 5.1?
      var self = this;

      function testFunction() {
        try {
          return self.testAppletInstance.areYouLoaded();
        } catch(e) {
          return false;
        }
      }

      function done() {
        self._appendHTML( self.getHTML() );
        self._state = 'appended';
        self._waitForAppletReady();
      }

      function fail() {
        self._appendCallback(new errors.JavaLoadError("Timed out waiting for test applet to respond."));
      }

      waitForTestFunction(testFunction, this.testAppletReadyInterval, 10, done, fail);
    },

    _waitForAppletReady: function() {
      var self = this;

      function testFunction() {
        return self.testAppletReady();
      }

      function done() {
        $(self.testAppletInstance).remove();
        if (self.getState() === 'appended') {
          self._state = 'applet ready';
        }

        if (self.isSensorConnected()) {
          self.initializeSensor();
          // now, do nothing. We just wait for the callback from the sensor applet to sensorIsReady.
        } else {
          self._appendCallback(new errors.SensorConnectionError("Device reported the requested sensor type was not attached."));
        }

      }

      function fail() {
        self._appendCallback(new errors.AppletInitializationError("Timed out waiting for sensor applet to be ready."));
      }

      waitForTestFunction(testFunction, this.testAppletReadyInterval, 10, done, fail);
    },

    sensorIsReady: function() {
      var self = this;
      this._state = 'stopped';
      setTimeout(function() {
        self._appendCallback(null);
        self._appendCallback = null;
      }, 10);
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

    _appendHTML: function(html) {
      $('body').append(html);
      this.appletInstance = $('#'+this.appletId)[0];
    },

    _removeApplet: function() {
      $('#'+this.appletId).remove();
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
