/*global define: false */

define(function() {

  return {
    button: {
      id: {
        required: true
      },
      action: {
        required: true
      },
      text: {
        defaultValue: ""
      }
    },

    checkbox: {
      id: {
        required: true
      },
      text: {
        defaultValue: ""
      },
      property: {},
      onClick: {},
      // Note that 'initialValue' makes sense only for checkboxes without property binding.
      initialValue: {}
    },

    slider: {

    },

    pulldown: {

    },

    radio: {

    },

    numericOutput: {

    },

    thermometer: {

    },

    graph: {

    },

    barGraph: {

    }
  };
});
