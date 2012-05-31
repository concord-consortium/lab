/*jshint eqnull:true boss:true */
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
exports.makeLennardJonesCalculator = function(elements, cb) {
  /*
     all of these pairwise variables are symmetrical matrices reprsenting the
     parameters between each pair of elements. Thus pairwiseEpsilons[0][0] is the
     epsilon component of the LJ force between two atoms of element 0, while
     pairwiseEpsilons[0][1] and pairwiseEpsilons[1][0] both represent the epsilon
     component between elements 0 and 1
  */
  var pairwiseEpsilons          = [],    // parameter; depth of the potential well, in eV
      pairwiseSigmas            = [],    // parameter: characteristic distance from particle, in nm
      pairwiseRmins             = [],    // distance from particle at which the potential is at its minimum
      pairwiseAlphaPotentials   = [],    // precalculated; units are eV * nm^12
      pairwiseBetaPotentials    = [],    // precalculated; units are eV * nm^6
      pairwiseAlphaForces       = [],    // units are "MW Force Units" * nm^13
      pairwiseBetaForces        = [],    // units are "MW Force Units" * nm^7
      pairwiseCutoffDistanceSq  = [],

      /*
        Precalculates all of the paramters between every pair of elements.
        @param elements: Elements of the form
          [ [mass_0, epsilon_0, sigma_0], [mass_1, epsilon_1, sigma_1], ...]

        If we pass in
          [ [30, 1, 1], [30, 2, 2] ]

        We will set

        pairwiseEpsilons = [[ 1 , 1.5],
                            [1.5,  2 ]]

        pairwiseSigmas   = [[ 1   , 1.414],
                            [1.414,  2   ]]

        rmin             = [[1.122, 1.587],
                            [1.587, 2.245]]

        alpha_Potential  = [[ 4   , 384  ],
                            [384  , 32768]]

        ...etc.
      */
      // FIXME: validate
      setElements = function(elements) {
        var i, ii, j, jj, epsilon, sigma, rmin, alpha_Potential, beta_Potential, alpha_Force, beta_Force, cutoffDistance;
        for (i=0, ii=elements.length; i<ii; i++) {
          pairwiseEpsilons[i]           = [];
          pairwiseSigmas[i]             = [];
          pairwiseRmins[i]              = [];
          pairwiseAlphaPotentials[i]    = [];
          pairwiseBetaPotentials[i]     = [];
          pairwiseAlphaForces[i]        = [];
          pairwiseBetaForces[i]         = [];
          pairwiseCutoffDistanceSq[i]   = [];

          for (j=0; j<i+1; j++) {
            epsilon = (elements[i][1] + elements[j][1]) / 2;
            sigma   = Math.sqrt(elements[i][2] * elements[j][2]);

            rmin    =  Math.pow(2, 1/6) * sigma;
            cutoffDistance = rmin * 5;

            if (epsilon != null && sigma != null) {
              alpha_Potential = 4 * epsilon * Math.pow(sigma, 12);
              beta_Potential  = 4 * epsilon * Math.pow(sigma, 6);

              // (1 J * nm^12) = (1 N * m * nm^12)
              // (1 N * m * nm^12) * (b nm / m) * (c MWUnits / N) = (abc MWUnits nm^13)
              alpha_Force = 12 * constants.convert(alpha_Potential, { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
              beta_Force =  6 * constants.convert(beta_Potential,  { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
            }

            pairwiseEpsilons[i][j]          = pairwiseEpsilons[j][i]    = epsilon;
            pairwiseSigmas[i][j]            = pairwiseSigmas[j][i]      = sigma;
            pairwiseRmins[i][j]             = pairwiseRmins[j][i]       = rmin;
            pairwiseAlphaPotentials[i][j]   = pairwiseAlphaPotentials[j][i]   = alpha_Potential;
            pairwiseBetaPotentials[i][j]    = pairwiseBetaPotentials[j][i]    = beta_Potential;
            pairwiseAlphaForces[i][j]       = pairwiseAlphaForces[j][i] = alpha_Force;
            pairwiseBetaForces[i][j]        = pairwiseBetaForces[j][i]  = beta_Force;
            pairwiseCutoffDistanceSq[i][j]  = pairwiseCutoffDistanceSq[j][i] = (cutoffDistance * cutoffDistance)
          }
        }

        if (typeof cb === 'function') cb(getCoefficients(), this);
      },

      getCoefficients = function() {
        return {
          epsilon: pairwiseEpsilons,
          sigma  : pairwiseSigmas,
          rmin   : pairwiseRmins,
          cutoffDistanceSq : pairwiseCutoffDistanceSq
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
      // validateEpsilon(params.epsilon);
      // validateSigma(params.sigma);

      // Initialize coefficients to passed-in values
      setElements(elements);

  return calculator = {

    coefficients: getCoefficients,

    /**
      Input units: r_sq: nm^2
      Output units: eV

      minimum is at r=rmin, V(rmin) = 0
    */
    potentialFromSquaredDistance: function(r_sq, el0, el1) {
       return pairwiseAlphaPotentials[el0][el1]*Math.pow(r_sq, -6) - pairwiseBetaPotentials[el0][el1]*Math.pow(r_sq, -3);
    },

    /**
      Input units: r: nm
      Output units: eV
    */
    potential: function(r, el0, el1) {
      return calculator.potentialFromSquaredDistance(r*r, el0, el1);
    },

    /**
      Input units: r_sq: nm^2
      Output units: MW Force Units / nm (= Dalton / fs^2)
    */
    forceOverDistanceFromSquaredDistance: function(r_sq, el0, el1) {
      // optimizing divisions actually does appear to be *slightly* faster
      var r_minus2nd  = 1 / r_sq,
          r_minus6th  = r_minus2nd * r_minus2nd * r_minus2nd,
          r_minus8th  = r_minus6th * r_minus2nd,
          r_minus14th = r_minus8th * r_minus6th;

      return pairwiseAlphaForces[el0][el1]*r_minus14th - pairwiseBetaForces[el0][el1]*r_minus8th;
    },

    /**
      Input units: r: nm
      Output units: MW Force Units (= Dalton * nm / fs^2)
    */
    force: function(r, el0, el1) {
      return r * calculator.forceOverDistanceFromSquaredDistance(r*r, el0, el1);
    }
  };
};
