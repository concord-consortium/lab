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
      }
    },
    viewOptions: {
      aspectRatio: {
        defaultValue: 1.55
      },
      showClock: {
        defaultValue: false,
        propertyChangeInvalidates: false
      },
      controlButtons: {
        defaultValue: "reset",
        propertyChangeInvalidates: false
      }
    }
  };
});
