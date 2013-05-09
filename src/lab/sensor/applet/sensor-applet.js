/*global define: false $:false */
/*jshint unused: false*/

define(function(require) {

  var miniClass = require('common/mini-class'),
      EventEmitter = require('./mini-event-emitter'),
      SensorApplet;

  SensorApplet = miniClass.defineClass({

    _state: 'not appended',
    _isInAppletCallback: false,

    testAppletReadyInterval: 100,

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

    append: function () {
      if (this.getState() !== 'not appended') {
        throw new Error("Can't call append() when sensor applet has left 'not appended' state");
      }
      this._appendTestAppletHTML();
    },

    _appendTestAppletHTML: function() {
      $('body').append( this.getTestAppletHTML() );
      this.testAppletInstance = $('#'+this.appletId + "-test-applet")[0];
      this._state = 'appended';
      this._waitForTestAppletReady();
    },

    _waitForTestAppletReady: function() {
      var self = this,
          attempts = 0,
          timer;

      timer = window.setInterval(function() {
        attempts++;
        if (self.testTestAppletReady()) {
          window.clearInterval( timer );
          attempts = 0;
          self._appendHTML( self.getHTML() );
          self._waitForAppletReady();
        } else {
          if (attempts > 10) {
            // failed to load the applet
            window.clearInterval( timer );
            $('#dialogalog-confirm').dialog({
              resizable: false,
              height: 300,
              width: 400,
              modal: true,
              buttons: {
                "OK": function() {
                  $(this).dialog("close");
                  window.setTimeout(function() { self._waitForTestAppletReady(); }, 100);
                },
                "Cancel": function() {
                  $(this).dialog("close");
                }
              }
            });
          }
        }
      }, this.testAppletReadyInterval);
    },

    _waitForAppletReady: function() {
      var self = this,
          attempts = 0,
          timer;

      timer = window.setInterval(function() {
        attempts++;
        if (self.testAppletReady()) {
          window.clearInterval( timer );
          attempts = 0;
          $('#'+self.appletId + "-test-applet").remove();
          if (self.getState() === 'appended') self._state = 'applet ready';
          self.emit('appletReady');
        } else {
          if (attempts > 10) {
            // failed to load the applet, but we know applets are working...
            window.clearInterval( timer );
            $('#dialog-confirm-content').text("The sensor applet is unexpectedly slow to load. Click OK to wait longer, or Cancel to stop trying.");
            $('#dialog-confirm').attr('title', "Sensor applet problem!");
            $('#dialog-confirm').dialog({
              resizable: false,
              height: 300,
              width: 400,
              modal: true,
              buttons: {
                "OK": function() {
                  $(this).dialog("close");
                  window.setTimeout(function() { self._waitForAppletReady(); }, 100);
                },
                "Cancel": function() {
                  $(this).dialog("close");
                }
              }
            });
          }
        }
      }, this.testAppletReadyInterval);
    },

    sensorIsReady: function() {
      var _this = this;
      this._state = 'stopped';
      setTimeout(function() { _this.emit('sensorReady'); }, 10);
    },

    start: function() {
      if (this.getState() === 'stopped') {
        this._state = 'started';
        this._startSensor();
      }
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

    testTestAppletReady: function() {
      try {
        return this.testAppletInstance.areYouLoaded();
      } catch(e) {
        return false;
      }
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
