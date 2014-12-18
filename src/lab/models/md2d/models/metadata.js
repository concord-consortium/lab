/*global define: false */

define(function() {

  return {
    mainProperties: {
      type: {
        defaultValue: "md2d",
        immutable: true
      },
      isBeingEdited: {
        defaultValue: false,
        serialize: false
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
      DNAState: {
        defaultValue: "dna"
      },
      DNA: {
        defaultValue: "",
        validate: function (value) {
          if (/[agtc]/.test(value)) {
            value = value.toUpperCase();
          }
          if (/[^AGTC]/.test(value)) {
            throw new Error("DNA code on sense strand can be defined using only A, G, T or C characters.");
          }
          return value;
        }
      },
      DNAMutations: {
        defaultValue: true
      },
      useQuantumDynamics: {
        defaultValue: false
      },
      useChemicalReactions: {
        defaultValue: false
      },
      useDuration: {
        defaultValue: 'codap',
        storeInTickHistory: false,
        validate: function(value) {
          if (value === true || value === false || value === 'codap') {
            return value;
          }
          throw new Error("Invalid 'useDuration' value: " + value);
        },
      },
      requestedDuration: {
        defaultValue: null,
        storeInTickHistory: false
      },
      skipPECheckOnAddAtom: {
        defaultValue: false
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
      viewPortDrag: {
        // Supported values:
        // - true  -> dragging is enabled.
        // - "x"   -> dragging is limited only to X axis.
        // - "y"   -> dragging is limited only yo Y axis.
        // - false -> dragging is disabled.
        defaultValue: false
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
      showElectricField: {
        defaultValue: false,
        storeInTickHistory: true
      },
      electricFieldDensity: {
        defaultValue: 18, // it means 18 arrows per row
        storeInTickHistory: true
      },
      electricFieldColor: {
        // "auto" means color contrasting to background, black or white.
        // However any custom color can be specified.
        defaultValue: "auto"
      },
      showAtomTrace: {
        storeInTickHistory: true,
        defaultValue: false
      },
      atomTraceId: {
        storeInTickHistory: true,
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
      controlButtonStyle: {
        defaultValue: "video",
        propertyChangeInvalidates: false,
        // expectation is that this will be set by the interactive
        serialize: false
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
      },
      forceVectorsDirectionOnly: {
        defaultValue: false
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
      radical: {
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
      draggableWhenStopped: {
        defaultValue: 1
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
        // [Quantum Dynamics plugin]
      },
      sharedElectrons: {
        // [Chemical Reactions plugin]
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
        unitType: "acceleration"
      },
      // Whether to render arrows for the externally applied acceleration externalAx and externalAy
      displayExternalAcceleration: {
        defaultValue: true
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
      color:{
        defaultValue: "rgb(128,128,128)"
      },
      visible: {
        defaultValue: true
      }
    },

    shape: {
      // Required properties:
      type: {
        defaultValue: "rectangle",
        required: true
      },
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
      fence: {
        defaultValue: 0,
      },
      // View options.
      color: {
        defaultValue: "transparent"
      },
      lineColor: {
        defaultValue: "black"
      },
      lineDashes: {
        defaultValue: "none"
      },
      lineWeight: {
        defaultValue: 1
      },
      layer: {
        defaultValue: 1
      },
      layerPosition: {
        defaultValue: 1
      },
      visible: {
        defaultValue: 1
      }
    },

    line: {
      // Required properties:
      x1: {
        defaultValue: 0,
        required: true,
        unitType: "length"
      },
      y1: {
        defaultValue: 0,
        required: true,
        unitType: "length"
      },
      x2: {
        defaultValue: 0,
        required: true,
        unitType: "length"
      },
      y2: {
        defaultValue: 0,
        required: true,
        unitType: "length"
      },
      // Optional properties:
      beginStyle: {
        defaultValue: "none",
      },
      endStyle: {
        defaultValue: "none",
      },
      fence: {
        defaultValue: 0,
      },
      // View options.
      lineColor: {
        defaultValue: "black"
      },
      lineDashes: {
        defaultValue: "none"
      },
      lineWeight: {
        defaultValue: 1
      },
      layer: {
        defaultValue: 1
      },
      layerPosition: {
        defaultValue: 1
      },
      visible: {
        defaultValue: 1
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

    electricField: {
      intensity: {
        defaultValue: 0.004
      },
      orientation: {
        defaultValue: "E"
      },
      shapeIdx: {
        // Optional, electric field boundaries can be limited to a shape. When 'null' is used,
        // the electric field will be applied to the whole model area.
        defaultValue: null
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
      strokeColor: {
        defaultValue: "#000000"
      },
      rotate: {
        defaultValue: 0
      },
      fontSize: {
        defaultValue: 0.12 // defined in nm!
      },
      hostType: {},
      hostIndex: {},
      textAlign: {}
    },

    chemicalReactions: {
      updateInterval: {
        defaultValue: 10
      },
      createAngularBonds: {
        // When this option is set to true, the algorithm will add angular bonds between triplet
        // of atoms. Angle calculation is based on the energy minimization and valence electrons
        // count.
        defaultValue: true
      },
      noLoops: {
        // If this option is enabled, the algorithm will ensure that no molecule will form a loop.
        // Note that it can have impact on performance and in many cases won't be possible due to
        // valence electrons configuration anyway.
        defaultValue: false
      },
      valenceElectrons: {
        defaultValue: [1, 1, 7, 7]
      },
      bondEnergy: {
        defaultValue: {
          // This configuration means that default bond chemical energy is 6eV, however single bonds
          // between the same elements (like bond between 1 and 1) have a bit smaller chemical
          // energy equal to 4eV. You can freely modify this configuration. Note that you should
          // define "default" key if you don't specify all possible configurations.
          // Single bond is defined by "-" symbol, e.g. 0-1 is a single bond between element 0 and 1.
          // Double bond is defined by "=" symbol, e.g. 1=2 is a double bond between element 1 and 2.
          // Triple bond is defined by "#" symbol, e.g. 2#3 is a triple bond between element 2 and 3.
          "default": 6,
          "0-0": 4,
          "1-1": 4,
          "2-2": 4,
          "3-3": 4
        }
      },
      activationEnergy: {
        defaultValue: {
          // This configuration means that default activation energy is equal to 0.2eV.
          // If you need custom parameters for various combinations, you can add e.g.:
          // "1+2-2": 0.5,
          // "2+1-1": 5
          // what means that when element 1 collides with two bonded elements 2, activation
          // energy that causes bonds exchange is 0.5 eV. Similarly, when element 2 collides with
          // two bonded elements 1, activation energy that causes bonds exchange is 5 eV.
          // Note that format is important! Single element is first, then "+" sign, then pair
          // description.
          "default": 0.2

        }
      },
      bondProbability: {
        defaultValue: {
          // This configuration means that when two colliding atoms have 3 unpaired electrons
          // (e.g. their valence electron count is equal to 5), there is 80% chances that
          // single bond will be formed between them, 15% that double and 5% that triple.
          // If you need custom probability for a specific elements configuration, you can add e.g:
          // "1-2": [0.6, 0.3, 0.1]
          // what has analogical meaning, but these values are limited only to elements 1 and 2.
          "default": [0.8, 0.15, 0.05]
        },
        validate: function (value) {
          Object.keys(value).forEach(function (key) {
            var p = value[key];
            if (Math.abs(p[0] + p[1] + p[2] - 1) > 1e-3) {
              throw new Error("Bond type probability values should sum to one.");
            }
          });
          return value;
        }
      }
    },

    image: {
      imageUri: {
        required: true
      },
      imageX: {
        defaultValue: 0,
        required: true
      },
      imageY: {
        defaultValue: 0,
        required: true
      },
      imageHostType: {
        defaultValue: ""
      },
      imageHostIndex: {
        defaultValue: 0
      },
      imageLayer: {
        defaultValue: 1
      },
      imageLayerPosition: {
        defaultValue: 1
      },
      visible: {
        defaultValue: true
      },
      rotation: {
        defaultValue: 0
      },
      opacity: {
        defaultValue: 1
      }
    },

    quantumDynamics: {
      elementEnergyLevels: {
        defaultValue: []
      },
      photons: {
        defaultValue: {}
      },
      radiationlessEmissionProbability: {
        defaultValue: 1
      },
      lightSource: {
      }
    },

    photon: {
      x: {
        serialize: true
      },
      y: {
        serialize: true
      },
      vx: {
        defaultValue: 0,
        serialize: true
      },
      vy: {
        defaultValue: 0,
        serialize: true
      },
      angularFrequency: {
        serialize: true
      }
    }
  };
});
