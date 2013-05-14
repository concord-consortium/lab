/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "sensor",
        immutable: true
      },
      sensorType: {
        defaultValue: 'goMotion'
      },
      samplesPerSecond: {
        readOnly: true
      }
    },
    viewOptions: {
      showClock: {
        defaultValue: true,
        propertyChangeInvalidates: false
      },
      controlButtons: {
        defaultValue: "play_reset",
        propertyChangeInvalidates: false
      }
    }
  };
});
