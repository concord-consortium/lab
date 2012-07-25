/*globals defineClass extendClass */

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

  on: function(evt, cb) {
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[evt]) this._callbacks[evt] = [];

    this._callbacks[evt].push(cb);
  },

  emit: function(evt) {
    var args = arguments.length > 1 ? [].splice.call(arguments, 1) : [];

    if (this._callbacks && this._callbacks[evt]) {
      for (var i = 0, len = this._callbacks[evt].length; i < len; i++) {
        this._callbacks[evt][i].apply(null, args);
      }
    }
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
        self._state = 'applet ready';
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

  _appendHTML: function(html) {
    $(document).append(html);
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


ISImporter.GoIOApplet = extendClass(ISImporter.SensorApplet, {

  // Before appending the applet, set this value with the path to an object that will receive applet callbacks.
  listenerPath: '',

  // path to otml file configuring the type of sensor
  otmlPath: '',

  appletId:     'goio-applet',
  classNames:   'applet sensor-applet',

  jarUrls:     ['org/concord/sensor-native/sensor-native.jar',
                'org/concord/otrunk/otrunk.jar',
                'org/concord/framework/framework.jar',
                'org/concord/frameworkview/frameworkview.jar',
                'jug/jug/jug.jar',
                'jdom/jdom/jdom.jar',
                'org/concord/sensor/sensor.jar',
                'org/concord/data/data.jar',
                'org/concord/sensor/sensor-applets/sensor-applets.jar'],

  code:         'org.concord.sensor.applet.OTSensorApplet',
  codebase:     '/jnlp',

  getHTML: function() {
    return [
     '<applet ',
       'id="',       this.appletId,           '" ',
       'class="',    this.classNames,         '" ',
       'archive="',  this.jarUrls.join(', '), '" ',
       'code="',     this.code,               '" ',
       'codebase="', this.codebase,            '" ',
       'width="1px" ',
       'height="1px" ',
       'MAYSCRIPT="true" ',
     '>',
        '<param name="resource" value="',      this.otmlPath,     '" />',
        '<param name="listenerPath" value="',  this.listenerPath, '" />',
        '<param name="name" value="',          this.appletId,     '" />',
      '</applet>'
    ].join('');
  },

  testAppletReady: function() {
    try {
      this.appletInstance.initSensorInterface( this.listenerPath );
    } catch(e) {
      return false;
    }
    return true;
  },

  // applet callbacks

  sensorsReady: function() {
    this.startAppletCallback();
    this.sensorIsReady();
    this.endAppletCallback();
  }

});
