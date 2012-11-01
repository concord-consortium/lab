/*global define: true */
/*jslint eqnull: true, boss: true, loopfunc: true*/

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

  var console      = require('common/console'),
      arrays       = require('arrays'),
      constants    = require('./constants/index'),
      unit         = constants.unit,
      math         = require('./math/index'),
      coulomb      = require('./potentials/index').coulomb,
      lennardJones = require('./potentials/index').lennardJones,
      CellList     = require('./cell-list').cellList,
      NeighborList = require('./neighbor-list').neighborList,

      // Check for Safari. Typed arrays are faster almost everywhere ... except Safari.
      notSafari = (function() {
        var safarimatch  = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
            match = navigator.userAgent.match(safarimatch);
        return !match || !match[3];
      }()),

      float32 = (arrays.typed && notSafari) ? 'Float32Array' : 'regular',
      uint16  = (arrays.typed && notSafari) ? 'Uint16Array'  : 'regular',
      uint8   = (arrays.typed && notSafari) ? 'Uint8Array'   : 'regular',

      // make at least 1 atom
      N_MIN = 1,

      // make no more than this many atoms:
      N_MAX = 1000,

      // from A. Rahman "Correlations in the Motion of Atoms in Liquid Argon", Physical Review 136 pp. A405–A411 (1964)
      ARGON_LJ_EPSILON_IN_EV = -120 * constants.BOLTZMANN_CONSTANT.as(unit.EV_PER_KELVIN),
      ARGON_LJ_SIGMA_IN_NM   = 0.34,

      ARGON_MASS_IN_DALTON = 39.95,
      ARGON_MASS_IN_KG = constants.convert(ARGON_MASS_IN_DALTON, { from: unit.DALTON, to: unit.KILOGRAM }),

      BOLTZMANN_CONSTANT_IN_JOULES = constants.BOLTZMANN_CONSTANT.as( unit.JOULES_PER_KELVIN ),

      DEFAULT_VALUES,

      ATOM_PROPERTY_LIST,

      ELEMENT_PROPERTY_LIST,

      RADIAL_BOND_PROPERTY_LIST,

      ANGULAR_BOND_PROPERTY_LIST,

      VDW_INDICES,

      RADIAL_BOND_STYLES,

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
      KE_to_T = function(totalKEinMWUnits, N) {
        // In 2 dimensions, kT = (2/N_df) * KE

        var N_df = 2 * N,
            averageKEinMWUnits = (2 / N_df) * totalKEinMWUnits,
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
      T_to_KE = function(T, N) {
        var N_df = 2 * N,
            averageKEinJoules  = T * BOLTZMANN_CONSTANT_IN_JOULES,
            averageKEinMWUnits = constants.convert(averageKEinJoules, { from: unit.JOULE, to: unit.MW_ENERGY_UNIT }),
            totalKEinMWUnits = averageKEinMWUnits * N_df / 2;

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

  // Atoms
  exports.ATOM_PROPERTY_LIST = ATOM_PROPERTY_LIST = [
    "radius",
    "px",
    "py",
    "x",
    "y",
    "vx",
    "vy",
    "speed",
    "ax",
    "ay",
    "charge",
    "element",
    "pinned",
    "friction",
    "mass"
  ];

  // Radial Bonds
  exports.RADIAL_BOND_PROPERTY_LIST = RADIAL_BOND_PROPERTY_LIST = [
    "atom1",
    "atom2",
    "length",
    "strength",
    "style"
  ];

  // Angular Bonds
  exports.ANGULAR_BOND_PROPERTY_LIST = ANGULAR_BOND_PROPERTY_LIST = [
    "atom1",
    "atom2",
    "atom3",
    "angle",
    "strength"
  ];

  exports.RADIAL_BOND_STYLES = RADIAL_BOND_STYLES = {
    RADIAL_BOND_STANDARD_STICK_STYLE : 101,
    RADIAL_BOND_LONG_SPRING_STYLE    : 102,
    RADIAL_BOND_SOLID_LINE_STYLE     : 103,
    RADIAL_BOND_GHOST_STYLE          : 104,
    RADIAL_BOND_UNICOLOR_STICK_STYLE : 105,
    RADIAL_BOND_SHORT_SPRING_STYLE   : 106,
    RADIAL_BOND_DOUBLE_BOND_STYLE    : 107,
    RADIAL_BOND_TRIPLE_BOND_STYLE    : 108
  };

  // Elements
  exports.ELEMENT_PROPERTY_LIST = ELEMENT_PROPERTY_LIST = [
    "mass",
    "epsilon",
    "sigma",
    "radius"
  ];

  // Obstacles
  exports.OBSTACLE_PROPERTY_LIST = [
    "x",
    "y",
    "width",
    "height",
    "mass",
    "vx",
    "vy",
    "externalFx", // External horizontal force, per mass unit.
    "externalFy", // External vertical force, per mass unit.
    "friction",   // Damping force, per mass unit.
    "westProbe",  // Pressure probe, west side.
    "northProbe", // Pressure probe, north side.
    "eastProbe",  // Pressure probe, east side.
    "southProbe", // Pressure probe, south side.
    "xPrev",      // [Internal property used in calculations!]
    "yPrev",      // [Internal property used in calculations!]
    "colorR",
    "colorG",
    "colorB",
    "visible"
  ];

  // VDW pairs
  exports.VDW_INDICES = VDW_INDICES = {
    COUNT : 0,
    ATOM1 : 1,
    ATOM2 : 2
  };

  exports.DEFAULT_VALUES = DEFAULT_VALUES = {
    charge            : 0,
    friction          : 0,
    pinned            : 0,
    RADIAL_BOND_STYLE : RADIAL_BOND_STYLES.RADIAL_BOND_STANDARD_STICK_STYLE
  };

  exports.createEngine = function() {

    var // the object to be returned
        engine,

        // Whether system dimensions have been set. This is only allowed to happen once.
        sizeHasBeenInitialized = false,

        // Whether "atoms" (particles) have been created & initialized. This is only allowed to happen once.
        atomsHaveBeenCreated = false,

        // Whether "elements" (properties for groups of particles) have been created & initialized. This is only allowed to happen once.
        elementsHaveBeenCreated = false,

        // Whether to simulate Coulomb forces between particles.
        useCoulombInteraction = false,

        // Whether any atoms actually have charges
        hasChargedAtoms = false,

        // List of atoms with charge (optimization)
        chargedAtomsList = [],

        // Whether to simulate Lennard Jones forces between particles.
        useLennardJonesInteraction = true,

        // Whether to use the thermostat to maintain the system temperature near T_target.
        useThermostat = false,

        // If a numeric value include gravitational field in force calculations,
        // otherwise value should be false
        gravitationalField = false,

        // Whether a transient temperature change is in progress.
        temperatureChangeInProgress = false,

        // Desired system temperature, in Kelvin.
        T_target,

        // Tolerance for (T_actual - T_target) relative to T_target
        tempTolerance = 0.001,

        // System dimensions as [x, y] in nanometers. Default value can be changed until particles are created.
        size = [10, 10],

        // Viscosity of the medium of the model
        viscosity,

        // The current model time, in femtoseconds.
        time = 0,

        // The current integration time step, in femtoseconds.
        dt,

        // Square of integration time step, in fs^2.
        dt_sq,

        // The number of atoms in the system.
        N,

        // Total mass of all particles in the system, in Dalton (atomic mass units).
        totalMass,

        // ####################################################################
        //                      Atom Properties

        // Individual property arrays for the atoms, indexed by atom number
        radius, px, py, x, y, vx, vy, speed, ax, ay, charge, element, friction, pinned, mass,

        // An object that contains references to the above atom-property arrays
        atoms,

        // ####################################################################
        //                      Element Properties

        // Individual property arrays for the elements
        elementMass,
        elementEpsilon,
        elementSigma,
        elementRadius,

        // An object that contains references to the above element-property arrays
        elements,

        // Number of actual elements (may be smaller than the length of the property arrays).
        N_elements = 0,

        // Additional structure, keeping information if given element is represented by
        // some atom in the model. Necessary for effective max cut-off distance calculation.
        elementUsed = [],

        // ####################################################################
        //                      Radial Bond Properties

        // Individual property arrays for the "radial" bonds, indexed by bond number
        radialBondAtom1Index,
        radialBondAtom2Index,
        radialBondLength,
        radialBondStrength,
        radialBondStyle,

        // An object that contains references to the above radial-bond-property arrays.
        // Left undefined if there are no radial bonds.
        radialBonds,

        // An array of individual radial bond index values and properties.
        // Each object contains all radial bond properties (atom1, atom2, length, strength, style)
        // and additionally (x,y) coordinates of bonded atoms defined as x1, y1, x2, y2 properties.
        radialBondResults,

        // radialBondMatrix[i][j] === true when atoms i and j are "radially bonded"
        // radialBondMatrix[i][j] === undefined otherwise
        radialBondMatrix,

        // Number of actual radial bonds (may be smaller than the length of the property arrays).
        N_radialBonds = 0,

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
        obstacleExtFX,
        obstacleExtFY,
        obstacleFriction,
        obstacleMass,
        obstacleWestProbe,
        obstacleNorthProbe,
        obstacleEastProbe,
        obstacleSouthProbe,
        obstacleColorR,
        obstacleColorG,
        obstacleColorB,
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

        // Special structure containing buffers with last PRESSURE_BUFFERS_LEN values
        // used for pressure calculations.
        // Call initializePressureBuffers() when obstacles are created to initialize
        // this structure. Each time a new obstacle is added, this function should
        // also be called!
        pressureBuffers = {},
        PRESSURE_BUFFERS_LEN = 50,
        // #####

        // An object that contains references to the above obstacle-property arrays.
        // Left undefined if there are no obstacles.
        obstacles,

        // Number of actual obstacles
        N_obstacles = 0,

        // ####################################################################
        //                      Misc Properties
        // Array of arrays containing VdW pairs
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

        // The following are the pairwise values for elements i and j, indexed
        // like [i][j]
        epsilon = [],
        sigma = [],

        // cutoff for force calculations, as a factor of sigma
        cutoff = 2,
        cutoffDistance_LJ_sq = [],

        // cutoff for neighbor list calculations, as a factor of sigma
        cutoffList = 2.5,
        cutoffNeighborListSquared = [],

        // Each object at ljCalculator[i,j] can calculate the magnitude of the Lennard-Jones force and
        // potential between elements i and j
        ljCalculator = [],

        // Throws an informative error if a developer tries to use the setCoefficients method of an
        // in-use LJ calculator. (Hint: for an interactive LJ chart, create a new LJ calculator with
        // the desired coefficients; call setElementProperties to change the LJ properties in use.)
        ljCoefficientChangeError = function() {
          throw new Error("md2d: Don't change the epsilon or sigma parameters of the LJ calculator being used by MD2D. Use the setElementProperties method instead.");
        },

        // Initialize epsilon, sigma, cutoffDistance_LJ_sq, cutoffNeighborListSquared, and ljCalculator
        // array elements for element pair i and j
        setPairwiseLJProperties = function(i, j) {
          var epsilon_i = elementEpsilon[i],
              epsilon_j = elementEpsilon[j],
              sigma_i   = elementSigma[i],
              sigma_j   = elementSigma[j],
              e,
              s;

          e = epsilon[i][j] = epsilon[j][i] = lennardJones.pairwiseEpsilon(epsilon_i, epsilon_j);
          s = sigma[i][j]   = sigma[j][i]   = lennardJones.pairwiseSigma(sigma_i, sigma_j);

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
              sigmaI,
              sigmaJ,
              sigma,
              i, j;

          for (i = 0; i < N_elements; i++) {
            for (j = 0; j <= i; j++) {
              if (elementUsed[i] && elementUsed[j]) {
                sigmaI = elementSigma[i];
                sigmaJ = elementSigma[j];
                sigma = lennardJones.pairwiseSigma(sigmaI, sigmaJ);

                // Use cutoffList, as cell lists are used to calculate neighbor lists.
                if (cutoffList * sigma > maxCutoff) {
                  maxCutoff = cutoffList * sigma;
                }
              }
            }
          }
          return maxCutoff;
        },

        // Returns a minimal difference between "real" cutoff
        // and cutoff used in neighbor list. This can be considered
        // as a minimal displacement of atom, which triggers neighbor
        // list recalculation (or maximal allowed displacement to avoid
        // recalculation).
        computeNeighborListMaxDisplacement = function() {
          var maxDisplacement = Infinity,
              sigmaI,
              sigmaJ,
              sigma,
              i, j;

          for (i = 0; i < N_elements; i++) {
            for (j = 0; j <= i; j++) {
              if (elementUsed[i] && elementUsed[j]) {
                sigmaI = elementSigma[i];
                sigmaJ = elementSigma[j];
                sigma = lennardJones.pairwiseSigma(sigmaI, sigmaJ);

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
            cellList = CellList(size[0], size[1], computeMaxCutoff());
          } else {
            cellList.reinitialize(computeMaxCutoff());
          }
        },

        // Initializes special structure for short-range forces calculation
        // optimization. Neighbor list cooperates with cell list.
        initializeNeighborList = function () {
          if (neighborList === undefined) {
            neighborList = NeighborList(N, computeNeighborListMaxDisplacement());
          } else {
            neighborList.reinitialize(N, computeNeighborListMaxDisplacement());
          }
        },

        /**
          Extend all arrays in arrayContainer to `newLength`. Here, arrayContainer is expected to be `atoms`
          `elements`, `radialBonds`, etc. arrayContainer might be an array or an object.
          TODO: this is just interim solution, in the future only objects will be expected.
        */
        extendArrays = function(arrayContainer, newLength) {
          var i, len;
          if (Array.isArray(arrayContainer)) {
            // Array of arrays.
            for (i = 0, len = arrayContainer.length; i < len; i++) {
              arrayContainer[i] = arrays.extend(arrayContainer[i], newLength);
            }
          } else {
            // Object with arrays defined as properties.
            for (i in arrayContainer) {
              if(arrayContainer.hasOwnProperty(i)) {
                arrayContainer[i] = arrays.extend(arrayContainer[i], newLength);
              }
            }
          }
        },

        /**
          Set up "shortcut" references, e.g., x = atoms.x
        */
        assignShortcutReferences = {

          atoms: function() {
            radius   = atoms.radius;
            px       = atoms.px;
            py       = atoms.py;
            x        = atoms.x;
            y        = atoms.y;
            vx       = atoms.vx;
            vy       = atoms.vy;
            speed    = atoms.speed;
            ax       = atoms.ax;
            ay       = atoms.ay;
            charge   = atoms.charge;
            friction = atoms.friction;
            element  = atoms.element;
            pinned   = atoms.pinned;
            mass     = atoms.mass;
          },

          radialBonds: function() {
            radialBondAtom1Index  = radialBonds.atom1;
            radialBondAtom2Index  = radialBonds.atom2;
            radialBondLength      = radialBonds.length;
            radialBondStrength    = radialBonds.strength;
            radialBondStyle       = radialBonds.style;
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
          },

          obstacles: function() {
            obstacleX           = obstacles.x;
            obstacleY           = obstacles.y;
            obstacleWidth       = obstacles.width;
            obstacleHeight      = obstacles.height;
            obstacleMass        = obstacles.mass;
            obstacleVX          = obstacles.vx;
            obstacleVY          = obstacles.vy;
            obstacleExtFX       = obstacles.externalFx;
            obstacleExtFY       = obstacles.externalFy;
            obstacleFriction    = obstacles.friction;
            obstacleWestProbe   = obstacles.westProbe;
            obstacleNorthProbe  = obstacles.northProbe;
            obstacleEastProbe   = obstacles.eastProbe;
            obstacleSouthProbe  = obstacles.southProbe;
            obstacleWProbeValue = obstacles.wProbeValue;
            obstacleNProbeValue = obstacles.nProbeValue;
            obstacleEProbeValue = obstacles.eProbeValue;
            obstacleSProbeValue = obstacles.sProbeValue;
            obstacleXPrev       = obstacles.xPrev;
            obstacleYPrev       = obstacles.yPrev;
            obstacleColorR      = obstacles.colorR;
            obstacleColorG      = obstacles.colorG;
            obstacleColorB      = obstacles.colorB;
            obstacleVisible     = obstacles.visible;
          },

          springForces: function() {
            springForceAtomIndex = springForces[0];
            springForceX         = springForces[1];
            springForceY         = springForces[2];
            springForceStrength  = springForces[3];
          }

        },

        createElementsArray = function(num) {
          elements = engine.elements = {};

          elements.mass    = arrays.create(num, 0, float32);
          elements.epsilon = arrays.create(num, 0, float32);
          elements.sigma   = arrays.create(num, 0, float32);
          elements.radius  = arrays.create(num, 0, float32);

          assignShortcutReferences.elements();
        },

        createRadialBondsArray = function(num) {
          var i;

          radialBonds = engine.radialBonds = {};

          radialBonds.atom1    = arrays.create(num, 0, uint16);
          radialBonds.atom2    = arrays.create(num, 0, uint16);
          radialBonds.length   = arrays.create(num, 0, float32);
          radialBonds.strength = arrays.create(num, 0, float32);
          radialBonds.style    = arrays.create(num, 0, uint8);

          assignShortcutReferences.radialBonds();

          //  Initialize radialBondResults[] array consisting of hashes of radial bond
          //  index numbers and transposed radial bond properties.
          radialBondResults = engine.radialBondResults = [];
          for (i = 0; i < num; i++) {
            radialBondResults[i] = {};
            radialBondResults[i].idx = i;
          }
        },

        createRestraintsArray = function(num) {
          restraints = engine.restraints = {};

          restraints.atomIndex = arrays.create(num, 0, uint16);
          restraints.k         = arrays.create(num, 0, float32);
          restraints.x0        = arrays.create(num, 0, float32);
          restraints.y0        = arrays.create(num, 0, float32);

          assignShortcutReferences.restraints();
        },

        createAngularBondsArray = function(num) {
          angularBonds = engine.angularBonds = {};

          angularBonds.atom1    = arrays.create(num, 0, uint16);
          angularBonds.atom2    = arrays.create(num, 0, uint16);
          angularBonds.atom3    = arrays.create(num, 0, uint16);
          angularBonds.angle    = arrays.create(num, 0, float32);
          angularBonds.strength = arrays.create(num, 0, float32);

          assignShortcutReferences.angularBonds();
        },

        createSpringForcesArray = function(num) {
          springForces = engine.springForces = [];

          springForces[0] = arrays.create(num, 0, uint16);
          springForces[1] = arrays.create(num, 0, float32);
          springForces[2] = arrays.create(num, 0, float32);
          springForces[3] = arrays.create(num, 0, float32);

          assignShortcutReferences.springForces();
        },

        createObstaclesArray = function(num) {
          obstacles = engine.obstacles = {};

          obstacles.x           = arrays.create(num, 0, float32);
          obstacles.y           = arrays.create(num, 0, float32);
          obstacles.width       = arrays.create(num, 0, float32);
          obstacles.height      = arrays.create(num, 0, float32);
          obstacles.mass        = arrays.create(num, 0, float32);
          obstacles.vx          = arrays.create(num, 0, float32);
          obstacles.vy          = arrays.create(num, 0, float32);
          obstacles.externalFx  = arrays.create(num, 0, float32);
          obstacles.externalFy  = arrays.create(num, 0, float32);
          obstacles.friction    = arrays.create(num, 0, float32);
          obstacles.westProbe   = arrays.create(num, 0, uint8);
          obstacles.northProbe  = arrays.create(num, 0, uint8);
          obstacles.eastProbe   = arrays.create(num, 0, uint8);
          obstacles.southProbe  = arrays.create(num, 0, uint8);
          obstacles.wProbeValue = arrays.create(num, 0, float32);
          obstacles.nProbeValue = arrays.create(num, 0, float32);
          obstacles.eProbeValue = arrays.create(num, 0, float32);
          obstacles.sProbeValue = arrays.create(num, 0, float32);
          obstacles.xPrev       = arrays.create(num, 0, float32);
          obstacles.yPrev       = arrays.create(num, 0, float32);
          obstacles.colorR      = arrays.create(num, 0, float32);
          obstacles.colorG      = arrays.create(num, 0, float32);
          obstacles.colorB      = arrays.create(num, 0, float32);
          obstacles.visible     = arrays.create(num, 0, uint8);

          assignShortcutReferences.obstacles();
        },

        // Function initializes special structure for keeping pressure probes data.
        // Arrays store historical data used during interpolation. This function
        // doesn't expect any arguments - it always validates all buffers and create
        // new if it's necessary (e.g. when obstacle was added).
        // To read final, interpolated pressure value in Bar, call this function:
        // getPressureFromProbe(i, name)
        // where 'obstacleIdx' is an index of obstacle containing this probe
        // and 'probeName' is: 'west', 'north', 'east', 'south'.
        initializePressureBuffers = function() {
          var i;
          for (i = 0; i < N_obstacles; i++) {
            if (obstacleWestProbe[i]) {
              pressureBuffers[i] = pressureBuffers[i] || {};
              pressureBuffers[i].west = pressureBuffers[i].west || arrays.create(PRESSURE_BUFFERS_LEN, 0, float32);
              pressureBuffers[i].westIdx = pressureBuffers[i].westIdx || 0;
            }
            if (obstacleNorthProbe[i]) {
              pressureBuffers[i] = pressureBuffers[i] || {};
              pressureBuffers[i].north = pressureBuffers[i].north || arrays.create(PRESSURE_BUFFERS_LEN, 0, float32);
              pressureBuffers[i].northIdx = pressureBuffers[i].northIdx || 0;
            }
            if (obstacleEastProbe[i]) {
              pressureBuffers[i] = pressureBuffers[i] || {};
              pressureBuffers[i].east = pressureBuffers[i].east || arrays.create(PRESSURE_BUFFERS_LEN, 0, float32);
              pressureBuffers[i].eastIdx = pressureBuffers[i].eastIdx || 0;
            }
            if (obstacleSouthProbe[i]) {
              pressureBuffers[i] = pressureBuffers[i] || {};
              pressureBuffers[i].south = pressureBuffers[i].south || arrays.create(PRESSURE_BUFFERS_LEN, 0, float32);
              pressureBuffers[i].southIdx = pressureBuffers[i].southIdx || 0;
            }
          }
        },

        // Returns final, interpolated pressure value in Bar.
        // 'obstacleIdx' is an index of obstacle containing desired probe,
        // 'probeName' is: 'west', 'north', 'east', 'south'.
        getPressureFromProbe = function (obstacleIdx, probeName) {
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
          var dim;
          if (probeName === 'west' || probeName === 'east')
            dim = obstacleHeight[obstacleIdx];
          else
            dim = obstacleWidth[obstacleIdx];

          return arrays.average(pressureBuffers[obstacleIdx][probeName]) *
            13888.89 / dim;
        },

        // Function that accepts a value T and returns an average of the last n values of T (for some n).
        T_windowed,

        // Dynamically determine an appropriate window size for use when measuring a windowed average of the temperature.
        getWindowSize = function() {
          return useCoulombInteraction && hasChargedAtoms ? 1000 : 1000;
        },

        // Whether or not the thermostat is not being used, begins transiently adjusting the system temperature; this
        // causes the adjustTemperature portion of the integration loop to rescale velocities until a windowed average of
        // the temperature comes within `tempTolerance` of `T_target`.
        beginTransientTemperatureChange = function()  {
          temperatureChangeInProgress = true;
          T_windowed = math.getWindowedAverager( getWindowSize() );
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

          return KE_to_T( twoKE/2, N );
        },

        // Scales the velocity vector of particle i by `factor`.
        scaleParticleVelocity = function(i, factor) {
          vx[i] *= factor;
          vy[i] *= factor;

          // scale momentum too
          px[i] *= factor;
          py[i] *= factor;
        },

        // Scales the velocity vector of obstacle i by `factor`.
        scaleObstacleVelocity = function(i, factor) {
          obstacleVX[i] *= factor;
          obstacleVY[i] *= factor;
          // Obstacles don't store momentum, nothing else to update.
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

        // Calculate x(t+dt, i) from v(t) and a(t)
        updatePosition = function(i) {
          x[i] += vx[i]*dt + 0.5*ax[i]*dt_sq;
          y[i] += vy[i]*dt + 0.5*ay[i]*dt_sq;
        },

        updateObstaclePosition = function(i) {
          // Fast path when obstacle isn't movable.
          if (obstacleMass[i] === Infinity) return;

          var ax, ay, drag,
              vx = obstacleVX[i],
              vy = obstacleVY[i],
              // External forces are defined per mass unit!
              // So, they are accelerations in fact.
              extFx = obstacleExtFX[i],
              extFy = obstacleExtFY[i];

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
          }
        },

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
        bounceAtomOffWalls = function(i) {
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

        bounceOffObstacles = function(i, x_prev, y_prev, updatePressure) {
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

        // Update special pressure buffers.
        updatePressureProbesBuffers = function(duration) {
          var i;
          for (i = 0; i < N_obstacles; i++) {
            if (obstacleWestProbe[i]) {
              pressureBuffers[i].west[pressureBuffers[i].westIdx++] = obstacleWProbeValue[i] / duration;
              obstacleWProbeValue[i] = 0;
              if (pressureBuffers[i].westIdx > PRESSURE_BUFFERS_LEN) {
                pressureBuffers[i].westIdx = 0;
              }
            }
            if (obstacleNorthProbe[i]) {
              pressureBuffers[i].north[pressureBuffers[i].northIdx++] = obstacleNProbeValue[i] / duration;
              obstacleNProbeValue[i] = 0;
              if (pressureBuffers[i].northIdx > PRESSURE_BUFFERS_LEN) {
                pressureBuffers[i].northIdx = 0;
              }
            }
            if (obstacleEastProbe[i]) {
              pressureBuffers[i].east[pressureBuffers[i].eastIdx++] = obstacleEProbeValue[i] / duration;
              obstacleEProbeValue[i] = 0;
              if (pressureBuffers[i].eastIdx > PRESSURE_BUFFERS_LEN) {
                pressureBuffers[i].eastIdx = 0;
              }
            }
            if (obstacleSouthProbe[i]) {
              pressureBuffers[i].south[pressureBuffers[i].southIdx++] = obstacleSProbeValue[i] / duration;
              obstacleSProbeValue[i] = 0;
              if (pressureBuffers[i].southIdx > PRESSURE_BUFFERS_LEN) {
                pressureBuffers[i].southIdx = 0;
              }
            }
          }
        },

        // Half of the update of v(t+dt, i) and p(t+dt, i) using a; during a single integration loop,
        // call once when a = a(t) and once when a = a(t+dt)
        halfUpdateVelocity = function(i) {
          var m = mass[i];
          vx[i] += 0.5*ax[i]*dt;
          px[i] = m * vx[i];
          vy[i] += 0.5*ay[i]*dt;
          py[i] = m * vy[i];
        },

        // Removes velocity and acceleration from atom i
        pinAtom = function(i) {
          vx[i] = vy[i] = ax[i] = ay[i] = 0;
        },

        // Calculate distance and force (if distance < cut-off distance).
        calculateLJInteraction = function(i, j) {
          // Fast path.
          if (radialBondMatrix && radialBondMatrix[i] && radialBondMatrix[i][j]) return;

          var elI = element[i],
              elJ = element[j],
              dx  = x[j] - x[i],
              dy  = y[j] - y[i],
              rSq = dx * dx + dy * dy,
              fOverR, fx, fy;

          if (updateNeighborList && rSq < cutoffNeighborListSquared[elI][elJ]) {
            neighborList.markNeighbors(i, j);
          }

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
          if (!useCoulombInteraction || !hasChargedAtoms) return;

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

              fOverR = coulomb.forceOverDistanceFromSquaredDistance(rSq, charge1, charge[atom2Idx]);

              fx = fOverR * dx;
              fy = fOverR * dy;
              ax[atom1Idx] += fx;
              ay[atom1Idx] += fy;
              ax[atom2Idx] -= fx;
              ay[atom2Idx] -= fy;
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

          var i,
              len,
              i1,
              i2,
              dx,
              dy,
              r_sq,
              r,
              k,
              r0,
              f_over_r,
              fx,
              fy;

          for (i = 0, len = radialBondAtom1Index.length; i < len; i++) {
            i1 = radialBondAtom1Index[i];
            i2 = radialBondAtom2Index[i];

            dx = x[i2] - x[i1];
            dy = y[i2] - y[i1];
            r_sq = dx*dx + dy*dy;
            r = Math.sqrt(r_sq);

            // eV/nm^2
            k = radialBondStrength[i];

            // nm
            r0 = radialBondLength[i];

            // "natural" Next Gen MW force units / nm
            f_over_r = constants.convert(k*(r-r0), { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / r;

            fx = f_over_r * dx;
            fy = f_over_r * dy;

            ax[i1] += fx;
            ay[i1] += fy;
            ax[i2] -= fx;
            ay[i2] -= fy;
          }
        },

        updateAngularBondForces = function() {
          // Fast path if no angular bonds have been defined.
          if (N_angularBonds < 1) return;

          var i, len,
              i1, i2, i3,
              dxij, dyij, dxkj, dykj, rijSquared, rkjSquared, rij, rkj,
              k, angle, theta, cosTheta, sinTheta,
              forceInXForI, forceInYForI, forceInXForK, forceInYForK,
              commonPrefactor, temp;

          for (i = 0, len = angularBonds.atom1.length; i < len; i++) {
            i1 = angularBondAtom1Index[i];
            i2 = angularBondAtom2Index[i];
            i3 = angularBondAtom3Index[i];

            // radian
            angle = angularBondAngle[i];

            // eV/radian^2
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

        // Accumulate acceleration into a(t+dt, i) and a(t+dt, j) for all possible interactions, fields
        // and forces connected with atoms. Note that data from the previous time step should be cleared
        // from arrays ax and ay before calling this function!
        updateParticlesAccelerations = function () {
          var i, inverseMass;

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

          // Accumulate forces into a(t+dt, i) and a(t+dt, j) for all pairwise interactions between
          // particles:
          // Short-range forces (Lennard-Jones interaction).
          console.time('short-range forces');
          updateShortRangeForces();
          console.timeEnd('short-range forces');
          // Long-range forces (Coulomb interaction).
          console.time('long-range forces');
          updateLongRangeForces();
          console.timeEnd('long-range forces');

          // Accumulate forces from radially bonded interactions into a(t+dt).
          updateRadialBondForces();

          // Accumulate forces from angularly bonded interactions into a(t+dt).
          updateAngularBondForces();

          // Accumulate forces from restraint forces into a(t+dt).
          updateRestraintForces();

          // Accumulate forces from spring forces into a(t+dt).
          updateSpringForces();

          // Accumulate drag forces into a(t+dt).
          updateFrictionForces();

          // Convert ax, ay from forces to accelerations!
          for (i = 0; i < N; i++) {
            inverseMass = 1/mass[i];
            ax[i] *= inverseMass;
            ay[i] *= inverseMass;
          }

          // ############################################
          // ax and ay are ACCELERATIONS below this point
          // ############################################

          // Accumulate optional gravitational accelerations into a(t+dt).
          updateGravitationalAccelerations();

          for (i = 0; i < N; i++) {
            // Clearing the acceleration here from pinned atoms will cause the acceleration
            // to be zero for both halfUpdateVelocity methods and updatePosition, freezing the atom.
            if (pinned[i]) pinAtom(i);
          }
        },

        adjustTemperature = function(target, forceAdjustment) {
          var rescalingFactor,
              i;

          if (target == null) target = T_target;

          T = computeTemperature();

          if (temperatureChangeInProgress && Math.abs(T_windowed(T) - target) <= target * tempTolerance) {
            temperatureChangeInProgress = false;
          }

          if (forceAdjustment || useThermostat || temperatureChangeInProgress && T > 0) {
            rescalingFactor = Math.sqrt(target / T);
            // Scale particles velocity.
            for (i = 0; i < N; i++) {
              scaleParticleVelocity(i, rescalingFactor);
            }
            // Scale obstacles velocity.
            for (i = 0; i < N_obstacles; i++) {
              scaleObstacleVelocity(i, rescalingFactor);
            }
            T = target;
          }
        };


    return engine = {

      useCoulombInteraction: function(v) {
        useCoulombInteraction = !!v;
      },

      useLennardJonesInteraction: function(v) {
        useLennardJonesInteraction = !!v;
      },

      useThermostat: function(v) {
        useThermostat = !!v;
      },

      setGravitationalField: function(gf) {
        if (typeof gf === "number" && gf !== 0) {
          gravitationalField = gf;
        } else {
          gravitationalField = false;
        }
      },

      setTargetTemperature: function(v) {
        validateTemperature(v);
        T_target = v;
      },

      // Our timekeeping is really a convenience for users of this lib, so let them reset time at will
      setTime: function(t) {
        time = t;
      },

      setSize: function(v) {
        // NB. We may want to create a simple state diagram for the md engine (as well as for the 'modeler' defined in
        // lab.molecules.js)
        if (sizeHasBeenInitialized) {
          throw new Error("The molecular model's size has already been set, and cannot be reset.");
        }
        var width  = (v[0] && v[0] > 0) ? v[0] : 10,
            height = (v[1] && v[1] > 0) ? v[1] : 10;
        size = [width, height];
      },

      getSize: function() {
        return [size[0], size[1]];
      },

      getLJCalculator: function() {
        return ljCalculator;
      },

      setRadialBondProperties: function(i, props) {
        var key;
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            radialBonds[key][i] = props[key];
            radialBondResults[i][key] = props[key];
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

        for (j = 0; j < N_elements; j++) {
          setPairwiseLJProperties(i, j);
        }
      },

      /**
        Allocates 'atoms' array of arrays, sets number of atoms.

        options:
          num: the number of atoms to create
      */
      createAtoms: function(options) {
        var num;

        if (!elementsHaveBeenCreated) {
          throw new Error("md2d: createAtoms was called before setElements.");
        }

        if (atomsHaveBeenCreated) {
          throw new Error("md2d: createAtoms was called even though the particles have already been created for this model instance.");
        }
        atomsHaveBeenCreated = true;
        sizeHasBeenInitialized = true;

        if (typeof options === 'undefined') {
          throw new Error("md2d: createAtoms was called without options specifying the atoms to create.");
        }

        //  number of atoms
        num = options.num;

        if (typeof num === 'undefined') {
          throw new Error("md2d: createAtoms was called without the required 'num' option specifying the number of atoms to create.");
        }
        if (num !== Math.floor(num)) {
          throw new Error("md2d: createAtoms was passed a non-integral 'num' option.");
        }
        if (num < N_MIN) {
          throw new Error("md2d: create Atoms was passed an 'num' option equal to: " + num + " which is less than the minimum allowable value: N_MIN = " + N_MIN + ".");
        }
        if (num > N_MAX) {
          throw new Error("md2d: create Atoms was passed an 'N' option equal to: " + num + " which is greater than the minimum allowable value: N_MAX = " + N_MAX + ".");
        }

        atoms  = engine.atoms  = {};

        // TODO. DRY this up by letting the property list say what type each array is
        atoms.radius   = arrays.create(num, 0, float32);
        atoms.px       = arrays.create(num, 0, float32);
        atoms.py       = arrays.create(num, 0, float32);
        atoms.x        = arrays.create(num, 0, float32);
        atoms.y        = arrays.create(num, 0, float32);
        atoms.vx       = arrays.create(num, 0, float32);
        atoms.vy       = arrays.create(num, 0, float32);
        atoms.speed    = arrays.create(num, 0, float32);
        atoms.ax       = arrays.create(num, 0, float32);
        atoms.ay       = arrays.create(num, 0, float32);
        atoms.charge   = arrays.create(num, 0, float32);
        atoms.friction = arrays.create(num, 0, float32);
        atoms.element  = arrays.create(num, 0, uint8);
        atoms.pinned   = arrays.create(num, 0, uint8);
        atoms.mass     = arrays.create(num, 0, float32);

        assignShortcutReferences.atoms();

        N = 0;
        totalMass = 0;
      },

      /**
        The canonical method for adding an atom to the collections of atoms.

        If there isn't enough room in the 'atoms' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more atoms.

        @returns the index of the new atom
      */
      addAtom: function(atom_element, atom_x, atom_y, atom_vx, atom_vy, atom_charge, atom_friction, atom_pinned) {
        var atom_mass;

        if (N + 1 > atoms.x.length) {
          extendArrays(atoms, N + 10);
          assignShortcutReferences.atoms();
        }

        // Allow these values to be optional, and use the default if not defined:

        if (atom_charge == null)   atom_charge   = DEFAULT_VALUES.charge;
        if (atom_friction == null) atom_friction = DEFAULT_VALUES.friction;
        if (atom_pinned == null )  atom_pinned   = DEFAULT_VALUES.pinned;

        atom_mass = elementMass[atom_element];

        element[N]   = atom_element;
        radius[N]    = elementRadius[atom_element];
        x[N]         = atom_x;
        y[N]         = atom_y;
        vx[N]        = atom_vx;
        vy[N]        = atom_vy;
        px[N]        = atom_vx * atom_mass;
        py[N]        = atom_vy * atom_mass;
        ax[N]        = 0;
        ay[N]        = 0;
        speed[N]     = Math.sqrt(atom_vx*atom_vx + atom_vy*atom_vy);
        charge[N]    = atom_charge;
        friction[N]  = atom_friction;
        pinned[N]    = atom_pinned;
        mass[N]      = atom_mass;

        if (atom_charge) {
          hasChargedAtoms = true;
          // Save indexes of charged atoms.
          chargedAtomsList.push(N);
        }

        totalMass += atom_mass;

        elementUsed[atom_element] = true;

        // Increase number of atoms.
        N++;

        // Initialize helper structures for
        // optimizations.
        initializeCellList();
        initializeNeighborList();

        return N;
      },

      /**
        The canonical method for adding an element.
      */
      addElement: function(props) {
        var i;

        if (N_elements >= elementEpsilon.length) {
          extendArrays(elements, N_elements + 10);
          assignShortcutReferences.N_elements();
        }

        elementMass[N_elements]    = props.mass;
        elementEpsilon[N_elements] = props.epsilon;
        elementSigma[N_elements]   = props.sigma;
        elementRadius[N_elements]  = lennardJones.radius(props.sigma);

        epsilon[N_elements]                   = [];
        sigma[N_elements]                     = [];
        ljCalculator[N_elements]              = [];
        cutoffDistance_LJ_sq[N_elements]      = [];
        cutoffNeighborListSquared[N_elements] = [];

        for (i = 0; i <= N_elements; i++) {
          setPairwiseLJProperties(N_elements,i);
        }

        elementsHaveBeenCreated = true;
        N_elements++;
      },

      /**
        The canonical method for adding a radial bond to the collection of radial bonds.
      */
      addRadialBond: function(atom1Index, atom2Index, bondLength, bondStrength, bondStyle) {
        if (bondStyle == null )  bondStyle = DEFAULT_VALUES.RADIAL_BOND_STYLE;

        if (N_radialBonds >= radialBondAtom1Index.length) {
          extendArrays(radialBonds, N_radialBonds + 10);
          assignShortcutReferences.radialBonds();
        }

        radialBondResults[N_radialBonds].atom1    = radialBondAtom1Index[N_radialBonds] = atom1Index;
        radialBondResults[N_radialBonds].atom2    = radialBondAtom2Index[N_radialBonds] = atom2Index;
        radialBondResults[N_radialBonds].length   = radialBondLength[N_radialBonds]     = bondLength;
        radialBondResults[N_radialBonds].strength = radialBondStrength[N_radialBonds]   = bondStrength;
        radialBondResults[N_radialBonds].style    = radialBondStyle[N_radialBonds]      = bondStyle;

        if ( ! radialBondMatrix[atom1Index] ) radialBondMatrix[atom1Index] = [];
        radialBondMatrix[atom1Index][atom2Index] = true;

        if ( ! radialBondMatrix[atom2Index] ) radialBondMatrix[atom2Index] = [];
        radialBondMatrix[atom2Index][atom1Index] = true;

        N_radialBonds++;
      },

      /**
        The canonical method for adding an 'restraint' bond to the collection of restraints.

        If there isn't enough room in the 'restraints' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more bonds.
      */
      addRestraint: function(atomIndex, k, x0, y0) {
        if (N_restraints + 1 > restraints.atomIndex.length) {
          extendArrays(restraints, N_restraints + 10);
          assignShortcutReferences.restraints();
        }

        restraintAtomIndex[N_restraints] = atomIndex;
        restraintK[N_restraints]         = k;
        restraintX0[N_restraints]        = x0;
        restraintY0[N_restraints]        = y0;

        N_restraints++;
      },

      /**
        The canonical method for adding an angular bond to the collection of angular bonds.

        If there isn't enough room in the 'angularBonds' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more bonds.
      */
      addAngularBond: function(atom1Index, atom2Index, atom3Index, bondAngle, bondStrength) {
        if (N_angularBonds + 1 > angularBonds.atom1.length) {
          extendArrays(angularBonds, N_angularBonds + 10);
          assignShortcutReferences.angularBonds();
        }

        angularBondAtom1Index[N_angularBonds] = atom1Index;
        angularBondAtom2Index[N_angularBonds] = atom2Index;
        angularBondAtom3Index[N_angularBonds] = atom3Index;
        angularBondAngle[N_angularBonds]      = bondAngle;
        angularBondStrength[N_angularBonds]   = bondStrength;

        N_angularBonds++;
      },

      /**
        Adds a spring force between an atom and an x, y location.

        @returns the index of the new spring force.
      */
      addSpringForce: function(atomIndex, x, y, strength) {

        if (!springForces) createSpringForcesArray(1);

        // conservatively just add one spring force
        if (N_springForces > springForces[0].length) {
          extendArrays(springForces, N_springForces + 1);
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

      removeSpringForce: function(i) {
        if (i >= N_springForces) return;
        N_springForces--;
      },

      springForceAtomIndex: function(i) {
        return springForceAtomIndex[i];
      },

      // TODO: Refactor this function with monster argument lists. Pass object with properties
      //       instead. Both addObstacle and initializeObstacles functions will be simpler.
      //       Refactor other addX functions to keep consistency.
      addObstacle: function(x, y, vx, vy, externalFx, externalFy, friction, width, height,
        density, westProbe, northProbe, eastProbe, southProbe, color, visible) {
        var obstaclemass;

        if (N_obstacles + 1 > obstacles.x.length) {
          extendArrays(obstacles, N_obstacles + 1);
          assignShortcutReferences.obstacles();
        }

        obstacleX[N_obstacles] = x;
        obstacleY[N_obstacles] = y;
        obstacleXPrev[N_obstacles] = x;
        obstacleYPrev[N_obstacles] = y;

        obstacleVX[N_obstacles] = vx;
        obstacleVY[N_obstacles] = vy;

        obstacleExtFX[N_obstacles] = externalFx;
        obstacleExtFY[N_obstacles] = externalFy;

        obstacleFriction[N_obstacles] = friction;

        obstacleWidth[N_obstacles]  = width;
        obstacleHeight[N_obstacles] = height;

        density = parseFloat(density);      // may be string "Infinity"

        // Mimic Classic MW behavior. When obstacle density is bigger than
        // 500 [120amu/0.1A^2] (= 500 * 1.2e6 [amu/nm^2]), it is considered to be fixed
        // (in Next Gen MW 'Infinity' mass is expected). It is important as it affects
        // kinetic energy calculations (temperature), particles bouncing etc.
        if (density >= 500 * 1.2e6) {
          density = Infinity;
        }

        obstaclemass = density * width * height;

        obstacleMass[N_obstacles] = obstaclemass;

        obstacleWestProbe[N_obstacles]  = westProbe;
        obstacleNorthProbe[N_obstacles] = northProbe;
        obstacleEastProbe[N_obstacles]  = eastProbe;
        obstacleSouthProbe[N_obstacles] = southProbe;

        obstacleColorR[N_obstacles] = color[0];
        obstacleColorG[N_obstacles] = color[1];
        obstacleColorB[N_obstacles] = color[2];

        obstacleVisible[N_obstacles] = visible;

        N_obstacles++;

        // Call it to check if new obstacle has any pressure probe.
        // If so, special buffers will be created.
        initializePressureBuffers();
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
      canPlaceAtom: function(element, _x, _y, i) {
        var orig_x,
            orig_y,
            PEAtLocation;

        // first do the simpler check to see if we're outside the walls or intersect an obstacle
        if ( !engine.atomInBounds(_x, _y, i) ) {
          return false;
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

      // Sets the X, Y, VX, VY and ELEMENT properties of the atoms
      initializeAtomsFromProperties: function(props) {
        var x, y, vx, vy, charge, element, friction, pinned,
            i, ii,
            usedElements = {};

        if (!(props.x && props.y)) {
          throw new Error("md2d: initializeAtomsFromProperties must specify at minimum X and Y locations.");
        }

        if (!(props.vx && props.vy)) {
          // We may way to support authored locations with random velocities in the future
          throw new Error("md2d: For now, velocities must be set when locations are set.");
        }

        for (i=0, ii=props.x.length; i<ii; i++){
          element = props.element ? props.element[i] : 0;
          x = props.x[i];
          y = props.y[i];
          vx = props.vx[i];
          vy = props.vy[i];
          charge = props.charge ? props.charge[i] : 0;
          pinned = props.pinned ? props.pinned[i] : 0;
          friction = props.friction ? props.friction[i] : 0;

          engine.addAtom(element, x, y, vx, vy, charge, friction, pinned);

          usedElements[element] = true;
        }

        // Publish the current state
        T = computeTemperature();
      },

      initializeAtomsRandomly: function(options) {

        var // if a temperature is not explicitly requested, we just need any nonzero number
            temperature = options.temperature || 100,

            // fill up the entire 'atoms' array if not otherwise requested
            num = options.num || atoms.x.length,

            nrows = Math.floor(Math.sqrt(num)),
            ncols = Math.ceil(num/nrows),

            i, r, c, rowSpacing, colSpacing,
            vMagnitude, vDirection,
            x, y, vx, vy, charge, element;

        validateTemperature(temperature);

        colSpacing = size[0] / (1+ncols);
        rowSpacing = size[1] / (1+nrows);

        // Arrange molecules in a lattice. Not guaranteed to have CM exactly on center, and is an artificially low-energy
        // configuration. But it works OK for now.
        i = -1;

        for (r = 1; r <= nrows; r++) {
          for (c = 1; c <= ncols; c++) {
            i++;
            if (i === num) break;

            element    = Math.floor(Math.random() * elementEpsilon.length);     // random element
            vMagnitude = math.normal(1, 1/4);
            vDirection = 2 * Math.random() * Math.PI;

            x = c*colSpacing;
            y = r*rowSpacing;
            vx = vMagnitude * Math.cos(vDirection);
            vy = vMagnitude * Math.sin(vDirection);

            charge = 2*(i%2)-1;      // alternate negative and positive charges

            engine.addAtom(element, x, y, vx, vy, charge, 0, 0, 1, 0);
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

        // Publish the current state
        T = computeTemperature();
      },

      initializeObstacles: function (props) {
        var num = props.x.length,
            i;

        createObstaclesArray(num);
        for (i = 0; i < num; i++) {
          engine.addObstacle(
            props.x[i],
            props.y[i],
            props.vx[i],
            props.vy[i],
            props.externalFx[i],
            props.externalFy[i],
            props.friction[i],
            props.width[i],
            props.height[i],
            props.density[i],
            props.westProbe[i],
            props.northProbe[i],
            props.eastProbe[i],
            props.southProbe[i],
            props.color[i],
            props.visible[i]
          );
        }

        // Creates special buffers for pressure probes.
        initializePressureBuffers();
      },

      initializeElements: function(elems) {
        var num = elems.length,
            i;

        createElementsArray(num);

        for (i = 0; i < num; i++) {
          engine.addElement(elems[i]);
        }
        elementsHaveBeenCreated = true;
      },

      initializeRadialBonds: function(props) {
        var num = props.atom1Index.length,
            i;

        radialBondMatrix = [];
        createRadialBondsArray(num);

        for (i = 0; i < num; i++) {
          engine.addRadialBond(
            props.atom1Index[i],
            props.atom2Index[i],
            props.bondLength[i],
            props.bondStrength[i],
            props.bondStyle[i]
          );
        }
      },

      initializeRestraints: function(props) {
        var num = props.atomIndex.length,
            i;

        createRestraintsArray(num);

        for (i = 0; i < num; i++) {
          engine.addRestraint(
            props.atomIndex[i],
            props.k[i],
            props.x0[i],
            props.y0[i]
          );
        }
      },

      initializeAngularBonds: function(props) {
        var num = props.atom1Index.length,
            i;

        createAngularBondsArray(num);

        for (i = 0; i < num; i++) {
          engine.addAngularBond(
            props.atom1Index[i],
            props.atom2Index[i],
            props.atom3Index[i],
            props.bondAngle[i],
            props.bondStrength[i]
          );
        }
      },

      createVdwPairsArray: function() {
        var maxNumPairs = N * (N-1) / 2;

        vdwPairs = engine.vdwPairs = [];

        vdwPairs[VDW_INDICES.COUNT] = N_vdwPairs;
        vdwPairs[VDW_INDICES.ATOM1] = vdwPairAtom1Index = arrays.create(maxNumPairs, 0, uint16);
        vdwPairs[VDW_INDICES.ATOM2] = vdwPairAtom2Index = arrays.create(maxNumPairs, 0, uint16);

        engine.updateVdwPairsArray();
      },

      updateVdwPairsArray: function() {
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
            distanceCutoff_sq = 4; // vdwLinesRatio * vdwLinesRatio : 2*2 for long distance cutoff

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
                vdwPairAtom1Index[N_vdwPairs] = i;
                vdwPairAtom2Index[N_vdwPairs] = j;
                N_vdwPairs++;
              }
            }
          }
        }

        vdwPairs[VDW_INDICES.COUNT] = N_vdwPairs;
      },

      relaxToTemperature: function(T) {

        // FIXME this method needs to be modified. It should rescale velocities only periodically
        // and stop when the temperature approaches a steady state between rescalings.

        if (T != null) T_target = T;

        validateTemperature(T_target);

        beginTransientTemperatureChange();
        while (temperatureChangeInProgress) {
          engine.integrate();
        }
      },

      integrate: function(duration, _dt) {

        var radius,
            inverseMass;

        if (!atomsHaveBeenCreated) {
          throw new Error("md2d: integrate called before atoms created.");
        }

        // How much time to integrate over, in fs
        if (duration == null)  duration = 100;

        // The length of an integration timestep, in fs
        if (_dt == null) _dt = 1;

        dt = _dt;       // dt is a closure variable that helpers need access to
        dt_sq = dt*dt;  // the squared time step is also needed by some helpers

        // FIXME we still need to make bounceAtomOffWalls respect each atom's actual radius, rather than
        // assuming just one radius as below
        radius = elementRadius[0];

        var t_start = time,
            n_steps = Math.floor(duration/dt),  // number of steps
            width100  = size[0] * 100,
            height100 = size[1] * 100,
            iloop,
            i,
            xPrev,
            yPrev;

        for (iloop = 1; iloop <= n_steps; iloop++) {
          time = t_start + iloop*dt;

          for (i = 0; i < N; i++) {
            xPrev = x[i];
            yPrev = y[i];

            // Update r(t+dt) using v(t) and a(t)
            updatePosition(i);

            // Simple check if model has diverged. Prevents web browser from crashing.
            // isNaN tests not only x, y, but also vx, vy, ax, ay as test is done after
            // updatePosition(). If a displacement during one step is larger than width * 100
            // (or height * 100) it means that the velocity is far too big for the current time step.
            if (isNaN(x[i]) || isNaN(y[i]) ||
                Math.abs(x[i]) > width100 || Math.abs(y[i]) > height100) {
              throw new Error("Model has diverged!");
            }

            // Bounce off walls.
            bounceAtomOffWalls(i);
            // Bounce off obstacles, update pressure probes.
            bounceOffObstacles(i, xPrev, yPrev, true);

            // First half of update of v(t+dt, i), using v(t, i) and a(t, i)
            halfUpdateVelocity(i);

            // Zero out a(t, i) for accumulation of forces into a(t+dt, i)
            ax[i] = ay[i] = 0;
          }

          // Accumulate acceleration into a(t+dt, i) and a(t+dt, j) for all possible interactions, fields
          // and forces connected with atoms. Note that data from the previous time step should be cleared
          // from arrays ax and ay before calling this function!
          updateParticlesAccelerations();

          for (i = 0; i < N; i++) {
            // Second half of update of v(t+dt, i) using first half of update and a(t+dt, i)
            halfUpdateVelocity(i);

            // Now that we have velocity, update speed
            speed[i] = Math.sqrt(vx[i]*vx[i] + vy[i]*vy[i]);
          }

          // Move obstacles
          for (i = 0; i < N_obstacles; i++) {
            updateObstaclePosition(i);
            bounceObstacleOffWalls(i);
          }

          adjustTemperature();
        } // end of integration loop

        updatePressureProbesBuffers(duration);
      },

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
            bounceAtomOffWalls(i);
            // Bounce off obstacles, but DO NOT update pressure probes.
            bounceOffObstacles(i, xPrev, yPrev, false);
          }

          // Calculate accelerations.
          updateParticlesAccelerations();
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

      getTotalMass: function() {
        return totalMass;
      },

      getRadiusOfElement: function(el) {
        return elementRadius[el];
      },

      getNumberOfAtoms: function() {
        return N;
      },

      /**
        Compute the model state and store into the passed-in 'state' object.
        (Avoids GC hit of throwaway object creation.)
      */
      // TODO: [refactoring] divide this function into smaller chunks?
      computeOutputState: function(state) {
        var i, j,
            i1, i2, i3,
            el1, el2,
            dx, dy,
            dxij, dyij, dxkj, dykj,
            cosTheta, theta,
            r_sq, rij, rkj,
            k, dr, angleDiff,
            value,
            gravPEInMWUnits,
            // Total kinetic energy, in MW units.
            KEinMWUnits,
            // Potential energy, in eV.
            PE,
            // Pressure probes data.
            probes;

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
            if (useCoulombInteraction && hasChargedAtoms) {
              PE += coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j]);
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
            PE -= coulomb.potential(Math.sqrt(r_sq), charge[i1], charge[i2]);
          }

          // Also save the updated position of the two bonded atoms
          // in a row in the radialBondResults array.
          radialBondResults[i].x1 = x[i1];
          radialBondResults[i].y1 = y[i1];
          radialBondResults[i].x2 = x[i2];
          radialBondResults[i].y2 = y[i2];
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

        // During obstacles loop calculate final probes values.
        // Try to reuse existing object (state.pressureProbes).
        probes = state.pressureProbes || {};

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

          // Pressure calculation.
          if (obstacleWestProbe[i]) {
            probes[i] = probes[i] || {};
            probes[i].west = getPressureFromProbe(i, 'west');
          }
          if (obstacleNorthProbe[i]) {
            probes[i] = probes[i] || {};
            probes[i].north = getPressureFromProbe(i, 'north');
          }
          if (obstacleEastProbe[i]) {
            probes[i] = probes[i] || {};
            probes[i].east = getPressureFromProbe(i, 'east');
          }
          if (obstacleSouthProbe[i]) {
            probes[i] = probes[i] || {};
            probes[i].south = getPressureFromProbe(i, 'south');
          }
        }

        // State to be read by the rest of the system:
        state.time           = time;
        state.pressure       = 0;// (time - t_start > 0) ? pressure / (time - t_start) : 0;
        state.pressureProbes = probes;
        state.PE             = PE;
        state.KE             = constants.convert(KEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
        state.temperature    = T;
        state.pCM            = [px_CM, py_CM]; // TODO: GC optimization? New array created each time.
        state.CM             = [x_CM, y_CM];
        state.vCM            = [vx_CM, vy_CM];
        state.omega_CM       = omega_CM;
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

            if (useCoulombInteraction && hasChargedAtoms && testCharge) {
              r = Math.sqrt(r_sq);
              PE += -coulomb.potential(r, testCharge, charge[i]);
              if (calculateGradient) {
                f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, testCharge, charge[i]);
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

      atomsInMolecule: [],
      depth: 0,

      /**
        Returns all atoms in the same molecule as atom i
        (not including i itself)
      */
      getMoleculeAtoms: function(i) {
        this.atomsInMolecule.push(i);

        var moleculeAtoms = [],
            bondedAtoms = this.getBondedAtoms(i),
            depth = this.depth,
            j, jj,
            atomNo;

        this.depth++;

        for (j=0, jj=bondedAtoms.length; j<jj; j++) {
          atomNo = bondedAtoms[j];
          if (!~this.atomsInMolecule.indexOf(atomNo)) {
            moleculeAtoms = moleculeAtoms.concat(this.getMoleculeAtoms(atomNo)); // recurse
          }
        }
        if (depth === 0) {
          this.depth = 0;
          this.atomsInMolecule = [];
        } else {
          moleculeAtoms.push(i);
        }
        return moleculeAtoms;
      },

      /**
        Returns all atoms directly bonded to atom i
      */
      getBondedAtoms: function(i) {
        var bondedAtoms = [],
            j, jj;
        if (radialBonds) {
          for (j = 0, jj = radialBondAtom1Index.length; j < jj; j++) {
            // console.log("looking at bond from "+radialBonds)
            if (radialBondAtom1Index[j] === i) {
              bondedAtoms.push(radialBondAtom2Index[j]);
            }
            if (radialBondAtom2Index[j] === i) {
              bondedAtoms.push(radialBondAtom1Index[j]);
            }
          }
        }
        return bondedAtoms;
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
      }
    };
  };
});
