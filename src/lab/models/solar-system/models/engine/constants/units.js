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

  var SECONDS_PER_DAY           = 86400,
      METERS_PER_AU             = 149597870700,
      KILOGRAMS_PER_EARTH_MASS  = 5.97219e24,
      EARTH_MASS_PER_SOLAR_MASS = 332946,

      types = {
        TIME:         "time",
        LENGTH:       "length",
        MASS:         "mass",
        ENERGY:       "energy",
        POWER:        "power",
        FORCE:        "force",
        VELOCITY:     "velocity",
        ACCELERATION: "acceleration",
        GRAVITATIONAL_CONSTANT: "Gravitational Constant",

        // unused as of yet
        AREA: "area",
        VOLUME: "volume",
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

    DAY:         { name: "Day",         value: 1,                             type: types.TIME },
    SECOND:      { name: "second",      value: SECONDS_PER_DAY,               type: types.TIME },

    AU:          { name: "au",          value: 1,                             type: types.LENGTH },
    METER:       { name: "meter",       value: METERS_PER_AU,               type: types.LENGTH },


    EARTH_MASS:  { name: "Earth Mass",  value: 1,                             type: types.MASS },
    KILOGRAM:    { name: "kilogram",    value: KILOGRAMS_PER_EARTH_MASS,  type: types.MASS },
    SOLAR_MASS:  { name: "Solar Mass",  value: EARTH_MASS_PER_SOLAR_MASS, type: types.MASS },

    JOULE: {
      name: "Joule",
      value: (1/KILOGRAMS_PER_EARTH_MASS) *
             (1/METERS_PER_AU) * (1/METERS_PER_AU) /
             ((1/SECONDS_PER_DAY) * (1/SECONDS_PER_DAY)),
      type: types.ENERGY
    },

    WATT: {
      name: "Watt",
      value: (1/KILOGRAMS_PER_EARTH_MASS) *
             (1/METERS_PER_AU) * (1/METERS_PER_AU) /
             ((1/SECONDS_PER_DAY) * (1/SECONDS_PER_DAY) * (1/SECONDS_PER_DAY)),
      type: types.POWER
    },

    NEWTON: {
      name: "Newton",
      value: 1,
      type: types.FORCE
    },

    METERS_PER_SECOND: {
      name: "meters per second",
      value: (1 / METERS_PER_AU) * SECONDS_PER_DAY,
      type: types.VELOCITY
    },

    METERS_PER_SECOND_PER_SECOND: {
      name: "meters per second per second",
      value: (1/METERS_PER_AU) * SECONDS_PER_DAY * SECONDS_PER_DAY,
      type: types.ACCELERATION
    },

    METERS_CUBED_PER_KILOGRAMS_TIMES_TIME_SQUARED: {
      name: "meters cubed per kilograms times second squared",
      value: (1/METERS_PER_AU) * (1/METERS_PER_AU) * (1/METERS_PER_AU) /
             ((1/KILOGRAMS_PER_EARTH_MASS) * SECONDS_PER_DAY * SECONDS_PER_DAY),
      type: types.ACCELERATION
    },

    ASTRONOMICAL_FORCE: {
      name: " in Astronomical units (Earth Mass, AU, Day)",
      value: 1 * KILOGRAMS_PER_EARTH_MASS,
      type: types.GRAVITATIONAL_CONSTANT
    },

    SI_GC: {
      name: "gravitational constant of proprtionality in SI units (kg, m, s)",
      value: 1,
      type: types.GRAVITATIONAL_CONSTANT
    },

    ASTRONOMICAL_GC: {
      name: "gravitational constant of proprtionality in Astronomical units (Earth Mass, AU, Day)",
      value: 1 *
             KILOGRAMS_PER_EARTH_MASS * SECONDS_PER_DAY * SECONDS_PER_DAY /
             (METERS_PER_AU * METERS_PER_AU * METERS_PER_AU),
      type: types.GRAVITATIONAL_CONSTANT
    }

  };


  /** Provide ratios for conversion of one unit to an equivalent unit type.

     Usage:
       constants.ratio(unit.SECOND, { per: unit.DAY })  => 86400
       constants.ratio(unit.METER, { per: unit.AU }) => 6.684587122268445e-12

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

    Usage:
      constants.convert(1, {from: unit.DAY, to: unit.SECOND}) => 86400
      constants.convert(1, {from: unit.AU, to: unit.METER}) => 6.684587122268445e-12
      constants.convert(1, {from: unit.EARTH_MASS, to: unit.KILOGRAM}) => 5.97219e+24
      constants.convert(1, {from: unit. EARTH_MASS, to: unit.SOLAR_MASS}) => 332946

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
