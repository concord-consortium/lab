/**
  Returns a new object with methods for calculating the force and potential for a Lennard-Jones
  potential with particular values of its parameters epsilon and sigma. These can be adjusted.

  To avoid the needing to take square roots during calculation of pairwise forces, there are
  also methods which calculate the inter-particle potential directly from a squared distance, and
  which calculate the quantity (force/distance) directly from a squared distance.

  This function also accepts a callback function which will be called with a hash representing
  the new coefficients, whenever the LJ coefficients are changed for the returned calculator.
*/
exports.getLennardJonesCalculator = function(cb) {

  var epsilon = -1.0,   // depth of the potential well
      sigma   =  4.0,   // distance from particle at which the potential is 0

      rmin,             // distance from particle at which the potential is minimimal, and equal to -epsilon
      alpha,            // precalculated from epsilon and sigma for computational convenience
      beta,             // precalculated from epsilon and sigma for computational convenience

      coefficients = function(e, s) {
        if (arguments.length) {
          epsilon = e;
          sigma   = s;
          rmin    = Math.pow(2, 1/6) * sigma;
          alpha   = 4 * epsilon * Math.pow(sigma, 12);
          beta    = 4 * epsilon * Math.pow(sigma, 6);
        }

        var coefficients = {
          epsilon: epsilon,
          sigma  : sigma,
          rmin   : rmin,
          alpha  : alpha,
          beta   : beta
        };

        if (typeof cb === 'function') cb(coefficients);

        return coefficients;
      },

      potentialFromSquaredDistance = function(r_sq) {
        return -(alpha*Math.pow(r_sq, -6) - beta*Math.pow(r_sq, -3));
      },

      forceOverDistanceFromSquaredDistance = function(r_sq) {
        var r_6th  = r_sq * r_sq * r_sq,
            r_8th  = r_6th * r_sq,
            r_14th = r_8th * r_6th;

        return 12*alpha/r_14th - 6*beta/r_8th;
      };

  // initial calculation of values dependent on (epsilon, sigma)
  coefficients(epsilon, sigma);

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

    potential: function(r) {
      return potentialFromSquaredDistance(r*r);
    },

    forceOverDistanceFromSquaredDistance: forceOverDistanceFromSquaredDistance,

    force: function(r) {
      return r * forceOverDistanceFromSquaredDistance(r*r);
    }
  };
};
