// Test physical constants against independently looked-up values using
// hand-written unit conversions.
const assert = require("assert");
import constants from "models/md2d/models/engine/constants";
const unit = constants.unit;

assert.close = function (actual, expected) {
  if (Math.abs(1 - actual / expected) > 0.00001) {
    assert.fail(actual, expected, "expected {actual} to be within 0.00001 of {expected}");
  }
};

describe("ELEMENTARY_CHARGE", () => {
  const topic = constants.ELEMENTARY_CHARGE;
  it("is correct in different units", () => {
    assert.close(topic.as(unit.COULOMB), 1.6021777e-19);
    assert.close(topic.as(unit.ELEMENTARY_CHARGE), 1);
  });
});

describe("ATOMIC_MASS", () => {
  const topic = constants.ATOMIC_MASS;
  it("is correct in different units", () => {
    assert.close(topic.as(unit.DALTON), 1);
    assert.close(topic.as(unit.GRAM), 1.660540e-24);
    assert.close(topic.as(unit.KILOGRAM), 1.660540e-27);
  });
});

describe("BOLTZMANN_CONSTANT", () => {
  const topic = constants.BOLTZMANN_CONSTANT;
  it("is correct in different units", () => {
    assert.close(topic.as(unit.JOULES_PER_KELVIN), 1.380658e-23);
    assert.close(topic.as(unit.EV_PER_KELVIN), 8.617387e-5);
  });
});

describe("AVAGADRO_CONSTANT", () => {
  const topic = constants.AVAGADRO_CONSTANT;
  it("is correct in different units", () => {
    assert.close(topic.as(unit.INVERSE_MOLE), 6.022137e23);
  });
});

describe("ratio method", () => {
  it("correctly calculates grams *per* kilogram when asked for 'per'", () => {
    assert.equal(constants.ratio(unit.GRAM, {per: unit.KILOGRAM}), 1000);
  });
  it("correctly returns grams as a fraction of kilogram", () => {
    assert.equal(constants.ratio(unit.GRAM, {as: unit.KILOGRAM}), 0.001);
  });
});

describe("convert method", () => {
  it("correctly converts 1 kilogram from kilograms to grams", () => {
    assert.equal(constants.convert(1, {from: unit.KILOGRAM, to: unit.GRAM}), 1000);
  });
  it("correctly returns 1 gram from grams to kilograms", () => {
    assert.equal(constants.convert(1, {from: unit.GRAM, to: unit.KILOGRAM}), 0.001);
  });
});

describe("1 \"MW Force Unit\"", () => {
  const topic = unit.MW_FORCE_UNIT;

  it("Should be 1.660538e-6 N", () => {
    assert.close(constants.ratio(topic, {as: unit.NEWTON}), 1.660538e-6);
  });

  it("Should be 1 Dalton * nm / fs^2", () => {
    var KILOGRAMS_PER_DALTON = constants.ratio(unit.KILOGRAM, {per: unit.DALTON}),
      METERS_PER_NANOMETER = constants.ratio(unit.METER, {per: unit.NANOMETER}),
      FEMTOSECONDS_PER_SECOND = constants.ratio(unit.FEMTOSECOND, {per: unit.SECOND});

    assert.close(constants.ratio(topic, {as: unit.NEWTON}),
      1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * FEMTOSECONDS_PER_SECOND * FEMTOSECONDS_PER_SECOND);
  });
});

describe("1 \"MW Velocity Unit\"", () => {
  const topic = unit.MW_VELOCITY_UNIT;

  it("Should be 1e6 m/s", () => {
    assert.close(constants.ratio(topic, {as: unit.METERS_PER_SECOND}), 1e6);
  });

  it("Should be 1 nm / fs", () => {
    var METERS_PER_NANOMETER = constants.ratio(unit.METER, {per: unit.NANOMETER}),
      FEMTOSECONDS_PER_SECOND = constants.ratio(unit.FEMTOSECOND, {per: unit.SECOND});

    assert.close(constants.ratio(topic, {as: unit.METERS_PER_SECOND}),
      1 * METERS_PER_NANOMETER * FEMTOSECONDS_PER_SECOND);
  });
});

describe("1 \"MW Energy Unit\"", () => {
  const topic = unit.MW_ENERGY_UNIT;

  it("Should be 1.660538e-15 J", () => {
    assert.close(constants.ratio(topic, {as: unit.JOULE}), 1.660538e-15);
  });

  it("Should be 1 Dalton * nm^2 / fs^2", () => {
    var KILOGRAMS_PER_DALTON = constants.ratio(unit.KILOGRAM, {per: unit.DALTON}),
      METERS_PER_NANOMETER = constants.ratio(unit.METER, {per: unit.NANOMETER}),
      FEMTOSECONDS_PER_SECOND = constants.ratio(unit.FEMTOSECOND, {per: unit.SECOND});

    assert.close(constants.ratio(topic, {as: unit.JOULE}),
      1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * METERS_PER_NANOMETER * FEMTOSECONDS_PER_SECOND * FEMTOSECONDS_PER_SECOND);
  });
});
