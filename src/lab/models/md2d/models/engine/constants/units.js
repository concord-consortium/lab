/*global define: true */
/** Provides a few simple helper functions for converting related unit types.

    This sub-module doesn't do unit conversion between compound unit types (e.g., knowing that kg*m/s^2 = N)
    only simple scaling between units measuring the same type of quantity.
*/

// Prefer the "per" formulation to the "in" formulation.
//
// If KILOGRAMS_PER_AMU is 1.660540e-27 we know the math is:
// "1 amu * 1.660540e-27 kg/amu = 1.660540e-27 kg"
// (Whereas the "in" forumulation might be slighty more error prone:
// given 1 amu and 6.022e-26 kg in an amu, how do you get kg again?)

// These you might have to look up...

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

  var KILOGRAMS_PER_DALTON  = 1.660540e-27,
      COULOMBS_PER_ELEMENTARY_CHARGE = 1.602177e-19,

      // 1 eV = 1 e * 1 V = (COULOMBS_PER_ELEMENTARY_CHARGE) C * 1 J/C
      JOULES_PER_EV = COULOMBS_PER_ELEMENTARY_CHARGE,

      // though these are equally important!
      SECONDS_PER_FEMTOSECOND = 1e-15,
      METERS_PER_NANOMETER    = 1e-9,
      ANGSTROMS_PER_NANOMETER = 10,
      GRAMS_PER_KILOGRAM      = 1000,

      types = {
        TIME: "time",
        LENGTH: "length",
        MASS: "mass",
        ENERGY: "energy",
        ENTROPY: "entropy",
        CHARGE: "charge",
        INVERSE_QUANTITY: "inverse quantity",

        FARADS_PER_METER: "farads per meter",
        METERS_PER_FARAD: "meters per farad",

        FORCE: "force",
        VELOCITY: "velocity",

        // unused as of yet
        AREA: "area",
        PRESSURE: "pressure"
      },

    unit,
    ratio,
    convert;

  /**
    In each of these units, the reference type we actually use has value 1, and conversion
    ratios for the others are listed.
  */
  exports.unit = unit = {

    FEMTOSECOND: { name: "femtosecond", value: 1,                       type: types.TIME },
    SECOND:      { name: "second",      value: SECONDS_PER_FEMTOSECOND, type: types.TIME },

    NANOMETER:   { name: "nanometer", value: 1,                           type: types.LENGTH },
    ANGSTROM:    { name: "Angstrom",  value: 1 * ANGSTROMS_PER_NANOMETER, type: types.LENGTH },
    METER:       { name: "meter",     value: 1 * METERS_PER_NANOMETER,    type: types.LENGTH },

    DALTON:   { name: "Dalton",   value: 1,                                             type: types.MASS },
    GRAM:     { name: "gram",     value: 1 * KILOGRAMS_PER_DALTON * GRAMS_PER_KILOGRAM, type: types.MASS },
    KILOGRAM: { name: "kilogram", value: 1 * KILOGRAMS_PER_DALTON,                      type: types.MASS },

    MW_ENERGY_UNIT: {
      name: "MW Energy Unit (Dalton * nm^2 / fs^2)",
      value: 1,
      type: types.ENERGY
    },

    JOULE: {
      name: "Joule",
      value: KILOGRAMS_PER_DALTON *
             METERS_PER_NANOMETER * METERS_PER_NANOMETER *
             (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND),
      type: types.ENERGY
    },

    EV: {
      name: "electron volt",
      value: KILOGRAMS_PER_DALTON *
              METERS_PER_NANOMETER * METERS_PER_NANOMETER *
              (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND) *
              (1/JOULES_PER_EV),
      type: types.ENERGY
    },

    EV_PER_KELVIN:     { name: "electron volts per Kelvin", value: 1,                 type: types.ENTROPY },
    JOULES_PER_KELVIN: { name: "Joules per Kelvin",         value: 1 * JOULES_PER_EV, type: types.ENTROPY },

    ELEMENTARY_CHARGE: { name: "elementary charge", value: 1,                             type: types.CHARGE },
    COULOMB:           { name: "Coulomb",           value: COULOMBS_PER_ELEMENTARY_CHARGE, type: types.CHARGE },

    INVERSE_MOLE: { name: "inverse moles", value: 1, type: types.INVERSE_QUANTITY },

    FARADS_PER_METER: { name: "Farads per meter", value: 1, type: types.FARADS_PER_METER },

    METERS_PER_FARAD: { name: "meters per Farad", value: 1, type: types.METERS_PER_FARAD },

    MW_FORCE_UNIT: {
      name: "MW force units (Dalton * nm / fs^2)",
      value: 1,
      type: types.FORCE
    },

    NEWTON: {
      name: "Newton",
      value: 1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND),
      type: types.FORCE
    },

    EV_PER_NM: {
      name: "electron volts per nanometer",
      value: 1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * METERS_PER_NANOMETER *
             (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND) *
             (1/JOULES_PER_EV),
      type: types.FORCE
    },

    MW_VELOCITY_UNIT: {
      name: "MW velocity units (nm / fs)",
      value: 1,
      type: types.VELOCITY
    },

    METERS_PER_SECOND: {
      name: "meters per second",
      value: 1 * METERS_PER_NANOMETER * (1 / SECONDS_PER_FEMTOSECOND),
      type: types.VELOCITY
    }

  };


  /** Provide ratios for conversion of one unit to an equivalent unit type.

     Usage: ratio(units.GRAM, { per: units.KILOGRAM }) === 1000
            ratio(units.GRAM, { as: units.KILOGRAM }) === 0.001
  */
  exports.ratio = ratio = function(from, to) {
    var checkCompatibility = function(fromUnit, toUnit) {
      if (fromUnit.type !== toUnit.type) {
        throw new Error("Attempt to convert incompatible type '" + fromUnit.name + "'' to '" + toUnit.name + "'");
      }
    };

    if (to.per) {
      checkCompatibility(from, to.per);
      return from.value / to.per.value;
    } else if (to.as) {
      checkCompatibility(from, to.as);
      return to.as.value / from.value;
    } else {
      throw new Error("units.ratio() received arguments it couldn't understand.");
    }
  };

  /** Scale 'val' to a different unit of the same type.

    Usage: convert(1, { from: unit.KILOGRAM, to: unit.GRAM }) === 1000
  */
  exports.convert = convert = function(val, fromTo) {
    var from = fromTo && fromTo.from,
        to   = fromTo && fromTo.to;

    if (!from) {
      throw new Error("units.convert() did not receive a \"from\" argument");
    }
    if (!to) {
      throw new Error("units.convert() did not receive a \"to\" argument");
    }

    return val * ratio(to, { per: from });
  };
});
