/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "sensor",
        immutable: true
      },
      sensorType: {
        defaultValue: null
      },
      samplesPerSecond: {
        readOnly: true
      },
      collectionTime: {
        defaultValue: null
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
      },
      controlButtonStyle: {
        defaultValue: "video",
        propertyChangeInvalidates: false,
        serialize: false
      }
    }
  };
});
