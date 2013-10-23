/*global define: true */
/*jshint eqnull:true boss:true */

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

  var constants = require('../constants/index'),
      unit      = constants.unit,

      NANOMETERS_PER_METER = constants.ratio( unit.NANOMETER, { per: unit.METER }),
      MW_FORCE_UNITS_PER_NEWTON = constants.ratio( unit.MW_FORCE_UNIT, { per: unit.NEWTON });

  /**
    Helper function that returns the correct pairwise epsilon value to be used
    when elements each have epsilon values epsilon1, epsilon2
  */
  exports.pairwiseEpsilon = function(epsilon1, epsilon2) {
    return 0.5 * (epsilon1 + epsilon2);
  },

  /**
    Helper function that returns the correct pairwise sigma value to be used
    when elements each have sigma values sigma1, sigma2
  */
  exports.pairwiseSigma = function(sigma1, sigma2) {
    return Math.sqrt(sigma1 * sigma2);
  },

  /**
    Helper function that returns the correct rmin value for a given sigma
  */
  exports.rmin = function(sigma) {
    return Math.pow(2, 1/6) * sigma;
  };

  /**
    Helper function that returns the correct atomic radius for a given sigma
  */
  exports.radius = function(sigma) {
    // See line 637 of Atom.java (org.concord.mw2d.models.Atom)
    // This assumes the "VdW percentage" is 100%. In classic MW the VdW percentage is settable.
    return 0.5 * sigma;
  };

  /**
    Returns a new object with methods for calculating the force and potential for a Lennard-Jones
    potential with particular values of its parameters epsilon and sigma. These can be adjusted.

    To avoid the needing to take square roots during calculation of pairwise forces, there are
    also methods which calculate the inter-particle potential directly from a squared distance, and
    which calculate the quantity (force/distance) directly from a squared distance.

    This function also accepts a callback function which will be called with a hash representing
    the new coefficients, whenever the LJ coefficients are changed for the returned calculator.
  */
  exports.newLJCalculator = function(params, cb) {

    var epsilon,          // parameter; depth of the potential well, in eV
        sigma,            // parameter: characteristic distance from particle, in nm

        rmin,             // distance from particle at which the potential is at its minimum
        alpha_Potential,  // precalculated; units are eV * nm^12
        beta_Potential,   // precalculated; units are eV * nm^6
        alpha_Force,      // units are "MW Force Units" * nm^13
        beta_Force,       // units are "MW Force Units" * nm^7

        initialized = false, // skip callback during initialization

        setCoefficients = function(e, s) {
          // Input units:
          //  epsilon: eV
          //  sigma:   nm

          epsilon = e;
          sigma   = s;
          rmin    = exports.rmin(sigma);

          if (epsilon != null && sigma != null) {
            alpha_Potential = 4 * epsilon * Math.pow(sigma, 12);
            beta_Potential  = 4 * epsilon * Math.pow(sigma, 6);

            // (1 J * nm^12) = (1 N * m * nm^12)
            // (1 N * m * nm^12) * (b nm / m) * (c MWUnits / N) = (abc MWUnits nm^13)
            alpha_Force = 12 * constants.convert(alpha_Potential, { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
            beta_Force =  6 * constants.convert(beta_Potential,  { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
          }

          if (initialized && typeof cb === 'function') cb(getCoefficients(), this);
        },

        getCoefficients = function() {
          return {
            epsilon: epsilon,
            sigma  : sigma,
            rmin   : rmin
          };
        },

        validateEpsilon = function(e) {
          if (e == null || parseFloat(e) !== e) {
            throw new Error("lennardJones: epsilon value " + e + " is invalid");
          }
        },

        validateSigma = function(s) {
          if (s == null || parseFloat(s) !== s || s <= 0) {
            throw new Error("lennardJones: sigma value " + s + " is invalid");
          }
        },

        // this object
        calculator;

        // At creation time, there must be a valid epsilon and sigma ... we're not gonna check during
        // inner-loop force calculations!
        validateEpsilon(params.epsilon);
        validateSigma(params.sigma);

        // Initialize coefficients to passed-in values, skipping setCoefficients callback
        setCoefficients(params.epsilon, params.sigma);
        initialized = true;

    return calculator = {

      getCoefficients: getCoefficients,

      setEpsilon: function(e) {
        validateEpsilon(e);
        setCoefficients(e, sigma);
      },

      setSigma: function(s) {
        validateSigma(s);
        setCoefficients(epsilon, s);
      },

      /**
        Input units: r_sq: nm^2
        Output units: eV

        minimum is at r=rmin, V(rmin) = 0
      */
      potentialFromSquaredDistance: function(r_sq) {
        if (!r_sq) return -Infinity;
        return alpha_Potential*Math.pow(r_sq, -6) - beta_Potential*Math.pow(r_sq, -3);
      },

      /**
        Input units: r: nm
        Output units: eV
      */
      potential: function(r) {
        return calculator.potentialFromSquaredDistance(r*r);
      },

      /**
        Input units: r_sq: nm^2
        Output units: MW Force Units / nm (= Dalton / fs^2)
      */
      forceOverDistanceFromSquaredDistance: function(r_sq) {
        // optimizing divisions actually does appear to be *slightly* faster
        var r_minus2nd  = 1 / r_sq,
            r_minus6th  = r_minus2nd * r_minus2nd * r_minus2nd,
            r_minus8th  = r_minus6th * r_minus2nd,
            r_minus14th = r_minus8th * r_minus6th;

        return alpha_Force*r_minus14th - beta_Force*r_minus8th;
      },

      /**
        Input units: r: nm
        Output units: MW Force Units (= Dalton * nm / fs^2)
      */
      force: function(r) {
        return r * calculator.forceOverDistanceFromSquaredDistance(r*r);
      }
    };
  };
});
