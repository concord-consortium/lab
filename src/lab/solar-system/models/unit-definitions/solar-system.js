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
        name: "meter",
        pluralName: "meters",
        abbreviation: "m"
      },

      // Internally, we've referred to "Dalton" but amu is probably more common. Dalton is
      // officially more correct but it still seems mostly to be used for protein masses, etc.
      mass: {
        name: "kilogram",
        pluralName: "kilograms",
        abbreviation: "kg"
      },

      time: {
        name: "second",
        pluralName: "seconds",
        abbreviation: "s",
        displayValue: {
          unitsPerBaseUnit: 1,
          pluralName: "seconds",
          name: "second",
          abbreviation: "s"
        }
      },

      // For unclear reasons, Classic MW scales the damping coefficient of obstacles linearly with
      // the obstacle's mass, so the acceleration due to friction is a constant times the velocity:
      //   a(friction) = -cv
      // For compatibility, MD2D does the same.
      // The units of the constant c (called "obstacle friction") are therefore 1 / time.
      inverseTime: {
        name: "1/second",
        pluralName: "1/seconds",
        abbreviation: "1/s"
      },

      velocity: {
        name: "meter per second",
        pluralName: "meters per second",
        abbreviation: "m/s"
      },

      acceleration: {
        name: "meter per second squared",
        pluralName: "meters per second squared",
        abbreviation: "m/fs²"
      },

      momentum: {
        name: "kg meter per second",
        pluralName: "kg meters per second",
        abbreviation: "kg⋅m/s"
      },

      // Forces haven't typically been exposed to Classic MW users in a quantitative way, and indeed
      // they aren't yet exposed in Next Gen MW, so MD2D doesn't try to translate the
      // (computationally convenient) amu nm/fs² to "user friendly" units. That said, Classic MW
      // could be said to use eV/nm implicitly, since spring constants are in eV/nm².
      force: {
        name: "kg ometer per second squared",
        pluralName: "kg meters per second squared",
        abbreviation: "kg⋅nm/s²"
      },

      energy: {
        name: "joules",
        pluralName: "joules",
        abbreviation: "J"
      },

      // aka spring constant (= eV/nm per nm)
      stiffness: {
        name: "joule per meter squared",
        pluralName: "joule per meter squared",
        abbreviation: "J/nm²"
      },

      temperature: {
        // Not "degrees Kelvin", just "Kelvin".
        name: "Kelvin",
        // Not "Kelvins", just "Kelvin".
        pluralName: "Kelvin",
        abbreviation: "K"
      },

      pressure: {
        name: "bar",
        // e.g., "50 bar"
        pluralName: "bar",
        abbreviation: "bar"
      },

      angle: {
        name: "radian",
        pluralName: "radians",
        abbreviation: "rad"
      }
    }
  };
});
