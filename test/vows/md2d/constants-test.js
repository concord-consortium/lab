// Test physical constants against independently looked-up values using
// hand-written unit conversions.

var constants = require('../../../src/lab/models/md2d/models/engine/constants'),
    unit = constants.unit,

    vows = require("vows"),
    assert = require("assert"),

    suite = vows.describe('md2d/models/engine/constants');

assert.close = function(actual, expected) {
  if (Math.abs(1 - actual/expected) > 0.00001) {
    assert.fail(actual, expected, "expected {actual} to be within 0.00001 of {expected}");
  }
};

suite.addBatch({
  "ELEMENTARY_CHARGE": {
    topic: constants.ELEMENTARY_CHARGE,

    "is correct in different units": function(topic) {
      assert.close( topic.as(unit.COULOMB),           1.6021777e-19);
      assert.close( topic.as(unit.ELEMENTARY_CHARGE), 1);
    }
  },

  "ATOMIC_MASS": {
    topic: constants.ATOMIC_MASS,
    "is correct in different units": function(topic) {
      assert.close( topic.as(unit.DALTON), 1);
      assert.close( topic.as(unit.GRAM), 1.660540e-24);
      assert.close( topic.as(unit.KILOGRAM), 1.660540e-27);
    }
  },

  "BOLTZMANN_CONSTANT": {
    topic: constants.BOLTZMANN_CONSTANT,
    "is correct in different units": function(topic) {
      assert.close( topic.as(unit.JOULES_PER_KELVIN), 1.380658e-23);
      assert.close( topic.as(unit.EV_PER_KELVIN), 8.617387e-5);
    }
  },

  "AVAGADRO_CONSTANT": {
    topic: constants.AVAGADRO_CONSTANT,
    "is correct": function(topic) {
      assert.close(topic.as(unit.INVERSE_MOLE), 6.022137e23);
    }
  }
});

suite.addBatch({
  "ratio method": {
    topic: constants,

    "correctly calculates grams *per* kilogram when asked for 'per'": function(topic) {
      assert.equal(constants.ratio(unit.GRAM, { per: unit.KILOGRAM }), 1000);
    },

    "correctly returns grams as a fraction of kilogram": function(topic) {
      assert.equal(constants.ratio(unit.GRAM, { as: unit.KILOGRAM }), 0.001);
    }
  },

  "convert method": {
    "correctly converts 1 kilogram from kilograms to grams": function(topic) {
      assert.equal(constants.convert(1, { from: unit.KILOGRAM, to: unit.GRAM }), 1000);
    },

    "correctly returns 1 gram from grams to kilograms": function(topic) {
      assert.equal(constants.convert(1, { from: unit.GRAM, to: unit.KILOGRAM }), 0.001);
    }
  }
});

suite.addBatch({
  "1 \"MW Force Unit\"": {
    topic: unit.MW_FORCE_UNIT,

    "Should be 1.660538e-6 N": function(topic) {
      assert.close( constants.ratio( topic, { as: unit.NEWTON }), 1.660538e-6);
    },

    "Should be 1 Dalton * nm / fs^2": function(topic) {
      var KILOGRAMS_PER_DALTON = constants.ratio( unit.KILOGRAM, { per: unit.DALTON }),
          METERS_PER_NANOMETER = constants.ratio( unit.METER, { per: unit.NANOMETER }),
          FEMTOSECONDS_PER_SECOND = constants.ratio( unit.FEMTOSECOND, { per: unit.SECOND });

      assert.close( constants.ratio( topic, { as: unit.NEWTON }),
        1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * FEMTOSECONDS_PER_SECOND * FEMTOSECONDS_PER_SECOND);
    }
  },

  "1 \"MW Velocity Unit\"": {
    topic: unit.MW_VELOCITY_UNIT,

    "Should be 1e6 m/s": function(topic) {
      assert.close( constants.ratio( topic, { as: unit.METERS_PER_SECOND }), 1e6);
    },

    "Should be 1 nm / fs": function(topic) {
      var METERS_PER_NANOMETER = constants.ratio( unit.METER, { per: unit.NANOMETER }),
          FEMTOSECONDS_PER_SECOND = constants.ratio( unit.FEMTOSECOND, { per: unit.SECOND });

      assert.close( constants.ratio( topic, { as: unit.METERS_PER_SECOND }),
        1 * METERS_PER_NANOMETER  * FEMTOSECONDS_PER_SECOND)
    }
  },

  "1 \"MW Energy Unit\"": {
    topic: unit.MW_ENERGY_UNIT,

    "Should be 1.660538e-15 J": function(topic) {
      assert.close( constants.ratio( topic, { as: unit.JOULE }), 1.660538e-15);
    },

    "Should be 1 Dalton * nm^2 / fs^2": function(topic) {
      var KILOGRAMS_PER_DALTON = constants.ratio( unit.KILOGRAM, { per: unit.DALTON }),
          METERS_PER_NANOMETER = constants.ratio( unit.METER, { per: unit.NANOMETER }),
          FEMTOSECONDS_PER_SECOND = constants.ratio( unit.FEMTOSECOND, { per: unit.SECOND });

      assert.close( constants.ratio( topic, { as: unit.JOULE }),
        1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * METERS_PER_NANOMETER * FEMTOSECONDS_PER_SECOND * FEMTOSECONDS_PER_SECOND);
    }
  }

});

suite.export(module);
