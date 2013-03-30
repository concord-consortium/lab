/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "md2d",
        immutable: true
      },
      imagePath: {
        defaultValue: "",
        immutable: true
      },
      minX: {
        defaultValue: 0,
        serialize: false
      },
      maxX: {
        defaultValue: 10,
        serialize: false
      },
      minY: {
        defaultValue: 0,
        serialize: false
      },
      maxY: {
        defaultValue: 10,
        serialize: false
      },
      width: {
        defaultValue: 10,
        unitType: "length",
        immutable: true
      },
      height: {
        defaultValue: 10,
        unitType: "length",
        immutable: true
      },
      unitsScheme: {
        defaultValue: "md2d"
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
        defaultValue: 300,
        unitType: "temperature"
      },
      modelSampleRate: {
        defaultValue: "default"
      },
      gravitationalField: {
        defaultValue: false,
        unitType: "acceleration"
      },
      timeStep: {
        defaultValue: 1,
        unitType: "time"
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
        defaultValue: 10,
        unitType: "length"
      },
      polarAAEpsilon: {
        defaultValue: -2
      },
      viscosity: {
        defaultValue: 1
      },
      timeStepsPerTick: {
        defaultValue: 50
      }
    },

    viewOptions: {
      backgroundColor: {
        defaultValue: "#eeeeee"
      },
      showClock: {
        defaultValue: true
      },
      markColor: {
        defaultValue: "#f8b500"
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
        required: true,
        unitType: "length"
      },
      y: {
        required: true,
        unitType: "length"
      },
      // Optional properties:
      element: {
        defaultValue: 0
      },
      vx: {
        defaultValue: 0,
        unitType: "velocity"
      },
      vy: {
        defaultValue: 0,
        unitType: "velocity"
      },
      ax: {
        defaultValue: 0,
        unitType: "acceleration",
        serialize: false
      },
      ay: {
        defaultValue: 0,
        unitType: "acceleration",
        serialize: false
      },
      charge: {
        defaultValue: 0,
        unitType: "charge"
      },
      friction: {
        defaultValue: 0,
        unitType: "dampingCoefficient"
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
        unitType: "length",
        serialize: false
      },
      px: {
        readOnly: true,
        unitType: "momentum",
        serialize: false
      },
      py: {
        readOnly: true,
        unitType: "momentum",
        serialize: false
      },
      speed: {
        readOnly: true,
        unitType: "velocity",
        serialize: false
      }
    },

    element: {
      mass: {
        defaultValue: 120,
        unitType: "mass"
      },
      sigma: {
        defaultValue: 0.3,
        unitType: "length"
      },
      epsilon: {
        defaultValue: -0.1,
        unitType: "energy"
      },
      radius: {
        unitType: "length",
        readOnly: true,
        serialize: false
      },
      color: {
        defaultValue: -855310
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
        unitType: "length"
      },
      epsilon: {
        unitType: "energy"
      }
    },

    obstacle: {
      // Required properties:
      width: {
        unitType: "length",
        required: true
      },
      height: {
        unitType: "length",
        required: true
      },
      // Optional properties:
      x: {
        defaultValue: 0,
        unitType: "length"
      },
      y: {
        defaultValue: 0,
        unitType: "length"
      },
      mass: {
        defaultValue: Infinity,
        unitType: "mass"
      },
      vx: {
        defaultValue: 0,
        unitType: "velocity"
      },
      vy: {
        defaultValue: 0,
        unitType: "velocity"
      },
      // External horizontal force, per mass unit (i.e., despite the name it's an acceleration)
      externalFx: {
        defaultValue: 0,
        unitType: "acceleration"
      },
      // External vertical force, per mass unit.
      externalFy: {
        defaultValue: 0,
        unitType: "accleration"
      },
      // Damping coefficient per mass unit (= acceleration / velocity = 1 / time)
      friction: {
        defaultValue: 0,
        unitType: "inverseTime"
      },
      // Pressure probe, west side.
      westProbe: {
        defaultValue: false
      },
      // Final value of pressure in Bars.
      westProbeValue: {
        unitType: "pressure",
        readOnly: true,
        serialize: false
      },
      // Pressure probe, north side.
      northProbe: {
        defaultValue: false
      },
      // Final value of pressure in Bars.
      northProbeValue: {
        unitType: "pressure",
        readOnly: true,
        serialize: false
      },
      // Pressure probe, east side.
      eastProbe: {
        defaultValue: false
      },
      // Final value of pressure in Bars.
      eastProbeValue: {
        unitType: "pressure",
        readOnly: true,
        serialize: false
      },
      // Pressure probe, south side.
      southProbe: {
        defaultValue: false
      },
      // Final value of pressure in Bars.
      southProbeValue: {
        unitType: "pressure",
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
        unitType: "length",
        required: true
      },
      strength: {
        unitType: "stiffness",
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
        unitType: "rotationalStiffness",
        required: true
      },
      angle: {
        unitType: "angle",
        required: true
      }
    },

    restraint: {
      atomIndex: {
        required: true
      },
      k: {
        defaultValue: 2000,
        unitType: "stiffness"
      },
      x0: {
        defaultValue: 0,
        unitType: "length"
      },
      y0: {
        defaultValue: 0,
        unitType: "length"
      }
    },

    geneticProperties: {
      DNA: {
        defaultValue: ""
      },
      DNAComplement: {
        readOnly: true,
        serialize: false
      },
      mRNA: {
        // Immutable directly via set method.
        // Use provided API to generate mRNA.
        immutable: true
      },
      translationStep: {
        // When this property is undefined, it means that the translation
        // hasn't been yet started. Note that when translation is finished,
        // translationStep will be equal to "end".
        // Immutable directly via set method.
        // Use provided API to translate step by step.
        immutable: true
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
      width: {
        defaultValue: 0.08
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
      layer: {
        defaultValue: 1
      },
      width: {},
      frame: {},
      color: {},
      backgroundColor: {
        defaultValue: "white"
      },
      strokeWidth: {
        defaultValue: 0.5
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
