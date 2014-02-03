/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "signal-generator",
        immutable: true
      },
      frequency: {
        defaultValue: 1,
        unitType: "frequency",
        propertyChangeInvalidates: true
      },
      modelSampleRate: {
        defaultValue: 60,
        propertyChangeInvalidates: true
      },
      timeScale: {
        defaultValue: 1,
        unitType: "time",
        propertyChangeInvalidates: true
      },
      sampleBatchLength: {
        defaultValue: 1,
        propertyChangeInvalidates: false
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
