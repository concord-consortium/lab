import constants from 'models/md2d/models/engine/constants/index';

var unit = constants.unit,

  // Classic MW uses a value for Coulomb's constant that is effectively 0.346 of the real value
  CLASSIC_MW_FUDGE_FACTOR = 0.346,

  COULOMB_CONSTANT_IN_METERS_PER_FARAD = constants.COULOMB_CONSTANT.as(constants.unit.METERS_PER_FARAD),

  NANOMETERS_PER_METER = constants.ratio(unit.NANOMETER, {
    per: unit.METER
  }),
  COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ = Math.pow(constants.ratio(unit.COULOMB, {
    per: unit.ELEMENTARY_CHARGE
  }), 2),

  EV_PER_JOULE = constants.ratio(unit.EV, {
    per: unit.JOULE
  }),
  MW_FORCE_UNITS_PER_NEWTON = constants.ratio(unit.MW_FORCE_UNIT, {
    per: unit.NEWTON
  }),

  // Coulomb constant for expressing potential in eV given elementary charges, nanometers
  k_ePotential = CLASSIC_MW_FUDGE_FACTOR *
  COULOMB_CONSTANT_IN_METERS_PER_FARAD *
  COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ *
  NANOMETERS_PER_METER *
  EV_PER_JOULE,

  // Coulomb constant for expressing force in Dalton*nm/fs^2 given elementary charges, nanometers
  k_eForce = CLASSIC_MW_FUDGE_FACTOR *
  COULOMB_CONSTANT_IN_METERS_PER_FARAD *
  COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ *
  NANOMETERS_PER_METER *
  NANOMETERS_PER_METER *
  MW_FORCE_UNITS_PER_NEWTON,

  // Exports

  /** Input:
       r: distance in nanometers,
       q1, q2: elementary charges,
       dC: dielectric constant, unitless,
       rDE: realistic dielectric effect switch, boolean.

      Output units: eV
  */
  potential = function(r, q1, q2, dC, rDE) {
    if (rDE && dC > 1 && r < 1.2) {
      // "Realistic Dielectric Effect" mode:
      // Diminish dielectric constant value using distance between particles.
      // Function based on: http://en.wikipedia.org/wiki/Generalized_logistic_curve
      // See plot for dC = 80: http://goo.gl/7zU6a
      // For optimization purposes it returns asymptotic value when r > 1.2.
      dC = 1 + (dC - 1) / (1 + Math.exp(-12 * r + 7));
    }
    return k_ePotential * ((q1 * q2) / r) / dC;
  },


  /** Input:
       rSq: squared distance in nanometers^2,
       q1, q2: elementary charges,
       dC: dielectric constant, unitless,
       rDE: realistic dielectric effect switch, boolean.

      Output units: "MW Force Units" (Dalton * nm / fs^2)
  */
  forceFromSquaredDistance = function(rSq, q1, q2, dC, rDE) {
    var r = Math.sqrt(rSq);
    if (rDE && dC > 1 && r < 1.2) {
      // "Realistic Dielectric Effect" mode:
      // Diminish dielectric constant value using distance between particles.
      // Function based on: http://en.wikipedia.org/wiki/Generalized_logistic_curve
      // See plot for dC = 80: http://goo.gl/7zU6a
      // For optimization purposes it returns asymptotic value when r > 1.2.
      dC = 1 + (dC - 1) / (1 + Math.exp(-12 * r + 7));
    }
    return -k_eForce * ((q1 * q2) / rSq) / dC;
  },


  forceOverDistanceFromSquaredDistance = function(rSq, q1, q2, dC, rDE) {
    return forceFromSquaredDistance(rSq, q1, q2, dC, rDE) / Math.sqrt(rSq);
  },

  /** Input:
       r: distance in nanometers,
       q1, q2: elementary charges,
       dC: dielectric constant, unitless,
       rDE: realistic dielectric effect switch, boolean.

      Output units: "MW Force Units" (Dalton * nm / fs^2)
  */
  force = function(r, q1, q2, dC, rDE) {
    return forceFromSquaredDistance(r * r, q1, q2, dC, rDE);
  };

export default {
  potential,
  forceFromSquaredDistance,
  forceOverDistanceFromSquaredDistance,
  force
};
