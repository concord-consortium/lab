/*globals Float32Array window:true */
/*jslint eqnull: true, boss: true, loopfunc: true*/

if (typeof window === 'undefined') window = {};

var arrays       = require('arrays'),
    constants    = require('./constants'),
    unit         = constants.unit,
    math         = require('./math'),
    coulomb      = require('./potentials').coulomb,
    lennardJones = require('./potentials').lennardJones,

    // TODO: Actually check for Safari. Typed arrays are faster almost everywhere
    // ... except Safari.
    notSafari = true,

    hasTypedArrays = (function() {
      try {
        new Float32Array();
      }
      catch(e) {
        return false;
      }
      return true;
    }()),

    // make at least 2 atoms
    N_MIN = 1,

    // make no more than this many atoms:
    N_MAX = 1000,

    // from A. Rahman "Correlations in the Motion of Atoms in Liquid Argon", Physical Review 136 pp. A405–A411 (1964)
    ARGON_LJ_EPSILON_IN_EV = -120 * constants.BOLTZMANN_CONSTANT.as(unit.EV_PER_KELVIN),
    ARGON_LJ_SIGMA_IN_NM   = 0.34,

    ARGON_MASS_IN_DALTON = 39.95,
    ARGON_MASS_IN_KG = constants.convert(ARGON_MASS_IN_DALTON, { from: unit.DALTON, to: unit.KILOGRAM }),

    BOLTZMANN_CONSTANT_IN_JOULES = constants.BOLTZMANN_CONSTANT.as( unit.JOULES_PER_KELVIN ),

    INDICES,
    ELEMENT_INDICES,
    OBSTACLE_INDICES,
    SAVEABLE_INDICES,
    RADIAL_INDICES,
    VDW_INDICES,

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
    },

    copyTypedArray = function(arr) {
      var copy = [];
      for (var i=0,ii=arr.length; i<ii; i++){
        copy[i] = arr[i];
      }
      return copy;
    };

exports.ELEMENT_INDICES = ELEMENT_INDICES = {
  MASS: 0,
  EPSILON: 1,
  SIGMA: 2,
  RADIUS: 3
},

exports.INDICES = INDICES = {
  RADIUS   :  0,
  PX       :  1,
  PY       :  2,
  X        :  3,
  Y        :  4,
  VX       :  5,
  VY       :  6,
  SPEED    :  7,
  AX       :  8,
  AY       :  9,
  CHARGE   : 10,
  ELEMENT  : 11,
  PINNED   : 12,
  FRICTION : 13,
  VISIBLE  : 14,
  DRAGGABLE: 15
};

exports.ATOM_PROPERTIES = {
  RADIUS   :  "radius",
  PX       :  "px",
  PY       :  "py",
  X        :  "x",
  Y        :  "y",
  VX       :  "vx",
  VY       :  "vy",
  SPEED    :  "speed",
  AX       :  "ax",
  AY       :  "ay",
  CHARGE   :  "charge",
  ELEMENT  :  "element",
  PINNED   :  "pinned",
  FRICTION : "friction",
  VISIBLE  :  "visible",
  DRAGGABLE: "draggable"
};

exports.OBSTACLE_INDICES = OBSTACLE_INDICES = {
  X       :  0,
  Y       :  1,
  WIDTH   :  2,
  HEIGHT  :  3,
  MASS    :  4,
  VX      :  5,
  VY      :  6,
  X_PREV  :  7,
  Y_PREV  :  8,
  COLOR_R :  9,
  COLOR_G :  10,
  COLOR_B :  11,
  VISIBLE :  12
};

exports.RADIAL_INDICES = RADIAL_INDICES = {
  ATOM1   :  0,
  ATOM2   :  1,
  LENGTH  :  2,
  STRENGTH:  3
};

exports.VDW_INDICES = VDW_INDICES = {
  ATOM1   :  0,
  ATOM2   :  1
};

exports.SAVEABLE_INDICES = SAVEABLE_INDICES = ["X", "Y","VX","VY", "CHARGE", "ELEMENT", "PINNED", "FRICTION", "VISIBLE", "DRAGGABLE"];

exports.makeModel = function() {

  var // the object to be returned
      model,

      // Whether system dimensions have been set. This is only allowed to happen once.
      sizeHasBeenInitialized = false,

      // Whether "atoms" (particles) have been created & initialized. This is only allowed to happen once.
      atomsHaveBeenCreated = false,

      // Whether to simulate Coulomb forces between particles.
      useCoulombInteraction = false,

      // Whether any atoms actually have charges
      hasChargedAtoms = false,

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

      // The number of molecules in the system.
      N,

      // Total mass of all particles in the system, in Dalton (atomic mass units).
      totalMass,

      // Element properties
      // elements is an array of elements, each one an array of properties
      // For now properties are just defined by index, with no additional lookup for
      // the index (e.g. elements[0][ELEM_MASS_INDEX] for the mass of elem 0). We
      // have few enough properties that we currently don't need this additional lookup.
      // element definition: [ MASS_IN_DALTONS, EPSILON, SIGMA ]
      elements,

      // Individual property arrays for the atoms, indexed by atom number
      radius, px, py, x, y, vx, vy, speed, ax, ay, charge, element, friction, pinned, visible, draggable,

      // An array of length max(INDICES)+1 which contains the above property arrays
      atoms,

      // Individual property arrays for the "radial" bonds, indexed by bond number
      radialBondAtom1Index,
      radialBondAtom2Index,
      radialBondLength,
      radialBondStrength,

      // An array of length 4 which contains the above 4 property arrays.
      // Left undefined if no radial bonds are defined.
      radialBonds,
      //Ordered Radial Bond hash
      radialBondsHash,

      //Number of VDW Pairs
      vdwPairNum,
      vdwPairs,
      vdwPairAtom1Index,
      vdwPairAtom2Index,

      // Number of actual radial bonds (may be smaller than the length of the property arrays)
      N_radialBonds = 0,

      // Arrays for spring forces, which are forces defined between an atom and a point in space
      springForceAtomIndex,
      springForceX,
      springForceY,
      springForceStrength,

      springForces,

      N_springForces = 0,

      // Individual properties for the obstacles
      obstacleX,
      obstacleY,
      obstacleWidth,
      obstacleHeight,
      obstacleVX,
      obstacleVY,
      obstacleMass,
      obstacleXPrev,
      obstacleYPrev,
      obstacleColorR,
      obstacleColorG,
      obstacleColorB,
      obstacleVisible,

      // An array of length 12 which contains obstacles information
      obstacles,

      // Number of actual obstacles
      N_obstacles = 0,

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

      // Object containing observations of the sytem (temperature, etc)
      outputState = window.state = {},

      // The following are the pairwise values for elements i and j, indexed
      // like [i][j]
      epsilon = [],
      sigma = [],

      // cutoff for force calculations, as a factor of sigma
      cutoff = 5.0,
      cutoffDistance_LJ_sq = [],

      // Each object at ljCalculator[i,j] can calculate the magnitude of the Lennard-Jones force and
      // potential between elements i and j
      ljCalculator = [],

      // Callback that recalculates element radii  and cutoffDistance_LJ_sq when the Lennard-Jones
      // sigma parameter changes.
      ljCoefficientsChanged = function(el1, el2, coefficients) {
        cutoffDistance_LJ_sq[el1][el2] =
          cutoffDistance_LJ_sq[el2][el1] =
          cutoff * cutoff * coefficients.sigma * coefficients.sigma;

        if (el1 === el2) updateElementRadius(el1, coefficients);
      },

      // Update radius of element # 'el'. Also, if 'element' and 'radius' arrays are defined, update
      // all atom's radii to match the new radii of their corresponding elements.
      updateElementRadius = function(el, coefficients) {
        elements[el][ELEMENT_INDICES.RADIUS] = lennardJones.radius( coefficients.sigma );

        if (!radius || !element) return;
        for (var i = 0, len = radius.length; i < len; i++) {
          radius[i] = elements[element[i]][ELEMENT_INDICES.RADIUS];
        }
      },

      // Make the 'atoms' array bigger
      extendAtomsArray = function(num) {
        var savedArrays = [],
            savedTotalMass,
            i;

        for (i = 0; i < atoms.length; i++) {
          savedArrays[i] = atoms[i];
        }

        savedTotalMass = totalMass;
        atomsHaveBeenCreated = false;
        model.createAtoms({ num: num });

        for (i = 0; i < atoms.length; i++) {
          arrays.copy(savedArrays[i], atoms[i]);
        }

        // restore N and totalMass
        N = savedArrays[0].length;        // atoms[0].length is now > N!
        totalMass = savedTotalMass;
      },

      createRadialBondsArray = function(num) {
      var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
          uint16  = (hasTypedArrays && notSafari) ? 'Uint16Array' : 'regular', radialIndices = RADIAL_INDICES;

        radialBonds = model.radialBonds = [];

        radialBonds[radialIndices.ATOM1] = radialBondAtom1Index = arrays.create(num, 0, uint16);
        radialBonds[radialIndices.ATOM2] = radialBondAtom2Index = arrays.create(num, 0, uint16);
        radialBonds[radialIndices.LENGTH] = radialBondLength     = arrays.create(num, 0, float32);
        radialBonds[radialIndices.STRENGTH] = radialBondStrength   = arrays.create(num, 0, float32);
      },


  // Make the 'radialBonds' array bigger. FIXME: needs to be factored
      // into a common pattern with 'extendAtomsArray'
      extendRadialBondsArray = function(num) {
        var savedArrays = [],
            i;

        for (i = 0; i < radialBonds.length; i++) {
          savedArrays[i] = radialBonds[i];
        }

        createRadialBondsArray(num);

        for (i = 0; i < radialBonds.length; i++) {
          arrays.copy(savedArrays[i], radialBonds[i]);
        }
      },

      createSpringForcesArray = function(num) {
      var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
          uint16  = (hasTypedArrays && notSafari) ? 'Uint16Array' : 'regular';

        springForces = model.springForces = [];

        springForces[0] = springForceAtomIndex  = arrays.create(num, 0, uint16);
        springForces[1] = springForceX          = arrays.create(num, 0, float32);
        springForces[2] = springForceY          = arrays.create(num, 0, float32);
        springForces[3] = springForceStrength   = arrays.create(num, 0, float32);
      },

      extendSpringForcesArray = function(num) {
        var savedArrays = [],
            i;

        if (springForces) {
          for (i = 0; i < springForces.length; i++) {
            savedArrays[i] = springForces[i];
          }
        }

        createSpringForcesArray(num);

        for (i = 0; i < savedArrays.length; i++) {
          arrays.copy(savedArrays[i], springForces[i]);
        }
      },

      createObstaclesArray = function(num) {
        var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
            uint8   = (hasTypedArrays && notSafari) ? 'Uint8Array' : 'regular',
            ind     = OBSTACLE_INDICES;

        obstacles = model.obstacles = [];

        obstacles[ind.X]        = obstacleX      = arrays.create(num, 0, float32);
        obstacles[ind.Y]        = obstacleY      = arrays.create(num, 0, float32);
        obstacles[ind.WIDTH]    = obstacleWidth  = arrays.create(num, 0, float32);
        obstacles[ind.HEIGHT]   = obstacleHeight = arrays.create(num, 0, float32);
        obstacles[ind.MASS]     = obstacleMass   = arrays.create(num, 0, float32);
        obstacles[ind.VX]       = obstacleVX     = arrays.create(num, 0, float32);
        obstacles[ind.VY]       = obstacleVY     = arrays.create(num, 0, float32);
        obstacles[ind.X_PREV]   = obstacleXPrev  = arrays.create(num, 0, float32);
        obstacles[ind.Y_PREV]   = obstacleYPrev  = arrays.create(num, 0, float32);
        obstacles[ind.COLOR_R]  = obstacleColorR = arrays.create(num, 0, float32);
        obstacles[ind.COLOR_G]  = obstacleColorG = arrays.create(num, 0, float32);
        obstacles[ind.COLOR_B]  = obstacleColorB = arrays.create(num, 0, float32);
        obstacles[ind.VISIBLE]  = obstacleVisible = arrays.create(num, 0, uint8);
      },


      extendObstaclesArray = function(num) {
        var savedArrays = [],
            i;

        for (i = 0; i < obstacles.length; i++) {
          savedArrays[i] = obstacles[i];
        }

        createObstaclesArray(num);

        for (i = 0; i < obstacles.length; i++) {
          arrays.copy(savedArrays[i], obstacles[i]);
        }
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

        for (i = 0; i < N; i++) {
          twoKE += elements[element[i]][0] * (vx[i] * vx[i] + vy[i] * vy[i]);
        }
        return KE_to_T( twoKE/2, N );
      },

      // Scales the velocity vector of particle i by `factor`.
      scaleVelocity = function(i, factor) {
        vx[i] *= factor;
        vy[i] *= factor;

        // scale momentum too
        px[i] *= factor;
        py[i] *= factor;
      },

      // Adds the velocity vector (vx_t, vy_t) to the velocity vector of particle i
      addVelocity = function(i, vx_t, vy_t) {
        vx[i] += vx_t;
        vy[i] += vy_t;

        px[i] = vx[i]*elements[element[i]][0];
        py[i] = vy[i]*elements[element[i]][0];
      },

      // Adds effect of angular velocity omega, relative to (x_CM, y_CM), to the velocity vector of particle i
      addAngularVelocity = function(i, omega) {
        vx[i] -= omega * (y[i] - y_CM);
        vy[i] += omega * (x[i] - x_CM);

        px[i] = vx[i]*elements[element[i]][0];
        py[i] = vy[i]*elements[element[i]][0];
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
            mass,
            i;

        for (i = 0; i < N; i++) {
          mass = elements[element[i]][0];
          // L_CM = sum over N of of mr_i x p_i (where r_i and p_i are position & momentum vectors relative to the CM)
          L += mass * cross( x[i]-x_CM, y[i]-y_CM, vx[i]-vx_CM, vy[i]-vy_CM);
          I += mass * sumSquare( x[i]-x_CM, y[i]-y_CM );
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
        var ob_vx = obstacleVX[i],
            ob_vy = obstacleVY[i];
        if (ob_vx || ob_vy) {
          obstacleXPrev[i] = obstacleX[i];
          obstacleYPrev[i] = obstacleY[i];
          obstacleX[i] += ob_vx*dt;
          obstacleY[i] += ob_vy*dt;
        }
      },

      // Constrain particle i to the area between the walls by simulating perfectly elastic collisions with the walls.
      // Note this may change the linear and angular momentum.
      bounceOffWalls = function(i) {
        var r = radius[i],
            leftwall = r,
            bottomwall = r,
            rightwall = size[0] - r,
            topwall = size[1] - r;

        // Bounce off vertical walls.
        if (x[i] < leftwall) {
          x[i]  = leftwall + (leftwall - x[i]);
          vx[i] *= -1;
          px[i] *= -1;
        } else if (x[i] > rightwall) {
          x[i]  = rightwall - (x[i] - rightwall);
          vx[i] *= -1;
          px[i] *= -1;
        }

        // Bounce off horizontal walls
        if (y[i] < bottomwall) {
          y[i]  = bottomwall + (bottomwall - y[i]);
          vy[i] *= -1;
          py[i] *= -1;
        } else if (y[i] > topwall) {
          y[i]  = topwall - (y[i] - topwall);
          vy[i] *= -1;
          py[i] *= -1;
        }
      },

      bounceOffObstacles = function(i, x_prev, y_prev) {
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
            mass,
            obs_mass,
            totalMass,
            bounceDirection = 0; // if we bounce horz: 1, vert: -1

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


          if (xi > x_left && xi < x_right && yi > y_bottom && yi < y_top) {
            if (x_prev <= x_left_prev) {
              x[i] = x_left - (xi - x_left);
              bounceDirection = 1;
            } else if (x_prev >= x_right_prev) {
              x[i] = x_right + (x_right - xi);
              bounceDirection = 1;
            } else if (y_prev <= y_top_prev) {
              y[i] = y_bottom - (yi - y_bottom);
              bounceDirection = -1;
            } else if (y_prev >= y_bottom_prev) {
              y[i] = y_top  + (y_top - yi);
              bounceDirection = -1;
            }
          }

          obs_mass = obstacleMass[j];

          if (bounceDirection) {
            if (obs_mass !== Infinity) {
              // if we have real mass, perform a perfectly-elastic collision
              mass = elements[element[i]][0];
              totalMass = obs_mass + mass;
              if (bounceDirection === 1) {
                vxPrev = vx[i];
                obs_vxPrev = obstacleVX[j];

                vx[i] = (vxPrev * (mass - obs_mass) + (2 * obs_mass * obs_vxPrev)) / totalMass;
                obstacleVX[j] = (obs_vxPrev * (obs_mass - mass) + (2 * px[i])) / totalMass;
              } else {
                vyPrev = vy[i];
                obs_vyPrev = obstacleVY[j];

                vy[i] = (vyPrev * (mass - obs_mass) + (2 * obs_mass * obs_vyPrev)) / totalMass;
                obstacleVY[j] = (obs_vyPrev * (obs_mass - mass) + (2 * py[i])) / totalMass;
              }
            } else {
              // if we have infinite mass, just reflect (like a wall)
              if (bounceDirection === 1) {
                vx[i] *= -1;
              } else {
                vy[i] *= -1;
              }
            }
          }
        }
      },


      // Half of the update of v(t+dt, i) and p(t+dt, i) using a; during a single integration loop,
      // call once when a = a(t) and once when a = a(t+dt)
      halfUpdateVelocity = function(i) {
        var mass = elements[element[i]][0];
        vx[i] += 0.5*ax[i]*dt;
        px[i] = mass * vx[i];
        vy[i] += 0.5*ay[i]*dt;
        py[i] = mass * vy[i];
      },

      // Removes velocity and acceleration from atom i
      pinAtom = function(i) {
        vx[i] = vy[i] = ax[i] = ay[i] = 0;
      },

      // Accumulate accelerations into a(t+dt, i) and a(t+dt, j) for all pairwise interactions between particles i and j
      // where j < i. Note a(t, i) and a(t, j) (accelerations from the previous time step) should be cleared from arrays
      // ax and ay before calling this function.
      updatePairwiseAccelerations = function(i) {
        var j, dx, dy, r_sq, f_over_r, fx, fy,
            el_i = element[i],
            el_j,
            mass_inv = 1/elements[el_i][0], mass_j_inv, q_i = charge[i];

        for (j = 0; j < i; j++) {
          el_j = element[j];

          mass_j_inv = 1/elements[el_j][0];

          dx = x[j] - x[i];
          dy = y[j] - y[i];
          r_sq = dx*dx + dy*dy;

          f_over_r = 0;

          if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq[el_i][el_j]) {
            f_over_r += ljCalculator[el_i][el_j].forceOverDistanceFromSquaredDistance(r_sq);
          }

          if (useCoulombInteraction && hasChargedAtoms) {
            f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, q_i, charge[j]);
          }

          if (f_over_r) {
            fx = f_over_r * dx;
            fy = f_over_r * dy;
            ax[i] += fx * mass_inv;
            ay[i] += fy * mass_inv;
            ax[j] -= fx * mass_j_inv;
            ay[j] -= fy * mass_j_inv;
          }
        }
      },

      updateGravitationalAcceleration = function() {
        // fast path if there is no gravitationalField
        if (!gravitationalField) return;
        var i;

        for (i = 0; i < N; i++) {
          ay[i] -= gravitationalField;
        }
      },

      updateFrictionAccelerations = function () {
        if (!viscosity) return;

        var i = N,
            fx,
            fy,
            inverseMass,
            drag;

        while (i--) {
          inverseMass = 1 / elements[element[i]][ELEMENT_INDICES.MASS];
          drag = viscosity * friction[i];

          fx = -vx[i] * drag;
          fy = -vy[i] * drag;
          ax[i] += fx * inverseMass;
          ay[i] += fy * inverseMass;
        }
      },

      updateBondAccelerations = function() {
        // fast path if no radial bonds have been defined
        if (N_radialBonds < 1) return;

        var i,
            len,
            i1,
            i2,
            el1,
            el2,
            dx,
            dy,
            r_sq,
            r,
            k,
            r0,
            f_over_r,
            fx,
            fy,
            mass1_inv,
            mass2_inv;

        for (i = 0, len = radialBonds[0].length; i < len; i++) {
          i1 = radialBondAtom1Index[i];
          i2 = radialBondAtom2Index[i];
          el1 = element[i1];
          el2 = element[i2];

          mass1_inv = 1/elements[el1][0];
          mass2_inv = 1/elements[el2][0];

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

          // Subtract out the Lennard-Jones force between bonded pairs.
          //
          // (optimization assumption: the penalty for calculating the force twice for bonded pairs
          // will be much less than the overhead and possible loop deoptimization incurred by
          // checking against a list of bonded pairs each time through
          // updatePairwiseAccelerations()'s inner loop.)

          if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq[el1][el2]) {
            f_over_r -= ljCalculator[el1][el2].forceOverDistanceFromSquaredDistance(r_sq);
          }

          if (useCoulombInteraction && hasChargedAtoms) {
            f_over_r -= coulomb.forceOverDistanceFromSquaredDistance(r_sq, charge[i1], charge[i2]);
          }

          fx = f_over_r * dx;
          fy = f_over_r * dy;

          ax[i1] += fx * mass1_inv;
          ay[i1] += fy * mass1_inv;
          ax[i2] -= fx * mass2_inv;
          ay[i2] -= fy * mass2_inv;
        }
      },

      updateSpringAccelerations = function() {
        if (N_springForces < 1) return;

        var i,
            mass_inv,
            dx, dy,
            r, r_sq,
            k,
            f_over_r,
            fx, fy,
            a;

        for (i = 0; i < N_springForces; i++) {
          a = springForceAtomIndex[i];
          mass_inv = 1/elements[element[a]][0];

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

          ax[a] += fx * mass_inv;
          ay[a] += fy * mass_inv;
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
          for (i = 0; i < N; i++) {
            scaleVelocity(i, rescalingFactor);
          }
          T = target;
        }
      };


  return model = {

    outputState: outputState,

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
      outputState.time = time = t;
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

    /*
      Expects an array of element properties such as
      [
        [ mass_of_elem_0 ],
        [ mass_of_elem_1 ]
      ]
    */
    setElements: function(elems) {
      var i, j, epsilon_i, epsilon_j, sigma_i, sigma_j;

      if (atomsHaveBeenCreated) {
        throw new Error("md2d: setElements cannot be called after atoms have been created");
      }
      elements = elems;

      for (i = 0; i < elements.length; i++) {
        epsilon[i] = [];
        sigma[i] = [];
        ljCalculator[i] = [];
        cutoffDistance_LJ_sq[i] = [];
      }

      for (i = 0; i < elements.length; i++) {
        epsilon_i = elements[i][ELEMENT_INDICES.EPSILON];
        sigma_i   = elements[i][ELEMENT_INDICES.SIGMA];
        // the radius is derived from sigma
        elements[i][ELEMENT_INDICES.RADIUS] = lennardJones.radius(sigma_i);

        for (j = i; j < elements.length; j++) {
          epsilon_j = elements[j][ELEMENT_INDICES.EPSILON];
          sigma_j   = elements[j][ELEMENT_INDICES.SIGMA];
          epsilon[i][j] = epsilon[j][i] = lennardJones.pairwiseEpsilon(epsilon_i, epsilon_j);
          sigma[i][j]   = sigma[j][i]   = lennardJones.pairwiseSigma(sigma_i, sigma_j);

          // bind i and j to the callback made below
          (function(i, j) {
            ljCalculator[i][j] = ljCalculator[j][i] = lennardJones.newLJCalculator({
              epsilon: epsilon[i][j],
              sigma:   sigma[i][j]
            }, function(coefficients) {
              ljCoefficientsChanged(i, j, coefficients);
            });
          }(i,j));
        }
      }
    },

    /**
      Allocates 'atoms' array of arrays, sets number of atoms.

      options:
        num: the number of atoms to create
    */
    createAtoms: function(options) {
      var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
          uint8 = (hasTypedArrays && notSafari) ? 'Uint8Array' : 'regular',
          numIndices,
          num;

      if (atomsHaveBeenCreated) {
        throw new Error("md2d: createAtoms was called even though the particles have already been created for this model instance.");
      }
      atomsHaveBeenCreated = true;
      sizeHasBeenInitialized = true;

      if (typeof options === 'undefined') {
        throw new Error("md2d: createAtoms was called without options specifying the atoms to create.");
      }

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

      numIndices = (function() {
        var n = 0, index;
        for (index in INDICES) {
          if (INDICES.hasOwnProperty(index)) n++;
        }
        return n;
      }());

      atoms  = model.atoms  = arrays.create(numIndices, null, 'regular');

      radius  = model.radius  = atoms[INDICES.RADIUS]  = arrays.create(num, 0, float32);
      px      = model.px      = atoms[INDICES.PX]      = arrays.create(num, 0, float32);
      py      = model.py      = atoms[INDICES.PY]      = arrays.create(num, 0, float32);
      x       = model.x       = atoms[INDICES.X]       = arrays.create(num, 0, float32);
      y       = model.y       = atoms[INDICES.Y]       = arrays.create(num, 0, float32);
      vx      = model.vx      = atoms[INDICES.VX]      = arrays.create(num, 0, float32);
      vy      = model.vy      = atoms[INDICES.VY]      = arrays.create(num, 0, float32);
      speed   = model.speed   = atoms[INDICES.SPEED]   = arrays.create(num, 0, float32);
      ax      = model.ax      = atoms[INDICES.AX]      = arrays.create(num, 0, float32);
      ay      = model.ay      = atoms[INDICES.AY]      = arrays.create(num, 0, float32);
      charge  = model.charge  = atoms[INDICES.CHARGE]  = arrays.create(num, 0, float32);
      friction= model.friction= atoms[INDICES.FRICTION]= arrays.create(num, 0, float32);
      element = model.element = atoms[INDICES.ELEMENT] = arrays.create(num, 0, uint8);
      pinned  = model.pinned  = atoms[INDICES.PINNED]  = arrays.create(num, 0, uint8);
      visible = model.visible = atoms[INDICES.VISIBLE] = arrays.create(num, 0, uint8);
      draggable = model.draggable = atoms[INDICES.DRAGGABLE] = arrays.create(num, 0, uint8);

      N = 0;
      totalMass = 0;
    },

    /**
      The canonical method for adding an atom to the collections of atoms.

      If there isn't enough room in the 'atoms' array, it (somewhat inefficiently)
      extends the length of the typed arrays by one to contain one more atom with listed properties.
    */
    addAtom: function(atom_element, atom_x, atom_y, atom_vx, atom_vy, atom_charge, atom_friction, is_pinned, is_visible, is_draggable) {
      var el, mass;

      if (N+1 > atoms[0].length) {
        extendAtomsArray(N+1);
      }

      el = elements[atom_element];
      mass = el[ELEMENT_INDICES.MASS];

      element[N] = atom_element;
      radius[N]  = elements[atom_element][ELEMENT_INDICES.RADIUS];
      x[N]       = atom_x;
      y[N]       = atom_y;
      vx[N]      = atom_vx;
      vy[N]      = atom_vy;
      px[N]      = atom_vx * mass;
      py[N]      = atom_vy * mass;
      ax[N]      = 0;
      ay[N]      = 0;
      speed[N]   = Math.sqrt(atom_vx*atom_vx + atom_vy*atom_vy);
      charge[N]  = atom_charge;
      friction[N]= atom_friction;
      pinned[N]  = is_pinned;
      visible[N] = is_visible;
      draggable[N] = is_draggable;

      if (atom_charge) hasChargedAtoms = true;

      totalMass += mass;
      N++;
    },

    /**
      The generic method to set properties on a single existing atom.

      Example: setAtomProperties(3, {x: 5, y: 8, px: 0.5, charge: -1})
    */
    setAtomProperties: function(i, props) {
      var prop;

      for (prop in props) {
        if (!props.hasOwnProperty(prop)) continue;
        this[prop][i] = props[prop];
      }
    },

    /**
      The canonical method for adding a radial bond to the collection of radial bonds.

      If there isn't enough room in the 'radialBonds' array, it (somewhat inefficiently)
      extends the length of the typed arrays by one to contain one more atom with listed properties.
    */
    addRadialBond: function(atomIndex1, atomIndex2, bondLength, bondStrength) {
      var smallerIndex, largerIndex;
      if(atomIndex1 < atomIndex2) {
        smallerIndex = atomIndex1;
        largerIndex = atomIndex2;
      }
      else {
        smallerIndex = atomIndex2;
        largerIndex = atomIndex1;
      }
      if (N_radialBonds+1 > radialBondAtom1Index.length) {
        extendRadialBondsArray(N_radialBonds+1);
      }

      radialBondAtom1Index[N_radialBonds] = atomIndex1;
      radialBondAtom2Index[N_radialBonds] = atomIndex2;
      radialBondLength[N_radialBonds]     = bondLength;
      radialBondStrength[N_radialBonds]   = bondStrength;

      if (!radialBondsHash[smallerIndex]) {
        radialBondsHash[smallerIndex] = {};
      }
      radialBondsHash[smallerIndex][largerIndex] = true;

      N_radialBonds++;
    },

    /**
      Adds a spring force between an atom and an x, y location.
    */
    addSpringForce: function(atomIndex, x, y, strength) {
      extendSpringForcesArray(N_springForces+1);

      springForceAtomIndex[N_springForces]  = atomIndex;
      springForceX[N_springForces]          = x;
      springForceY[N_springForces]          = y;
      springForceStrength[N_springForces]   = strength;

      N_springForces++;
    },

    updateSpringForce: function(i, x, y) {
      springForceX[i] = x;
      springForceY[i] = y;
    },

    removeSpringForce: function(i) {
      if (i >= N_springForces) return;

      N_springForces--;

      if (N_springForces === 0) {
        createSpringForcesArray(0);
      } else {
        var savedArrays = [],
            j;

        for (j = 0; j < springForces.length; j++) {
          if (j !== i) {
            savedArrays.push(springForces[i]);
          }
        }

        createSpringForcesArray(N_springForces);

        for (j = 0; j < springForces.length; j++) {
          arrays.copy(savedArrays[i], springForces[i]);
        }
      }
    },

    addObstacle: function(x, y, width, height, density, color, visible) {
      var mass;

      if (N_obstacles+1 > obstacleX.length) {
        extendObstaclesArray(N_obstacles+1);
      }

      obstacleX[N_obstacles] = x;
      obstacleY[N_obstacles] = y;
      obstacleXPrev[N_obstacles] = x;
      obstacleYPrev[N_obstacles] = y;

      obstacleWidth[N_obstacles]  = width;
      obstacleHeight[N_obstacles] = height;

      obstacleVX[N_obstacles] = 0;
      obstacleVY[N_obstacles] = 0;

      density = parseFloat(density);      // may be string "Infinity"
      mass = density * width * height;

      obstacleMass[N_obstacles] = mass;

      obstacleColorR[N_obstacles] = color[0];
      obstacleColorG[N_obstacles] = color[1];
      obstacleColorB[N_obstacles] = color[2];

      obstacleVisible[N_obstacles] = visible;

      N_obstacles++;
    },

    /**
      Checks to see if an uncharged atom could be placed at location x,y
      without increasing the PE (i.e. overlapping with another atom), and
      without being on an obstacle.

      Optionally, an atom index i can be included which will tell the function
      to ignore the existance of atom i. (Used when moving i around.)
    */
    canPlaceAtom: function(element, _x, _y, i) {
      var r,
          orig_x, orig_y,
          PEAtLocation,
          j;

      // first do the simpler check to see if we're on an obstacle
      r = radius[i];
      for (j = 0; j < N_obstacles; j++) {
        if (_x > (obstacleX[j] - r) && _x < (obstacleX[j] + obstacleWidth[j] + r) &&
            _y > (obstacleY[j] - r) && _y < (obstacleY[j] + obstacleHeight[j] + r)) {
          return false;
        }
      }

      // then check PE at location
      if (typeof i === "number") {
        orig_x = x[i];
        orig_y = y[i];
        x[i] = y[i] = Infinity;   // move i atom away
      }

      PEAtLocation = model.newPotentialCalculator(element, 0, false)(_x, _y);

      if (typeof i === "number") {
        x[i] = orig_x;
        y[i] = orig_y;
      }

      return PEAtLocation <= 0;
    },

    // Sets the X, Y, VX, VY and ELEMENT properties of the atoms
    initializeAtomsFromProperties: function(props) {
      var x, y, vx, vy, charge, element, friction, pinned, visible, draggable,
          i, ii;

      if (!(props.X && props.Y)) {
        throw new Error("md2d: initializeAtomsFromProperties must specify at minimum X and Y locations.");
      }

      if (!(props.VX && props.VY)) {
        // We may way to support authored locations with random velocities in the future
        throw new Error("md2d: For now, velocities must be set when locations are set.");
      }

      for (i=0, ii=props.X.length; i<ii; i++){
        element = props.ELEMENT ? props.ELEMENT[i] : 0;
        x = props.X[i];
        y = props.Y[i];
        vx = props.VX[i];
        vy = props.VY[i];
        charge = props.CHARGE ? props.CHARGE[i] : 0;
        pinned = props.PINNED ? props.PINNED[i] : 0;
        visible = props.VISIBLE ? props.VISIBLE[i] : 1;
        friction = props.FRICTION ? props.FRICTION[i] : 0;
        draggable = props.DRAGGABLE ? props.DRAGGABLE[i] : 0;

        model.addAtom(element, x, y, vx, vy, charge, friction, pinned, visible, draggable);
      }

      // Publish the current state
      T = computeTemperature();
      model.computeOutputState();
    },

    initializeAtomsRandomly: function(options) {

      var // if a temperature is not explicitly requested, we just need any nonzero number
          temperature = options.temperature || 100,

          // fill up the entire 'atoms' array if not otherwise requested
          num         = options.num         || atoms[0].length,

          nrows = Math.floor(Math.sqrt(num)),
          ncols = Math.ceil(num/nrows),

          i, r, c, rowSpacing, colSpacing,
          vMagnitude, vDirection,
          x, y, vx, vy, charge, friction, element;

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

          element    = Math.floor(Math.random() * elements.length);     // random element
          vMagnitude = math.normal(1, 1/4);
          vDirection = 2 * Math.random() * Math.PI;

          x = c*colSpacing;
          y = r*rowSpacing;
          vx = vMagnitude * Math.cos(vDirection);
          vy = vMagnitude * Math.sin(vDirection);

          charge = 2*(i%2)-1;      // alternate negative and positive charges

          model.addAtom(element, x, y, vx, vy, charge, 0, 0, 1, 0);
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
      model.computeOutputState();
    },

    initializeObstacles: function (props) {
      var num = props.x.length,
          i;

      createObstaclesArray(num);
      for (i = 0; i < num; i++) {
        model.addObstacle(props.x[i], props.y[i], props.width[i], props.height[i], props.density[i], props.color[i], props.visible[i]);
      }
    },

    initializeRadialBonds: function(props) {
      var num = props.atom1Index.length,
          i;
      radialBondsHash = {};
      createRadialBondsArray(num);

      for (i = 0; i < num; i++) {
        model.addRadialBond(
          props.atom1Index[i],
          props.atom2Index[i],
          props.bondLength[i],
          props.bondStrength[i]
        );
      }
    },

    createVdwPairsArray: function(num) {
      var uint16  = (hasTypedArrays && notSafari) ? 'Uint16Array' : 'regular',
        vdwIndices = VDW_INDICES,
        numAtoms = num.ELEMENT.length;
      var maxNumPairs = (((numAtoms)*(numAtoms-1))/2);

      vdwPairs = model.vdwPairs = [];

      vdwPairs[vdwIndices.ATOM1] = vdwPairAtom1Index = arrays.create(maxNumPairs, 0, uint16);
      vdwPairs[vdwIndices.ATOM2] = vdwPairAtom2Index = arrays.create(maxNumPairs, 0, uint16);
      model.updateVdwPairsArray();

    },

    updateVdwPairsArray: function(){
      var i, j,
        dx, dy,
        r_sq,
        element_i, element_j,
        sigma_i, epsilon_i,
        sigma_j, epsilon_j,
        sig, eps,
        distanceCutoff_sq = 4, // vdwLinesRatio * vdwLinesRatio : 2*2 for long distance cutoff
        prevVdwPairsNum = vdwPairNum || 0;
      vdwPairNum = 0;

      for (i = 0; i < N; i++) {
        // pairwise interactions
        element_i = elements[element[i]];
        sigma_i = element_i[ELEMENT_INDICES.SIGMA];
        epsilon_i = element_i[ELEMENT_INDICES.EPSILON];
        for (j = i+1; j < N; j++) {
          if (N_radialBonds !== 0 && (radialBondsHash[i] && radialBondsHash[i][j])) continue;
          element_j = elements[element[j]];
          if(charge[i]*charge[j] <= 0){
            dx = x[j] - x[i];
            dy = y[j] - y[i];
            r_sq = dx*dx + dy*dy;
            sigma_j = element_j[ELEMENT_INDICES.SIGMA];
            epsilon_j = element_j[ELEMENT_INDICES.EPSILON];
            sig = 0.5*(sigma_i+sigma_j);
            sig *= sig;
            eps = epsilon_i*epsilon_j;
            if (r_sq < sig * distanceCutoff_sq && eps > 0) {
              vdwPairAtom1Index[vdwPairNum] = i;
              vdwPairAtom2Index[vdwPairNum] = j;
              vdwPairNum++;
            }
          }
        }
      }
      //Logic to clear off the previous atoms indices from the array which are far apart than cutoff distance after array update
      if(vdwPairNum < prevVdwPairsNum) {
        for(i = vdwPairNum;i<prevVdwPairsNum;i++) {
           vdwPairAtom1Index[i] = 0;
           vdwPairAtom2Index[i] = 0;
        }
      }
    },

    relaxToTemperature: function(T) {

      // FIXME this method needs to be modified. It should rescale velocities only periodically
      // and stop when the temperature approaches a steady state between rescalings.

      if (T != null) T_target = T;

      validateTemperature(T_target);

      beginTransientTemperatureChange();
      while (temperatureChangeInProgress) {
        model.integrate();
      }
    },

    integrate: function(duration, opt_dt) {

      var radius;

      if (!atomsHaveBeenCreated) {
        throw new Error("md2d: integrate called before atoms created.");
      }

      if (duration == null)  duration = 100;  // how much time to integrate over, in fs

      dt = opt_dt || 1;
      dt_sq = dt*dt;                      // time step, squared

      // FIXME we still need to make bounceOffWalls respect each atom's actual radius, rather than
      // assuming just one radius as below
      radius = elements[element[0]][ELEMENT_INDICES.RADIUS];

      var t_start = time,
          n_steps = Math.floor(duration/dt),  // number of steps
          iloop,
          i,
          x_prev,
          y_prev;

      for (iloop = 1; iloop <= n_steps; iloop++) {
        time = t_start + iloop*dt;

        for (i = 0; i < N; i++) {
          x_prev = x[i];
          y_prev = y[i];

          // Update r(t+dt) using v(t) and a(t)
          updatePosition(i);
          bounceOffWalls(i);
          bounceOffObstacles(i, x_prev, y_prev);

          // First half of update of v(t+dt, i), using v(t, i) and a(t, i)
          halfUpdateVelocity(i);

          // Zero out a(t, i) for accumulation of a(t+dt, i)
          ax[i] = ay[i] = 0;

          // Accumulate accelerations for time t+dt into a(t+dt, k) for k <= i. Note that a(t+dt, i) won't be
          // usable until this loop completes; it won't have contributions from a(t+dt, k) for k > i
          updatePairwiseAccelerations(i);
        }

        // Move obstacles
        for (i = 0; i < N_obstacles; i++) {
          updateObstaclePosition(i);
        }

        // Accumulate accelerations from bonded interactions into a(t+dt)
        updateBondAccelerations();

        // Accumulate accelerations from spring forces
        updateSpringAccelerations();

        // Accumulate optional gravitational accelerations
        updateGravitationalAcceleration();

        // Accumulate friction/drag accelerations
        updateFrictionAccelerations();

        for (i = 0; i < N; i++) {
          // Clearing the acceleration here from pinned atoms will cause the acceleration
          // to be zero for both halfUpdateVelocity methods and updatePosition, freezing the atom
          if (pinned[i]) pinAtom(i);

          // Second half of update of v(t+dt, i) using first half of update and a(t+dt, i)
          halfUpdateVelocity(i);

          // Now that we have velocity, update speed
          speed[i] = Math.sqrt(vx[i]*vx[i] + vy[i]*vy[i]);
        }

        adjustTemperature();
      } // end of integration loop
      model.computeOutputState();
    },

    getTotalMass: function() {
      return totalMass;
    },

    getRadiusOfElement: function(el) {
      return elements[el][ELEMENT_INDICES.RADIUS];
    },

    computeOutputState: function() {
      var i, j,
          i1, i2,
          el1, el2,
          dx, dy,
          r_sq,
          k,
          dr,
          gravPEInMWUnits,
          KEinMWUnits,       // total kinetic energy, in MW units
          PE;                // potential energy, in eV

      // Calculate potentials in eV. Note that we only want to do this once per call to integrate(), not once per
      // integration loop!
      PE = 0;
      KEinMWUnits = 0;

      for (i = 0; i < N; i++) {

        // gravitational PE
        if (gravitationalField) {
          gravPEInMWUnits = elements[i][ELEMENT_INDICES.MASS] * gravitationalField * y[i];
          PE += constants.convert(gravPEInMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
        }

        KEinMWUnits += 0.5 * elements[element[i]][0] * (vx[i] * vx[i] + vy[i] * vy[i]);

        // pairwise interactions
        for (j = i+1; j < N; j++) {
          dx = x[j] - x[i];
          dy = y[j] - y[i];

          r_sq = dx*dx + dy*dy;

          // report total potentials as POSITIVE, i.e., - the value returned by potential calculators
          if (useLennardJonesInteraction) {
            PE += -ljCalculator[element[i]][element[j]].potentialFromSquaredDistance(r_sq);
          }
          if (useCoulombInteraction && hasChargedAtoms) {
            PE += -coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j]);
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
      }

      // State to be read by the rest of the system:
      outputState.time     = time;
      outputState.pressure = 0;// (time - t_start > 0) ? pressure / (time - t_start) : 0;
      outputState.PE       = PE;
      outputState.KE       = constants.convert(KEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
      outputState.T        = T;
      outputState.pCM      = [px_CM, py_CM];
      outputState.CM       = [x_CM, y_CM];
      outputState.vCM      = [vx_CM, vy_CM];
      outputState.omega_CM = omega_CM;
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
      var pot    = model.newPotentialCalculator(el, charge, true),
          radius = elements[el][ELEMENT_INDICES.RADIUS],

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
      var pot = model.newPotentialCalculator(el, charge, true),

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

          radius = elements[el][ELEMENT_INDICES.RADIUS],

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
        for (j = 0, jj = radialBonds[0].length; j < jj; j++) {
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

    setViscosity: function(v) {
      viscosity = v;
    },

    serialize: function() {
      var serializedData = {},
          prop,
          array,
          i, ii;
      for (i=0, ii=SAVEABLE_INDICES.length; i<ii; i++) {
        prop = SAVEABLE_INDICES[i];
        array = atoms[INDICES[prop]];
        serializedData[prop] = array.slice ? array.slice() : copyTypedArray(array);
      }
      return serializedData;
    }
  };
};