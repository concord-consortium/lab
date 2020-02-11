/*global define: false */

export default {
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
    },
    tareValue: {
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
