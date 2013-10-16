/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "iframe-model",
        immutable: true
      },
      url: {
        immutable: true
      },
      width: {
        defaultValue: 150
      },
      height: {
        defaultValue: 150
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
