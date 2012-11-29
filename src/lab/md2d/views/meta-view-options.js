/*global define: false */

define(function() {

  return {
    fit_to_parent: {
      defaultValue: false
    },
    title: {
      defaultValue: false
    },
    xlabel: {
      defaultValue: false
    },
    ylabel: {
      defaultValue: false
    },
    controlButtons: {
      defaultValue: "play"
    },
    grid_lines: {
      defaultValue: false
    },
    xunits: {
      defaultValue: false
    },
    yunits: {
      defaultValue: false
    },
    atom_mubers: {
      defaultValue: false
    },
    enableAtomTooltips: {
      defaultValue: false
    },
    enableKeyboardHandlers: {
      defaultValue: true
    },
    atomTraceColor: {
      defaultValue: "#6913c5"
    },
    xmin: {
      defaultValue: 0
    },
    xmax: {
      defaultValue: 10
    },
    ymin: {
      defaultValue: 0
    },
    ymax: {
      defaultValue: 10
    },
    interactiveUrl: {
      defaultValue: ''
    },
    velocityVectors: {
      defaultValue: {
        color: "#000",
        width: 1.1,
        length: 2
      }
    },
    forceVectors: {
      defaultValue: {
        color: "#F0F",
        width: 1.1,
        length: 2
      }
    },
    textBoxes: {},
    images: {},
    imageMapping: {}
  };
});
