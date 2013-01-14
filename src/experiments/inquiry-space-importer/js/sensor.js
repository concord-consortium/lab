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
    this._appendHTML( this.getHTML() );
    this._state = 'appended';
    this._waitForAppletReady();
  },

  _waitForAppletReady: function() {
    var self = this,
        timer;

    timer = window.setInterval(function() {
      if (self.testAppletReady()) {
        window.clearInterval( timer );
        if (self.getState() === 'appended') self._state = 'applet ready';
        self.emit('appletReady');
      }
    }, this.testAppletReadyInterval);
  },

  sensorIsReady: function() {
    this._state = 'stopped';
    this.emit('sensorReady');
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

  _startSensor: function() {
    throw new Error("Override this method!");
  },

  _stopSensor: function () {
    throw new Error("Override this method!");
  }

});

mixin( ISImporter.SensorApplet.prototype, ISImporter.EventEmitter );

ISImporter.GoIOApplet = extendClass(ISImporter.SensorApplet, {

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

  deviceType: 'golink',

  appletId:     'goio-applet',
  classNames:   'applet sensor-applet',

  jarUrls:     ['com/sun/jna/jna.jar',
                'org/concord/sensor/sensor.jar',
                'org/concord/sensor/goio-jna/goio-jna.jar',
                'org/concord/sensor/sensor-vernier/sensor-vernier.jar',
                'org/concord/sensor/sensor-applets/sensor-applets.jar'],

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
    return [
     '<applet ',
       'id="',       this.appletId,           '" ',
       'class="',    this.classNames,         '" ',
       'archive="',  this.jarUrls.join(', '), '" ',
       'code="',     this.code,               '" ',
       'codebase="', this.getCodebase(),      '" ',
       'width="1px" ',
       'height="1px" ',
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
    this.appletInstance.initSensorInterface(this.listenerPath, this.deviceType, [req]);
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

  // the applet will may call this, so it has to exist
  dataStreamEvent: function() {
  }

});
