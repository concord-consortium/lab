/*global define: false $:false*/

define(function(require) {

  var miniClass    = require('common/mini-class'),
      SensorApplet = require('./sensor-applet');

  return miniClass.extendClass(SensorApplet, {

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
      this.appletInstance.getSensorRequest(this.sensorType);
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
});
