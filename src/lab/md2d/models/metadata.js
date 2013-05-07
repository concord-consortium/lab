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
        serialize: false
      },
      maxX: {
        serialize: false
      },
      minY: {
        serialize: false
      },
      maxY: {
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
        defaultValue: true,
        storeInTickHistory: true
      },
      coulombForces: {
        defaultValue: true,
        storeInTickHistory: true
      },
      temperatureControl: {
        defaultValue: false,
        storeInTickHistory: true
      },
      targetTemperature: {
        defaultValue: 300,
        unitType: "temperature",
        storeInTickHistory: true
      },
      modelSampleRate: {
        defaultValue: "default"
      },
      gravitationalField: {
        defaultValue: false,
        unitType: "acceleration",
        storeInTickHistory: true
      },
      timeStep: {
        defaultValue: 1,
        unitType: "time",
        storeInTickHistory: true
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
        defaultValue: 1,
        storeInTickHistory: true
      },
      timeStepsPerTick: {
        defaultValue: 50,
        storeInTickHistory: true
      },
      geneticEngineState: {
        defaultValue: "dna"
      },
      DNA: {
        defaultValue: ""
      },
      DNAComplement: {
        serialize: false
      },
      mRNA: {
        serialize: false
      },
      useQuantumDynamics: {
      },
      elementEnergyLevels: {
      },
      radiationlessEmissionProb: {
      }
    },

    viewOptions: {
      viewPortWidth: {
        unitType: "length",
        immutable: true
      },
      viewPortHeight: {
        unitType: "length",
        immutable: true
      },
      viewPortZoom: {
        defaultValue: 1
      },
      viewPortX: {
        unitType: "length"
      },
      viewPortY: {
        unitType: "length"
      },
      backgroundColor: {
        defaultValue: "#eeeeee"
      },
      showClock: {
        defaultValue: true,
        storeInTickHistory: true
      },
      markColor: {
        defaultValue: "#f8b500"
      },
      keShading: {
        defaultValue: false,
        storeInTickHistory: true
      },
      chargeShading: {
        defaultValue: false,
        storeInTickHistory: true
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
        defaultValue: false,
        storeInTickHistory: true
      },
      VDWLinesCutoff: {
        defaultValue: "medium"
      },
      showVelocityVectors: {
        defaultValue: false,
        storeInTickHistory: true
      },
      showForceVectors: {
        defaultValue: false,
        storeInTickHistory: true
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
      },
      mass: {
        // Mass is defined per element, but this is a convenience shortcut for
        // quick access to mass of the given atom.
        readOnly: true,
        unitType: "mass",
        serialize: false
      },
      excitation: {
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
      // Externally applied horizontal acceleration
      externalAx: {
        defaultValue: 0,
        unitType: "acceleration"
      },
      // Externally applied vertical acceleration
      externalAy: {
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
      calloutPoint: {},
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
