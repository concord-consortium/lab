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
    interactiveUrl: {
      defaultValue: ''
    },
    velocityVectors: {
      defaultValue: {
        color: "#000",
        width: 0.01,
        length: 2
      }
    },
    forceVectors: {
      defaultValue: {
        color: "#169C30",
        width: 0.01,
        length: 2
      }
    },
    textBoxes: {}
  };
});
