/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "md2d",
        immutable: true
      },
      width: {
        defaultValue: 10,
        immutable: true
      },
      height: {
        defaultValue: 10,
        immutable: true
      },
      lennardJonesForces: {
        defaultValue: true
      },
      coulombForces: {
        defaultValue: true
      },
      temperatureControl: {
        defaultValue: false
      },
      targetTemperature: {
        defaultValue: 300
      },
      modelSampleRate: {
        defaultValue: "default"
      },
      gravitationalField: {
        defaultValue: false
      },
      timeStep: {
        defaultValue: 1
      },
      dielectricConstant: {
        defaultValue: 1
      },
      realisticDielectricEffect: {
        defaultValue: true
      },
      solventForceFactor: {
        defaultValue: 1.25
      },
      solventForceType: {
        //  0 - vacuum.
        //  1 - water.
        // -1 - oil.
        defaultValue: 0
      },
      // Additional force applied to amino acids that depends on distance from the center of mass. It affects
      // only AAs which are pulled into the center of mass (to stabilize shape of the protein).
      // 'additionalSolventForceMult'      - maximum multiplier applied to solvent force when AA is in the center of mass.
      // 'additionalSolventForceThreshold' - maximum distance from the center of mass which triggers this increase of the force.
      // The additional force is described by the linear function of the AA distance from the center of mass
      // that passes through two points:
      // (0, additionalSolventForceMult) and (additionalSolventForceThreshold, 1).
      additionalSolventForceMult: {
        defaultValue: 4
      },
      additionalSolventForceThreshold: {
        defaultValue: 10
      },
      polarAAEpsilon: {
        defaultValue: -2
      },
      viscosity: {
        defaultValue: 1
      },
      viewRefreshInterval: {
        defaultValue: 50
      }
    },

    modelViewProperties: {
      backgroundColor: {
        defaultValue: "#eeeeee"
      },
      showClock: {
        defaultValue: true
      },
      keShading: {
        defaultValue: false
      },
      chargeShading: {
        defaultValue: false
      },
      useThreeLetterCode: {
        defaultValue: true
      },
      aminoAcidColorScheme: {
        defaultValue: "hydrophobicity"
      },
      showChargeSymbols: {
        defaultValue: true
      },
      showVDWLines: {
        defaultValue: false
      },
      VDWLinesCutoff: {
        defaultValue: "medium"
      },
      showVelocityVectors: {
        defaultValue: false
      },
      showForceVectors: {
        defaultValue: false
      },
      showAtomTrace: {
        defaultValue: false
      },
      atomTraceId: {
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
      xlabel: {
        defaultValue: false
      },
      ylabel: {
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
      atomNumbers: {
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

    element: {
      mass: {
        defaultValue: 120
      },
      sigma: {
        defaultValue: 0.3
      },
      epsilon: {
        defaultValue: -0.1
      },
      radius: {
        readOnly: true,
        serialize: false
      }
    },

    pairwiseLJProperties: {
      element1: {
        defaultValue: 0
      },
      element2: {
        defaultValue: 0
      },
      sigma: {
      },
      epsilon: {
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
      // Final value of pressure in Bars.
      westProbeValue: {
        readOnly: true,
        serialize: false
      },
      // Pressure probe, north side.
      northProbe: {
        defaultValue: false
      },
      // Final value of pressure in Bars.
      northProbeValue: {
        readOnly: true,
        serialize: false
      },
      // Pressure probe, east side.
      eastProbe: {
        defaultValue: false
      },
      // Final value of pressure in Bars.
      eastProbeValue: {
        readOnly: true,
        serialize: false
      },
      // Pressure probe, south side.
      southProbe: {
        defaultValue: false
      },
      // Final value of pressure in Bars.
      southProbeValue: {
        readOnly: true,
        serialize: false
      },
      // View options.
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
      type: {
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
    },

    geneticProperties: {
      DNA: {
        defaultValue: ""
      },
      x: {
        defaultValue: 0.01
      },
      y: {
        defaultValue: 0.01
      },
      height: {
        defaultValue: 0.12
      },
      DNAComplement: {
        readOnly: true
      },
      mRNA: {
        readOnly: true
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
