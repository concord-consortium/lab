var constants = require('../constants'),
    unit      = constants.unit,

    NANOMETERS_PER_METER = constants.ratio( unit.NANOMETER, { per: unit.METER }),
    MW_FORCE_UNITS_PER_NEWTON = constants.ratio( unit.MW_FORCE_UNIT, { per: unit.NEWTON });

/**
  Returns a new object with methods for calculating the force and potential for a Lennard-Jones
  potential with particular values of its parameters epsilon and sigma. These can be adjusted.

  To avoid the needing to take square roots during calculation of pairwise forces, there are
  also methods which calculate the inter-particle potential directly from a squared distance, and
  which calculate the quantity (force/distance) directly from a squared distance.

  This function also accepts a callback function which will be called with a hash representing
  the new coefficients, whenever the LJ coefficients are changed for the returned calculator.
*/
exports.makeLennardJonesCalculator = function(params, cb) {

  var epsilon,          // parameter; depth of the potential well, in eV
      sigma,            // parameter: characteristic distance from particle, in nm

      rmin,             // distance from particle at which the potential is at its minimum
      alpha_Potential,  // precalculated; units are eV * nm^12
      beta_Potential,   // precalculated; units are eV * nm^6
      alpha_Force,      // units are "MW Force Units" * nm^13
      beta_Force,       // units are "MW Force Units" * nm^7

      coefficients = function(e, s) {
        // Input units:
        //  epsilon: eV
        //  sigma:   nm

        if (arguments.length) {
          epsilon = e;
          sigma   = s;
          rmin    = Math.pow(2, 1/6) * sigma;

          alpha_Potential = 4 * epsilon * Math.pow(sigma, 12);
          beta_Potential  = 4 * epsilon * Math.pow(sigma, 6);

          // (1 J * nm^12) = (1 N * m * nm^12)
          // (1 N * m * nm^12) * (b nm / m) * (c MWUnits / N) = (abc MWUnits nm^13)
          alpha_Force = 12 * constants.convert(alpha_Potential, { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
          beta_Force =  6 * constants.convert(beta_Potential,  { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
        }

        var coefficients = {
          epsilon: epsilon,
          sigma  : sigma,
          rmin   : rmin
        };

        if (typeof cb === 'function') cb(coefficients, this);

        return coefficients;
      },

      /**
        Input units: r_sq: nm^2
        Output units: eV

        minimum is at r=rmin, V(rmin) = 0
      */
      potentialFromSquaredDistance = function(r_sq) {
         return alpha_Potential*Math.pow(r_sq, -6) - beta_Potential*Math.pow(r_sq, -3) + epsilon;
      },

      /**
        Input units: r_sq: nm^2
        Output units: MW Force Units / nm (= Dalton / fs^2)
      */
      forceOverDistanceFromSquaredDistance = function(r_sq) {
        // optimizing divisions actually does appear to be *slightly* faster
        var r_minus2nd  = 1 / r_sq,
            r_minus6th  = r_minus2nd * r_minus2nd * r_minus2nd,
            r_minus8th  = r_minus6th * r_minus2nd,
            r_minus14th = r_minus8th * r_minus6th;

        return alpha_Force*r_minus14th - beta_Force*r_minus8th;
      };

      // Initialize coefficients to passed-in values
      coefficients(params.epsilon, params.sigma);

  return {

    coefficients: coefficients,

    setEpsilon: function(e) {
      return coefficients(e, sigma);
    },

    setSigma: function(s) {
      return coefficients(epsilon, s);
    },

    // "fast" forms which avoid the need for a square root
    potentialFromSquaredDistance: potentialFromSquaredDistance,

    /**
      Input units: r: nm
      Output units: eV
    */
    potential: function(r) {
      return potentialFromSquaredDistance(r*r);
    },

    forceOverDistanceFromSquaredDistance: forceOverDistanceFromSquaredDistance,

    /**
      Input units: r: nm
      Output units: MW Force Units (= Dalton * nm / fs^2)
    */
    force: function(r) {
      return r * forceOverDistanceFromSquaredDistance(r*r);
    }
  };
};
