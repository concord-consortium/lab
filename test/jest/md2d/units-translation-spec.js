import UnitsTranslation from "models/md2d/models/units-translation";

const mks = {
  name: "mks",
  translated: true,
  units: {

    length: {
      name: "meter",
      pluralName: "meters",
      abbreviation: "m",
      representationInMD2DUnits: 1,
      valueInSIUnits: 1
    },

    mass: {
      name: "kilogram",
      pluralName: "kilograms",
      abbreviation: "kg",
      representationInMD2DUnits: 1,
      valueInSIUnits: 1
    },

    time: {
      name: "second",
      pluralName: "seconds",
      abbreviation: "s",
      representationInMD2DUnits: 1e4,
      valueInSIUnits: 1
    },

    inverseTime: {
      name: "1/second",
      pluralName: "1/seconds",
      abbreviation: "1/s",
      valueInSIUnits: 1
    },

    velocity: {
      name: "meter per second",
      pluralName: "meters per second",
      abbreviation: "m/s",
      valueInSIUnits: 1
    },

    acceleration: {
      name: "meter per second squared",
      pluralName: "meters per second squared",
      abbreviation: "m/s²",
      valueInSIUnits: 1
    },

    force: {
      name: "Newton",
      pluralName: "Newtons",
      abbreviation: "N",
      valueInSIUnits: 1
    },

    energy: {
      name: "Joule",
      pluralName: "Joules",
      abbreviation: "J",
      valueInSIUnits: 1
    },

    dampingCoefficient: {
      name: "Newton second per meter",
      pluralName: "Newton seconds per meter",
      abbreviation: "N⋅s/m",
      valueInSIUnits: 1
    },

    // aka spring constant
    stiffness: {
      name: "Newton per meter",
      pluralName: "Newtons per meter",
      abbreviation: "N/m",
      valueInSIUnits: 1
    },

    // aka torsional spring constant
    rotationalStiffness: {
      name: "Newton-meter per radian",
      pluralName: "Newton-meters per radian",
      abbreviation: "N⋅m/rad",
      valueInSIUnits: 1
    },

    charge: {
      name: "Coulomb",
      pluralName: "Coulombs",
      abbreviation: "C",
      valueInSIUnits: 1
    }
  }
};

// see http://lab.dev.concord.org/doc/models/md2d/macroscopic-units/
const expectedMD2DUnitValueInMKSUnits = {
  mass: 1,
  length: 1,
  time: 1e-4,
  inverseTime: 1e4,
  velocity: 1e4,
  acceleration: 1e8,
  force: 1e8,
  energy: 9.649e3,
  dampingCoefficient: 1e4,
  stiffness: 9.649e3,
  rotationalStiffness: 9.649e3,
  charge: 7.313e-4
};

describe("UnitsTranslation", () => {
  const translation = new UnitsTranslation(mks);

  for (var unitType in expectedMD2DUnitValueInMKSUnits) {
    var value = expectedMD2DUnitValueInMKSUnits[unitType];
    it(`should translate ${unitType} correctly into MD2D units`, () => {
      translation.translateToModelUnits(value, unitType).should.be.approximately(1, 1e-3);
    });

    it(`should translated ${unitType} correctly from MD2D units`, () => {
      translation.translateFromModelUnits(1, unitType).should.be.approximately(value, value * 1e-3);
    });
  }

  it("should return an untranslated value for unit types it does not convert", function () {
    translation.translateToModelUnits(1, "made up unit type").should.eql(1);
    translation.translateFromModelUnits(1, "made up unit type").should.eql(1);
  });
});
