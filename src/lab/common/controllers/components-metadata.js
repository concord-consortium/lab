/*global define: false */

define(function() {

  return {
    button: {
      id: {
        required: true
      },
      type: {
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
      type: {
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
      id: {
        required: true
      },
      type: {
        required: true
      },
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
      id: {
        required: true
      },
      type: {
        required: true
      },
      options: {
        defaultValue: []
      }
    },

    pulldownOption: {
      text: {
        defaultValue: ""
      },
      disabled: {},
      selected: {},
      action: {},
      loadModel: {}
    },

    radio: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      options: {
        defaultValue: []
      }
    },

    radioOption: {
      text: {
        defaultValue: ""
      },
      disabled: {},
      selected: {},
      action: {},
      loadModel: {}
    },

    numericOutput: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      label: {
        defaultValue: ""
      },
      units: {
        defaultValue: ""
      },
      property: {},
      displayValue: {}
    },

    thermometer: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      min: {
        required: true
      },
      max: {
        required: true
      },
      labelIsReading: {
        defaultValue: false
      },
      reading: {
        defaultValue: {
          units: "K",
          offset: 0,
          scale: 1,
          digits: 0
        }
      }
    },

    graph: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      properties: {
        defaultValue: []
      },
      title: {
        defaultValue: "Graph"
      },
      xlabel: {
        defaultValue: "Model Time (ps)"
      },
      xmin: {
        defaultValue: 0
      },
      xmax: {
        defaultValue: 20
      },
      ylabel: {
        defaultValue: ""
      },
      ymin: {
        defaultValue: 0
      },
      ymax: {
        defualtValue: 10
      }
    },

    barGraph: {
      id: {
        required: true
      },
      type: {
        required: true
      },
      input1: {
        // Data input.
        required: true
      },
      options: {
        defaultValue: {
          // Min value displayed.
          minValue:  0,
          // Max value displayed.
          maxValue:  10,
          // Graph title.
          title:     "",
          // Color of the main bar.
          barColor:  "green",
          // Color of the area behind the bar.
          fillColor: "white",
          // Color of axis, labels, title.
          textColor: "#555",
          // Number of ticks displayed on the axis.
          // This value is *only* a suggestion. The most clean
          // and human-readable values are used.
          ticks:          10,
          // Number of subdivisions between major ticks.
          tickSubdivide: 1,
          // Enables or disables displaying of numerical labels.
          displayLabels: true,
          // Format of labels.
          // See the specification of this format:
          // https://github.com/mbostock/d3/wiki/Formatting#wiki-d3_format
          // or:
          // http://docs.python.org/release/3.1.3/library/string.html#formatspec
          labelFormat: "0.1f"
        }
      }
    }
  };
});
