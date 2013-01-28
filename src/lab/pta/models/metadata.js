/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "pta",
        immutable: true
      },
      imagePath: {
        defaultValue: "",
        immutable: true
      },
      minX: {
        defaultValue: -25,
        immutable: true
      },
      maxX: {
        defaultValue: 25,
        immutable: true
      },
      minY: {
        defaultValue: -25,
        immutable: true
      },
      maxY: {
        defaultValue: 25,
        immutable: true
      },
      width: {
        defaultValue: 50
      },
      height: {
        defaultValue: 50
      },
      unitsScheme: {
        defaultValue: "pta"
      },
      modelSampleRate: {
        defaultValue: "default"
      },
      timeStep: {
        defaultValue: 1
      },
      timeStepsPerTick: {
        defaultValue: 50
      },
      horizontalWrapping: {
        defaultValue: false
      },
      verticalWrapping: {
        defaultValue: false
      },
    },

    viewOptions: {
      viewPortWidth: {
        defaultValue: 50,
        unitType: "length",
        immutable: true
      },
      viewPortHeight: {
        defaultValue: 50,
        unitType: "length",
        immutable: true
      },
      viewPortX: {
        defaultValue: 0,
        unitType: "length",
        immutable: true
      },
      viewPortY: {
        defaultValue: 0,
        unitType: "length",
        immutable: true
      },
      backgroundColor: {
        defaultValue: "#eeeeee"
      },
      showClock: {
        defaultValue: true
      },
      markColor: {
        defaultValue: "#f8b500"
      },
      showTurtleTrace: {
        defaultValue: false
      },
      turtleTraceId: {
        defaultValue: 0
      },
      images: {
        defaultValue: []
      },
      imageMapping: {
        defaultValue: {}
      },
      textBoxes: {
        defaultValue: []
      },
      fitToParent: {
        defaultValue: false
      },
      xunits: {
        defaultValue: false
      },
      yunits: {
        defaultValue: false
      },
      controlButtons: {
        defaultValue: "play"
      },
      gridLines: {
        defaultValue: false
      },
      turtleNumbers: {
        defaultValue: false
      },
      enableTurtleTooltips: {
        defaultValue: false
      },
      enableKeyboardHandlers: {
        defaultValue: true
      },
      turtleTraceColor: {
        defaultValue: "#6913c5"
      }
    },

    turtle: {
      // Required properties:
      x: {
        required: true
      },
      y: {
        required: true
      },
      vx: {
        defaultValue: 0
      },
      vy: {
        defaultValue: 0
      },
      ax: {
        defaultValue: 0,
        serialize: false
      },
      ay: {
        defaultValue: 0,
        serialize: false
      },
      visible: {
        defaultValue: 1
      },
      marked: {
        defaultValue: 0
      },
      // Read-only values, can be set only by engine:
      radius: {
        readOnly: true,
        serialize: false
      },
      px: {
        readOnly: true,
        serialize: false
      },
      py: {
        readOnly: true,
        serialize: false
      },
      speed: {
        readOnly: true,
        serialize: false
      }
    },

    textBox: {
      text: {
        defaultValue: ""
      },
      x: {
        defaultValue: 0
      },
      y: {
        defaultValue: 0
      },
      layer: {
        defaultValue: 1
      },
      width: {},
      frame: {},
      color: {},
      backgroundColor: {},
      hostType: {},
      hostIndex: {},
      textAlign: {}
    }
  };
});
