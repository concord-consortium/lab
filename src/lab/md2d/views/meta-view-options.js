/*global define: false */

define(function() {

  return {
    controlButtons: {
      defaultValue: "play"
    },
    grid_lines: {
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
    }
  };
});
