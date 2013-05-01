/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "md2d",
        immutable: true
      },
      frequency: {
        defaultValue: 1,
        unitType: "frequency",
        propertyChangeInvalidates: true
      },
      timeScale: {
        defaultValue: 1,
        unitType: "time",
        propertyChangeInvalidates: true
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
