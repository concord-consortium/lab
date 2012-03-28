/*globals Float32Array */
/*globals Float32Array window*/
/*jslint eqnull: true */

if (typeof window === 'undefined') window = {};

var model = exports.model = {},

    arrays       = require('./arrays/arrays').arrays,
    constants    = require('./constants'),
    unit         = constants.unit,
    math         = require('./math'),
    coulomb      = require('./potentials').coulomb,
    lennardJones = window.lennardJones = require('./potentials').getLennardJonesCalculator(),

    // from A. Rahman "Correlations in the Motion of Atoms in Liquid Argon", Physical Review 136 pp. A405–A411 (1964)
    ARGON_LJ_EPSILON_IN_EV = -120 * constants.BOLTZMANN_CONSTANT.as(unit.EV_PER_KELVIN),
    ARGON_LJ_SIGMA_IN_NM   = 0.34,

    ARGON_MASS_IN_DALTON = 39.95,
    ARGON_MASS_IN_KG = constants.convert(ARGON_MASS_IN_DALTON, { from: unit.DALTON, to: unit.KILOGRAM }),

    BOLTZMANN_CONSTANT_IN_JOULES = constants.BOLTZMANN_CONSTANT.as( unit.JOULES_PER_KELVIN ),

    makeIntegrator,
    ljfLimitsNeedToBeUpdated = true,
    setup_ljf_limits,
    setup_coulomb_limits,

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

    // having finite values for these are a hack that get the relative strength of the forces wrong
    maxLJRepulsion = -Infinity,

    // determined by sigma
    cutoffDistance_LJ,

    size = [10, 10],

    //
    // Individual property arrays for the particles
    //
    radius, px, py, x, y, vx, vy, speed, ax, ay, mass, charge,

    //
    // Total mass of all particles in the system
    //
    totalMass,

    // the total mass of all particles
    //
    // Number of individual properties for a particle
    //
    nodePropertiesCount = 12,

    //
    // A two dimensional array consisting of arrays of particle property values
    //
    nodes,

    //
    // Indexes into the nodes array for the individual particle property arrays
    //
    // Access to these within this module will be faster if they are vars in this closure rather than property lookups.
    // However, publish the indices to model.INDICES for use outside this module.
    //
    RADIUS_INDEX   =  0,
    PX_INDEX       =  1,
    PY_INDEX       =  2,
    X_INDEX        =  3,
    Y_INDEX        =  4,
    VX_INDEX       =  5,
    VY_INDEX       =  6,
    SPEED_INDEX    =  7,
    AX_INDEX       =  8,
    AY_INDEX       =  9,
    MASS_INDEX = 10,
    CHARGE_INDEX   = 11;

model.INDICES = {
  RADIUS   : RADIUS_INDEX,
  PX       : PX_INDEX,
  PY       : PY_INDEX,
  X        : X_INDEX,
  Y        : Y_INDEX,
  VX       : VX_INDEX,
  VY       : VY_INDEX,
  SPEED    : SPEED_INDEX,
  AX       : AX_INDEX,
  AY       : AY_INDEX,
  MASS     : MASS_INDEX,
  CHARGE   : CHARGE_INDEX
};


lennardJones.setEpsilon(ARGON_LJ_EPSILON_IN_EV);
lennardJones.setSigma(ARGON_LJ_SIGMA_IN_NM);

model.setSize = function(x) {
  //size = x;
};

// FIXME: disabled for now, so the view doesn't try to change epsilon
model.setLJEpsilon = function(e) {
  lennardJones.setEpsilon(e);
  ljfLimitsNeedToBeUpdated = true;
};

// FIXME: disabled for now, so the view doesn't try to change sigma
model.setLJSigma = function(s) {
  lennardJones.setSigma(s);
  ljfLimitsNeedToBeUpdated = true;
};

model.getLJEpsilon = function() {
  return lennardJones.coefficients().epsilon;
};

model.getLJSigma = function() {
  return lennardJones.coefficients().sigma;
};

// Returns the LJ calculator. Be careful with it!
model.getLJCalculator = function() {
  return lennardJones;
};

//
// Calculate the minimum and maximum distances for applying Lennard-Jones forces
//
setup_ljf_limits = function() {
  // for any epsilon:
  // 1 - lennardJones.potential(5*lennardJones.coefficients().rmin) / lennardJones.potential(Infinity) ~= 1e-4
  cutoffDistance_LJ = lennardJones.coefficients().rmin * 5;
  ljfLimitsNeedToBeUpdated = false;
};

//
// Calculate the minimum and maximum distances for applying Coulomb forces
//
setup_coulomb_limits = function() {
};

model.createNodes = function(options) {
  options = options || {};

  var num                    = options.num                    || 50,
      temperature            = options.temperature            || 100,

      rmin = lennardJones.coefficients().rmin,

      mol_rmin_radius_factor = 0.5,

      // special-case:
      arrayType = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',

      k_inJoulesPerKelvin = constants.BOLTZMANN_CONSTANT.as(unit.JOULES_PER_KELVIN),

      mass_in_kg, v0_MKS, v0,
      i, r, c, nrows, ncols, rowSpacing, colSpacing,
      vMagnitude, vDirection,
      pCMx = 0,
      pCMy = 0,
      vCMx, vCMy;

  nrows = Math.floor(Math.sqrt(num));
  ncols = Math.ceil(num/nrows);

  model.nodes = nodes = arrays.create(nodePropertiesCount, null, 'regular');

  // model.INDICES.RADIUS = 0
  nodes[model.INDICES.RADIUS] = arrays.create(num, rmin * mol_rmin_radius_factor, arrayType );
  model.radius = radius = nodes[model.INDICES.RADIUS];

  // model.INDICES.PX     = 1;
  nodes[model.INDICES.PX] = arrays.create(num, 0, arrayType);
  model.px = px = nodes[model.INDICES.PX];

  // model.INDICES.PY     = 2;
  nodes[model.INDICES.PY] = arrays.create(num, 0, arrayType);
  model.py = py = nodes[model.INDICES.PY];

  // model.INDICES.X      = 3;
  nodes[model.INDICES.X] = arrays.create(num, 0, arrayType);
  model.x = x = nodes[model.INDICES.X];

  // model.INDICES.Y      = 4;
  nodes[model.INDICES.Y] = arrays.create(num, 0, arrayType);
  model.y = y = nodes[model.INDICES.Y];

  // model.INDICES.VX     = 5;
  nodes[model.INDICES.VX] = arrays.create(num, 0, arrayType);
  model.vx = vx = nodes[model.INDICES.VX];

  // model.INDICES.VY     = 6;
  nodes[model.INDICES.VY] = arrays.create(num, 0, arrayType);
  model.vy = vy = nodes[model.INDICES.VY];

  // model.INDICES.SPEED  = 7;
  nodes[model.INDICES.SPEED] = arrays.create(num, 0, arrayType);
  model.speed = speed = nodes[model.INDICES.SPEED];

  // model.INDICES.AX     = 8;
  nodes[model.INDICES.AX] = arrays.create(num, 0, arrayType);
  model.ax = ax = nodes[model.INDICES.AX];

  // model.INDICES.AY     = 9;
  nodes[model.INDICES.AY] = arrays.create(num, 0, arrayType);
  model.ay = ay = nodes[model.INDICES.AY];

  // model.INDICES.MASS = 10;
  nodes[model.INDICES.MASS] = arrays.create(num, ARGON_MASS_IN_DALTON, arrayType);
  model.mass = mass = nodes[model.INDICES.MASS];

  totalMass = model.totalMass = ARGON_MASS_IN_DALTON * num;

  // model.INDICES.CHARGE   = 11;
  nodes[model.INDICES.CHARGE] = arrays.create(num, 0, arrayType);
  model.charge = charge = nodes[model.INDICES.CHARGE];

  colSpacing = size[0] / (1+ncols);
  rowSpacing = size[1] / (1+nrows);

  console.log('initializing to temp', temperature);
  // Arrange molecules in a lattice. Not guaranteed to have CM exactly on center, and is an artificially low-energy
  // configuration. But it works OK for now.
  i = -1;

  for (r = 1; r <= nrows; r++) {
    for (c = 1; c <= ncols; c++) {
      i++;
      if (i === num) break;

      x[i] = c*colSpacing;
      y[i] = r*rowSpacing;

      // Randomize velocities, exactly balancing the motion of the center of mass by making the second half of the
      // set of atoms have the opposite velocities of the first half. (If the atom number is odd, the "odd atom out"
      // should have 0 velocity).
      //
      // Note that although the instantaneous temperature will be 'temperature' exactly, the temperature will quickly
      // settle to a lower value because we are initializing the atoms spaced far apart, in an artificially low-energy
      // configuration.

      if (i < Math.floor(num/2)) {      // 'middle' atom will have 0 velocity

        // Note kT = m<v^2>/2 because there are 2 degrees of freedom per atom, not 3
        // TODO: define constants to avoid unnecesssary conversions below.

        mass_in_kg = constants.convert(mass[i], { from: unit.DALTON, to: unit.KILOGRAM });
        v0_MKS = Math.sqrt(2 * k_inJoulesPerKelvin * temperature / mass_in_kg);
        // FIXME: why does this velocity need a sqrt(2)/10 correction?
        // (no, not because of potentials...)
        v0 = constants.convert(v0_MKS, { from: unit.METERS_PER_SECOND, to: unit.MW_VELOCITY_UNIT });

        vMagnitude = math.normal(v0, v0/4);
        vDirection = 2 * Math.random() * Math.PI;
        vx[i] = vMagnitude * Math.cos(vDirection);
        vy[i] = vMagnitude * Math.sin(vDirection);
        vx[num-i-1] = -vx[i];
        vy[num-i-1] = -vy[i];
      }

      pCMx += vx[i] * mass[i];
      pCMy += vy[i] * mass[i];

      ax[i] = 0;
      ay[i] = 0;

      speed[i]  = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      charge[i] = 2*(i%2)-1;      // alternate negative and positive charges
    }
  }

  vCMx = pCMx / totalMass;
  vCMy = pCMy / totalMass;
};


makeIntegrator = function(args) {

  var time           = 0,
      setOnceState   = args.setOnceState,
      readWriteState = args.readWriteState,
      settableState  = args.settableState || {},

      outputState    = window.state = {},

      size                   = setOnceState.size,

      ax                   = readWriteState.ax,
      ay                   = readWriteState.ay,
      charge               = readWriteState.charge,
      nodes                = readWriteState.nodes,
      N                    = nodes[0].length,
      radius               = readWriteState.radius,
      speed                = readWriteState.speed,
      vx                   = readWriteState.vx,
      vy                   = readWriteState.vy,
      x                    = readWriteState.x,
      y                    = readWriteState.y,

      useCoulombInteraction      = settableState.useCoulombInteraction,
      useLennardJonesInteraction = settableState.useLennardJonesInteraction,
      useThermostat              = settableState.useThermostat,

      // Desired temperature. We will simulate coupling to an infinitely large heat bath at desired
      // temperature T_target.
      T_target                   = settableState.targetTemperature,

      // Set to true when a temperature change is requested, reset to false when system approaches temperature
      temperatureChangeInProgress = false,

      // Whether to immediately break out of the integration loop when the target temperature is reached.
      // Used only by relaxToTemperature()
      breakOnTargetTemperature = false,

      // Coupling factor for Berendsen thermostat. In theory, 1 = "perfectly" constrained temperature.
      // (Of course, we're not measuring temperature *quite* correctly.)
      thermostatCouplingFactor = 0.1,

      // Tolerance for (T_actual - T_target) relative to T_target
      tempTolerance = 0.001,

      // Take a value T, return an average of the last n values
      T_windowed,

      getWindowSize = function() {
        // Average over a larger window if Coulomb force (which should result in larger temperature excursions)
        // is in effect. 50 vs. 10 below were chosen by fiddling around, not for any theoretical reasons.
        return useCoulombInteraction ? 1000 : 1000;
      },

      adjustTemperature = function(options)  {
        if (options == null) options = {};

        var windowSize = options.windowSize || getWindowSize();
        temperatureChangeInProgress = true;
        T_windowed = math.getWindowedAverager( windowSize );
      },

      /**
        Input units:
          KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
        Output units:
          T: K
      */
      KE_to_T = function(internalKEinMWUnits) {
        // In 2 dimensions, kT = (2/N_df) * KE

        // We are using "internal coordinates" from which 2 (1?) angular and 2 translational degrees of freedom have
        // been removed

        var N_df = 2 * N - 4,
            averageKEinMWUnits = (2 / N_df) * internalKEinMWUnits,
            averageKEinJoules = constants.convert(averageKEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.JOULE });

        return averageKEinJoules / BOLTZMANN_CONSTANT_IN_JOULES;
      },

      x_CM, y_CM,         // x, y position of center of mass in "real" coordinates
      px_CM, py_CM,       // x, y velocity of center of mass in "real" coordinates
      vx_CM, vy_CM,       // x, y velocity of center of mass in "real" coordinates
      omega_CM,           // angular velocity around the center of mass

      cross = function(a, b) {
        return a[0]*b[1] - a[1]*b[0];
      },

      sumSquare = function(a,b) {
        return a*a + b*b;
      },

      calculateOmega_CM = function() {
        var i, I_CM = 0, L_CM = 0;
        for (i = 0; i < N; i++) {
          // I_CM = sum over N of of mr_i x p_i (where r_i and p_i are position & momentum vectors relative to the CM)
          I_CM += mass[i] * cross( [x[i]-x_CM, y[i]-y_CM], [vx[i]-vx_CM, vy[i]-vy_CM]);
          L_CM += mass[i] * sumSquare( x[i]-x_CM, y[i]-y_CM );
        }
        return I_CM / L_CM;
      },

      convertToReal = function(i) {
        vx[i] = vx[i] + vx_CM - omega_CM * (y[i] - y_CM);
        vy[i] = vy[i] + vy_CM + omega_CM * (x[i] - x_CM);
      },

      convertToInternal = function(i) {
        vx[i] = vx[i] - vx_CM + omega_CM * (y[i] - y_CM);
        vy[i] = vy[i] - vy_CM - omega_CM * (x[i] - x_CM);
      },

      i;

      x_CM = y_CM = px_CM = py_CM = vx_CM = vy_CM = 0;

      for (i = 0; i < N; i++) {
        x_CM += x[i];
        y_CM += y[i];
        px_CM += vx[i] * mass[i];
        py_CM += vy[i] * mass[i];
      }

      x_CM /= N;
      y_CM /= N;
      vx_CM = px_CM / totalMass;
      vy_CM = py_CM / totalMass;

      omega_CM = calculateOmega_CM();

  outputState.time = time;

  return {

    useCoulombInteraction      : function(v) {
      if (v !== useCoulombInteraction) {
        useCoulombInteraction = v;
        adjustTemperature();
      }
    },

    useLennardJonesInteraction : function(v) {
      if (v !== useLennardJonesInteraction) {
        useLennardJonesInteraction = v;
        if (useLennardJonesInteraction) {
          adjustTemperature();
        }
      }
    },

    useThermostat              : function(v) {
      useThermostat = v;
    },

    setTargetTemperature       : function(v) {
      console.log('target temp = ', v);
      if (v !== T_target) {
        T_target = v;
        adjustTemperature();
      }
      T_target = v;
    },

    relaxToTemperature: function(T) {
      if (T != null) T_target = T;

      // doesn't work on IE9
      // console.log("T_target = ", T_target);
      // override window size
      adjustTemperature();

      breakOnTargetTemperature = true;
      while (temperatureChangeInProgress) {
        this.integrate();
      }
      breakOnTargetTemperature = false;
    },

    getOutputState: function() {
      return outputState;
    },

    integrate: function(duration, dt) {

      // FIXME. Recommended timestep for accurate simulation is τ/200
      // using rescaled t where t → τ(mσ²/ϵ)^½  (~= 1 ps for argon)
      // This is hardcoded below for the "Argon" case by setting dt = 5 fs:

      if (duration == null)  duration = 500;  // how much "time" to integrate over
      if (dt == null) dt = 5;

      if (ljfLimitsNeedToBeUpdated) setup_ljf_limits();

      var t_start = time,
          n_steps = Math.floor(duration/dt),  // number of steps
          dt_sq = dt*dt,                      // time step, squared
          i,
          j,
          v_sq, r_sq,

          x_sum, y_sum,

          cutoffDistance_LJ_sq      = cutoffDistance_LJ * cutoffDistance_LJ,
          maxLJRepulsion_sq         = maxLJRepulsion * maxLJRepulsion,

          f, f_over_r, aPair_over_r, aPair_x, aPair_y, // pairwise forces /accelerations and their x, y components
          dx, dy,
          iloop,
          leftwall   = radius[0],
          bottomwall = radius[0],
          rightwall  = size[0] - radius[0],
          topwall    = size[1] - radius[0],

          realKEinMWUnits,   // KE in "real" coordinates, in MW Units
          PE,                // potential energy, in eV

          twoKE_internal,    // 2*KE in "internal" coordinates, in MW Units
          T,                 // instantaneous temperature, in Kelvin
          vRescalingFactor;  // rescaling factor for Berendsen thermostat

          // measurements to be accumulated during the integration loop:
          // pressure = 0;

      // when coordinates are converted to "real" coordinates when leaving this method, so convert back
      twoKE_internal = 0;
      for (i = 0; i < N; i++) {
        convertToInternal(i);
        twoKE_internal += mass[i] * (vx[i] * vx[i] + vy[i] * vy[i]);
      }
      T = KE_to_T( twoKE_internal/2 );

      // update time
      for (iloop = 1; iloop <= n_steps; iloop++) {
        time = t_start + iloop*dt;

        if (temperatureChangeInProgress && Math.abs(T_windowed(T) - T_target) <= T_target * tempTolerance) {
          temperatureChangeInProgress = false;
          if (breakOnTargetTemperature) break;
        }

        // rescale velocities based on ratio of target temp to measured temp (Berendsen thermostat)
        vRescalingFactor = 1;
        if (temperatureChangeInProgress || useThermostat && T > 0) {
          vRescalingFactor = Math.sqrt(1 + thermostatCouplingFactor * (T_target / T - 1));
        }

        // Initialize sums such as 'twoKE_internal' which need be accumulated once per integration loop:
        twoKE_internal = 0;
        x_sum = 0;
        y_sum = 0;
        px_CM = 0;
        py_CM = 0;

        //
        // Use velocity Verlet integration to continue particle movement integrating acceleration with
        // existing position and previous position while managing collision with boundaries.
        //
        // Update positions for first half of verlet integration
        //
        for (i = 0; i < N; i++) {

          // Rescale v(t) using T(t)
          if (vRescalingFactor !== 1) {
            vx[i] *= vRescalingFactor;
            vy[i] *= vRescalingFactor;
          }

          // (1) convert velocities from "internal" to "real" velocities before calculating x, y and updating px, py
          convertToReal(i);

          // calculate x(t+dt) from v(t) and a(t)
          x[i] += vx[i]*dt + 0.5*ax[i]*dt_sq;
          y[i] += vy[i]*dt + 0.5*ay[i]*dt_sq;

          v_sq  = vx[i]*vx[i] + vy[i]*vy[i];
          speed[i] = Math.sqrt(v_sq);

          // Bounce off vertical walls.
          if (x[i] < leftwall) {
            x[i]  = leftwall + (leftwall - x[i]);
            vx[i] *= -1;
          } else if (x[i] > rightwall) {
            x[i]  = rightwall - (x[i] - rightwall);
            vx[i] *= -1;
          }

          // Bounce off horizontal walls
          if (y[i] < bottomwall) {
            y[i]  = bottomwall + (bottomwall - y[i]);
            vy[i] *= -1;
          } else if (y[i] > topwall) {
            y[i]  = topwall - (y[i] - topwall);
            vy[i] *= -1;
          }

          // Bouncing of walls like changes the overall momentum and center of mass, so accumulate them for later
          px_CM += mass[i] * vx[i];
          py_CM += mass[i] * vy[i];

          x_sum += x[i];
          y_sum += y[i];
        }

        // (2) recaclulate CM, v_CM, omega_CM for translation back to "internal" coordinates

        // Note:
        // px_CM = px_CM(t+dt) even though we haven't updated velocities using accelerations a(t) and a(t+dt).
        // That is because the accelerations are strictly pairwise and should be momentum-conserving.
        // Momentum

        x_CM = x_sum / N;
        y_CM = y_sum / N;

        vx_CM = px_CM / totalMass;
        vy_CM = py_CM / totalMass;

        omega_CM = calculateOmega_CM();

        for (i = 0; i < N; i++) {

          // (3) convert back to internal coordinates
          convertToInternal(i);

          // FIRST HALF of calculation of v(t+dt):  v1(t+dt) <- v(t) + 0.5*a(t)*dt;
          vx[i] += 0.5*ax[i]*dt;
          vy[i] += 0.5*ay[i]*dt;

          // now that we used ax[i], ay[i] from a(t), zero them out for accumulation of pairwise interactions in a(t+dt)
          ax[i] = 0;
          ay[i] = 0;
        }

        // Calculate a(t+dt), step 2: Sum over all pairwise interactions.
        if (useLennardJonesInteraction || useCoulombInteraction) {
          for (i = 0; i < N; i++) {
            for (j = i+1; j < N; j++) {
              dx = x[j] - x[i];
              dy = y[j] - y[i];

              r_sq = dx*dx + dy*dy;

              if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq) {
                f_over_r = lennardJones.forceOverDistanceFromSquaredDistance(r_sq);

                // Cap force to maxLJRepulsion. This should be a relatively rare occurrence, so ignore
                // the cost of the (expensive) square root calculation.
                if (f_over_r * f_over_r * r_sq > maxLJRepulsion_sq) {
                  f_over_r = maxLJRepulsion / Math.sqrt(r_sq);
                }

                // Units of fx, fy are "MW Force Units", Dalton * nm / fs^2
                aPair_over_r = f_over_r / mass[i];
                aPair_x = aPair_over_r * dx;
                aPair_y = aPair_over_r * dy;

                // positive = attractive, negative = repulsive
                ax[i] += aPair_x;
                ay[i] += aPair_y;
                ax[j] -= aPair_x;
                ay[j] -= aPair_y;
              }

              if (useCoulombInteraction) {
                f = coulomb.forceFromSquaredDistance(r_sq, charge[i], charge[j]);
                f_over_r = f / Math.sqrt(r_sq);

                aPair_over_r = f_over_r / mass[i];
                aPair_x = aPair_over_r * dx;
                aPair_y = aPair_over_r * dy;

                ax[i] += aPair_x;
                ay[i] += aPair_y;
                ax[j] -= aPair_x;
                ay[j] -= aPair_y;
              }
            }
          }
        }

        // SECOND HALF of calculation of v(t+dt): v(t+dt) <- v1(t+dt) + 0.5*a(t+dt)*dt
        for (i = 0; i < N; i++) {
          vx[i] += 0.5*ax[i]*dt;
          vy[i] += 0.5*ay[i]*dt;

          v_sq  = vx[i]*vx[i] + vy[i]*vy[i];
          twoKE_internal += mass[i] * v_sq;
          speed[i] = Math.sqrt(v_sq);
        }

        // Calculate T(t+dt) from v(t+dt)
        T = KE_to_T( twoKE_internal/2 );
      }

      // Calculate potentials in eV. Note that we only want to do this once per call to integrate(), not once per
      // integration loop!
      PE = 0;
      realKEinMWUnits= 0;
      for (i = 0; i < N; i++) {
        convertToReal(i);

        realKEinMWUnits += 0.5 * mass[i] * vx[i] * vx[i] + vy[i] * vy[i];
        for (j = i+1; j < N; j++) {
          dx = x[j] - x[i];
          dy = y[j] - y[i];

          r_sq = dx*dx + dy*dy;

          if (useLennardJonesInteraction ) {
            PE += lennardJones.potentialFromSquaredDistance(r_sq);
          }
          if (useCoulombInteraction) {
            PE += coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j]);
          }
        }
      }

      // State to be read by the rest of the system:
      outputState.time = time;
      outputState.pressure = 0;// (time - t_start > 0) ? pressure / (time - t_start) : 0;
      outputState.PE = PE;
      outputState.KE = constants.convert(realKEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
      outputState.T = T;
      outputState.pCM = [px_CM, py_CM];
      outputState.CM = [x_CM, y_CM];
      outputState.vCM = [vx_CM, vy_CM];
      outputState.omega_CM = omega_CM;
    }
  };
};

model.getIntegrator = function(options, integratorOutputState) {
  options = options || {};
  var lennard_jones_forces = options.lennard_jones_forces || true,
      coulomb_forces       = options.coulomb_forces       || false,
      temperature_control  = options.temperature_control  || false,
      temperature          = options.temperature          || 1,
      integrator;

  // just needs to be done once, right now.
  setup_coulomb_limits();

  integrator = makeIntegrator({

    setOnceState: {
      size                : size
    },

    settableState: {
      useLennardJonesInteraction : lennard_jones_forces,
      useCoulombInteraction      : coulomb_forces,
      useThermostat              : temperature_control,
      targetTemperature          : temperature
    },

    readWriteState: {
      ax     : ax,
      ay     : ay,
      charge : charge,
      nodes  : nodes,
      px     : px,
      py     : py,
      radius : radius,
      speed  : speed,
      vx     : vx,
      vy     : vy,
      x      : x,
      y      : y
    },

    outputState: integratorOutputState
  });

  // get initial state
  integrator.integrate(0);

  return integrator;
};
