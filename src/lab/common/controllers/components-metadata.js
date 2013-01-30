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
      min: {
        required: true
      },
      max: {
        required: true
      },
      steps: {
        required: true
      },
      title: {
        defaultValue: ""
      },
      labels: {
        defaultValue: []
      },
      displayValue: {},
      property: {},
      action: {},
      initialValue: {}
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
