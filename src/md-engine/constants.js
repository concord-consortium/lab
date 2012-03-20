

    // Prefer the "per" formulation to the "in" formulation.
    //
    // If KILOGRAMS_PER_AMU is 1.660540e-27 we know the math is:
    // "1 amu * 1.660540e-27 kg/amu = 1.660540e-27 kg"
    // (Whereas the "in" forumulation: given 1 amu and 6.022e26 kg in an amu,
    // might be more slighlty error prone: how do you get kg again?)

    // These you might have to look up
var KILOGRAMS_PER_DALTON  = 1.660540e-27,
    COULOMBS_PER_ELEMENTARY_CHARGE = 1.602177e-19,

    // 1 eV = 1 e * 1 V * = (COULOMBS_PER_ELEMENTARY_CHARGE) C * 1 J/C
    JOULES_PER_EV = COULOMBS_PER_ELEMENTARY_CHARGE,

    // though these are equally important!
    SECONDS_PER_FEMTOSECOND = 1e-15,
    METERS_PER_NANOMETER = 1e-9,
    ANGSTROMS_PER_NANOMETER = 10,
    GRAMS_PER_KILOGRAM = 1000,

    types = {
      TIME: "time",
      LENGTH: "length",
      MASS: "mass",
      ENERGY: "energy",
      ENTROPY: "entropy",
      CHARGE: "charge",
      INVERSE_QUANTITY: "inverse quantity",

      // unused as of yet
      FORCE: "force",
      AREA: "area",
      PRESSURE: "pressure"
    },

    // In each of these units, the reference type we actually use has value 1, and conversion
    // ratios for the others are listed.
    units = {

      FEMTOSECOND: { name: "femtosecond", value: 1,                       type: types.TIME },
      SECOND:      { name: "second",      value: SECONDS_PER_FEMTOSECOND, type: types.TIME },

      NANOMETER:   { name: "nanometer", value: 1,                           type: types.LENGTH },
      ANGSTROM:    { name: "Angstrom",  value: 1 * ANGSTROMS_PER_NANOMETER, type: types.LENGTH },
      METER:       { name: "meter",     value: 1 * METERS_PER_NANOMETER,    type: types.LENGTH },

      DALTON:   { name: "Dalton",   value: 1,                                             type: types.MASS },
      GRAM:     { name: "gram",     value: 1 * KILOGRAMS_PER_DALTON * GRAMS_PER_KILOGRAM, type: types.MASS },
      KILOGRAM: { name: "kilogram", value: 1 * KILOGRAMS_PER_DALTON,                      type: types.MASS },

      EV:    { name: "electron volt", value: 1,                 type: types.ENERGY },
      JOULE: { name: "Joule",         value: 1 * JOULES_PER_EV, type: types.ENERGY },

      EV_PER_KELVIN:     { name: "electron volts per Kelvin", value: 1,                 type: types.ENTROPY },
      JOULES_PER_KELVIN: { name: "Joules per Kelvin",         value: 1 * JOULES_PER_EV, type: types.ENTROPY },

      ELEMENTARY_CHARGE: { name: "elementary charge", value: 1,                              type: types.CHARGE },
      COULOMB:           { name: "Coulomb",          value: COULOMBS_PER_ELEMENTARY_CHARGE, type: types.CHARGE },

      INVERSE_MOLE: { name: "inverse moles", value: 1, type: types.INVERSE_QUANTITY }
    },

    constants = {

      ELEMENTARY_CHARGE: {
        value: 1,
        units: units.ELEMENTARY_CHARGE
      },

      ATOMIC_MASS: {
        value: 1,
        units: units.DALTON
      },

      BOLTZMANN_CONSTANT: {
        value: 1.380658e-23,
        units: units.JOULES_PER_KELVIN
      },

      AVAGADRO_CONSTANT: {
        // N_A is numerically equal to Dalton per gram
        value: 1 / (KILOGRAMS_PER_DALTON * GRAMS_PER_KILOGRAM),
        units: units.INVERSE_MOLE
      }
    },

    converterFrom = function(fromUnit, val) {
      return function(toUnit) {
        if (toUnit.type !== fromUnit.type) {
          throw new Error("Attempt to convert incompatible type '" + fromUnit.name + "'' to '" + toUnit.name + "'");
        }
        return (val / fromUnit.value) * toUnit.value;
      };
    },

    constantName, constant;

for (constantName in constants) {
  if (constants.hasOwnProperty(constantName)) {
    constant = constants[constantName];
    constant.as = converterFrom(constant.units, constant.value);
  }
}


exports.constants = constants;
exports.units = units;

/** Provide ratios for conversion of one unit to an equivalent unit type.

   Usage: ratio(units.GRAM, { per: units.KILOGRAM }) === 1000
          ratio(units.GRAM, { as: units.KILOGRAM }) === 0.001
*/

exports.ratio = function(from, to) {
  if (to.per) {
    return from.value / to.per.value;
  } else if (to.as) {
    return to.as.value / from.value;
  }
};
