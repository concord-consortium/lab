/*globals defineClass extendClass mixin */

if (typeof ISImporter === 'undefined') ISImporter = {};

ISImporter.SensorApplet = defineClass({

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
    $('#main .left').append( this.getTestAppletHTML() );
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
          $('#dialog-confirm').dialog({
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

mixin( ISImporter.SensorApplet.prototype, ISImporter.EventEmitter );

ISImporter.VernierSensorApplet = extendClass(ISImporter.SensorApplet, {

  // Before appending the applet, set this value with the path to an object that will receive applet callbacks.
  listenerPath: '',

  // Before appending the applet, set this to the sensor type
  // supported values are:
  //   "temperature"
  //   "light"
  //   "force 5n"
  //   "force 50n"
  //   "co2"
  //   "o2"
  //   "ph"
  //   "distance"
  sensorType: '',

  // supported values are:
  //  "labquest"
  //  "golink"
  deviceType: '',

  appletId:     'sensor-applet',
  classNames:   'applet sensor-applet',

  jarUrls:     ['com/sun/jna/jna.jar',
                'org/concord/sensor/sensor.jar',
                'org/concord/sensor/sensor-vernier/sensor-vernier.jar',
                'org/concord/sensor/sensor-applets/sensor-applets.jar'],

  deviceSpecificJarUrls: [],

  code:         'org.concord.sensor.applet.SensorApplet',

  getCodebase: function(pathname) {
    var IMPORTER_SUFFIX = "experiments/inquiry-space-importer/",
        IMPORTER_RE = new RegExp("/(.*/)?" + IMPORTER_SUFFIX),
        match = pathname && pathname.match(IMPORTER_RE),
        prefix;

    if (!match) {
      return "/jnlp";
    }

    prefix = match[1] || '';
    return '/' + prefix + 'jnlp';
  },

  getHTML: function() {
    var allJarUrls = this.jarUrls.concat(this.deviceSpecificJarUrls);

    return [
     '<applet ',
       'id="',       this.appletId,         '" ',
       'class="',    this.classNames,       '" ',
       'archive="',  allJarUrls.join(', '), '" ',
       'code="',     this.code,             '" ',
       'codebase="', this.getCodebase(document.location.pathname), '" ',
       'width="1px" ',
       'height="1px" ',
       'MAYSCRIPT="true" ',
     '>',
        '<param name="MAYSCRIPT" value="true" />',
      '</applet>'
    ].join('');
  },

  getTestAppletHTML: function() {
    return [
     '<applet ',
       'id="',       this.appletId,         '-test-applet" ',
       'class="applet test-sensor-applet" ',
       'code="org.concord.sensor.applet.DetectionApplet" ',
       'codebase="', this.getCodebase(document.location.pathname), '" ',
       'width="150px" ',
       'height="150px" ',
       'MAYSCRIPT="true" ',
     '>',
        '<param name="MAYSCRIPT" value="true" />',
      '</applet>'
    ].join('');
  },

  testAppletReady: function() {
    try {
      this.initializeSensor();
    } catch(e) {
      return false;
    }
    return true;
  },

  initializeSensor: function() {
    var req = this.appletInstance.getSensorRequest(this.sensorType);
    return this.checkIfConnected();
  },

  checkIfConnected: function() {
    var self = this;
    if (this.appletInstance.isInterfaceConnected(this.deviceType)) {
      var req = this.appletInstance.getSensorRequest(this.sensorType);
      return this.appletInstance.initSensorInterface(this.listenerPath, this.deviceType, [req]);
    } else {
      $('#dialog-confirm-content').text("No sensor device is connected! Please connect your device and click OK to try again, or Cancel to stop trying.");
      $('#dialog-confirm').attr('title', "No sensor device found!");
      $('#dialog-confirm').dialog({
        resizable: false,
        height: 300,
        width: 400,
        modal: true,
        buttons: {
          "OK": function() {
            $(this).dialog("close");
            window.setTimeout(function() { self.checkIfConnected(); }, 250);
          },
          "Cancel": function() {
            $(this).dialog("close");
          }
        }
      });
    }
    return false;
  },

  // In some browsers, calling an applet method from within a callback triggered by
  // an applet seems to cause problems (lock up the browser). Therefore, make sure
  // not to call the applet's stopCollecting, startCollecting methods within an applet
  // callback.

  _stopSensor: function() {
    var self = this;

    if (this.getIsInAppletCallback()) {
      window.setTimeout(function() { self.appletInstance.stopCollecting(); }, 10);
    }
    else {
      this.appletInstance.stopCollecting();
    }
  },

  _startSensor: function() {
    var self = this;

    if (this.getIsInAppletCallback()) {
      window.setTimeout(function() { self.appletInstance.startCollecting(); }, 10);
    }
    else {
      this.appletInstance.startCollecting();
    }
  },

  // applet callbacks

  sensorsReady: function() {
    this.startAppletCallback();
    this.sensorIsReady();
    this.endAppletCallback();
  },

  dataReceived: function(type, count, data) {
    data = data || [];
    this.startAppletCallback();
    for (var i = 0, len = data.length; i < len; i++) {
      this.emit('data', data[i]);
    }
    this.endAppletCallback();
  },

  deviceUnplugged: function() {
    var self = this;
    this.startAppletCallback();
    window.setTimeout(function() { self.emit('deviceUnplugged'); }, 10);
    this.endAppletCallback();
  },

  sensorUnplugged: function() {
    var self = this;
    this.startAppletCallback();
    window.setTimeout(function() { self.emit('sensorUnplugged'); }, 10);
    this.endAppletCallback();
  }
});


ISImporter.GoIOApplet = extendClass(ISImporter.VernierSensorApplet, {
  deviceType:            'golink',
  deviceSpecificJarUrls: ['org/concord/sensor/goio-jna/goio-jna.jar']
});


ISImporter.LabQuestApplet = extendClass(ISImporter.VernierSensorApplet, {
  deviceType:            'labquest',
  deviceSpecificJarUrls: ['org/concord/sensor/labquest-jna/labquest-jna.jar']
});

