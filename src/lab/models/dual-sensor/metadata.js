/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "dual-sensor",
        immutable: true
      },
      sensorType: {
        defaultValue: null
      },
      sensorType2: {
        defaultValue: null
      },
      samplesPerSecond: {
        readOnly: true
      },
      collectionTime: {
        defaultValue: null
      },
      tareValue: {
        defaultValue: 0
      },
      tareValue2: {
        defaultValue: 0
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
