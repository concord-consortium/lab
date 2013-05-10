/*global define: false*/

define(function() {
  return {
    goMotion: {
      appletClass: 'goio',
      measurementType: 'distance',

      // fully specified, readable name of the sensor: e.g., "GoIO pH Sensor"
      sensorName: "GoMotion",

      // readable name of the interface device the sensor connects to, e..g, "GoIO"
      deviceName: "GoMotion",

      samplesPerSecond: 20,
      tareable: true
    }
  };
});
