/*global define: false*/

define(function(require) {

  var miniClass           = require('common/mini-class'),
      VernierSensorApplet = require('./vernier-sensor-applet');

  return {
    goio: miniClass.extendClass(VernierSensorApplet, {
      deviceType:            'golink',
      deviceSpecificJarUrls: ['org/concord/sensor/goio-jna/goio-jna.jar']
    }),

    labquest: miniClass.extendClass(VernierSensorApplet, {
      deviceType:            'labquest',
      deviceSpecificJarUrls: ['org/concord/sensor/labquest-jna/labquest-jna.jar']
    })
  };
});
