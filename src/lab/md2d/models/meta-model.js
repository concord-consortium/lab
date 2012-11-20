/*global define: false */

define(function() {

  return {
    properties: {
      targetTemperature: {
        defaultValue: 300
      },
      modelSampleRate: {
        defaultValue: "default"
      },
      coulombForces: {
        defaultValue: true
      },
      lennardJonesForces: {
        defaultValue: true
      },
      temperatureControl: {
        defaultValue: true
      },
      gravitationalField: {
        defaultValue: false
      },
      keShading: {
        defaultValue: false
      },
      chargeShading: {
        defaultValue: false
      },
      showVDWLines: {
        defaultValue: false
      },
      showVelocityVectors: {
        defaultValue: false
      },
      showClock: {
        defaultValue: true
      },
      showAtomTrace: {
        defaultValue: false
      },
      atomTraceId: {
        defaultValue: 0
      },
      viewRefreshInterval: {
        defaultValue: 50
      },
      timeStep: {
        defaultValue: 1
      },
      VDWLinesCutoff: {
        defaultValue: "medium"
      },
      viscosity: {
        defaultValue: 0
      }
    },

    atom: {
      // Required properties:
      x: {
        required: true
      },
      y: {
        required: true
      },
      // Optional properties:
      element: {
        defaultValue: 0
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
      charge: {
        defaultValue: 0
      },
      friction: {
        defaultValue: 0
      },
      visible: {
        defaultValue: 1
      },
      pinned: {
        defaultValue: 0
      },
      marked: {
        defaultValue: 0
      },
      draggable: {
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

    obstacle: {
      // Required properties:
      width: {
        required: true
      },
      height: {
        required: true
      },
      // Optional properties:
      x: {
        defaultValue: 0
      },
      y: {
        defaultValue: 0
      },
      mass: {
        defaultValue: Infinity
      },
      vx: {
        defaultValue: 0
      },
      vy: {
        defaultValue: 0
      },
      // External horizontal force, per mass unit.
      externalFx: {
        defaultValue: 0
      },
      // External vertical force, per mass unit.
      externalFy: {
        defaultValue: 0
      },
      // Damping force, per mass unit.
      friction: {
        defaultValue: 0
      },
      // Pressure probe, west side.
      westProbe: {
        defaultValue: false
      },
      // Pressure probe, north side.
      northProbe: {
        defaultValue: false
      },
      // Pressure probe, east side.
      eastProbe: {
        defaultValue: false
      },
      // Pressure probe, south side.
      southProbe: {
        defaultValue: false
      },
      colorR: {
        defaultValue: 128
      },
      colorG: {
        defaultValue: 128
      },
      colorB: {
        defaultValue: 128
      },
      visible: {
        defaultValue: true
      }
    },

    radialBond: {
      atom1: {
        defaultValue: 0
      },
      atom2: {
        defaultValue: 0
      },
      length: {
        required: true
      },
      strength: {
        required: true
      },
      style: {
        defaultValue: 101
      }
    },

    angularBond: {
      atom1: {
        defaultValue: 0
      },
      atom2: {
        defaultValue: 0
      },
      atom3: {
        defaultValue: 0
      },
      strength: {
        required: true
      },
      angle: {
        required: true
      }
    },

    restraint: {
      atomIndex: {
        required: true
      },
      k: {
        defaultValue: 2000
      },
      x0: {
        defaultValue: 0
      },
      y0: {
        defaultValue: 0
      }
    }
  };
});
