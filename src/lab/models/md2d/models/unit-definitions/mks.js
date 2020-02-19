
// Definitions of the MKS units used for macroscopic models. We simulate macroscopic models by
// declaring that some value in (microscopic) MD2D units actually represents one macroscopic-scale
// unit of the same type, e.g., we choose 1 nm (a value of 1 in any MD2D property that has unitType
// "length") to represent 1 m.
//
// Such microscopic:macroscopic ratios as 1nm:1m can only be freely chosen for three unit types:
// length, mass, and time. The remaining unit ratios are computed by the UnitsTranslation module.
// See http://lab.dev.concord.org/doc/models/md2d/macroscopic-units/ for an overview of the
// calculations.
//
// In order to compute these ratios, the UnitsTranslation requires two pieces of
// data about each unit:
//
// (1) for mass, length, and time only, the "representationInMD2DUnits" property, which tells
//     how many MD2D units of the same type represent 1 macroscopic unit.
// (2) for each unit type, the "valueInSIUnits" property, which tells the value of that unit in
//     SI units. This is required, for example, if we wanted to have a unit system that represented
//     acceleration in g (multiples of Earth gravity.) We can automatically translate from the MD2D
//     system of units (nm/fs²) to SI/MKS, but without further information relating the value of 1g
//     to units of m/s² we cannot translate MD2D units to g.
//
// Additionally, angle, pressure, and temperature are not included below. That is because angle
// units require no translation, and temperature, while nominally applicable to macroscale models,
// is computed from kinetic energy in a way that is not really applicable to, e.g., a macroscopic
// mass-spring model. Moreover pressure units in Classic MW are somewhat fake, and we don't really
// anticipate trying to compute the pressure exerted by a box of bouncing macroscopic balls.

export default {
  name: "mks",
  translated: true,
  units: {

    length: {
      name: "meter",
      pluralName: "meters",
      symbol: "m",
      representationInMD2DUnits: 1,
      valueInSIUnits: 1
    },

    mass: {
      name: "kilogram",
      pluralName: "kilograms",
      symbol: "kg",
      representationInMD2DUnits: 1,
      valueInSIUnits: 1
    },

    time: {
      name: "second",
      pluralName: "seconds",
      symbol: "s",
      representationInMD2DUnits: 1e4,
      valueInSIUnits: 1
    },

    inverseTime: {
      name: "1/second",
      pluralName: "1/seconds",
      symbol: "1/s",
      valueInSIUnits: 1
    },

    velocity: {
      name: "meter per second",
      pluralName: "meters per second",
      symbol: "m/s",
      valueInSIUnits: 1
    },

    acceleration: {
      name: "meter per second squared",
      pluralName: "meters per second squared",
      symbol: "m/s²",
      valueInSIUnits: 1
    },

    force: {
      name: "Newton",
      pluralName: "Newtons",
      symbol: "N",
      valueInSIUnits: 1
    },

    energy: {
      name: "Joule",
      pluralName: "Joules",
      symbol: "J",
      valueInSIUnits: 1
    },

    dampingCoefficient: {
      name: "Newton second per meter",
      pluralName: "Newton seconds per meter",
      symbol: "N⋅s/m",
      valueInSIUnits: 1
    },

    // aka spring constant
    stiffness: {
      name: "Newton per meter",
      pluralName: "Newtons per meter",
      symbol: "N/m",
      valueInSIUnits: 1
    },

    // aka torsional spring constant
    rotationalStiffness: {
      name: "Newton-meter per radian",
      pluralName: "Newton-meters per radian",
      symbol: "N⋅m/rad",
      valueInSIUnits: 1
    },

    charge: {
      name: "Coulomb",
      pluralName: "Coulombs",
      symbol: "C",
      valueInSIUnits: 1
    }
  }
};
