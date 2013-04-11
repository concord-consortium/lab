/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "solar-system",
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
        defaultValue: "solar-system"
      },
      modelSampleRate: {
        defaultValue: "default"
      },
      timeStep: {
        defaultValue: 0.1
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
      showBodyTrace: {
        defaultValue: false
      },
      bodyTraceId: {
        defaultValue: 0
      },
      bodyTraceColor: {
        defaultValue: "#ee8833"
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
      planetNumbers: {
        defaultValue: false
      },
      enableBodyTooltips: {
        defaultValue: false
      },
      enableKeyboardHandlers: {
        defaultValue: true
      },
      planetTraceColor: {
        defaultValue: "#6913c5"
      }
    },

    body: {
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
      mass: {
        defaultValue: 1
      },
      radius: {
      },
      pinned: {
        defaultValue: false
      },
      visible: {
        defaultValue: 1
      },
      marked: {
        defaultValue: 0
      },
      // Read-only values, can be set only by engine:
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
        defaultValue: 0,
        unitType: "length"
      },
      y: {
        defaultValue: 0,
        unitType: "length"
      },
      anchor: {
        defaultValue: "lower-left"
      },
      layer: {
        defaultValue: 1
      },
      width: {},
      height: {},
      frame: {},
      color: {},
      backgroundColor: {
        defaultValue: "white"
      },
      strokeWidthEms: {
        defaultValue: 0.03
      },
      strokeOpacity: {
        defaultValue: 1.0
      },
      rotate: {
        defaultValue: 0
      },
      fontScale: {
        defaultValue: 1
      },
      hostType: {},
      hostIndex: {},
      textAlign: {}
    }
  };
});
