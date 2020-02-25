
// Definitions of the default MD2D units. Every model property exposed by md2d/models/modeler.js is
// in one of the unit types below.

// This particular set of definitions is for reference and for generating the correct labels on
// output properties; it's not used for computation. Unit conversions that need to happen during
// calculations in the MD2D engine itself are "baked in" using the engine's internal constants and
// units module 'md2d/models/engine/constants/index.js')

// Additionally, since we don't yet offer user-facing methods which do unit conversions (e.g.,
// allowing a property setter to accept an argument containing a value and a unit) there is no
// need for quantitative information in this definition.

export default {
  name: "md2d",
  translated: false,
  units: {

    length: {
      name: "nanometer",
      pluralName: "nanometers",
      symbol: "nm"
    },

    // Internally, we've referred to "Dalton" but amu is probably more common. Dalton is
    // officially more correct but it still seems mostly to be used for protein masses, etc.
    mass: {
      name: "atomic mass unit",
      pluralName: "atomic mass units",
      symbol: "amu"
    },

    time: {
      name: "femtosecond",
      pluralName: "femtoseconds",
      symbol: "fs",
      displayValue: {
        unitsPerBaseUnit: 1e-3,
        pluralName: "picoseconds",
        name: "picosecond",
        symbol: "ps"
      }
    },

    // For unclear reasons, Classic MW scales the damping coefficient of obstacles linearly with
    // the obstacle's mass, so the acceleration due to friction is a constant times the velocity:
    //   a(friction) = -cv
    // For compatibility, MD2D does the same.
    // The units of the constant c (called "obstacle friction") are therefore 1 / time.
    inverseTime: {
      name: "1/femtosecond",
      pluralName: "1/femtoseconds",
      symbol: "1/fs"
    },

    velocity: {
      name: "nanometer per femtosecond",
      pluralName: "nanometers per second",
      symbol: "nm/s"
    },

    acceleration: {
      name: "nanometer per femtosecond squared",
      pluralName: "nanometers per femtosecond squared",
      symbol: "nm/fs²"
    },

    momentum: {
      name: "amu nanometer per femtosecond",
      pluralName: "amu nanometers per femtosecond",
      symbol: "amu⋅nm/fs"
    },

    // Forces haven't typically been exposed to Classic MW users in a quantitative way, and indeed
    // they aren't yet exposed in Next Gen MW, so MD2D doesn't try to translate the
    // (computationally convenient) amu nm/fs² to "user friendly" units. That said, Classic MW
    // could be said to use eV/nm implicitly, since spring constants are in eV/nm².
    force: {
      name: "amu nanometer per femtosecond squared",
      pluralName: "amu nanometers per femtosecond squared",
      symbol: "amu⋅nm/fs²"
    },

    energy: {
      name: "electron volt",
      pluralName: "electron volts",
      symbol: "eV"
    },

    // force / velocity = mass / time; given the composite force unit we use, this is much simpler
    // to write as amu/fs than anything else.
    dampingCoefficient: {
      name: "amu per femtosecond",
      pluralName: "amu per femtoseconds",
      symbol: "amu/fs"
    },

    // aka spring constant (= eV/nm per nm)
    stiffness: {
      name: "electron volt per nanometer squared",
      pluralName: "electron volts per nanometer squared",
      symbol: "eV/nm²"
    },

    // aka torsional spring constant.
    // Dimensions are torque / angle = force (eV/nm) x lever arm (nm) / angle (radians). This is
    // dimensionally equivalent to energy / angle (eV/radians) but the interpretation of force x
    // distance is different for energy than it is for torque.
    rotationalStiffness: {
      name: "electron volt per radian",
      pluralName: "electron volts per radian",
      symbol: "eV/rad"
    },

    charge: {
      name: "elementary charge",
      pluralName: "elementary charges",
      symbol: "e"
    },

    temperature: {
      // Not "degrees Kelvin", just "Kelvin".
      name: "Kelvin",
      // Not "Kelvins", just "Kelvin".
      pluralName: "Kelvin",
      symbol: "K"
    },

    pressure: {
      name: "bar",
      // e.g., "50 bar"
      pluralName: "bar",
      symbol: "bar"
    },

    angle: {
      name: "radian",
      pluralName: "radians",
      symbol: "rad"
    }
  }
};
