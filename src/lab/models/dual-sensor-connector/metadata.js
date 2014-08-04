/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "dual-sensor-connector",
        immutable: true
      },
      collectionTime: {
        defaultValue: null
      },
      tareValue: {
        defaultValue: 0
      },
      tareValue2: {
        defaultValue: 0
      },
      clientId: {
        defaultValue: null
      },
      clientName: {
        defaultValue: null
      },
      useRandomClientId: {
        defaultValue: false
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
