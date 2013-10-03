/*global define: false*/

define(function(require) {

  var miniClass           = require('common/mini-class'),
      SensorApplet = require('./sensor-applet');

  return {
    goio: miniClass.extendClass(SensorApplet, {
      deviceType:            'golink',
      deviceSpecificJarUrls: [
        'org/concord/sensor/sensor-vernier/sensor-vernier.jar',
        'org/concord/sensor/goio-jna/goio-jna.jar']
    }),

    labquest: miniClass.extendClass(SensorApplet, {
      deviceType:            'labquest',
      deviceSpecificJarUrls: [
        'org/concord/sensor/sensor-vernier/sensor-vernier.jar',
        'org/concord/sensor/labquest-jna/labquest-jna.jar']
    })
  };
});
