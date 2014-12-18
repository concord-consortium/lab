/*global define: true */

define(function (require, exports) {

  var arrays               = require('arrays'),
      arrayTypes           = require('common/array-types'),
      console              = require('common/console'),
      constants            = require('./constants/index'),
      unit                 = constants.unit,
      aminoacidsHelper     = require('cs!models/md2d/models/aminoacids-helper'),
      math                 = require('./math/index'),
      coulomb              = require('./potentials/index').coulomb,
      lennardJones         = require('./potentials/index').lennardJones,
      PairwiseLJProperties = require('cs!./pairwise-lj-properties'),
      CloneRestoreWrapper  = require('common/models/engines/clone-restore-wrapper'),
      CellList             = require('./cell-list'),
      NeighborList         = require('./neighbor-list'),
      PluginController     = require('common/models/plugin-controller'),
      utils                = require('./utils'),

      BOLTZMANN_CONSTANT_IN_JOULES = constants.BOLTZMANN_CONSTANT.as( unit.JOULES_PER_KELVIN ),

      cross = function(a0, a1, b0, b1) {
        return a0*b1 - a1*b0;
      },

      sumSquare = function(a,b) {
        return a*a + b*b;
      },

      /**
        Convert total kinetic energy in the container of N atoms to a temperature in Kelvin.

        Input units:
          KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
        Output units:
          T: K
      */
      convertKEtoT = function(totalKEinMWUnits, N) {
        if (N === 0) return 0;
        var averageKEinMWUnits = totalKEinMWUnits / N,
            averageKEinJoules = constants.convert(averageKEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.JOULE });
        return averageKEinJoules / BOLTZMANN_CONSTANT_IN_JOULES;
      },

      /**
        Convert a temperature in Kelvin to the total kinetic energy in the container of N atoms.

        Input units:
          T: K
        Output units:
          KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
      */
      convertTtoKE = function(T, N) {
        var averageKEinJoules  = T * BOLTZMANN_CONSTANT_IN_JOULES,
            averageKEinMWUnits = constants.convert(averageKEinJoules, { from: unit.JOULE, to: unit.MW_ENERGY_UNIT }),
            totalKEinMWUnits = averageKEinMWUnits * N;

        return totalKEinMWUnits;
      },

      validateTemperature = function(t) {
        var temperature = parseFloat(t);

        if (isNaN(temperature)) {
          throw new Error("md2d: requested temperature " + t + " could not be understood.");
        }
        if (temperature < 0) {
          throw new Error("md2d: requested temperature " + temperature + " was less than zero");
        }
        if (temperature === Infinity) {
          throw new Error("md2d: requested temperature was Infinity!");
        }
      };

  exports.createEngine = function() {

    var // the object to be returned
        engine,

        // Whether system dimensions have been set. This is only allowed to happen once.
        sizeHasBeenInitialized = false,

        pluginController = new PluginController(),

        // Whether to simulate Coulomb forces between particles.
        useCoulombInteraction = false,

        // Dielectric constant, it influences Coulomb interaction.
        // E.g. a dielectric of 80 means a Coulomb force 1/80th as strong.
        dielectricConst = 1,

        // Whether dielectric effect should be realistic or simplified. Realistic
        // version takes into account distance between charged particles and reduces
        // dielectric constant when particles are closer to each other.
        realisticDielectricEffect = true,

        // Parameter that reflects the watery extent of the solvent, when an effective
        // hydrophobic/hydrophilic interaction is used. A negative value represents oil environment
        // (usually -1). A positive one represents water environment (usually 1). A zero value means vacuum.
        solventForceType = 0,

        // State describing whether DNA translation is in progress.
        // TODO: move all functionality connected with DNA and proteins to engine plugins!
        dnaTranslationInProgress = false,

        // Parameter that influences strength of force applied to amino acids by water of oil (solvent).
        solventForceFactor = 1,

        // Additional force applied to amino acids that depends on distance from the center of mass. It affects
        // only AAs which are pulled into the center of mass (to stabilize shape of the protein).
        additionalSolventForceMult = 25,
        additionalSolventForceThreshold = 3,

        // Whether to simulate Lennard Jones forces between particles.
        useLennardJonesInteraction = true,

        // Whether to use the thermostat to maintain the system temperature near T_target.
        useThermostat = false,

        // A value to use in calculating if two atoms are close enough for a VDW line to be displayed
        vdwLinesRatio = 1.67,

        // If a numeric value include gravitational field in force calculations,
        // otherwise value should be false
        gravitationalField = false,

        // Desired system temperature, in Kelvin.
        T_target,

        // System dimensions as [x, y] in nanometers. Default value can be changed until particles are created.
        size = [10, 10],

        // System dimensions as minX, minY, maxX, maxY. Default value can be changed until turles are created.
        minX =  0,
        minY =  0,
        maxX = 10,
        maxY = 10,

        // Viscosity of the medium of the model
        viscosity,

        // The current model time, in femtoseconds.
        time = 0,

        // The current integration time step, in femtoseconds.
        dt,

        // Square of integration time step, in fs^2.
        dt_sq,

        // ####################################################################
        //                      Atom Properties

        // Individual property arrays for the atoms, indexed by atom number
        radius, px, py, x, y, vx, vy, speed, ax, ay, charge, element, friction, radical, pinned, mass, hydrophobicity,
        // Helper array, which may be used by various engine routines traversing atoms in untypical order.
        // Make sure that you reset it before use. At the moment, it's used by updateAminoAcidForces() function.
        visited,

        // An object that contains references to the above atom-property arrays
        atoms,

        // The number of atoms in the system.
        N = 0,

        // ####################################################################
        //                      Element Properties

        // Individual property arrays for the elements
        elementMass,
        elementEpsilon,
        elementSigma,
        elementRadius,
        elementColor,

        // An object that contains references to the above element-property arrays
        elements,

        // Number of actual elements (may be smaller than the length of the property arrays).
        N_elements = 0,

        // Additional structure, keeping information if given element is represented by
        // some atom in the model. Necessary for effective max cut-off distance calculation.
        elementUsed = [],

        // ####################################################################
        //                      Custom Pairwise LJ Properties
        pairwiseLJProperties,

        // ####################################################################
        //                      Radial Bond Properties

        // Individual property arrays for the "radial" bonds, indexed by bond number
        radialBondAtom1Index,
        radialBondAtom2Index,
        radialBondLength,
        radialBondStrength,
        radialBondType,

        // An object that contains references to the above radial-bond-property arrays.
        // Left undefined if there are no radial bonds.
        radialBonds,

        // Number of actual radial bonds (may be smaller than the length of the property arrays).
        N_radialBonds = 0,

        // Flag indicating if some radial bonds were added or removed during the integration step.
        radialBondsChanged = false,

        // ####################################################################
        //                      Restraint Properties

        // Individual property arrays for the "restraint" bonds, indexed by bond number.
        restraintAtomIndex,
        restraintK,
        restraintX0,
        restraintY0,

        // An object that contains references to the above restraint-property arrays.
        // Left undefined if there are no restraints.
        restraints,

        // Number of actual restraint bonds (may be smaller than the length of the property arrays).
        N_restraints = 0,

        // ####################################################################
        //                      Angular Bond Properties

        // Individual property arrays for the "angular" bonds, indexed by bond number.
        angularBondAtom1Index,
        angularBondAtom2Index,
        angularBondAtom3Index,
        angularBondAngle,
        angularBondStrength,

        // An object that contains references to the above angular-bond-property arrays.
        // Left undefined if there are no angular bonds.
        angularBonds,

        // Number of actual angular bonds (may be smaller than the length of the property arrays).
        N_angularBonds = 0,

        // ####################################################################
        //                      Obstacle Properties

        // Individual properties for the obstacles
        obstacleX,
        obstacleY,
        obstacleWidth,
        obstacleHeight,
        obstacleVX,
        obstacleVY,
        obstacleExtAX,
        obstacleExtAY,
        obstacleFriction,
        obstacleMass,
        obstacleWestProbe,
        obstacleNorthProbe,
        obstacleEastProbe,
        obstacleSouthProbe,
        obstacleColor,
        obstacleVisible,

        // Properties used only during internal calculations (e.g. shouldn't
        // be returned during getObstacleProperties(i) call - TODO!).
        obstacleXPrev,
        obstacleYPrev,

        // ### Pressure calculation ###
        // Arrays containing sum of impulses 2mv/dt from atoms hitting the probe.
        // These values are later stored in pressureBuffers object, interpolated
        // (last average of last PRESSURE_BUFFERS_LEN values) and converted
        // to value in Bar by getPressureFromProbe() function.
        obstacleWProbeValue,
        obstacleNProbeValue,
        obstacleEProbeValue,
        obstacleSProbeValue,

        // An object that contains references to the above obstacle-property arrays.
        // Left undefined if there are no obstacles.
        obstacles,

        // Number of actual obstacles
        N_obstacles = 0,

        // ####################################################################
        //                      Shape Properties

        // Individual properties for the shapes
        shapeType,
        shapeX,
        shapeY,
        shapeWidth,
        shapeHeight,
        shapeFence,
        shapeColor,
        shapeLineColor,
        shapeLineDashes,
        shapeLineWeight,
        shapeLayer,
        shapeLayerPosition,
        shapeVisible,

        // An object that contains references to the above shape-property arrays.
        // Left undefined if there are no shapes.
        shapes,

        // Number of actual shapes
        N_shapes = 0,


        // ####################################################################
        //                      Line Properties

        // Individual properties for the lines
        lineX1,
        lineY1,
        lineX2,
        lineY2,
        lineBeginStyle,
        lineEndStyle,
        lineFence,
        lineLineColor,
        lineLineDashes,
        lineLineWeight,
        lineLayer,
        lineLayerPosition,
        lineVisible,

        // An object that contains references to the above line-property arrays.
        // Left undefined if there are no lines.
        lines,

        // Number of actual lines
        N_lines = 0,

        // ####################################################################
        //                      Electric Field Properties

        // Individual properties for the electric fields.
        electricFieldIntensity,
        electricFieldOrientation,
        electricFieldShapeIdx,

        // An object that contains references to the above shape-property arrays.
        // Left undefined if there are no electric fields.
        electricFields,

        // Number of actual electric fields.
        N_electricFields = 0,

        // ####################################################################
        //                      Misc Properties
        // Hash of arrays containing VdW pairs
        vdwPairs,

        // Number of VdW pairs
        N_vdwPairs,

        // Arrays of VdW pair atom #1 and atom #2 indices
        vdwPairAtom1Index,
        vdwPairAtom2Index,

        // Arrays for spring forces, which are forces defined between an atom and a point in space
        springForceAtomIndex,
        springForceX,
        springForceY,
        springForceStrength,

        // An array whose members are the above spring-force-property arrays
        springForces,

        // The number of spring forces currently being applied in the model.
        N_springForces = 0,

        // Cell list structure.
        cellList,

        // Neighbor (Verlet) list structure.
        neighborList,

        // Information whether neighbor list should be
        // recalculated in the current integration step.
        updateNeighborList,

        //
        // The location of the center of mass, in nanometers.
        x_CM, y_CM,

        // Linear momentum of the system, in Dalton * nm / fs.
        px_CM, py_CM,

        // Velocity of the center of mass, in nm / fs.
        vx_CM, vy_CM,

        // Angular momentum of the system wrt its center of mass
        L_CM,

        // (Instantaneous) moment of inertia of the system wrt its center of mass
        I_CM,

        // Angular velocity of the system about the center of mass, in radians / fs.
        // (= angular momentum about CM / instantaneous moment of inertia about CM)
        omega_CM,

        // instantaneous system temperature, in Kelvin
        T,

        // cutoff for force calculations, as a factor of sigma
        cutoff = 4,
        cutoffDistance_LJ_sq = [],

        // cutoff for neighbor list calculations, as a factor of sigma
        cutoffList = 4.1,
        cutoffNeighborListSquared = [],

        // Each object at ljCalculator[i,j] can calculate the magnitude of the Lennard-Jones force and
        // potential between elements i and j
        ljCalculator = [],

        // List of particles representing cysteine amino acid, which can possibly create disulphide bonds.
        // So, each cysteine in this list is NOT already connected to other cysteine.
        freeCysteinesList = [],

        // Initializes basic data structures.
        initialize = function () {
          createElementsArray(0);
          createAtomsArray(0);
          createAngularBondsArray(0);
          createRadialBondsArray(0);
          createRestraintsArray(0);
          createVdwPairsArray(0);
          createSpringForcesArray(0);
          createObstaclesArray(0);
          createShapesArray(0);
          createLinesArray(0);
          createElectricFieldsArray(0);

          // Custom pairwise properties.
          pairwiseLJProperties = new PairwiseLJProperties(engine);
        },

        // Throws an informative error if a developer tries to use the setCoefficients method of an
        // in-use LJ calculator. (Hint: for an interactive LJ chart, create a new LJ calculator with
        // the desired coefficients; call setElementProperties to change the LJ properties in use.)
        ljCoefficientChangeError = function() {
          throw new Error("md2d: Don't change the epsilon or sigma parameters of the LJ calculator being used by MD2D. Use the setElementProperties method instead.");
        },

        // Initialize epsilon, sigma, cutoffDistance_LJ_sq, cutoffNeighborListSquared, and ljCalculator
        // array elements for element pair i and j
        setPairwiseLJProperties = function(i, j) {
          var epsilon_i   = elementEpsilon[i],
              epsilon_j   = elementEpsilon[j],
              sigma_i     = elementSigma[i],
              sigma_j     = elementSigma[j],
              customProps = pairwiseLJProperties.get(i, j),
              e,
              s;

          if (customProps && customProps.epsilon !== undefined) {
            e = customProps.epsilon;
          } else {
            e = lennardJones.pairwiseEpsilon(epsilon_i, epsilon_j);
          }

          if (customProps && customProps.sigma !== undefined) {
            s = customProps.sigma;
          } else {
            s = lennardJones.pairwiseSigma(sigma_i, sigma_j);
          }

          // Cutoff for Lennard-Jones interactions.
          cutoffDistance_LJ_sq[i][j] = cutoffDistance_LJ_sq[j][i] = (cutoff * s) * (cutoff * s);
          // Cutoff for neighbor lists calculations.
          cutoffNeighborListSquared[i][j] = cutoffNeighborListSquared[j][i] = (cutoffList * s) * (cutoffList * s);

          ljCalculator[i][j] = ljCalculator[j][i] = lennardJones.newLJCalculator({
            epsilon: e,
            sigma:   s
          }, ljCoefficientChangeError);
        },

        // Calculates maximal cut-off used in the current model. Functions checks all used
        // elements at the moment. When new atom is added, maximum cut-off distance should
        // be recalculated.
        computeMaxCutoff = function() {
          var maxCutoff = 0,
              customProps,
              sigma,
              i, j;

          for (i = 0; i < N_elements; i++) {
            for (j = 0; j <= i; j++) {
              if (elementUsed[i] && elementUsed[j]) {
                customProps = pairwiseLJProperties.get(i, j);
                if (customProps && customProps.sigma !== undefined) {
                  sigma = customProps.sigma;
                } else {
                  sigma = lennardJones.pairwiseSigma(elementSigma[i], elementSigma[j]);
                }
                // Use cutoffList, as cell lists are used to calculate neighbor lists.
                if (cutoffList * sigma > maxCutoff) {
                  maxCutoff = cutoffList * sigma;
                }
              }
            }
          }
          // If maxCutoff === 0, return size of the model
          // as a default cutoff distance for empty model.
          return maxCutoff || Math.max(size[0], size[1]);
        },

        // Returns a minimal difference between "real" cutoff
        // and cutoff used in neighbor list. This can be considered
        // as a minimal displacement of atom, which triggers neighbor
        // list recalculation (or maximal allowed displacement to avoid
        // recalculation).
        computeNeighborListMaxDisplacement = function() {
          var maxDisplacement = Infinity,
              customProps,
              sigma,
              i, j;

          for (i = 0; i < N_elements; i++) {
            for (j = 0; j <= i; j++) {
              if (elementUsed[i] && elementUsed[j]) {
                customProps = pairwiseLJProperties.get(i, j);
                if (customProps && customProps.sigma !== undefined) {
                  sigma = customProps.sigma;
                } else {
                  sigma = lennardJones.pairwiseSigma(elementSigma[i], elementSigma[j]);
                }

                if ((cutoffList - cutoff) * sigma < maxDisplacement) {
                  maxDisplacement = (cutoffList - cutoff) * sigma;
                }
              }
            }
          }
          return maxDisplacement;
        },

        // Initializes special structure for short-range forces calculation
        // optimization. Cell lists support neighbor list.
        initializeCellList = function () {
          if (cellList === undefined) {
            cellList = new CellList(size[0], size[1], computeMaxCutoff());
          } else {
            cellList.reinitialize(size[0], size[1], computeMaxCutoff());
          }
        },

        // Initializes special structure for short-range forces calculation
        // optimization. Neighbor list cooperates with cell list.
        initializeNeighborList = function () {
          if (neighborList === undefined) {
            neighborList = new NeighborList(N, computeNeighborListMaxDisplacement());
          } else {
            neighborList.reinitialize(N, computeNeighborListMaxDisplacement());
          }
        },

        /**
          Set up "shortcut" references, e.g., x = atoms.x
        */
        assignShortcutReferences = {

          atoms: function() {
            radius         = atoms.radius;
            px             = atoms.px;
            py             = atoms.py;
            x              = atoms.x;
            y              = atoms.y;
            vx             = atoms.vx;
            vy             = atoms.vy;
            speed          = atoms.speed;
            ax             = atoms.ax;
            ay             = atoms.ay;
            charge         = atoms.charge;
            friction       = atoms.friction;
            radical        = atoms.radical;
            element        = atoms.element;
            pinned         = atoms.pinned;
            mass           = atoms.mass;
            hydrophobicity = atoms.hydrophobicity;
            visited        = atoms.visited;
          },

          radialBonds: function() {
            radialBondAtom1Index  = radialBonds.atom1;
            radialBondAtom2Index  = radialBonds.atom2;
            radialBondLength      = radialBonds.length;
            radialBondStrength    = radialBonds.strength;
            radialBondType        = radialBonds.type;
          },

          restraints: function() {
            restraintAtomIndex  = restraints.atomIndex;
            restraintK          = restraints.k;
            restraintX0         = restraints.x0;
            restraintY0         = restraints.y0;
          },

          angularBonds: function() {
            angularBondAtom1Index  = angularBonds.atom1;
            angularBondAtom2Index  = angularBonds.atom2;
            angularBondAtom3Index  = angularBonds.atom3;
            angularBondAngle       = angularBonds.angle;
            angularBondStrength    = angularBonds.strength;
          },

          elements: function() {
            elementMass    = elements.mass;
            elementEpsilon = elements.epsilon;
            elementSigma   = elements.sigma;
            elementRadius  = elements.radius;
            elementColor   = elements.color;
          },

          obstacles: function() {
            obstacleX           = obstacles.x;
            obstacleY           = obstacles.y;
            obstacleWidth       = obstacles.width;
            obstacleHeight      = obstacles.height;
            obstacleMass        = obstacles.mass;
            obstacleVX          = obstacles.vx;
            obstacleVY          = obstacles.vy;
            obstacleExtAX       = obstacles.externalAx;
            obstacleExtAY       = obstacles.externalAy;
            obstacleFriction    = obstacles.friction;
            obstacleWestProbe   = obstacles.westProbe;
            obstacleNorthProbe  = obstacles.northProbe;
            obstacleEastProbe   = obstacles.eastProbe;
            obstacleSouthProbe  = obstacles.southProbe;
            obstacleWProbeValue = obstacles.westProbeValue;
            obstacleNProbeValue = obstacles.northProbeValue;
            obstacleEProbeValue = obstacles.eastProbeValue;
            obstacleSProbeValue = obstacles.southProbeValue;
            obstacleXPrev       = obstacles.xPrev;
            obstacleYPrev       = obstacles.yPrev;
            obstacleColor       = obstacles.color;
            obstacleVisible     = obstacles.visible;
          },

          shapes: function() {
            shapeType          = shapes.type;
            shapeX             = shapes.x;
            shapeY             = shapes.y;
            shapeWidth         = shapes.width;
            shapeHeight        = shapes.height;
            shapeFence         = shapes.fence;
            shapeColor         = shapes.color;
            shapeLineColor     = shapes.lineColor;
            shapeLineDashes    = shapes.lineDashes;
            shapeLineWeight    = shapes.lineWeight;
            shapeLayer         = shapes.layer;
            shapeLayerPosition = shapes.layerPosition;
            shapeVisible       = shapes.visible;
          },

          lines: function() {
            lineX1            = lines.x1;
            lineY1            = lines.y1;
            lineX2            = lines.x2;
            lineY2            = lines.y2;
            lineBeginStyle    = lines.beginStyle;
            lineEndStyle      = lines.endStyle;
            lineFence         = lines.fence;
            lineLineColor     = lines.lineColor;
            lineLineDashes    = lines.lineDashes;
            lineLineWeight    = lines.lineWeight;
            lineLayer         = lines.layer;
            lineLayerPosition = lines.layerPosition;
            lineVisible       = lines.visible;
          },

          electricFields: function() {
            electricFieldIntensity    = electricFields.intensity;
            electricFieldOrientation  = electricFields.orientation;
            electricFieldShapeIdx = electricFields.shapeIdx;
          },

          springForces: function() {
            springForceAtomIndex = springForces[0];
            springForceX         = springForces[1];
            springForceY         = springForces[2];
            springForceStrength  = springForces[3];
          },

          vdwPairs: function () {
            vdwPairAtom1Index = vdwPairs.atom1;
            vdwPairAtom2Index = vdwPairs.atom2;
          }

        },

        createElementsArray = function(num) {
          elements = engine.elements = {};

          elements.mass    = arrays.create(num, 0, arrayTypes.floatType);
          elements.epsilon = arrays.create(num, 0, arrayTypes.floatType);
          elements.sigma   = arrays.create(num, 0, arrayTypes.floatType);
          elements.radius  = arrays.create(num, 0, arrayTypes.floatType);
          elements.color   = arrays.create(num, 0, arrayTypes.int32Type);

          assignShortcutReferences.elements();
        },

        createAtomsArray = function(num) {
          atoms = {};

          // TODO. DRY this up by letting the property list say what type each array is
          atoms.radius         = arrays.create(num, 0, arrayTypes.floatType);
          atoms.px             = arrays.create(num, 0, arrayTypes.floatType);
          atoms.py             = arrays.create(num, 0, arrayTypes.floatType);
          atoms.x              = arrays.create(num, 0, arrayTypes.floatType);
          atoms.y              = arrays.create(num, 0, arrayTypes.floatType);
          atoms.vx             = arrays.create(num, 0, arrayTypes.floatType);
          atoms.vy             = arrays.create(num, 0, arrayTypes.floatType);
          atoms.speed          = arrays.create(num, 0, arrayTypes.floatType);
          atoms.ax             = arrays.create(num, 0, arrayTypes.floatType);
          atoms.ay             = arrays.create(num, 0, arrayTypes.floatType);
          atoms.charge         = arrays.create(num, 0, arrayTypes.floatType);
          atoms.friction       = arrays.create(num, 0, arrayTypes.floatType);
          atoms.radical        = arrays.create(num, 0, arrayTypes.uint8Type);
          atoms.element        = arrays.create(num, 0, arrayTypes.uint8Type);
          atoms.pinned         = arrays.create(num, 0, arrayTypes.uint8Type);
          atoms.mass           = arrays.create(num, 0, arrayTypes.floatType);
          atoms.hydrophobicity = arrays.create(num, 0, arrayTypes.int8Type);
          atoms.visited        = arrays.create(num, 0, arrayTypes.uint8Type);
          // For the sake of clarity, manage all atoms properties in one
          // place (engine). In the future, think about separation of engine
          // properties and view-oriented properties like these:
          atoms.marked         = arrays.create(num, 0, arrayTypes.uint8Type);
          atoms.visible        = arrays.create(num, 0, arrayTypes.uint8Type);
          atoms.draggable      = arrays.create(num, 0, arrayTypes.uint8Type);
          atoms.draggableWhenStopped = arrays.create(num, 1, arrayTypes.uint8Type);

          assignShortcutReferences.atoms();
        },

        createRadialBondsArray = function(num) {
          radialBonds = engine.radialBonds = {};

          radialBonds.atom1    = arrays.create(num, 0, arrayTypes.uint16Type);
          radialBonds.atom2    = arrays.create(num, 0, arrayTypes.uint16Type);
          radialBonds.length   = arrays.create(num, 0, arrayTypes.floatType);
          radialBonds.strength = arrays.create(num, 0, arrayTypes.floatType);
          radialBonds.type     = arrays.create(num, 0, arrayTypes.uint8Type);

          assignShortcutReferences.radialBonds();
        },

        createRestraintsArray = function(num) {
          restraints = engine.restraints = {};

          restraints.atomIndex = arrays.create(num, 0, arrayTypes.uint16Type);
          restraints.k         = arrays.create(num, 0, arrayTypes.floatType);
          restraints.x0        = arrays.create(num, 0, arrayTypes.floatType);
          restraints.y0        = arrays.create(num, 0, arrayTypes.floatType);

          assignShortcutReferences.restraints();
        },

        createAngularBondsArray = function(num) {
          angularBonds = engine.angularBonds = {};

          angularBonds.atom1    = arrays.create(num, 0, arrayTypes.uint16Type);
          angularBonds.atom2    = arrays.create(num, 0, arrayTypes.uint16Type);
          angularBonds.atom3    = arrays.create(num, 0, arrayTypes.uint16Type);
          angularBonds.angle    = arrays.create(num, 0, arrayTypes.floatType);
          angularBonds.strength = arrays.create(num, 0, arrayTypes.floatType);

          assignShortcutReferences.angularBonds();
        },

        createVdwPairsArray = function(num) {
          vdwPairs = engine.vdwPairs = {};

          vdwPairs.count = 0;
          vdwPairs.atom1 = arrays.create(num, 0, arrayTypes.uint16Type);
          vdwPairs.atom2 = arrays.create(num, 0, arrayTypes.uint16Type);
        },

        createSpringForcesArray = function(num) {
          springForces = engine.springForces = [];

          // TODO: not very descriptive. Use hash of arrays like elsewhere.
          springForces[0] = arrays.create(num, 0, arrayTypes.uint16Type);
          springForces[1] = arrays.create(num, 0, arrayTypes.floatType);
          springForces[2] = arrays.create(num, 0, arrayTypes.floatType);
          springForces[3] = arrays.create(num, 0, arrayTypes.floatType);

          assignShortcutReferences.springForces();
        },

        createObstaclesArray = function(num) {
          obstacles = engine.obstacles = {};

          obstacles.x               = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.y               = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.width           = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.height          = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.mass            = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.vx              = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.vy              = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.externalAx      = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.externalAy      = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.friction        = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.westProbe       = arrays.create(num, 0, arrayTypes.uint8Type);
          obstacles.northProbe      = arrays.create(num, 0, arrayTypes.uint8Type);
          obstacles.eastProbe       = arrays.create(num, 0, arrayTypes.uint8Type);
          obstacles.southProbe      = arrays.create(num, 0, arrayTypes.uint8Type);
          obstacles.westProbeValue  = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.northProbeValue = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.eastProbeValue  = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.southProbeValue = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.xPrev           = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.yPrev           = arrays.create(num, 0, arrayTypes.floatType);
          obstacles.color           = [];
          obstacles.visible         = arrays.create(num, 0, arrayTypes.uint8Type);
          obstacles.displayExternalAcceleration = arrays.create(num, 0, arrayTypes.uint8Type);

          assignShortcutReferences.obstacles();
        },

        createShapesArray = function(num) {
          shapes = engine.shapes = {};

          shapes.type          = [];
          shapes.x             = arrays.create(num, 0, arrayTypes.floatType);
          shapes.y             = arrays.create(num, 0, arrayTypes.floatType);
          shapes.width         = arrays.create(num, 0, arrayTypes.floatType);
          shapes.height        = arrays.create(num, 0, arrayTypes.floatType);
          shapes.color         = [];
          shapes.lineColor     = [];
          shapes.lineDashes    = [];
          shapes.lineWeight    = arrays.create(num, 0, arrayTypes.floatType);
          shapes.layer         = arrays.create(num, 0, arrayTypes.uint8Type);
          shapes.layerPosition = arrays.create(num, 0, arrayTypes.uint8Type);
          shapes.visible       = arrays.create(num, 0, arrayTypes.uint8Type);
          shapes.fence         = arrays.create(num, 0, arrayTypes.uint8Type);

          assignShortcutReferences.shapes();
        },

        createLinesArray = function(num) {
          lines = engine.lines = {};

          lines.x1            = arrays.create(num, 0, arrayTypes.floatType);
          lines.y1            = arrays.create(num, 0, arrayTypes.floatType);
          lines.x2            = arrays.create(num, 0, arrayTypes.floatType);
          lines.y2            = arrays.create(num, 0, arrayTypes.floatType);
          lines.beginStyle    = [];
          lines.endStyle      = [];
          lines.lineColor     = [];
          lines.lineDashes    = [];
          lines.lineWeight    = arrays.create(num, 0, arrayTypes.floatType);
          lines.layer         = arrays.create(num, 0, arrayTypes.uint8Type);
          lines.layerPosition = arrays.create(num, 0, arrayTypes.uint8Type);
          lines.visible       = arrays.create(num, 0, arrayTypes.uint8Type);
          lines.fence         = arrays.create(num, 0, arrayTypes.uint8Type);

          assignShortcutReferences.lines();
        },

        createElectricFieldsArray = function(num) {
          electricFields = engine.electricFields = {};

          electricFields.intensity   = arrays.create(num, 0, arrayTypes.floatType);
          electricFields.orientation = [];
          electricFields.shapeIdx    = [];

          assignShortcutReferences.electricFields();
        },

        // Calculates & returns instantaneous temperature of the system.
        computeTemperature = function() {
          var twoKE = 0,
              i;

          // Particles.
          for (i = 0; i < N; i++) {
            twoKE += mass[i] * (vx[i] * vx[i] + vy[i] * vy[i]);
          }
          // Obstacles.
          for (i = 0; i < N_obstacles; i++) {
            if (obstacleMass[i] !== Infinity) {
              twoKE += obstacleMass[i] *
                  (obstacleVX[i] * obstacleVX[i] + obstacleVY[i] * obstacleVY[i]);
            }
          }

          return convertKEtoT(twoKE / 2, N);
        },

        // Calculates & returns the instaneous temperature of a particular group of atoms
        computeTemperatureOfAtoms = function(atomIndices) {
          var twoKE = 0,
              i,
              j;

          // Particles.
          for (i = 0; i < atomIndices.length; i++) {
            j = atomIndices[i];
            twoKE += mass[j] * (vx[j] * vx[j] + vy[j] * vy[j]);
          }

          return convertKEtoT(twoKE / 2, atomIndices.length);
        },

        // Adds the velocity vector (vx_t, vy_t) to the velocity vector of particle i
        addVelocity = function(i, vx_t, vy_t) {
          vx[i] += vx_t;
          vy[i] += vy_t;

          px[i] = vx[i]*mass[i];
          py[i] = vy[i]*mass[i];
        },

        // Adds effect of angular velocity omega, relative to (x_CM, y_CM), to the velocity vector of particle i
        addAngularVelocity = function(i, omega) {
          vx[i] -= omega * (y[i] - y_CM);
          vy[i] += omega * (x[i] - x_CM);

          px[i] = vx[i]*mass[i];
          py[i] = vy[i]*mass[i];
        },

        // Subtracts the center-of-mass linear velocity and the system angular velocity from the velocity vectors
        removeTranslationAndRotationFromVelocities = function() {
          for (var i = 0; i < N; i++) {
            addVelocity(i, -vx_CM, -vy_CM);
            addAngularVelocity(i, -omega_CM);
          }
        },

        // currently unused, implementation saved here for future reference:

        // // Adds the center-of-mass linear velocity and the system angular velocity back into the velocity vectors
        // addTranslationAndRotationToVelocities = function() {
        //   for (var i = 0; i < N; i++) {
        //     addVelocity(i, vx_CM, vy_CM);
        //     addAngularVelocity(i, omega_CM);
        //   }
        // },

        // Subroutine that calculates the position and velocity of the center of mass, leaving these in x_CM, y_CM,
        // vx_CM, and vy_CM, and that then computes the system angular velocity around the center of mass, leaving it
        // in omega_CM.
        computeSystemTranslation = function() {
          var x_sum = 0,
              y_sum = 0,
              px_sum = 0,
              py_sum = 0,
              totalMass = engine.getTotalMass(),
              i;

          for (i = 0; i < N; i++) {
            x_sum += x[i];
            y_sum += y[i];
            px_sum += px[i];
            py_sum += py[i];
          }

          x_CM = x_sum / N;
          y_CM = y_sum / N;
          px_CM = px_sum;
          py_CM = py_sum;
          vx_CM = px_sum / totalMass;
          vy_CM = py_sum / totalMass;
        },

        // Subroutine that calculates the angular momentum and moment of inertia around the center of mass, and then
        // uses these to calculate the weighted angular velocity around the center of mass.
        // Updates I_CM, L_CM, and omega_CM.
        // Requires x_CM, y_CM, vx_CM, vy_CM to have been calculated.
        computeSystemRotation = function() {
          var L = 0,
              I = 0,
              m,
              i;

          for (i = 0; i < N; i++) {
            m = mass[i];
            // L_CM = sum over N of of mr_i x p_i (where r_i and p_i are position & momentum vectors relative to the CM)
            L += m * cross( x[i]-x_CM, y[i]-y_CM, vx[i]-vx_CM, vy[i]-vy_CM);
            I += m * sumSquare( x[i]-x_CM, y[i]-y_CM );
          }

          L_CM = L;
          I_CM = I;
          omega_CM = L_CM / I_CM;
        },

        computeCMMotion = function() {
          computeSystemTranslation();
          computeSystemRotation();
        },

        // ####################################################################
        // #              Functions handling different collisions.            #
        // ####################################################################

        // Constrain obstacle i to the area between the walls by simulating perfectly elastic collisions with the walls.
        bounceObstacleOffWalls = function(i) {
          var leftwall   = 0,
              bottomwall = 0,
              width  = size[0],
              height = size[1],
              rightwall = width - obstacleWidth[i],
              topwall   = height - obstacleHeight[i];

          // Bounce off vertical walls.
          if (obstacleX[i] < leftwall) {
            while (obstacleX[i] < leftwall - width) {
              obstacleX[i] += width;
            }
            obstacleX[i]  = leftwall + (leftwall - obstacleX[i]);
            obstacleVX[i] *= -1;
          } else if (obstacleX[i] > rightwall) {
            while (obstacleX[i] > rightwall + width) {
              obstacleX[i] -= width;
            }
            obstacleX[i]  = rightwall - (obstacleX[i] - rightwall);
            obstacleVX[i] *= -1;
          }

          // Bounce off horizontal walls.
          if (obstacleY[i] < bottomwall) {
            while (obstacleY[i] < bottomwall - height) {
              obstacleY[i] += height;
            }
            obstacleY[i]  = bottomwall + (bottomwall - obstacleY[i]);
            obstacleVY[i] *= -1;
          } else if (obstacleY[i] > topwall) {
            while (obstacleY[i] > topwall + width) {
              obstacleY[i] -= width;
            }
            obstacleY[i]  = topwall - (obstacleY[i] - topwall);
            obstacleVY[i] *= -1;
          }
        },

        // Constrain particle i to the area between the walls by simulating perfectly elastic collisions with the walls.
        // Note this may change the linear and angular momentum.
        bounceParticleOffWalls = function(i) {
          var r = radius[i],
              leftwall = r,
              bottomwall = r,
              width = size[0],
              height = size[1],
              rightwall = width - r,
              topwall = height - r;

          // Bounce off vertical walls.
          if (x[i] < leftwall) {
            while (x[i] < leftwall - width) {
              x[i] += width;
            }
            x[i]  = leftwall + (leftwall - x[i]);
            vx[i] *= -1;
            px[i] *= -1;
          } else if (x[i] > rightwall) {
            while (x[i] > rightwall + width) {
              x[i] -= width;
            }
            x[i]  = rightwall - (x[i] - rightwall);
            vx[i] *= -1;
            px[i] *= -1;
          }

          // Bounce off horizontal walls
          if (y[i] < bottomwall) {
            while (y[i] < bottomwall - height) {
              y[i] += height;
            }
            y[i]  = bottomwall + (bottomwall - y[i]);
            vy[i] *= -1;
            py[i] *= -1;
          } else if (y[i] > topwall) {
            while (y[i] > topwall + height) {
              y[i] -= height;
            }
            y[i]  = topwall - (y[i] - topwall);
            vy[i] *= -1;
            py[i] *= -1;
          }
        },
        bounceParticleOffObstacles = function(i, x_prev, y_prev, updatePressure) {
          // fast path if no obstacles
          if (N_obstacles < 1) return;

          var r,
              xi,
              yi,

              j,

              x_left,
              x_right,
              y_top,
              y_bottom,
              x_left_prev,
              x_right_prev,
              y_top_prev,
              y_bottom_prev,
              vxPrev,
              vyPrev,
              obs_vxPrev,
              obs_vyPrev,
              atom_mass,
              obs_mass,
              totalMass,
              bounceDirection;

          r = radius[i];
          xi = x[i];
          yi = y[i];

          for (j = 0; j < N_obstacles; j++) {

            x_left = obstacleX[j] - r;
            x_right = obstacleX[j] + obstacleWidth[j] + r;
            y_top = obstacleY[j] + obstacleHeight[j] + r;
            y_bottom = obstacleY[j] - r;

            x_left_prev = obstacleXPrev[j] - r;
            x_right_prev = obstacleXPrev[j] + obstacleWidth[j] + r;
            y_top_prev = obstacleYPrev[j] + obstacleHeight[j] + r;
            y_bottom_prev = obstacleYPrev[j] - r;

            // Reset bounceDirection, which indicates collision type.
            bounceDirection = 0;
            // Check all possibilities for a collision with the rectangular obstacle.
            if (xi > x_left && xi < x_right && yi > y_bottom && yi < y_top) {
              if (x_prev <= x_left_prev) {
                x[i] = x_left - (xi - x_left);
                bounceDirection = 1; // West wall collision.
              } else if (x_prev >= x_right_prev) {
                x[i] = x_right + (x_right - xi);
                bounceDirection = 2; // East wall collision.
              } else if (y_prev <= y_bottom_prev) {
                y[i] = y_bottom - (yi - y_bottom);
                bounceDirection = -1; // South wall collision.
              } else if (y_prev >= y_top_prev) {
                y[i] = y_top  + (y_top - yi);
                bounceDirection = -2; // North wall collision.
              }
            }

            obs_mass = obstacleMass[j];

            if (bounceDirection !== 0) {
              if (obs_mass !== Infinity) {
                // if we have real mass, perform a perfectly-elastic collision
                atom_mass = mass[i];
                totalMass = obs_mass + atom_mass;
                if (bounceDirection > 0) {
                  vxPrev = vx[i];
                  obs_vxPrev = obstacleVX[j];

                  vx[i] = (vxPrev * (atom_mass - obs_mass) + (2 * obs_mass * obs_vxPrev)) / totalMass;
                  obstacleVX[j] = (obs_vxPrev * (obs_mass - atom_mass) + (2 * px[i])) / totalMass;
                } else {
                  vyPrev = vy[i];
                  obs_vyPrev = obstacleVY[j];

                  vy[i] = (vyPrev * (atom_mass - obs_mass) + (2 * obs_mass * obs_vyPrev)) / totalMass;
                  obstacleVY[j] = (obs_vyPrev * (obs_mass - atom_mass) + (2 * py[i])) / totalMass;
                }
              } else {
                // if we have infinite mass, just reflect (like a wall)
                if (bounceDirection > 0) {
                  vx[i] *= -1;
                } else {
                  vy[i] *= -1;
                }
              }

              if (updatePressure) {
                // Update pressure probes if there are any.
                if (obstacleWestProbe[j] && bounceDirection === 1) {
                  // 1 is west wall collision.
                  obstacleWProbeValue[j] += mass[i] * ((vxPrev ? vxPrev : -vx[i]) - vx[i]);
                } else if (obstacleEastProbe[j] && bounceDirection === 2) {
                  // 2 is west east collision.
                  obstacleEProbeValue[j] += mass[i] * (vx[i] - (vxPrev ? vxPrev : -vx[i]));
                } else if (obstacleSouthProbe[j] && bounceDirection === -1) {
                  // -1 is south wall collision.
                  obstacleSProbeValue[j] += mass[i] * ((vyPrev ? vyPrev : -vy[i]) - vy[i]);
                } else if (obstacleNorthProbe[j] && bounceDirection === -2) {
                  // -2 is north wall collision.
                  obstacleNProbeValue[j] += mass[i] * (vy[i] - (vyPrev ? vyPrev : -vy[i]));
                }
              }

            }
          }
        },

        bounceParticleOffShapes = function(i, x_prev, y_prev) {
          // fast path if no shapes
          if (N_shapes < 1) return;

          var r,
              xi,
              yi,

              j,

              x_inside_left,
              x_inside_right,
              y_inside_top,
              y_inside_bottom,
              x_outside_left,
              x_outside_right,
              y_outside_top,
              y_outside_bottom,

              shapeX_offset,shapeY_offset,

              tx,ty,
              tx_prev,ty_prev,
              ar,br,

              a,b,c,
              f1x,f1y,f1d,
              f2x,f2y,f2d,
              tvx,tvy,
              mx,my,
              nx,ny,nd;

          r = radius[i];
          xi = x[i];
          yi = y[i];


          for ( j = 0; j < N_shapes; j++) {

            if (!shapeFence[j])
              continue;

            if (shapeType[j] === 'rectangle') {

              x_outside_left = shapeX[j] - r;
              x_outside_right = shapeX[j] + shapeWidth[j] + r;
              y_outside_top = shapeY[j] + shapeHeight[j] + r;
              y_outside_bottom = shapeY[j] - r;

              x_inside_left = shapeX[j] + r;
              x_inside_right = shapeX[j] + shapeWidth[j] - r;
              y_inside_top = shapeY[j] + shapeHeight[j] - r;
              y_inside_bottom = shapeY[j] + r;

              // Check all outside collisions
              if (xi > x_outside_left && xi < x_outside_right && yi > y_outside_bottom && yi < y_outside_top) {
                if (x_prev <= x_outside_left) {
                  x[i] = x_outside_left - (xi - x_outside_left);
                  vx[i] *= -1;
                }
                else if (x_prev >= x_outside_right) {
                  x[i] = x_outside_right + (x_outside_right - xi);
                  vx[i] *= -1;
                }
                else if (y_prev <= y_outside_bottom) {
                  y[i] = y_outside_bottom - (yi - y_outside_bottom);
                  vy[i] *= -1;
                }
                else if (y_prev >= y_outside_top) {
                  y[i] = y_outside_top + (y_outside_top - yi);
                  vy[i] *= -1;
                }
              }
              //Check all inside collisions
              if (x_prev > x_inside_left && x_prev < x_inside_right && y_prev > y_inside_bottom && y_prev < y_inside_top) {
                if (xi <= x_inside_left) {
                  x[i] = x_inside_left + (x_inside_left - xi);
                  vx[i] *= -1;
                } else if (xi >= x_inside_right) {
                  x[i] = x_inside_right - (xi - x_inside_right);
                  vx[i] *= -1;
                }
                if (yi <= y_inside_bottom) {
                  y[i] = y_inside_bottom + (y_inside_bottom - yi);
                  vy[i] *= -1;
                } else if (yi >= y_inside_top) {
                  y[i] = y_inside_top - (yi - y_inside_top);
                  vy[i] *= -1;
                }
              }
            }
            else if (shapeType[j] === 'ellipse') {
              a = shapeWidth[j] / 2;
              b = shapeHeight[j] / 2;
              // Transform points from model space to ellipse space
              // to facilitate collision checking
              shapeX_offset = shapeX[j] + a;
              shapeY_offset = shapeY[j] + b;
              tx = (xi - shapeX_offset) / (a + r);
              ty = (yi - shapeY_offset) / (b + r);
              tx *= tx;
              ty *= ty;
              tx_prev = (x_prev - shapeX_offset) / (a + r);
              ty_prev = (y_prev - shapeY_offset) / (b + r);
              tx_prev *= tx_prev;
              ty_prev *= ty_prev;
              ar = (a + r) / (a - r);
              br = (b + r) / (b - r);
              ar *= ar;
              br *= br;
              if (tx + ty <= 1 && tx_prev + ty_prev > 1 || tx * ar + ty * br >= 1 && tx_prev * ar + ty_prev * br < 1) {

                // Calculate the two foci
                if (shapeWidth[j] > shapeHeight[j]) {
                  c = Math.sqrt(a * a - b * b);
                  f1x = shapeX[j] + a + c;
                  f2x = shapeX[j] + a - c;
                  f1y = f2y = shapeY[j] + b;
                } else {
                  c = Math.sqrt(b * b - a * a);
                  f1x = f2x = shapeX[j] + a;
                  f1y = shapeY[j] + b + c;
                  f2y = shapeY[j] + b - c;
                }


                // Determine the midpoint of the atom's motion path
                // so it can be used as an approximate point of collision
                mx = (xi + x_prev) / 2;
                my = (yi + y_prev) / 2;

                // Determine the distance from the point of collision
                // to both foci
                f1d = Math.sqrt(sumSquare(f1x - mx, f1y - my));
                f2d = Math.sqrt(sumSquare(f2x - mx, f2x - mx));

                // Calculate the angle bisector which is the normal vector
                nx = mx - (f1x * f2d + f2x * f1d) / (f1d + f2d);
                ny = my - (f1y * f2d + f2y * f1d) / (f1d + f2d);

                // Normalize the normal vector
                nd = Math.sqrt(sumSquare(nx, ny));
                nx /= nd;
                ny /= nd;

                // Reflect the atom's position off the normal vector
                x[i] = (mx - x_prev) - 2 * ((mx - x_prev) * nx + (my - y_prev) * ny) * nx + mx;
                y[i] = (my - y_prev) - 2 * ((mx - x_prev) * nx + (my - y_prev) * ny) * ny + my;

                // Reflect the atom's velocity off the normal vector
                tvx = vx[i];
                tvy = vy[i];
                vx[i] = (tvx - 2 * (tvx * nx + tvy * ny) * nx);
                vy[i] = (tvy - 2 * (tvx * nx + tvy * ny) * ny);
              }
            }
          }
        },

        bounceParticleOffLines = function(i, x_prev, y_prev) {
          // fast path if no lines
          if (N_lines < 1) return;

          var r,
              ld,
              atom1_to_line,
              atom2_to_line,
              line1_to_atom,
              line2_to_atom,
              mx,my,
              nx,ny,nd,
              tvx,tvy,
              j,
              xi, yi;

          r = radius[i];
          xi = x[i];
          yi = y[i];

          for (j = 0; j < N_lines; j++) {
            if (!lineFence[j])
              continue;

            // Find a bunch of cross products to check collision
            line1_to_atom = cross(x_prev - lineX1[j], y_prev - lineY1[j], xi - lineX1[j], yi - lineY1[j]);
            line2_to_atom = cross(x_prev - lineX2[j], y_prev - lineY2[j], xi - lineX2[j], yi - lineY2[j]);
            if (line1_to_atom * line2_to_atom < 0) {
              ld = Math.sqrt(sumSquare(lineX1[j] - lineX2[j], lineY1[j] - lineY2[j]));
              atom1_to_line = cross(lineX2[j] - x_prev, lineY2[j] - y_prev, lineX1[j] - x_prev, lineY1[j] - y_prev);
              atom2_to_line = cross(lineX2[j] - xi, lineY2[j] - yi, lineX1[j] - xi, lineY1[j] - yi);
              if ((atom1_to_line < 0 && atom2_to_line > -r*ld || atom1_to_line > 0 && atom2_to_line < r*ld) &&
                   atom1_to_line * line1_to_atom > 0) {
                // Collision!

                // Determine the midpoint of the atom's motion path
                // so it can be used as an approximate point of collision
                mx = (xi + x_prev) / 2;
                my = (yi + y_prev) / 2;

                // Caclulate the normal vector (just perpendicular to the line)
                nx = lineY2[j] - lineY1[j];
                ny = -(lineX2[j] - lineX1[j]);

                // Normalize the normal vector
                nd = Math.sqrt(sumSquare(nx, ny));
                nx /= nd;
                ny /= nd;

                // Reflect the atom's position off the normal vector
                x[i] = (mx - x_prev) - 2 * ((mx - x_prev) * nx + (my - y_prev) * ny) * nx + mx;
                y[i] = (my - y_prev) - 2 * ((mx - x_prev) * nx + (my - y_prev) * ny) * ny + my;

                // Reflect the atom's velocity off the normal vector
                tvx = vx[i];
                tvy = vy[i];
                vx[i] = (tvx - 2 * (tvx * nx + tvy * ny) * nx);
                vy[i] = (tvy - 2 * (tvx * nx + tvy * ny) * ny);
              }
            }
          }
        },

        // ####################################################################
        // #         Functions calculating forces and accelerations.          #
        // ####################################################################

        // Calculate distance and force (if distance < cut-off distance).
        calculateLJInteraction = function(i, j) {
          var elI = element[i],
              elJ = element[j],
              dx  = x[j] - x[i],
              dy  = y[j] - y[i],
              rSq = sumSquare(dx, dy),
              fOverR, fx, fy;

          if (updateNeighborList && rSq < cutoffNeighborListSquared[elI][elJ]) {
            neighborList.markNeighbors(i, j);
          }

          // Don't calculate LJ interaction between bonded atoms. However note that bonded atoms
          // will be marked as neighbors during list update - it's necessary to avoid divergence
          // when the bond is removed.
          if (radialBondMatrix && radialBondMatrix[i] && radialBondMatrix[i][j]) return;

          if (rSq < cutoffDistance_LJ_sq[elI][elJ]) {
            fOverR = ljCalculator[elI][elJ].forceOverDistanceFromSquaredDistance(rSq);
            fx = fOverR * dx;
            fy = fOverR * dy;
            ax[i] += fx;
            ay[i] += fy;
            ax[j] -= fx;
            ay[j] -= fy;
          }
        },

        updateShortRangeForces = function () {
          // Fast path if Lennard Jones interaction is disabled.
          if (!useLennardJonesInteraction) return;

          if (updateNeighborList) {
            console.time('cell lists');
            shortRangeForcesCellList();
            console.timeEnd('cell lists');
          } else {
            console.time('neighbor list');
            shortRangeForcesNeighborList();
            console.timeEnd('neighbor list');
          }
        },

        shortRangeForcesCellList = function () {
          var rows = cellList.getRowsNum(),
              cols = cellList.getColsNum(),
              i, j, temp, cellIdx, cell1, cell2,
              a, b, atom1Idx, cell1Len, cell2Len,
              n, nLen, cellNeighbors;

          for (i = 0; i < rows; i++) {
            temp = i * cols;
            for (j = 0; j < cols; j++) {
              cellIdx = temp + j;

              cell1 = cellList.getCell(cellIdx);
              cellNeighbors = cellList.getNeighboringCells(i, j);

              for (a = 0, cell1Len = cell1.length; a < cell1Len; a++) {
                atom1Idx = cell1[a];

                // Interactions inside the cell.
                for (b = 0; b < a; b++) {
                  calculateLJInteraction(atom1Idx, cell1[b]);
                }
                // Interactions between neighboring cells.
                for (n = 0, nLen = cellNeighbors.length; n < nLen; n++) {
                  cell2 = cellNeighbors[n];
                  for (b = 0, cell2Len = cell2.length; b < cell2Len; b++) {
                    calculateLJInteraction(atom1Idx, cell2[b]);
                  }
                }
              }
            }
          }
        },

        shortRangeForcesNeighborList = function () {
          var nlist = neighborList.getList(),
              atom1Idx, atom2Idx, i, len;

          for (atom1Idx = 0; atom1Idx < N; atom1Idx++) {
            for (i = neighborList.getStartIdxFor(atom1Idx), len = neighborList.getEndIdxFor(atom1Idx); i < len; i++) {
              atom2Idx = nlist[i];
              calculateLJInteraction(atom1Idx, atom2Idx);
            }
          }
        },

        updateLongRangeForces = function() {
          // Fast path if Coulomb interaction is disabled or there are no charged atoms.
          if (!useCoulombInteraction || chargedAtomsList.length === 0) return;

          var i, j, len, dx, dy, rSq, fOverR, fx, fy,
              charge1, atom1Idx, atom2Idx,
              bondingPartners;

          for (i = 0, len = chargedAtomsList.length; i < len; i++) {
            atom1Idx = chargedAtomsList[i];
            charge1 = charge[atom1Idx];
            bondingPartners = radialBondMatrix && radialBondMatrix[atom1Idx];
            for (j = 0; j < i; j++) {
              atom2Idx = chargedAtomsList[j];
              if (bondingPartners && bondingPartners[atom2Idx]) continue;

              dx = x[atom2Idx] - x[atom1Idx];
              dy = y[atom2Idx] - y[atom1Idx];
              rSq = dx*dx + dy*dy;

              fOverR = coulomb.forceOverDistanceFromSquaredDistance(rSq, charge1, charge[atom2Idx],
                dielectricConst, realisticDielectricEffect);

              fx = fOverR * dx;
              fy = fOverR * dy;
              ax[atom1Idx] += fx;
              ay[atom1Idx] += fy;
              ax[atom2Idx] -= fx;
              ay[atom2Idx] -= fy;
            }
          }
        },

        updateFrictionForces = function() {
          if (!viscosity) return;

          var i,
              drag;

          for (i = 0; i < N; i++) {
            drag = viscosity * friction[i];

            ax[i] += (-vx[i] * drag);
            ay[i] += (-vy[i] * drag);
          }
        },

        updateRadialBondForces = function() {
          // fast path if no radial bonds have been defined
          if (N_radialBonds < 1) return;

          var i, i1, i2, dx, dy,
              rSq, r, k, r0,
              fOverR, fx, fy;

          for (i = 0; i < N_radialBonds; i++) {
            i1 = radialBondAtom1Index[i];
            i2 = radialBondAtom2Index[i];

            dx = x[i2] - x[i1];
            dy = y[i2] - y[i1];
            rSq = dx*dx + dy*dy;
            r = Math.sqrt(rSq);

            // eV/nm^2
            k = radialBondStrength[i];

            // nm
            r0 = radialBondLength[i];

            // "natural" Next Gen MW force units / nm
            fOverR = constants.convert(k*(r-r0), { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / r;

            fx = fOverR * dx;
            fy = fOverR * dy;

            ax[i1] += fx;
            ay[i1] += fy;
            ax[i2] -= fx;
            ay[i2] -= fy;
          }
        },

        updateAngularBondForces = function() {
          // Fast path if no angular bonds have been defined.
          if (N_angularBonds < 1) return;

          var i, i1, i2, i3,
              dxij, dyij, dxkj, dykj, rijSquared, rkjSquared, rij, rkj,
              k, angle, theta, cosTheta, sinTheta,
              forceInXForI, forceInYForI, forceInXForK, forceInYForK,
              commonPrefactor, temp;

          for (i = 0; i < N_angularBonds; i++) {
            i1 = angularBondAtom1Index[i];
            i2 = angularBondAtom2Index[i];
            i3 = angularBondAtom3Index[i];

            // radian
            angle = angularBondAngle[i];

            // (eV/nm * nm) / radian
            k = angularBondStrength[i];

            // Calculate angle (theta) between two vectors:
            // Atom1-Atom3 and Atom2-Atom3
            // Atom1 -> i, Atom2 -> k, Atom3 -> j
            dxij = x[i1] - x[i3];
            dxkj = x[i2] - x[i3];
            dyij = y[i1] - y[i3];
            dykj = y[i2] - y[i3];
            rijSquared = dxij * dxij + dyij * dyij;
            rkjSquared = dxkj * dxkj + dykj * dykj;
            rij = Math.sqrt(rijSquared);
            rkj = Math.sqrt(rkjSquared);
            // Calculate cos using dot product definition.
            cosTheta = (dxij * dxkj + dyij * dykj) / (rij * rkj);
            if (cosTheta > 1.0) cosTheta = 1.0;
            else if (cosTheta < -1.0) cosTheta = -1.0;
            // Pythagorean trigonometric identity.
            sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);
            // Finally:
            theta = Math.acos(cosTheta);

            if (sinTheta < 0.0001) sinTheta = 0.0001;

            // Calculate force.
            // "natural" Next Gen MW force units / nm
            commonPrefactor = constants.convert(k * (theta - angle) / (sinTheta * rij),
                { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / rkj;

            // nm^2
            temp = dxij * dxkj + dyij * dykj;
            // Terms in brackets end up with nm unit.
            // commonPrefactor is in "natural" Next Gen MW force units / nm,
            // so everything is correct.
            forceInXForI = commonPrefactor * (dxkj - temp * dxij / rijSquared);
            forceInYForI = commonPrefactor * (dykj - temp * dyij / rijSquared);
            forceInXForK = commonPrefactor * (dxij - temp * dxkj / rkjSquared);
            forceInYForK = commonPrefactor * (dyij - temp * dykj / rkjSquared);

            ax[i1] += forceInXForI;
            ay[i1] += forceInYForI;
            ax[i2] += forceInXForK;
            ay[i2] += forceInYForK;
            ax[i3] -= (forceInXForI + forceInXForK);
            ay[i3] -= (forceInYForI + forceInYForK);
          }
        },

        // FIXME: eliminate duplication with springForces
        updateRestraintForces = function() {
          // fast path if no restraints have been defined
          if (N_restraints < 1) return;

          var i,
              dx, dy,
              r, r_sq,
              k,
              f_over_r,
              fx, fy,
              a;

          for (i = 0; i < N_restraints; i++) {
            a = restraintAtomIndex[i];

            dx = restraintX0[i] - x[a];
            dy = restraintY0[i] - y[a];

            if (dx === 0 && dy === 0) continue;   // force will be zero

            r_sq = dx*dx + dy*dy;
            r = Math.sqrt(r_sq);

            // eV/nm^2
            k = restraintK[i];

            f_over_r = constants.convert(k*r, { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / r;

            fx = f_over_r * dx;
            fy = f_over_r * dy;

            ax[a] += fx;
            ay[a] += fy;
          }
        },

        updateSpringForces = function() {
          if (N_springForces < 1) return;

          var i,
              dx, dy,
              r, r_sq,
              k,
              f_over_r,
              fx, fy,
              a;

          for (i = 0; i < N_springForces; i++) {
            a = springForceAtomIndex[i];

            dx = springForceX[i] - x[a];
            dy = springForceY[i] - y[a];

            if (dx === 0 && dy === 0) continue;   // force will be zero

            r_sq = dx*dx + dy*dy;
            r = Math.sqrt(r_sq);

            // eV/nm^2
            k = springForceStrength[i];

            f_over_r = constants.convert(k*r, { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / r;

            fx = f_over_r * dx;
            fy = f_over_r * dy;

            ax[a] += fx;
            ay[a] += fy;
          }
        },

        // Returns center of mass of given atoms set (molecule).
        getMoleculeCenterOfMass = function (molecule) {
          var xcm = 0,
              ycm = 0,
              totalMass = 0,
              atomIdx, atomMass, i, len;

          for (i = 0, len = molecule.length; i < len; i++) {
            atomIdx = molecule[i];
            atomMass = mass[atomIdx];
            xcm += x[atomIdx] * atomMass;
            ycm += y[atomIdx] * atomMass;
            totalMass += atomMass;
          }
          xcm /= totalMass;
          ycm /= totalMass;
          return {x: xcm, y: ycm};
        },

        updateAminoAcidForces = function () {
          // Fast path if there is no solvent defined or it doesn't have impact on AAs.
          if (solventForceType === 0 || solventForceFactor === 0 || N < 2) return;

          var moleculeAtoms, atomIdx, cm, solventFactor,
              dx, dy, r, fx, fy, temp, i, j, len;

          // Reset helper array.
          for (i = 0; i < N; i++) {
            visited[i] = 0;
          }

          // Set multiplier of force produced by the solvent.
          // Constants used in Classic MW: 5 * 0.00001 = 0.00005.
          // Multiply it by 0.01 * 120 = 1.2 to convert from
          // 0.1A * 120amu / fs^2 to nm * amu / fs^2.
          // solventForceType is the same like in Classic MW (unitless).
          // solventForceFactor is a new variable used only in Next Gen MW.
          solventFactor = 0.00006 * solventForceType * solventForceFactor;

          for (i = 0; i < N; i++) {
            // Calculate forces only *once* for amino acid.
            if (visited[i] === 1) continue;

            moleculeAtoms = engine.getMoleculeAtoms(i);
            moleculeAtoms.push(i);

            cm = getMoleculeCenterOfMass(moleculeAtoms);

            for (j = 0, len = moleculeAtoms.length; j < len; j++) {
              atomIdx = moleculeAtoms[j];
              // Mark that atom was part of processed molecule to avoid
              // calculating its molecule again.
              visited[atomIdx] = 1;

              if (hydrophobicity[atomIdx] !== 0) {
                dx = x[atomIdx] - cm.x;
                dy = y[atomIdx] - cm.y;
                r = Math.sqrt(dx * dx + dy * dy);

                if (r > 0) {
                  temp = hydrophobicity[atomIdx] * solventFactor;

                  // AAs being pulled into the center of mass should feel an additional force factor that depends
                  // on distance from the center of mass, ranging between 1 and 25, with 1 being furthest away from the CoM
                  // and 25 being the max when at the CoM or within a certain radius of the CoM. In some ways this
                  // is closer to nature as the core of a protein is less exposed to solvent and thus even more stable.
                  if (temp > 0 && r < additionalSolventForceThreshold) {
                    // Force towards the center of mass, distance from the CoM less than a given threshold.
                    // Multiply force by an additional factor defined by the linear function of 'r' defined by two points:
                    // (0, additionalSolventForceMult) and (additionalSolventForceThreshold, 1).
                    temp *= (1 - additionalSolventForceMult) * r / additionalSolventForceThreshold + additionalSolventForceMult;
                  }

                  fx = temp * dx / r;
                  fy = temp * dy / r;
                  ax[atomIdx] -= fx;
                  ay[atomIdx] -= fy;
                }
              }
            }
          }
        },

        updateGravitationalAccelerations = function() {
          // fast path if there is no gravitationalField
          if (!gravitationalField) return;
          var i;

          for (i = 0; i < N; i++) {
            ay[i] -= gravitationalField;
          }
        },

        rectContains = function (i, x, y) {
          var rx = shapeX[i],
              ry = shapeY[i];
          return rx <= x && x <= rx + shapeWidth[i] &&
                 ry <= y && y <= ry + shapeHeight[i];
        },

        getElFieldForce = function (i) {
          var o = electricFieldOrientation[i];
          return (o === "N" || o === "E" ? 1 : -1) * electricFieldIntensity[i];
        },

        updateElectricFieldsAccelerations = function() {
          // fast path if there are no electric fields
          if (!electricFields) return;

          var i, e, o, vertical, rect, temp;

          for (e = 0; e < N_electricFields; e++) {
            o = electricFieldOrientation[e];
            vertical = o === "N" || o === "S";
            temp = getElFieldForce(e) / dielectricConst;
            rect = electricFieldShapeIdx[e];

            for (i = 0; i < N; i++) {
              if (rect != null && !rectContains(rect, x[i], y[i])) continue;
              if (vertical) {
                ay[i] += temp * charge[i] / mass[i];
              } else {
                ax[i] += temp * charge[i] / mass[i];
              }
            }
          }
        },

        // Push all amino acids above some Y coordinate during DNA translation.
        // TODO: this should be part of the MD2D plug-in for proteins engine!
        updateDNATranslationAccelerations = function() {
          if (!dnaTranslationInProgress) return;
          var i, diff;

          for (i = 0; i < N; i++) {
            diff = Math.min(1, 2.2 - y[i]);
            if (diff > 0) {
              ay[i] += 1e-4 * diff;
              ax[i] -= 3e-6;
            }
          }
        },

        // ####################################################################
        // #               Integration main helper functions.                 #
        // ####################################################################

        // For now, calculate only structures used by proteins engine.
        // TODO: move there calculation of various optimization structures like chargedAtomLists.
        calculateOptimizationStructures = function () {
          var cysteineEl = aminoacidsHelper.cysteineElement,
              idx, i;

          // Reset optimization data structure.
          freeCysteinesList.length = 0;

          for (i = 0; i < N; i++) {
            if (element[i] === cysteineEl) {
              // At the beginning, assume that each cysteine is "free" (ready to create disulfide bond).
              freeCysteinesList.push(i);
            }
          }

          for (i = 0; i < N_radialBonds; i++) {
            if (element[radialBondAtom1Index[i]] === cysteineEl && element[radialBondAtom2Index[i]] === cysteineEl) {
              // Two cysteines are already bonded, so remove them from freeCysteinsList.
              idx = freeCysteinesList.indexOf(radialBondAtom1Index[i]);
              if (idx !== -1) arrays.remove(freeCysteinesList, idx);
              idx = freeCysteinesList.indexOf(radialBondAtom2Index[i]);
              if (idx !== -1) arrays.remove(freeCysteinesList, idx);
            }
          }
        },

        // Accumulate acceleration into a(t + dt) from all possible interactions, fields
        // and forces connected with atoms.
        updateParticlesAccelerations = function () {
          var i, inverseMass;

          if (N === 0) return;

          // Zero out a(t) for accumulation of forces into a(t + dt).
          for (i = 0; i < N; i++) {
            ax[i] = ay[i] = 0;
          }

          // Check if the neighbor list should be recalculated.
          updateNeighborList = neighborList.shouldUpdate(x, y);

          if (updateNeighborList) {
            // Clear both lists.
            cellList.clear();
            neighborList.clear();

            for (i = 0; i < N; i++) {
              // Add particle to appropriate cell.
              cellList.addToCell(i, x[i], y[i]);
              // And save its initial position
              // ("initial" = position during neighbor list creation).
              neighborList.saveAtomPosition(i, x[i], y[i]);
            }
          }

          // ######################################
          // ax and ay are FORCES below this point
          // ######################################

          // Accumulate forces into a(t + dt) for all pairwise interactions between
          // particles:
          // Short-range forces (Lennard-Jones interaction).
          console.time('short-range forces');
          updateShortRangeForces();
          console.timeEnd('short-range forces');
          // Long-range forces (Coulomb interaction).
          console.time('long-range forces');
          updateLongRangeForces();
          console.timeEnd('long-range forces');

          // Accumulate forces from radially bonded interactions into a(t + dt).
          updateRadialBondForces();

          // Accumulate forces from angularly bonded interactions into a(t + dt).
          updateAngularBondForces();

          // Accumulate forces from restraint forces into a(t + dt).
          updateRestraintForces();

          // Accumulate forces from spring forces into a(t + dt).
          updateSpringForces();

          // Accumulate drag forces into a(t + dt).
          updateFrictionForces();

          // Apply forces caused by the hydrophobicity.
          // Affects only amino acids in the water or oil solvent.
          updateAminoAcidForces();

          // Convert ax, ay from forces to accelerations!
          for (i = 0; i < N; i++) {
            inverseMass = 1/mass[i];
            ax[i] *= inverseMass;
            ay[i] *= inverseMass;
          }

          // ############################################
          // ax and ay are ACCELERATIONS below this point
          // ############################################

          // Accumulate optional gravitational accelerations into a(t + dt).
          updateGravitationalAccelerations();

          // Accumulate optional accelerations coming from electric fields into a(t + dt).
          updateElectricFieldsAccelerations();

          // Push all amino acids above some Y coordinate during DNA translation.
          // TODO: this should be part of the MD2D plug-in for proteins engine!
          updateDNATranslationAccelerations();
        },

        // Half of the update of v(t + dt) and p(t + dt) using a. During a single integration loop,
        // call once when a = a(t) and once when a = a(t+dt).
        halfUpdateVelocity = function() {
          var i, m;
          for (i = 0; i < N; i++) {
            m = mass[i];
            vx[i] += 0.5 * ax[i] * dt;
            px[i] = m * vx[i];
            vy[i] += 0.5 * ay[i] * dt;
            py[i] = m * vy[i];
          }
        },

        // Calculate r(t + dt, i) from v(t + 0.5 * dt).
        updateParticlesPosition = function() {
          var width100  = size[0] * 100,
              height100 = size[1] * 100,
              xPrev, yPrev, i;

          for (i = 0; i < N; i++) {
            xPrev = x[i];
            yPrev = y[i];

            x[i] += vx[i] * dt;
            y[i] += vy[i] * dt;

            // Simple check if model has diverged. Prevents web browser from crashing.
            // isNaN tests not only x, y, but also vx, vy, ax, ay as test is done after
            // updateParticlesPosition(). If a displacement during one step is larger than width * 100
            // (or height * 100) it means that the velocity is far too big for the current time step.
            if (isNaN(x[i]) || isNaN(y[i]) ||
                Math.abs(x[i]) > width100 || Math.abs(y[i]) > height100) {
              throw new Error("Model has diverged!");
            }

            // Bounce off walls.
            bounceParticleOffWalls(i);
            // Bounce off obstacles, update pressure probes.
            bounceParticleOffObstacles(i, xPrev, yPrev, true);
            // Bounce off shapes
            bounceParticleOffShapes(i, xPrev, yPrev);
            // Bounce off lines
            bounceParticleOffLines(i, xPrev, yPrev);
          }
        },

        // Removes velocity and acceleration from pinned atoms.
        pinAtoms = function() {
          var i;

          for (i = 0; i < N; i++) {
            if (pinned[i]) {
              vx[i] = vy[i] = ax[i] = ay[i] = 0;
            }
          }
        },

        // Update speed using velocities.
        updateParticlesSpeed = function() {
          var i;

          for (i = 0; i < N; i++) {
            speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
          }
        },

        // Calculate new obstacles position using simple integration method.
        updateObstaclesPosition = function() {
          var ax, ay, vx, vy,
              drag, extFx, extFy, i;

          for (i = 0; i < N_obstacles; i++) {
            // Fast path when obstacle isn't movable.
            if (obstacleMass[i] === Infinity) continue;

            vx = obstacleVX[i];
            vy = obstacleVY[i];
            // External forces are defined per mass unit!
            // So, they are accelerations in fact.
            extFx = obstacleExtAX[i];
            extFy = obstacleExtAY[i];

            if (vx || vy || extFx || extFy || gravitationalField) {
              drag = viscosity * obstacleFriction[i];
              ax = extFx - drag * vx;
              ay = extFy - drag * vy - gravitationalField;

              obstacleXPrev[i] = obstacleX[i];
              obstacleYPrev[i] = obstacleY[i];

              // Update positions.
              obstacleX[i] += vx * dt + 0.5 * ax * dt_sq;
              obstacleY[i] += vy * dt + 0.5 * ay * dt_sq;

              // Update velocities.
              obstacleVX[i] += ax * dt;
              obstacleVY[i] += ay * dt;

              bounceObstacleOffWalls(i);
            }
          }
        },

        // Sets total momentum of each molecule to zero.
        // Useful for proteins engine.
        zeroTotalMomentumOfMolecules = function() {
          var moleculeAtoms, atomIdx, sumX, sumY, invMass,
              i, j, len;

          for (i = 0; i < N; i++) {
            visited[i] = 0;
          }

          for (i = 0; i < N; i++) {
            // Process each particular atom only *once*.
            if (visited[i] === 1) continue;

            moleculeAtoms = engine.getMoleculeAtoms(i);
            if (moleculeAtoms.length === 0) continue;
            moleculeAtoms.push(i);

            sumX = sumY = invMass = 0;
            for (j = 0, len = moleculeAtoms.length; j < len; j++) {
              atomIdx = moleculeAtoms[j];
              // Mark that atom was part of processed molecule to avoid
              // calculating its molecule again.
              visited[atomIdx] = 1;
              if (!pinned[atomIdx]) {
                sumX += vx[atomIdx] * mass[atomIdx];
                sumY += vy[atomIdx] * mass[atomIdx];
                invMass += mass[atomIdx];
              }
            }
            invMass = 1.0 / invMass;
            for (j = 0, len = moleculeAtoms.length; j < len; j++) {
              atomIdx = moleculeAtoms[j];
              if (!pinned[atomIdx]) {
                vx[atomIdx] -= sumX * invMass;
                vy[atomIdx] -= sumY * invMass;
                // Update momentum.
                px[atomIdx] = vx[atomIdx] * mass[atomIdx];
                py[atomIdx] = vy[atomIdx] * mass[atomIdx];
              }
            }
          }
        },

        adjustTemperature = function(target, forceAdjustment) {
          var rescalingFactor, i;

          if (target == null) target = T_target;

          T = computeTemperature();

          if (T === 0) {
            // Special case when T is 0.
            for (i = 0; i < N; i++) {
              if (pinned[i] === false) {
                // Add some random velocity to unpinned atoms.
                vx[i] = Math.random() * 0.02 - 0.01;
                vy[i] = Math.random() * 0.02 - 0.01;
              }
            }
            // Update temperature.
            T = computeTemperature();

            if (T === 0) {
              // This means that all atoms are pinned. Nothing to do.
              return;
            }
          }

          if (forceAdjustment || useThermostat && T > 0) {
            rescalingFactor = Math.sqrt(target / T);

            // Scale particles velocity.
            for (i = 0; i < N; i++) {
              vx[i] *= rescalingFactor;
              vy[i] *= rescalingFactor;
              px[i] *= rescalingFactor;
              py[i] *= rescalingFactor;
            }

            // Scale obstacles velocity.
            for (i = 0; i < N_obstacles; i++) {
              obstacleVX[i] *= rescalingFactor;
              obstacleVY[i] *= rescalingFactor;
            }

            T = target;
          }
        },

        // Two cysteine AAs can form a covalent bond between their sulphur atoms. We could model this such that
        // when two Cys AAs come close enough a covalent bond is formed (only one between a pair of cysteines).
        createDisulfideBonds = function () {
          var cys1Idx, cys2Idx, xDiff, yDiff, rSq, i, j, len;

          for (i = 0, len = freeCysteinesList.length; i < len; i++) {
            cys1Idx = freeCysteinesList[i];
            for (j = i + 1; j < len; j++) {
              cys2Idx = freeCysteinesList[j];

              xDiff = x[cys1Idx] - x[cys2Idx];
              yDiff = y[cys1Idx] - y[cys2Idx];
              rSq = xDiff * xDiff + yDiff * yDiff;

              // Check whether cysteines are close enough to each other.
              // As both are in the freeCysteinesList, they are not connected.
              if (rSq < 0.07) {
                // Connect cysteines.
                engine.addRadialBond({
                  atom1: cys1Idx,
                  atom2: cys2Idx,
                  length: Math.sqrt(rSq),
                  // Default strength of bonds between amino acids.
                  strength: 10000,
                  // Disulfide bond type.
                  type: 109
                });

                // Remove both cysteines from freeCysteinesList.
                arrays.remove(freeCysteinesList, i);
                arrays.remove(freeCysteinesList, j);

                // Update len, cys1Idx, j as freeCysteinesList has changed.
                // Not very pretty, but probably the fastest way.
                len = freeCysteinesList.length;
                cys1Idx = freeCysteinesList[i];
                j = i + 1;
              }
            }
          }
        },

        // ### Pressure calculation ###

        // Zero values of pressure probes. It should be called
        // at the beginning of the integration step.
        zeroPressureValues = function () {
          var i;
          for (i = 0; i < N_obstacles; i++) {
            if (obstacleNorthProbe[i]) {
              obstacleNProbeValue[i] = 0;
            }
            if (obstacleSouthProbe[i]) {
              obstacleSProbeValue[i] = 0;
            }
            if (obstacleEastProbe[i]) {
              obstacleEProbeValue[i] = 0;
            }
            if (obstacleWestProbe[i]) {
              obstacleWProbeValue[i] = 0;
            }
          }
        },

        // Update probes values so they contain final pressure value in Bar.
        // It should be called at the end of the integration step.
        calculateFinalPressureValues = function (duration) {
          var mult, i;
          // Classic MW converts impulses 2mv/dt to pressure in Bar using constant: 1666667.
          // See: the header of org.concord.mw2d.models.RectangularObstacle.
          // However, Classic MW also uses different units for mass and length:
          // - 120amu instead of 1amu,
          // - 0.1A instead of 1nm.
          // We should convert mass, velocity and obstacle height to Next Gen units.
          // Length units reduce themselves (velocity divided by height or width), only mass is left.
          // So, divide classic MW constant 1666667 by 120 - the result is 13888.89.
          // [ There is unit module available, however for reduction of computational cost,
          // include conversion in the pressure constant, especially considering the fact that
          // conversion from 120amu to amu is quite simple. ]
          mult = 13888.89 / duration;
          for (i = 0; i < N_obstacles; i++) {
            if (obstacleNorthProbe[i]) {
              obstacleNProbeValue[i] *= mult / obstacleWidth[i];
            }
            if (obstacleSouthProbe[i]) {
              obstacleSProbeValue[i] *= mult / obstacleWidth[i];
            }
            if (obstacleEastProbe[i]) {
              obstacleEProbeValue[i] *= mult / obstacleHeight[i];
            }
            if (obstacleWestProbe[i]) {
              obstacleWProbeValue[i] *= mult / obstacleHeight[i];
            }
          }
        },

        // Removes all angular bonds that includes atom1 and atom2 as one of the "arms".
        // Function is useful when e.g. radial bond is removed.
        removeAngularBondsContaining = function (atom1, atom2, conserveEnergy) {
          var i;
          // Use such "strange" form of loop, as while removing one bonds,
          // other change their indexing. So, after removal of bond 5, we
          // should check bond 5 again, as it would be another bond (previously
          // indexed as 6).
          i = 0;
          while (i < N_angularBonds) {
            // Remove related angular bonds.
            if ((angularBondAtom1Index[i] === atom1 && angularBondAtom3Index[i] === atom2) ||
                (angularBondAtom1Index[i] === atom2 && angularBondAtom3Index[i] === atom1) ||
                (angularBondAtom2Index[i] === atom1 && angularBondAtom3Index[i] === atom2) ||
                (angularBondAtom2Index[i] === atom2 && angularBondAtom3Index[i] === atom1))
              engine.removeAngularBond(i, conserveEnergy);
            else
              i++;
          }
        };

    // A list of the indices of atoms having nonzero charge.
    // (Yes, this introduces some slightly different code patterns than are used elsewhere here, as
    // it's probably time to evolve away from this-avoidance and the onevar style.)
    var chargedAtomsList = [];
    chargedAtomsList.reset = function() {
      var i, j = 0;
      for (i = 0; i < N; i++) {
        if (atoms.charge[i]) {
          this[j++] = i;
        }
      }
      this.length = j;
    };

    // radialBondMatrix[i][j] === true when atoms i and j are "radially bonded"
    // radialBondMatrix[i][j] === undefined otherwise
    var radialBondMatrix = [];
    radialBondMatrix.reset = function () {
      var i, atom1, atom2;

      this.length = 0;

      for (i = 0; i < N_radialBonds; i++) {
        atom1 = radialBondAtom1Index[i];
        atom2 = radialBondAtom2Index[i];
        this[atom1] = this[atom1] || [];
        this[atom1][atom2] = true;
        this[atom2] = this[atom2] || [];
        this[atom2][atom1] = true;
      }
    };

    // bondedAtoms[i] contains a list of atoms bonded to atom "i".
    var bondedAtoms = [];
    bondedAtoms.reset = function () {
      var i, atom1, atom2;

      this.length = 0;

      for (i = 0; i < N_radialBonds; i++) {
        atom1 = radialBondAtom1Index[i];
        atom2 = radialBondAtom2Index[i];
        this[atom1] = this[atom1] || [];
        this[atom1].push(atom2);
        this[atom2] = this[atom2] || [];
        this[atom2].push(atom1);
      }
    };
    bondedAtoms.unset = function(atom1, atom2) {
      if (this[atom1]) {
        var atom1Idx = this[atom2].indexOf(atom1);
        var atom2Idx = this[atom1].indexOf(atom2);
        if (atom1Idx !== -1) {
          this[atom1].splice(atom2Idx, 1);
          this[atom2].splice(atom1Idx, 1);
        }
      }
    };
    bondedAtoms.set = function(atom1, atom2) {
      if (this[atom1] == null) {
        this[atom1] = [];
      }
      if (this[atom2] == null) {
        this[atom2] = [];
      }
      this[atom1].push(atom2);
      this[atom2].push(atom1);
    };

    // ####################################################################
    // ####################################################################

    engine = {

      // Adds a new plugin. Plugin will be initialized with the object arrys, so that
      // it can add to them as necessary, and will then be registered in the controller,
      // allowing it to respond to functions passed to the controller from arbitrary
      // points in the md2d code.
      addPlugin: function(plugin) {
        if (plugin.initialize) {
          // plugins can update the data arrays as needed so we pass in the arrays.
          // we do this as an object, so we can add new arrays as needed by the plugins
          // without needing to update all existing plugins
          plugin.initialize({
            atoms: atoms,
            elements: elements,
            radialBonds: radialBonds,
            angularBonds: angularBonds
          });
        }

        pluginController.registerPlugin(plugin);
      },

      useCoulombInteraction: function(v) {
        useCoulombInteraction = !!v;
      },

      useLennardJonesInteraction: function(v) {
        useLennardJonesInteraction = !!v;
      },

      useThermostat: function(v) {
        useThermostat = !!v;
      },

      setVDWLinesRatio: function(vdwlr) {
        if (typeof vdwlr === "number" && vdwlr !== 0) {
          vdwLinesRatio = vdwlr;
        }
      },

      setGravitationalField: function(gf) {
        if (typeof gf === "number" && gf !== 0) {
          gravitationalField = gf;
        } else {
          gravitationalField = false;
        }
      },

      setTemperatureOfAtoms: function(atomIndices, targetT) {

        var i, j, vxtmp, vytmp, smallT, smallKE, scale, s, groupT,
            nGroup = atomIndices.length;

        // Assign a random direction and speed to atoms with velocity exactly equal to 0 (e.g.
        // cooled drastically or newly created). This ensures that we don't just rescale the
        // velocities of the (possibly small or nonexistent) group of atoms that already have some
        // velocity. After rescaling, the net effect is to transfer some velocity from moving atoms
        // to non-moving atoms.

        // Pick a small temperature to assign to non-moving atoms
        smallT = (computeTemperatureOfAtoms(atomIndices) || targetT) * 0.0001;
        smallKE = convertTtoKE(smallT, 1);

        // Assign moveable, non-moving atoms a small temperature
        for (i = 0; i < nGroup; i++) {
          j = atomIndices[i];
          if (!pinned[j] && vx[j] === 0 && vy[j] === 0) {
            vxtmp = Math.random() - 0.5;
            vytmp = Math.random() - 0.5;
            s  = Math.sqrt( (2*smallKE/mass[j]) / (vxtmp*vxtmp + vytmp*vytmp) );
            vx[j] = vxtmp * s;
            vy[j] = vytmp * s;
          }
        }

        T      = computeTemperature();
        groupT = computeTemperatureOfAtoms(atomIndices);

        scale = Math.sqrt( targetT / groupT );

        for (i = 0; i < nGroup; i++) {
          j = atomIndices[i];
          engine.setAtomProperties(j, {
            vx: vx[j] * scale,
            vy: vy[j] * scale
          });
        }
      },

      getTemperatureOfAtoms: function(atomIndices) {
        return computeTemperatureOfAtoms(atomIndices);
      },

      setTargetTemperature: function(v) {
        validateTemperature(v);
        T_target = v;
      },

      setDielectricConstant: function(dc) {
        dielectricConst = dc;
      },

      setRealisticDielectricEffect: function (r) {
        realisticDielectricEffect = r;
      },

      setSolventForceType: function(sft) {
        solventForceType = sft;
      },

      setDNAState: function (s) {
        // Don't store DNAState, it's not necessary. Just
        // information whether translation is in progress is useful.
        dnaTranslationInProgress = s.indexOf("translation:") === 0;
      },

      setSolventForceFactor: function(sff) {
        solventForceFactor = sff;
      },

      setAdditionalSolventForceMult: function(asfm) {
        additionalSolventForceMult = asfm;
      },

      setAdditionalSolventForceThreshold: function(asft) {
        additionalSolventForceThreshold = asft;
      },

      // Our timekeeping is really a convenience for users of this lib, so let them reset time at will
      setTime: function(t) {
        time = t;
      },

      setDimensions: function(v) {
        // NB. We may want to create a simple state diagram for the md engine (as well as for the 'modeler' defined in
        // lab.molecules.js)
        if (sizeHasBeenInitialized) {
          throw new Error("The molecular model's size has already been set, and cannot be reset.");
        }
        minX = v[0];
        minY = v[1];
        maxX = v[2];
        maxY = v[3];
        size = [maxX - minX, maxY - minY];
        sizeHasBeenInitialized = true;
      },

      getDimensions: function() {
        return [minX, minY, maxX, maxY];
      },

      getLJCalculator: function() {
        return ljCalculator;
      },

      setAtomProperties: function (i, props) {
        var cysteineEl = aminoacidsHelper.cysteineElement,
            key, amino, j;

        if (props.element !== undefined) {
          if (props.element < 0 || props.element >= N_elements) {
            throw new Error("md2d: Unknown element " + props.element + ", an atom can't be created.");
          }

          // Special case when cysteine AA is morphed into other AA type,
          // which can't create disulphide bonds. Remove a connected
          // disulphide bond if it exists.
          if (element[i] === cysteineEl && props.element !== cysteineEl) {
            for (j = 0; j < N_radialBonds; j++) {
              if ((radialBondAtom1Index[j] === i || radialBondAtom2Index[j] === i) &&
                   radialBondType[j] === 109) {
                // Remove the radial bond representing disulphide bond.
                engine.removeRadialBond(j);
                // One cysteine can create only one disulphide bond so there is no need to continue the loop.
                break;
              }
            }
          }

          // Mark element as used by some atom (used by performance optimizations).
          elementUsed[props.element] = true;

          // Update mass and radius when element is changed.
          props.mass   = elementMass[props.element];
          props.radius = elementRadius[props.element];

          if (aminoacidsHelper.isAminoAcid(props.element)) {
            amino = aminoacidsHelper.getAminoAcidByElement(props.element);
            // Setup properties which are relevant to amino acids.
            props.charge = amino.charge;
            // Note that we overwrite value set explicitly in the hash.
            // So, while setting element of atom, it's impossible to set also its charge.
            props.hydrophobicity = amino.hydrophobicity;
          }
        }

        // Update charged atoms list (performance optimization).
        if (!charge[i] && props.charge) {
          // !charge[i]   => shortcut for charge[i] === 0 || charge[i] === undefined (both cases can occur).
          // props.charge => shortcut for props.charge !== undefined && props.charge !== 0.
          // Save index of charged atom.
          chargedAtomsList.push(i);
        } else if (charge[i] && props.charge === 0) {
          // charge[i] => shortcut for charge[i] !== undefined && charge[i] !== 0 (both cases can occur).
          // Remove index from charged atoms list.
          chargedAtomsList.splice(chargedAtomsList.indexOf(i), 1);
        }

        // Set all properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            atoms[key][i] = props[key];
          }
        }

        // Update properties which depend on other properties.
        px[i]    = vx[i] * mass[i];
        py[i]    = vy[i] * mass[i];
        speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      },

      setRadialBondProperties: function(i, props, conserveAngularBondsEnergy) {
        var key, atom1, atom2;

        // Unset current radial bond matrix entry.
        // Matrix will be updated when new properties are set.
        atom1 = radialBondAtom1Index[i];
        atom2 = radialBondAtom2Index[i];
        if (radialBondMatrix[atom1] && radialBondMatrix[atom1][atom2])
          radialBondMatrix[atom1][atom2] = false;
        if (radialBondMatrix[atom2] && radialBondMatrix[atom2][atom1])
          radialBondMatrix[atom2][atom1] = false;

        bondedAtoms.unset(atom1, atom2);

        // If atom1 or atom2 properties are changed, remove related angular bonds.
        if ((props.atom1 !== undefined && props.atom1 !== atom1) ||
            (props.atom2 !== undefined && props.atom2 !== atom2)) {
          removeAngularBondsContaining(atom1, atom2, conserveAngularBondsEnergy);
        }

        // Set all properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            radialBonds[key][i] = props[key];
          }
        }

        // Update radial bond matrix.
        atom1 = radialBondAtom1Index[i];
        atom2 = radialBondAtom2Index[i];
        if (!radialBondMatrix[atom1]) radialBondMatrix[atom1] = [];
        radialBondMatrix[atom1][atom2] = true;
        if (!radialBondMatrix[atom2]) radialBondMatrix[atom2] = [];
        radialBondMatrix[atom2][atom1] = true;

        bondedAtoms.set(atom1, atom2);
      },

      setAngularBondProperties: function(i, props) {
        var key;
        // Set all properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            angularBonds[key][i] = props[key];
          }
        }
      },

      setRestraintProperties: function(i, props) {
        var key;
        // Set all properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            restraints[key][i] = props[key];
          }
        }
      },

      setElementProperties: function(i, properties) {
        var j, newRadius;
        // FIXME we cached mass into its own array, which is now probably unnecessary (position-update
        // calculations have since been speeded up by batching the computation of accelerations from
        // forces.) If we remove the mass[] array we also remove the need for the loop below:

        if (properties.mass != null && properties.mass !== elementMass[i]) {
            elementMass[i] = properties.mass;
          for (j = 0; j < N; j++) {
            if (element[j] === i) mass[j] = properties.mass;
          }
        }

        if (properties.sigma != null) {
          elementSigma[i] = properties.sigma;
          newRadius = lennardJones.radius(properties.sigma);

          if (elementRadius[i] !== newRadius) {
            elementRadius[i] = newRadius;
            for (j = 0; j < N; j++) {
              if (element[j] === i) radius[j] = newRadius;
            }
          }
        }

        if (properties.epsilon != null) elementEpsilon[i] = properties.epsilon;

        if (properties.color != null) {
          elementColor[i] = properties.color;
        }

        for (j = 0; j < N_elements; j++) {
          setPairwiseLJProperties(i, j);
        }
        // Reinitialize optimization structures, as sigma can be changed.
        initializeCellList();
        initializeNeighborList();
      },

      setPairwiseLJProperties: function (i, j) {
        // Call private (closure) version of this funcion.
        setPairwiseLJProperties(i, j);
        // Reinitialize optimization structures, as sigma can be changed.
        initializeCellList();
        initializeNeighborList();
      },

      setObstacleProperties: function (i, props) {
        var key;

        if (!engine.canPlaceObstacle(props.x, props.y, props.width, props.height, i))
          throw new Error("Obstacle can't be placed at " + props.x + ", " + props.y);

        // If position is manually changed, update previous
        // position also.
        if (props.x !== undefined) {
          props.xPrev = props.x;
        }
        if (props.y !== undefined) {
          props.yPrev = props.y;
        }
        // Try to parse mass, as it may be string "Infinity".
        if (typeof props.mass === 'string') {
          props.mass = parseFloat(props.mass);
        }

        // Set properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            obstacles[key][i] = props[key];
          }
        }
      },

      setShapeProperties: function (i, props) {
        var key;
        // Set properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            shapes[key][i] = props[key];
          }
        }
      },

      setLineProperties: function (i, props) {
        var key;
        // Set properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            lines[key][i] = props[key];
          }
        }
      },

      setElectricFieldProperties: function (i, props) {
        var key;
        // Set properties from props hash.
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            electricFields[key][i] = props[key];
          }
        }
      },

      /**
        The canonical method for adding an atom to the collections of atoms.

        If there isn't enough room in the 'atoms' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more atoms.

        @returns the index of the new atom
      */
      addAtom: function(props) {
        if (N + 1 > atoms.x.length) {
          utils.extendArrays(atoms, Math.round(N * 1.5 + 10));
          assignShortcutReferences.atoms();
        }

        // Set acceleration of new atom to zero.
        props.ax = props.ay = 0;

        // Remove any stray value from charge--setAtomProperties updates chargedAtomsList based on
        // whether the atom was charged previously.
        charge[N] = 0;

        // Set provided properties of new atom.
        engine.setAtomProperties(N, props);

        // Increase number of atoms.
        N++;

        // Initialize helper structures for optimizations.
        initializeCellList();
        initializeNeighborList();
      },

      removeAtom: function(idx) {
        var i, len, prop,
            l, list, lists;

        if (idx >= N) {
          throw new Error("Atom " + idx + " doesn't exist, so it can't be removed.");
        }

        // Start from removing all bonds connected to this atom.
        // Note that we are removing only radial bonds. Angular bonds
        // will be removed while removing radial bond, not atom!

        // Use such "strange" form of loop, as while removing one bonds,
        // other change their indexing. So, after removal of bond 5, we
        // should check bond 5 again, as it would be another bond (previously
        // indexed as 6).
        i = 0;
        while (i < N_radialBonds) {
          if (radialBondAtom1Index[i] === idx || radialBondAtom2Index[i] === idx)
            engine.removeRadialBond(i);
          else
            i++;
        }

        // Try to remove atom from charged atoms list.
        i = chargedAtomsList.indexOf(idx);
        if (i !== -1) {
          arrays.remove(chargedAtomsList, i);
        }

        // Finally, remove atom.

        // Shift atoms properties and zero last element.
        // It can be optimized by just replacing the last
        // atom with atom 'i', however this approach
        // preserves more expectable atoms indexing.
        for (i = idx; i < N; i++) {
          for (prop in atoms) {
            if (atoms.hasOwnProperty(prop)) {
              if (i === N - 1)
                atoms[prop][i] = 0;
              else
                atoms[prop][i] = atoms[prop][i + 1];
            }
          }
        }

        // Update number of atoms!
        N--;

        // Shift indices of atoms in various lists.
        lists = [
          chargedAtomsList,
          radialBondAtom1Index, radialBondAtom2Index,
          angularBondAtom1Index, angularBondAtom2Index, angularBondAtom3Index
        ];

        for (l = 0; l < lists.length; l++) {
          list = lists[l];
          for (i = 0, len = list.length; i < len; i++) {
            if (list[i] > idx)
              list[i]--;
          }
        }

        // Recalculate radial bond matrix and bonded atoms lists, as indices have changed.
        radialBondMatrix.reset();
        bondedAtoms.reset();

        // (Re)initialize helper structures for optimizations.
        initializeCellList();
        initializeNeighborList();

        neighborList.invalidate();

        // Update accelerations of atoms.
        updateParticlesAccelerations();
      },

      /**
        The canonical method for adding an element.
      */
      addElement: function(props) {
        var i;

        if (N_elements >= elementEpsilon.length) {
          utils.extendArrays(elements, N_elements + 10);
          assignShortcutReferences.elements();
        }

        elementMass[N_elements]    = props.mass;
        elementEpsilon[N_elements] = props.epsilon;
        elementSigma[N_elements]   = props.sigma;
        elementRadius[N_elements]  = lennardJones.radius(props.sigma);
        elementColor[N_elements]   = props.color;

        ljCalculator[N_elements]              = [];
        cutoffDistance_LJ_sq[N_elements]      = [];
        cutoffNeighborListSquared[N_elements] = [];

        for (i = 0; i <= N_elements; i++) {
          setPairwiseLJProperties(N_elements, i);
        }
        // Note that we don't have to reinitialize optimization
        // structures (cell lists and neighbor list). They are
        // based only on the properties of *used* elements, so
        // adding a new atom should trigger reinitialization instead.

        N_elements++;
      },

      /**
        The canonical method for adding a radial bond to the collection of radial bonds.
      */
      addRadialBond: function(props) {
        if (N_radialBonds + 1 > radialBondAtom1Index.length) {
          utils.extendArrays(radialBonds, N_radialBonds + 10);
          assignShortcutReferences.radialBonds();
        }

        N_radialBonds++;

        // Set new radial bond properties.
        engine.setRadialBondProperties(N_radialBonds - 1, props);

        radialBondsChanged = true;
      },

      removeRadialBond: function(idx, conserveAngularBondsEnergy) {
        var i, prop;

        if (idx >= N_radialBonds) {
          throw new Error("Radial bond " + idx + " doesn't exist, so it can't be removed.");
        }

        // Start from removing angular bonds.
        removeAngularBondsContaining(radialBondAtom1Index[idx], radialBondAtom2Index[idx], conserveAngularBondsEnergy);

        // Update optimization structure.
        bondedAtoms.unset(radialBondAtom1Index[idx], radialBondAtom2Index[idx]);

        // Shift radial bonds properties and zero last element.
        // It can be optimized by just replacing the last
        // radial bond with radial bond 'i', however this approach
        // preserves more expectable indexing.
        // TODO: create some general function for that, as it's duplicated
        // in each removeObject method.
        for (i = idx; i < N_radialBonds; i++) {
          for (prop in radialBonds) {
            if (radialBonds.hasOwnProperty(prop)) {
              if (i === N_radialBonds - 1)
                radialBonds[prop][i] = 0;
              else
                radialBonds[prop][i] = radialBonds[prop][i + 1];
            }
          }
        }

        N_radialBonds--;

        // Recalculate radial bond matrix as bond indices have changed.
        radialBondMatrix.reset();

        radialBondsChanged = true;
      },

      /**
        The canonical method for adding an 'restraint' bond to the collection of restraints.

        If there isn't enough room in the 'restraints' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more bonds.
      */
      addRestraint: function(props) {
        if (N_restraints + 1 > restraints.atomIndex.length) {
          utils.extendArrays(restraints, N_restraints + 10);
          assignShortcutReferences.restraints();
        }

        N_restraints++;

        // Set new restraint properties.
        engine.setRestraintProperties(N_restraints - 1, props);
      },

      /**
        The canonical method for adding an angular bond to the collection of angular bonds.

        If there isn't enough room in the 'angularBonds' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more bonds.
      */
      addAngularBond: function(props) {
        if (N_angularBonds + 1 > angularBonds.atom1.length) {
          utils.extendArrays(angularBonds, N_angularBonds + 10);
          assignShortcutReferences.angularBonds();
        }

        N_angularBonds++;

        // Set new angular bond properties.
        engine.setAngularBondProperties(N_angularBonds - 1, props);
      },

      removeAngularBond: function(idx, conserveEnergy) {
        var i, prop, a1, a2, a3, angleDiff;

        if (idx >= N_angularBonds) {
          throw new Error("Angular bond " + idx + " doesn't exist, so it can't be removed.");
        }

        if (conserveEnergy) {
          a1 = angularBondAtom1Index[idx];
          a2 = angularBondAtom2Index[idx];
          a3 = angularBondAtom3Index[idx];
          angleDiff = angularBondAngle[idx] - math.getAngleBetweenVec(x[a1], y[a1],
                                                                      x[a2], y[a2],
                                                                      x[a3], y[a3]);
          engine.addKEToAtoms(0.5 * angularBondStrength[idx] * angleDiff * angleDiff, a1, a2, a3);
        }

        // Shift angular bonds properties and zero last element.
        // It can be optimized by just replacing the last
        // angular bond with angular bond 'i', however this approach
        // preserves more expectable indexing.
        // TODO: create some general function for that, as it's duplicated
        // in each removeObject method.
        for (i = idx; i < N_angularBonds; i++) {
          for (prop in angularBonds) {
            if (angularBonds.hasOwnProperty(prop)) {
              if (i === N_angularBonds - 1)
                angularBonds[prop][i] = 0;
              else
                angularBonds[prop][i] = angularBonds[prop][i + 1];
            }
          }
        }

        N_angularBonds--;
      },

      /**
        Adds a spring force between an atom and an x, y location.

        @returns the index of the new spring force.
      */
      addSpringForce: function(atomIndex, x, y, strength) {
        // conservatively just add one spring force
        if (N_springForces + 1 > springForces[0].length) {
          utils.extendArrays(springForces, N_springForces + 1);
          assignShortcutReferences.springForces();
        }

        springForceAtomIndex[N_springForces]  = atomIndex;
        springForceX[N_springForces]          = x;
        springForceY[N_springForces]          = y;
        springForceStrength[N_springForces]   = strength;

        return N_springForces++;
      },

      updateSpringForce: function(i, x, y) {
        springForceX[i] = x;
        springForceY[i] = y;
      },

      removeSpringForce: function(idx) {
        var i, j;

        if (idx >= N_springForces) {
          throw new Error("Spring force " + idx + " doesn't exist, so it can't be removed.");
        }

        N_springForces--;

        // Shift spring forces properties.
        for (i = idx; i < N_springForces; i++) {
          for (j = 0; j < 4; j++) {
            springForces[j][i] = springForces[j][i + 1];
          }
        }
      },

      springForceAtomIndex: function(i) {
        return springForceAtomIndex[i];
      },

      addObstacle: function(props) {
        if (!engine.canPlaceObstacle(props.x, props.y, props.width, props.height))
          throw new Error("Obstacle can't be placed at " + props.x + ", " + props.y + ".");

        if (N_obstacles + 1 > obstacles.x.length) {
          // Extend arrays each time (as there are only
          // a few obstacles in typical model).
          utils.extendArrays(obstacles, N_obstacles + 1);
          assignShortcutReferences.obstacles();
        }

        N_obstacles++;

        // Set properties of new obstacle.
        engine.setObstacleProperties(N_obstacles - 1, props);
      },

      removeObstacle: function(idx) {
        var i, prop;

        if (idx >= N_obstacles) {
          throw new Error("Obstacle " + idx + " doesn't exist, so it can't be removed.");
        }

        N_obstacles--;

        // Shift obstacles properties.
        // It can be optimized by just replacing the last
        // obstacle with obstacle 'i', however this approach
        //  preserves more expectable obstacles indexing.
        for (i = idx; i < N_obstacles; i++) {
          for (prop in obstacles) {
            if (obstacles.hasOwnProperty(prop)) {
              obstacles[prop][i] = obstacles[prop][i + 1];
            }
          }
        }

        // FIXME: This shouldn't be necessary, however various modules
        // (e.g. views) use obstacles.x.length as the real number of obstacles.
        utils.extendArrays(obstacles, N_obstacles);
        assignShortcutReferences.obstacles();
      },

      addShape: function(props) {
        if (N_shapes + 1 > shapes.x.length) {
          // Extend arrays each time (as there are only
          // a few shapes in typical model).
          utils.extendArrays(shapes, N_shapes + 1);
          assignShortcutReferences.shapes();
        }

        N_shapes++;

        // Set properties of new shape.
        engine.setShapeProperties(N_shapes - 1, props);
      },

      removeShape: function(idx) {
        var i, prop;

        if (idx >= N_shapes) {
          throw new Error("Shape " + idx + " doesn't exist, so it can't be removed.");
        }

        // Remove all electric fields connected with this shape.

        // Use such "strange" form of loop, as while removing one electric field,
        // other change their indexing. So, after removal of field 5, we
        // should check field 5 again, as it would be another field (previously
        // indexed as 6).
        i = 0;
        while (i < N_electricFields) {
          if (electricFieldShapeIdx[i] === idx)
            engine.removeElectricField(i);
          else
            i++;
        }

        N_shapes--;

        // Shift shapes properties.
        // It can be optimized by just replacing the last
        // shape with shape 'i', however this approach
        //  preserves more expectable shapes indexing.
        for (i = idx; i < N_shapes; i++) {
          for (prop in shapes) {
            if (shapes.hasOwnProperty(prop)) {
              shapes[prop][i] = shapes[prop][i + 1];
            }
          }
        }

        // Shift indices of shapes referenced by electric fields.
        for (i = 0; i < N_electricFields; i++) {
          if (electricFieldShapeIdx[i] > idx)
            electricFieldShapeIdx[i]--;
        }

        // FIXME: This shouldn't be necessary, however various modules
        // (e.g. views) use shapes.x.length as the real number of shapes.
        utils.extendArrays(shapes, N_shapes);
        assignShortcutReferences.shapes();
      },

      addLine: function(props) {
        if (N_lines + 1 > lines.x1.length) {
          // Extend arrays each time (as there are only
          // a few lines in typical model).
          utils.extendArrays(lines, N_lines + 1);
          assignShortcutReferences.lines();
        }

        N_lines++;

        // Set properties of new line.
        engine.setLineProperties(N_lines - 1, props);
      },

      removeLine: function(idx) {
        var i, prop;

        if (idx >= N_lines) {
          throw new Error("Line " + idx + " doesn't exist, so it can't be removed.");
        }

        // Shift lines properties.
        // It can be optimized by just replacing the last
        // shape with shape 'i', however this approach
        //  preserves more expectable lines indexing.
        for (i = idx; i < N_lines; i++) {
          for (prop in lines) {
            if (lines.hasOwnProperty(prop)) {
              lines[prop][i] = lines[prop][i + 1];
            }
          }
        }

        N_lines--;

        // FIXME: This shouldn't be necessary, however various modules
        // (e.g. views) use lines.x1.length as the real number of lines.
        utils.extendArrays(lines, N_lines);
        assignShortcutReferences.lines();
      },

      addElectricField: function(props) {
        if (N_electricFields + 1 > electricFields.intensity.length) {
          // Extend arrays each time (as there are only
          // a few electricFields in typical model).
          utils.extendArrays(electricFields, N_electricFields + 1);
          assignShortcutReferences.electricFields();
        }

        N_electricFields++;

        // Set properties of new shape.
        engine.setElectricFieldProperties(N_electricFields - 1, props);
      },

      removeElectricField: function(idx) {
        var i, prop;

        if (idx >= N_electricFields) {
          throw new Error("Electric field " + idx + " doesn't exist, so it can't be removed.");
        }

        N_electricFields--;

        // Shift electric fields properties.
        for (i = idx; i < N_electricFields; i++) {
          for (prop in electricFields) {
            if (electricFields.hasOwnProperty(prop)) {
              electricFields[prop][i] = electricFields[prop][i + 1];
            }
          }
        }

        // Follow convention of other engine objects whose array is reduced after removal.
        utils.extendArrays(electricFields, N_electricFields);
        assignShortcutReferences.electricFields();
      },

      atomInBounds: function(_x, _y, i) {
        var r = radius[i], j;

        if (_x < r || _x > size[0] - r || _y < r || _y > size[1] - r) {
          return false;
        }
        for (j = 0; j < N_obstacles; j++) {
          if (_x > (obstacleX[j] - r) && _x < (obstacleX[j] + obstacleWidth[j] + r) &&
              _y > (obstacleY[j] - r) && _y < (obstacleY[j] + obstacleHeight[j] + r)) {
            return false;
          }
        }
        return true;
      },

      /**
        Checks to see if an uncharged atom could be placed at location x,y
        without increasing the PE (i.e. overlapping with another atom), and
        without being on an obstacle or past a wall.

        Optionally, an atom index i can be included which will tell the function
        to ignore the existance of atom i. (Used when moving i around.)
      */
      canPlaceAtom: function(element, _x, _y, i, skipPECheck) {
        var orig_x,
            orig_y,
            PEAtLocation,
            testX, testY, testXMax, testYMax,
            j;

        // first do the simpler check to see if we're outside the walls
        if ( !engine.atomInBounds(_x, _y, i) ) {
          return false;
        }

        // Check collision with obstacles.
        for (j = 0; j < N_obstacles; j++) {
          testX = obstacleX[j];
          testY = obstacleY[j];
          testXMax = testX + obstacleWidth[j];
          testYMax = testY + obstacleHeight[j];
          if ((_x > testX && _x < testXMax) &&
              (_y > testY && _y < testYMax)) {
            return false;
          }
        }

        if (skipPECheck) {
          return true;
        }

        // then check PE at location
        if (typeof i === "number") {
          orig_x = x[i];
          orig_y = y[i];
          x[i] = y[i] = Infinity;   // move i atom away
        }

        PEAtLocation = engine.newPotentialCalculator(element, 0, false)(_x, _y);

        if (typeof i === "number") {
          x[i] = orig_x;
          y[i] = orig_y;
        }

        return PEAtLocation <= 0;
      },

      /**
        Checks to see if an obstacle could be placed at location x, y
        without being on an atom, another obstacle or past a wall.

        idx parameter is optional. It should be defined and equal to id
        of an existing obstacle when the existing obstacle should be checked.
        It prevents an algorithm from comparing the obstacle with itself during
        collisions detection.
      */
      canPlaceObstacle: function (obsX, obsY, obsWidth, obsHeight, idx) {
        var obsXMax = obsX + obsWidth,
            obsYMax = obsY + obsHeight,
            testX, testY, testXMax, testYMax,
            r, i;

        // Check collision with walls.
        if (obsX < 0 || obsXMax > size[0] || obsY < 0 || obsYMax > size[0]) {
          return false;
        }

        // Check collision with atoms.
        for (i = 0; i < N; i++) {
          r = radius[i];
          if (x[i] > (obsX - r) && x[i] < (obsXMax + r) &&
              y[i] > (obsY - r) && y[i] < (obsYMax + r)) {
            return false;
          }
        }

        // Check collision with other obstacles.
        for (i = 0; i < N_obstacles; i++) {
          if (idx !== undefined && idx === i) {
            // If we are checking existing obstacle,
            // avoid comparing it with itself.
            continue;
          }
          testX = obstacleX[i];
          testY = obstacleY[i];
          testXMax = testX + obstacleWidth[i];
          testYMax = testY + obstacleHeight[i];
          if ((obsXMax > testX && obsX < testXMax) &&
              (obsYMax > testY && obsY < testYMax)) {
            return false;
          }
        }

        return true;
      },

      setupAtomsRandomly: function(options) {

        var // if a temperature is not explicitly requested, we just need any nonzero number
            temperature = options.temperature || 100,

            nrows = Math.floor(Math.sqrt(N)),
            ncols = Math.ceil(N/nrows),

            i, r, c, rowSpacing, colSpacing,
            vMagnitude, vDirection, props;

        validateTemperature(temperature);

        colSpacing = size[0] / (1 + ncols);
        rowSpacing = size[1] / (1 + nrows);

        // Arrange molecules in a lattice. Not guaranteed to have CM exactly on center, and is an artificially low-energy
        // configuration. But it works OK for now.
        i = -1;

        for (r = 1; r <= nrows; r++) {
          for (c = 1; c <= ncols; c++) {
            i++;
            if (i === N) break;
            vMagnitude = math.normal(1, 1/4);
            vDirection = 2 * Math.random() * Math.PI;

            props = {
              element: Math.floor(Math.random() * options.userElements), // random element
              x:       c * colSpacing,
              y:       r * rowSpacing,
              vx:      vMagnitude * Math.cos(vDirection),
              vy:      vMagnitude * Math.sin(vDirection),
              charge:  2 * (i % 2) - 1 // alternate negative and positive charges
            };
            engine.setAtomProperties(i, props);
          }
        }

        // now, remove all translation of the center of mass and rotation about the center of mass
        computeCMMotion();
        removeTranslationAndRotationFromVelocities();

        // Scale randomized velocities to match the desired initial temperature.
        //
        // Note that although the instantaneous temperature will be 'temperature' exactly, the temperature will quickly
        // settle to a lower value because we are initializing the atoms spaced far apart, in an artificially low-energy
        // configuration.
        //
        adjustTemperature(temperature, true);
      },

      getVdwPairsArray: function() {
        var i,
            j,
            dx,
            dy,
            r_sq,
            x_i,
            y_i,
            sigma_i,
            epsilon_i,
            sigma_j,
            epsilon_j,
            index_i,
            index_j,
            sig,
            eps,
            distanceCutoff_sq = vdwLinesRatio * vdwLinesRatio;

        N_vdwPairs = 0;

        for (i = 0; i < N; i++) {
          // pairwise interactions
          index_i = element[i];
          sigma_i   = elementSigma[index_i];
          epsilon_i = elementSigma[index_i];
          x_i = x[i];
          y_i = y[i];

          for (j = i+1; j < N; j++) {
            if (N_radialBonds !== 0 && (radialBondMatrix[i] && radialBondMatrix[i][j])) continue;

            index_j = element[j];
            sigma_j   = elementSigma[index_j];
            epsilon_j = elementSigma[index_j];

            if (charge[i]*charge[j] <= 0) {
              dx = x[j] - x_i;
              dy = y[j] - y_i;
              r_sq = dx*dx + dy*dy;


              sig = 0.5 * (sigma_i+sigma_j);
              sig *= sig;
              eps = epsilon_i * epsilon_j;

              if (r_sq < sig * distanceCutoff_sq && eps > 0) {
                if (N_vdwPairs + 1 > vdwPairs.atom1.length) {
                  utils.extendArrays(vdwPairs, (N_vdwPairs + 1) * 2);
                  assignShortcutReferences.vdwPairs();
                }
                vdwPairAtom1Index[N_vdwPairs] = i;
                vdwPairAtom2Index[N_vdwPairs] = j;
                N_vdwPairs++;
              }
            }
          }
        }

        vdwPairs.count = N_vdwPairs;
        return vdwPairs;
      },

      // Velocity Verlet integration scheme.
      // See: http://en.wikipedia.org/wiki/Verlet_integration#Velocity_Verlet
      // The current implementation is:
      // 1. Calculate: v(t + 0.5 * dt) = v(t) + 0.5 * a(t) * dt
      // 2. Calculate: r(t + dt) = r(t) + v(t + 0.5 * dt) * dt
      // 3. Derive a(t + dt) from the interaction potential using r(t + dt)
      // 4. Calculate: v(t + dt) = v(t + 0.5 * dt) + 0.5 * a(t + dt) * dt
      integrate: function(duration, _dt) {
        var steps, iloop, tStart = time;

        // How much time to integrate over, in fs.
        if (duration === undefined)  duration = 100;

        // The length of an integration timestep, in fs.
        if (_dt === undefined) _dt = 1;

        dt = _dt;        // dt is a closure variable that helpers need access to
        dt_sq = dt * dt; // the squared time step is also needed by some helpers.

        // Clear flag indicating if some radial bonds were added or removed during the integration
        // step.
        radialBondsChanged = false;

        // Prepare optimization structures to ensure that they are valid during integration.
        // Note that when user adds or removes various objects (like atoms, bonds), such structures
        // can become invalid. That's why we update them each time before integration.
        // It's also safer and easier to do recalculate each structure than to modify it while
        // engine state is changed by user.
        calculateOptimizationStructures();

        // Calculate accelerations a(t), where t = 0.
        // Later this is not necessary, as a(t + dt) from
        // previous step is used as a(t) in the current step.
        if (time === 0) {
          updateParticlesAccelerations();
        }

        // Number of steps.
        steps = Math.floor(duration / dt);

        // Zero values of pressure probes at the beginning of
        // each integration step.
        zeroPressureValues();

        // Clear the acceleration and velocity for pinned atoms, as we may have updated
        // acceleration prior to entering integrate() (e.g. in readModelState).
        pinAtoms();

        for (iloop = 1; iloop <= steps; iloop++) {
          time = tStart + iloop * dt;

          // Calculate v(t + 0.5 * dt) using v(t) and a(t).
          halfUpdateVelocity();

          // Update r(t + dt) using v(t + 0.5 * dt).
          updateParticlesPosition();

          // Accumulate accelerations into a(t + dt) from all possible interactions, fields
          // and forces connected with atoms.
          updateParticlesAccelerations();

          // Clear the acceleration and velocity for pinned atoms before moving them.
          pinAtoms();

          // Calculate v(t + dt) using v(t + 0.5 * dt) and a(t + dt).
          halfUpdateVelocity();

          // Now that we have velocity v(t + dt), update speed.
          updateParticlesSpeed();

          // Move obstacles using very simple integration.
          updateObstaclesPosition();

          // If solvent is different from vacuum (water or oil), ensure that
          // the total momentum of each molecule is equal to zero. This
          // prevents amino acids chains from drifting towards one boundary of
          // the model. Don't do it during translation process to let the protein
          // freely fold.
          if (solventForceType !== 0 && !dnaTranslationInProgress) {
            zeroTotalMomentumOfMolecules();
          }

          pluginController.callPluginFunction('performActionWithinIntegrationLoop', [neighborList, dt, time]);

          // Adjust temperature, e.g. when heat bath is enabled.
          adjustTemperature();
        } // end of integration loop

        // Collisions between particles and obstacles are collected during
        // updateParticlesPosition() execution. This function takes into account
        // time which passed and converts raw data from pressure probes to value
        // in Bars.
        calculateFinalPressureValues(duration);

        // After each integration loop try to create new disulfide bonds between cysteines.
        // It's enough to do it outside the inner integration loop (performance).
        createDisulfideBonds();
      },

      updateParticlesAccelerations: updateParticlesAccelerations,

      // Minimize energy using steepest descend method.
      minimizeEnergy: function () {
            // Maximal length of displacement during one step of minimization.
        var stepLength   = 1e-3,
            // Maximal acceleration allowed.
            accThreshold = 1e-4,
            // Maximal number of iterations allowed.
            iterLimit    = 3000,
            maxAcc, delta, xPrev, yPrev, i, iter;

        // Calculate accelerations.
        updateParticlesAccelerations();
        pinAtoms();
        // Get maximum value.
        maxAcc = 0;
        for (i = 0; i < N; i++) {
          if (maxAcc < Math.abs(ax[i]))
            maxAcc = Math.abs(ax[i]);
          if (maxAcc < Math.abs(ay[i]))
            maxAcc = Math.abs(ay[i]);
        }

        iter = 0;
        while (maxAcc > accThreshold && iter < iterLimit) {
          iter++;

          delta = stepLength / maxAcc;
          for (i = 0; i < N; i++) {
            xPrev = x[i];
            yPrev = y[i];
            x[i] += ax[i] * delta;
            y[i] += ay[i] * delta;

            // Keep atoms in bounds.
            bounceParticleOffWalls(i);
            // Bounce off obstacles, but DO NOT update pressure probes.
            bounceParticleOffObstacles(i, xPrev, yPrev, false);
            // Bounce off shapes
            bounceParticleOffShapes(i, xPrev, yPrev);
            // Bounce off lines
            bounceParticleOffLines(i, xPrev, yPrev);
          }

          // Calculate accelerations.
          updateParticlesAccelerations();
          pinAtoms();
          // Get maximum value.
          maxAcc = 0;
          for (i = 0; i < N; i++) {
            if (maxAcc < Math.abs(ax[i]))
              maxAcc = Math.abs(ax[i]);
            if (maxAcc < Math.abs(ay[i]))
              maxAcc = Math.abs(ay[i]);
          }
        }
      },

      getRadialBondsForAtom: function(index) {
        var rbonds = [],
            i,
            i1,
            i2;

        for (i = 0; i < N_radialBonds; i++) {
          i1 = radialBondAtom1Index[i];
          i2 = radialBondAtom2Index[i];
          if (index === i1 || index === i2) {
            rbonds.push(i);
          }
        }
        return rbonds;
      },

      getAngularBondsForAtom: function(index) {
        var abonds = [],
            i,
            i1,
            i2,
            i3;

        for (i = 0; i < N_angularBonds; i++) {
          i1 = angularBondAtom1Index[i];
          i2 = angularBondAtom2Index[i];
          i3 = angularBondAtom3Index[i];
          if (index === i1 || index === i2 || index === i3) {
            abonds.push(i);
          }
        }
        return abonds;
      },

      // Total mass of all particles in the system, in Dalton (atomic mass units).
      getTotalMass: function() {
        var totalMass = 0, i;
        for (i = 0; i < N; i++) {
          totalMass += mass[i];
        }
        return totalMass;
      },

      getRadiusOfElement: function(el) {
        return elementRadius[el];
      },

      getNumberOfAtoms: function() {
        return N;
      },

      getNumberOfElements: function() {
        return N_elements;
      },

      getNumberOfObstacles: function() {
        return N_obstacles;
      },

      getNumberOfShapes: function() {
        return N_shapes;
      },

      getNumberOfLines: function() {
        return N_lines;
      },

      getNumberOfRadialBonds: function() {
        return N_radialBonds;
      },

      getNumberOfAngularBonds: function() {
        return N_angularBonds;
      },

      getNumberOfRestraints: function() {
        return N_restraints;
      },

      getNumberOfSpringForces: function() {
        return N_springForces;
      },

      getNumberOfElectricFields: function() {
        return N_electricFields;
      },

      /**
        Compute the model state and store into the passed-in 'state' object.
        (Avoids GC hit of throwaway object creation.)
      */
      // TODO: [refactoring] divide this function into smaller chunks?
      computeOutputState: function(state) {
        var i, j, e,
            i1, i2, i3,
            el1, el2,
            dx, dy,
            dxij, dyij, dxkj, dykj,
            cosTheta, theta, rect,
            r_sq, rij, rkj,
            k, dr, angleDiff,
            elInMWUnits,
            gravPEInMWUnits,
            // Total kinetic energy, in MW units.
            KEinMWUnits,
            // Potential energy, in eV.
            PE;

        // Calculate potentials in eV. Note that we only want to do this once per call to integrate(), not once per
        // integration loop!
        PE = 0;
        KEinMWUnits = 0;

        for (i = 0; i < N; i++) {

          // gravitational PE
          if (gravitationalField) {
            gravPEInMWUnits = mass[i] * gravitationalField * y[i];
            PE += constants.convert(gravPEInMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
          }

          // electric field PE
          for (e = 0; e < N_electricFields; e++) {
            rect = electricFieldShapeIdx[e];
            if (rect != null && !rectContains(rect, x[i], y[i])) continue;
            elInMWUnits = charge[i] * getElFieldForce(e);
            switch (electricFieldOrientation[e]) {
            case "N":
            case "S":
              elInMWUnits *= (rect != null ? shapeY[rect] : minY) - y[i]; break;
            case "W":
            case "E":
              elInMWUnits *= (rect != null ? shapeX[rect] : minX) - x[i]; break;
            }
            PE += constants.convert(elInMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
          }

          KEinMWUnits += 0.5 * mass[i] * (vx[i] * vx[i] + vy[i] * vy[i]);

          // pairwise interactions
          for (j = i+1; j < N; j++) {
            dx = x[j] - x[i];
            dy = y[j] - y[i];

            r_sq = dx*dx + dy*dy;

            // FIXME the signs here don't really make sense
            if (useLennardJonesInteraction) {
              PE -=ljCalculator[element[i]][element[j]].potentialFromSquaredDistance(r_sq);
            }
            if (useCoulombInteraction && chargedAtomsList.length > 0) {
              PE += coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j], dielectricConst, realisticDielectricEffect);
            }
          }
        }

        // radial bonds
        for (i = 0; i < N_radialBonds; i++) {
          i1 = radialBondAtom1Index[i];
          i2 = radialBondAtom2Index[i];
          el1 = element[i1];
          el2 = element[i2];

          dx = x[i2] - x[i1];
          dy = y[i2] - y[i1];
          r_sq = dx*dx + dy*dy;

          // eV/nm^2
          k = radialBondStrength[i];

          // nm
          dr = Math.sqrt(r_sq) - radialBondLength[i];

          PE += 0.5*k*dr*dr;

          // Remove the Lennard Jones potential for the bonded pair
          if (useLennardJonesInteraction) {
            PE += ljCalculator[el1][el2].potentialFromSquaredDistance(r_sq);
          }
          if (useCoulombInteraction && charge[i1] && charge[i2]) {
            PE -= coulomb.potential(Math.sqrt(r_sq), charge[i1], charge[i2], dielectricConst, realisticDielectricEffect);
          }
        }

        // Angular bonds.
        for (i = 0; i < N_angularBonds; i++) {
          i1 = angularBondAtom1Index[i];
          i2 = angularBondAtom2Index[i];
          i3 = angularBondAtom3Index[i];

          // Calculate angle (theta) between two vectors:
          // Atom1-Atom3 and Atom2-Atom3
          // Atom1 -> i, Atom2 -> k, Atom3 -> j
          dxij = x[i1] - x[i3];
          dxkj = x[i2] - x[i3];
          dyij = y[i1] - y[i3];
          dykj = y[i2] - y[i3];
          rij = Math.sqrt(dxij * dxij + dyij * dyij);
          rkj = Math.sqrt(dxkj * dxkj + dykj * dykj);
          // Calculate cos using dot product definition.
          cosTheta = (dxij * dxkj + dyij * dykj) / (rij * rkj);
          if (cosTheta > 1.0) cosTheta = 1.0;
          else if (cosTheta < -1.0) cosTheta = -1.0;
          theta = Math.acos(cosTheta);

          // Finally, update PE.
          // radian
          angleDiff = theta - angularBondAngle[i];
          // angularBondStrength unit: eV/radian^2
          PE += 0.5 * angularBondStrength[i] * angleDiff * angleDiff;
        }

        // update PE for 'restraint' bonds
        for (i = 0; i < N_restraints; i++) {
          i1 = restraintAtomIndex[i];
          el1 = element[i1];

          dx = restraintX0[i] - x[i1];
          dy = restraintY0[i] - y[i1];
          r_sq = dx*dx + dy*dy;

          // eV/nm^2
          k = restraintK[i];

          // nm
          dr = Math.sqrt(r_sq);

          PE += 0.5*k*dr*dr;
       }

        // Process all obstacles.
        for (i = 0; i < N_obstacles; i++) {

          if (obstacleMass[i] !== Infinity) {
            // Gravitational potential energy.
            if (gravitationalField) {
              gravPEInMWUnits = obstacleMass[i] * gravitationalField * obstacleY[i];
              PE += constants.convert(gravPEInMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
            }
            // Kinetic energy.
            KEinMWUnits += 0.5 * obstacleMass[i] *
                (obstacleVX[i] * obstacleVX[i] + obstacleVY[i] * obstacleVY[i]);
          }
        }

        // Update temperature.
        T = convertKEtoT(KEinMWUnits, N);

        // "macro" state
        state.time           = time;
        state.PE             = PE;
        state.KE             = constants.convert(KEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
        state.temperature    = T;
        state.pCM            = [px_CM, py_CM]; // TODO: GC optimization? New array created each time.
        state.CM             = [x_CM, y_CM];
        state.vCM            = [vx_CM, vy_CM];
        state.omega_CM       = omega_CM;

        // "micro" state. TODO: put radial bonds, etc here.
        // TODO2: do we really need to put all objects here? Can't modeler ask about interesting
        // arrays using just some getter or property, e.g.: engine.getAtoms() or engine.atoms?
        state.atoms = atoms;
        state.radialBonds = radialBonds;

        // Let plugins modify output state, e.g. PE, KE etc.
        pluginController.callPluginFunction('processOutputState', [state]);
      },


      /**
        Given a test element and charge, returns a function that returns for a location (x, y) in nm:
         * the potential energy, in eV, of an atom of that element and charge at location (x, y)
         * optionally, if calculateGradient is true, the gradient of the potential as an
           array [gradX, gradY]. (units: eV/nm)
      */
      newPotentialCalculator: function(testElement, testCharge, calculateGradient) {

        return function(testX, testY) {
          var PE = 0,
              fx = 0,
              fy = 0,
              gradX,
              gradY,
              ljTest = ljCalculator[testElement],
              i,
              dx,
              dy,
              r_sq,
              r,
              f_over_r,
              lj;

          for (i = 0; i < N; i++) {
            dx = testX - x[i];
            dy = testY - y[i];
            r_sq = dx*dx + dy*dy;
            f_over_r = 0;

            if (useLennardJonesInteraction) {
              lj = ljTest[element[i]];
              PE += -lj.potentialFromSquaredDistance(r_sq, testElement, element[i]);
              if (calculateGradient) {
                f_over_r += lj.forceOverDistanceFromSquaredDistance(r_sq);
              }
            }

            if (useCoulombInteraction && chargedAtomsList.length > 0 && testCharge) {
              r = Math.sqrt(r_sq);
              PE += -coulomb.potential(r, testCharge, charge[i], dielectricConst, realisticDielectricEffect);
              if (calculateGradient) {
                f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, testCharge, charge[i],
                  dielectricConst, realisticDielectricEffect);
              }
            }

            if (f_over_r) {
              fx += f_over_r * dx;
              fy += f_over_r * dy;
            }
          }

          if (calculateGradient) {
            gradX = constants.convert(fx, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
            gradY = constants.convert(fy, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
            return [PE, [gradX, gradY]];
          }

          return PE;
        };
      },


      // Adds a kinetic energy (defined in eV) to a group of atoms defined as optional arguments.
      // e.g. .addKEToAtoms(2, 1, 2, 3) will add 2eV to atoms 1, 2 and 3. When no atom index is
      // specified, the function will use all available atoms.
      // Returns false when it's impossible (e.g. it can happen when provided energy is negative
      // and atoms can't be cooled down more), true otherwise.
      addKEToAtoms: function(energyChange) {
        var atoms = Array.prototype.slice.call(arguments, 1),
            oldKE = 0,
            newKE,
            ratio,
            i, len, idx;

        if (atoms.length === 0) {
          for (i = 0; i < N; i++) {
            atoms.push(i);
          }
        }

        for (i = 0, len = atoms.length; i < len; i++) {
          oldKE += engine.getAtomKineticEnergy(atoms[i]);
        }

        newKE = oldKE + energyChange;

        if (newKE <= 0) {
          // Energy can't be conserved using a given set of atoms.
          return false;
        }
        if (oldKE === 0) {
          idx = atoms[0];
          vx[idx] = Math.random() * 2 - 1 * 1e-5;
          vy[idx] = Math.random() * 2 - 1 * 1e-5;
          oldKE = engine.getAtomKineticEnergy(idx);
        }

        ratio = Math.sqrt(newKE / oldKE);

        for (i = 0, len = atoms.length; i < len; i++) {
          idx = atoms[i];
          vx[idx] *= ratio;
          vy[idx] *= ratio;
          // TODO: probably we shouldn't store (px, py) at all, but calculate it when needed.
          px[idx] *= ratio;
          py[idx] *= ratio;
        }

        return true;
      },

      addKEToAtomPairAndConserveMomentum: function(deltaKE, atom1, atom2) {

        // rotate into x-axis to simplify the quadratic equation below and to avoid numerical
        // problems when dx is small

        var dx = x[atom2] - x[atom1];
        var dy = y[atom2] - y[atom1];
        var theta = -Math.atan2(dy, dx);
        var cosTheta = Math.cos(theta);
        var sinTheta = Math.sin(theta);

        var v1x = cosTheta * vx[atom1] - sinTheta * vy[atom1];
        var v2x = cosTheta * vx[atom2] - sinTheta * vy[atom2];
        var v1y = sinTheta * vx[atom1] + cosTheta * vy[atom1];
        var v2y = sinTheta * vx[atom2] + cosTheta * vy[atom2];

        var m1 = mass[atom1];
        var m2 = mass[atom2];

        // use MW units here
        var oldKE = 0.5*m1*(v1x*v1x + v1y*v1y) + 0.5*m2*(v2x*v2x + v2y*v2y);
        var newKE = oldKE + constants.convert(deltaKE, { from: unit.EV, to: unit.MW_ENERGY_UNIT });

        if (newKE < 0) {
          return false;
        }

        // We require m1 * dv1x = -m2 * dv2x (momentum conservation)
        // and m1 * ((v1x + dv1)^2 + v1y^2) + m2 * ((v2x + dv2x)^2 + v2y^2) = 2 * newKE
        // This results in a quadratic equation in dv1x; solve it:
        var a = m1 + m1*m1/m2;
        var b = 2 * m1 * (v1x - v2x);
        var c = 2 * (oldKE - newKE);
        var disc = b*b - 4*a*c;

        if (disc < 0) {
          // Momentum can't be conserved.
          return false;
        }

        // Of the two roots, choose the solution that minimizes the changes to the individual
        // momenta (which are equal and opposite, so we only need to check v1x)
        disc = Math.sqrt(disc);
        var dv1xPlus = (-b + disc) / (2*a);
        var dv1xMinus = (-b - disc) / (2*a);
        var dv1x = Math.abs(dv1xPlus) < Math.abs(dv1xMinus) ? dv1xPlus : dv1xMinus;

        v1x += dv1x;
        v2x += (-m1/m2 * dv1x);

        // reverse sign of rotation
        sinTheta *= -1;

        vx[atom1] = v1x * cosTheta - v1y * sinTheta;
        px[atom1] = m1 * vx[atom1];
        vy[atom1] = v1x * sinTheta + v1y * cosTheta;
        py[atom1] = m1 * vy[atom1];

        vx[atom2] = v2x * cosTheta - v2y * sinTheta;
        px[atom2] = m2 * vx[atom2];
        vy[atom2] = v2x * sinTheta + v2y * cosTheta;
        py[atom2] = m2 * vy[atom2];

        return true;
      },

      /**
        Starting at (x,y), try to find a position which minimizes the potential energy change caused
        by adding at atom of element el.
      */
      findMinimumPELocation: function(el, x, y, charge) {
        var pot    = engine.newPotentialCalculator(el, charge, true),
            radius = elementRadius[el],

            res =  math.minimize(pot, [x, y], {
              bounds: [ [radius, size[0]-radius], [radius, size[1]-radius] ]
            });

        if (res.error) return false;
        return res[1];
      },

      /**
        Starting at (x,y), try to find a position which minimizes the square of the potential energy
        change caused by adding at atom of element el, i.e., find a "farthest from everything"
        position.
      */
      findMinimumPESquaredLocation: function(el, x, y, charge) {
        var pot = engine.newPotentialCalculator(el, charge, true),

            // squared potential energy, with gradient
            potsq = function(x,y) {
              var res, f, grad;

              res = pot(x,y);
              f = res[0];
              grad = res[1];

              // chain rule
              grad[0] *= (2*f);
              grad[1] *= (2*f);

              return [f*f, grad];
            },

            radius = elementRadius[el],

            res = math.minimize(potsq, [x, y], {
              bounds: [ [radius, size[0]-radius], [radius, size[1]-radius] ],
              stopval: 1e-4,
              precision: 1e-6
            });

        if (res.error) return false;
        return res[1];
      },

      /**
        Returns all atoms in the same molecule as atom idx
        (not including idx itself)
      */
      getMoleculeAtoms: function(idx) {
        // Use simple DFS algorithm.
        var result = [];
        var stack = [];
        var visited = {};
        var bondedAtoms, bondedAtom, i, len;

        stack.push(idx);
        visited[idx] = true;
        while (stack.length > 0) {
          bondedAtoms = engine.getBondedAtoms(stack.pop());
          for (i = 0, len = bondedAtoms.length; i < len; i++) {
            bondedAtom = bondedAtoms[i];
            if (!visited[bondedAtom]) {
              visited[bondedAtom] = true;
              stack.push(bondedAtom);
              result.push(bondedAtom);
            }
          }
        }
        return result;
      },

      /**
        Returns all atoms directly bonded to atom idx
      */
      getBondedAtoms: function(idx) {
        return bondedAtoms[idx] || [];
      },

      getCoulombForceAt: function(testX, testY, resultObj) {
        // Let client code reuse objects.
        resultObj = resultObj || {};
        // Fast path if Coulomb interaction is disabled or there are no charged atoms.
        if (!useCoulombInteraction || chargedAtomsList.length === 0) {
          resultObj.fx = resultObj.fy = 0;
          return resultObj;
        }

        var fx = 0, fy = 0,
            i, len, dx, dy, rSq, fOverR, atomCharge, atomIdx, rect, o;

        for (i = 0, len = chargedAtomsList.length; i < len; i++) {
          atomIdx = chargedAtomsList[i];
          atomCharge = charge[atomIdx];

          dx = x[atomIdx] - testX;
          dy = y[atomIdx] - testY;
          rSq = dx * dx + dy * dy;

          fOverR = coulomb.forceOverDistanceFromSquaredDistance(rSq, 1, atomCharge,
            dielectricConst, realisticDielectricEffect);

          fx += fOverR * dx;
          fy += fOverR * dy;
        }

        for (i = 0; i < N_electricFields; i++) {
          rect = electricFieldShapeIdx[i];
          if (rect != null && !rectContains(rect, testX, testY)) continue;
          o = electricFieldOrientation[i];
          if (o === "N" || o === "S") {
            fy += getElFieldForce(i); // * 1 Coulomb (test charge)
          } else {
            fx += getElFieldForce(i); // * 1 Coulomb (test charge)
          }
        }


        resultObj.fx = constants.convert(fx, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
        resultObj.fy = constants.convert(fy, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
        return resultObj;
      },

      /**
        Returns Kinetic Energy of single atom i, in eV.
      */
      getAtomKineticEnergy: function(i) {
        var KEinMWUnits = 0.5 * mass[i] * (vx[i] * vx[i] + vy[i] * vy[i]);
        return constants.convert(KEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
      },

      getAtomNeighbors: function(idx) {
        var res = [],
            list = neighborList.getList(),
            i, len;

        for (i = neighborList.getStartIdxFor(idx), len = neighborList.getEndIdxFor(idx); i < len; i++) {
          res.push(list[i]);
        }
        return res;
      },

      getNeighborList: function () {
        return neighborList;
      },

      setViscosity: function(v) {
        viscosity = v;
      },

      get ljCalculator() {
        return ljCalculator;
      },

      /**
        Indicates whether some radial bonds were added or removed during the last integration step.
        This flag is cleared at the beginning of the integration.
       */
      get radialBondsChanged() {
        return radialBondsChanged;
      },

      /**
       * Returns true when atoms i and j are "radially bonded", false otherwise.
       */
      atomsBonded: function(i, j) {
        return !!(radialBondMatrix && radialBondMatrix[i] && radialBondMatrix[i][j]);
      },

      // ######################################################################
      //                State definition of the engine

      // Return array of objects defining state of the engine.
      // Each object in this list should implement following interface:
      // * .clone()        - returning complete state of that object.
      // * .restore(state) - restoring state of the object, using 'state'
      //                     as input (returned by clone()).
      getState: function() {
        var state = [
          // Use wrapper providing clone-restore interface to save the hashes-of-arrays
          // that represent model state.
          new CloneRestoreWrapper(elements),
          new CloneRestoreWrapper(atoms),
          new CloneRestoreWrapper(obstacles),
          new CloneRestoreWrapper(shapes),
          new CloneRestoreWrapper(lines),
          new CloneRestoreWrapper(radialBonds),
          new CloneRestoreWrapper(angularBonds),
          new CloneRestoreWrapper(restraints),
          new CloneRestoreWrapper(springForces),
          // PairwiseLJProperties class implements Clone-Restore Interface.
          pairwiseLJProperties,

          // Also save toplevel state (time, number of atoms, etc):
          {
            clone: function () {
              return {
                time          : time,
                N             : N,
                N_elements    : N_elements,
                N_obstacles   : N_obstacles,
                N_shapes      : N_shapes,
                N_lines       : N_lines,
                N_radialBonds : N_radialBonds,
                N_angularBonds: N_angularBonds,
                N_restraints  : N_restraints,
                N_springForces: N_springForces
              };
            },
            restore: function(state) {
              time           = state.time;
              N              = state.N;
              N_elements     = state.N_elements;
              N_shapes       = state.N_shapes;
              N_lines        = state.N_lines;
              N_radialBonds  = state.N_radialBonds;
              N_angularBonds = state.N_angularBonds;
              N_restraints   = state.N_restraints;
              N_springForces = state.N_springForces;

              neighborList.invalidate();
              radialBondMatrix.reset();
              bondedAtoms.reset();
              chargedAtomsList.reset();
            }
          }
        ];

        pluginController.callPluginFunction('getState', [], function(pluginState) {
          state = state.concat(pluginState);
        });

        return state;
      },

      // FIXME. Not a sustainable pattern. This is just a temporary pass-through of modeler-level
      // methods that are implemented in the quantumDynamics plugin, because for now the plugin is
      // only callable from the engine.
      callPluginAccessor: function(accessorMethodName, args) {
        var returnValue;
            args = args || [];
        pluginController.callPluginFunction(accessorMethodName, args, function(_) {
          returnValue = _;
        });
        return returnValue;
      }
    };



    // Initialization
    initialize();

    // Export initialized objects to Public API.
    // To ensure that client code always has access to these public properties,
    // they should be initialized  only once during the engine lifetime (in the initialize method).
    engine.pairwiseLJProperties = pairwiseLJProperties;

    // Finally, return Public API.
    return engine;
  };
});
