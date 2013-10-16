/*global define: true */
/*jslint loopfunc: true */

/** A list of physical constants. To access any given constant, require() this module
    and call the 'as' method of the desired constant to get the constant in the desired unit.

    This module also provides a few helper functions for unit conversion.

    Usage:
      var constants = require('./constants'),

          AU_IN_METERS = constants.ASTRONOMICAL_UNIT_DISTANCE.as(constants.unit.METER),

          SOLAR_LUMINOSITY = constants.SOLAR_LUMINOSITY.as(constants.unit.WATT)

          ASTRONOMICAL_GRAVITATIONAL_CONSTANT = constants.GRAVITATIONAL_CONSTANT.as(constants.unit.ASTRONOMICAL_GC)

*/

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

  var units = require('./units'),
      unit  = units.unit,
      ratio = units.ratio,
      convert = units.convert,

      constants = {

        SOLAR_LUMINOSITY: {
          value: 3.839e26,
          unit: unit.WATT
        },

        ASTRONOMICAL_UNIT_DISTANCE: {
          value: 149597870691,
          unit: unit.METER
        },

        GRAVITATIONAL_CONSTANT: {
          value: 6.67384e-11,
          unit: unit.SI_GC
        }
      },

      constantName, constant;

  // Exports

  exports.unit = unit;
  exports.ratio = ratio;
  exports.convert = convert;

  // Require explicitness about units by publishing constants as a set of objects with only an 'as' property,
  // which will return the constant in the specified unit.

  for (constantName in constants) {
    if (constants.hasOwnProperty(constantName)) {
      constant = constants[constantName];

      exports[constantName] = (function(constant) {
        return {
          as: function(toUnit) {
            return units.convert(constant.value, { from: constant.unit, to: toUnit });
          }
        };
      }(constant));
    }
  }
});
