/*global define: true */
/*jslint loopfunc: true */

/** A list of physical constants. To access any given constant, require() this module
    and call the 'as' method of the desired constant to get the constant in the desired unit.

    This module also provides a few helper functions for unit conversion.

    Usage:
      var constants = require('./constants'),

          ATOMIC_MASS_IN_GRAMS = constants.ATOMIC_MASS.as(constants.unit.GRAM),

          GRAMS_PER_KILOGRAM = constants.ratio(constants.unit.GRAM, { per: constants.unit.KILOGRAM }),

          // this works for illustration purposes, although the preferred method would be to pass
          // constants.unit.KILOGRAM to the 'as' method:

          ATOMIC_MASS_IN_KILOGRAMS = constants.convert(ATOMIC_MASS_IN_GRAMS, {
            from: constants.unit.GRAM,
            to:   constants.unit.KILOGRAM
          });
*/
import units from './units';

var
  unit = units.unit,
  ratio = units.ratio,
  convert = units.convert,

  constants = {

    ELEMENTARY_CHARGE: {
      value: 1,
      unit: unit.ELEMENTARY_CHARGE
    },

    ATOMIC_MASS: {
      value: 1,
      unit: unit.DALTON
    },

    BOLTZMANN_CONSTANT: {
      value: 1.380658e-23,
      unit: unit.JOULES_PER_KELVIN
    },

    AVAGADRO_CONSTANT: {
      // N_A is numerically equal to Dalton per gram
      value: ratio(unit.DALTON, {
        per: unit.GRAM
      }),
      unit: unit.INVERSE_MOLE
    },

    PERMITTIVITY_OF_FREE_SPACE: {
      value: 8.854187e-12,
      unit: unit.FARADS_PER_METER
    }
  },

  constantName, constant;


// Derived units
constants.COULOMB_CONSTANT = {
  value: 1 / (4 * Math.PI * constants.PERMITTIVITY_OF_FREE_SPACE.value),
  unit: unit.METERS_PER_FARAD
};


// Require explicitness about units by publishing constants as a set of objects with only an 'as' property,
// which will return the constant in the specified unit.

const api = {};

for (constantName in constants) {
  if (constants.hasOwnProperty(constantName)) {
    constant = constants[constantName];

    api[constantName] = (function(constant) {
      return {
        as: function(toUnit) {
          return units.convert(constant.value, {
            from: constant.unit,
            to: toUnit
          });
        }
      };
    }(constant));
  }
}

api.unit = unit;
api.ratio = ratio;
api.convert = convert;

export default api;
