/*global define: false */

// Definitions of the default Solar System units. Every model property exposed by
// solar-system/models/modeler.js is in one of the unit types below.

// This particular set of definitions is for reference and for generating the correct labels on
// output properties; it's not used for computation. Unit conversions that need to happen during
// calculations in the solar-system engine itself are "baked in" using a engines constants and
// units module 'solar-system/models/engine/constants/index.js')

// Additionally, since we don't yet offer user-facing methods which do unit conversions (e.g.,
// allowing a property setter to accept an argument containing a value and a unit) there is no
// need for quantitative information in this definition.

define(function() {
  return {
    name: "solar-system",
    translated: false,
    units: {

      length: {
        name: "Astronomical Unit",
        pluralName: "Astronomical Units",
        symbol: "AU"
      },

      mass: {
        name: "Earth Mass",
        pluralName: "Earth Masses",
        symbol: "M"
      },

      time: {
        name: "day",
        pluralName: "days",
        symbol: "D",
        displayValue: {
          unitsPerBaseUnit: 1,
          name: "day",
          pluralName: "days",
          symbol: "D"
        }
      },

      velocity: {
        name: "Astronomical Unit per day",
        pluralName: "Astronomical Units per day",
        symbol: "AU/D"
      },

      acceleration: {
        name: "Astronomical Unit per day squared",
        pluralName: "Astronomical Units per day squared",
        symbol: "AU/D²"
      },

      momentum: {
        name: "Earth Mass Astronomical Unit per day",
        pluralName: "Earth Mass Astronomical Units per day",
        symbol: "M⋅AU/D"
      },

      force: {
        name: "Earth Mass Astronomical Unit per day squared",
        pluralName: "Earth Mass Astronomical Units per day squared",
        symbol: "M⋅AU/D²"
      },

      energy: {
        name: "joules",
        pluralName: "joules",
        symbol: "J"
      },

      temperature: {
        // Not "degrees Kelvin", just "Kelvin".
        name: "Kelvin",
        // Not "Kelvins", just "Kelvin".
        pluralName: "Kelvin",
        symbol: "K"
      },

      angle: {
        name: "radian",
        pluralName: "radians",
        symbol: "rad"
      }
    }
  };
});
