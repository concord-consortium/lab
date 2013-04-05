/*global define: false */

// Definitions of the default MD2D units. Every model property exposed by md2d/models/modeler.js is
// in one of the unit types below.

// This particular set of definitions is for reference and for generating the correct labels on
// output properties; it's not used for computation. Unit conversions that need to happen during
// calculations in the MD2D engine itself are "baked in" using a common engines constants and
// units module 'common/models/engines/constants/index.js')

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

      // Internally, we've referred to "Dalton" but amu is probably more common. Dalton is
      // officially more correct but it still seems mostly to be used for protein masses, etc.
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

      // For unclear reasons, Classic MW scales the damping coefficient of obstacles linearly with
      // the obstacle's mass, so the acceleration due to friction is a constant times the velocity:
      //   a(friction) = -cv
      // For compatibility, MD2D does the same.
      // The units of the constant c (called "obstacle friction") are therefore 1 / time.
      inverseTime: {
        name: "1/day",
        pluralName: "1/days",
        symbol: "1/D"
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

      // Forces haven't typically been exposed to Classic MW users in a quantitative way, and indeed
      // they aren't yet exposed in Next Gen MW, so MD2D doesn't try to translate the
      // (computationally convenient) amu nm/fs² to "user friendly" units. That said, Classic MW
      // could be said to use eV/nm implicitly, since spring constants are in eV/nm².
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
