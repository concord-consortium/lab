/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "dual-sensor-connector",
        immutable: true
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
      },
      useDuration: {
        defaultValue: 'codap',
        storeInTickHistory: false,
        validate: function(value) {
          if (value === true || value === false || value === 'codap') {
            return value;
          }
          throw new Error("Invalid 'useDuration' value: " + value);
        },
      },
      requestedDuration: {
        defaultValue: 10,
        storeInTickHistory: false
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
