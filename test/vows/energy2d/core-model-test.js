/*jslint indent: 2, sloppy: true, node: true */

var
  requirejs = require('requirejs'),
  config    = require('../../requirejs-config'),
  vows      = require("vows"),
  assert    = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'energy2d/models/core-model',
  'energy2d/models/default-config',
  'energy2d/models/photon'
], function (core, config, photon) {
  var
    Photon = photon.Photon,

    suite  = vows.describe("energy2d/models/core-model");

  suite.addBatch({
    'Core model': {
      '(initialized with empty options)': {
        topic: function () {
          return core.makeCoreModel({});
        },
        'should have default options': function (model) {
          assert.deepEqual(model.getModelOptions(), config.DEFAULT_VALUES.model);
        },
        'should start at the step 0': function (model) {
          assert.equal(model.getIndexOfStep(), 0);
        },
        'should have all simulation arrays initialized': function (model) {
          var
            nx = model.getGridWidth(),
            ny = model.getGridHeight(),
            array_size = nx * ny;

          assert.lengthOf(model.getTemperatureArray(), array_size);
          assert.lengthOf(model.getUVelocityArray(), array_size);
          assert.lengthOf(model.getVVelocityArray(), array_size);
          assert.lengthOf(model.getUWindArray(), array_size);
          assert.lengthOf(model.getVWindArray(), array_size);
          assert.lengthOf(model.getBoundaryTemperatureArray(), array_size);
          assert.lengthOf(model.getPowerArray(), array_size);
          assert.lengthOf(model.getConductivityArray(), array_size);
          assert.lengthOf(model.getCapacityArray(), array_size);
          assert.lengthOf(model.getDensityArray(), array_size);
          assert.lengthOf(model.getFluidityArray(), array_size);
          assert.lengthOf(model.getPhotonsArray(), 0);
          assert.lengthOf(model.getPartsArray(), 0);
        },
        'should allow to add and remove photons': function (model) {
          var
            p1 = new Photon(1, 2, 3, 4),
            p2 = new Photon(4, 3, 2, 1);

          assert.lengthOf(model.getPhotonsArray(), 0);
          model.addPhoton(p1);
          assert.lengthOf(model.getPhotonsArray(), 1);
          model.addPhoton(p2);
          assert.lengthOf(model.getPhotonsArray(), 2);
          model.removePhoton(p1);
          assert.lengthOf(model.getPhotonsArray(), 1);
          model.removePhoton(p2);
          assert.lengthOf(model.getPhotonsArray(), 0);
        },
        'should allow to get and set temperature at given point (x, y)': function (model) {
          var x = 5, y = 5, temp = 15;

          assert.equal(model.getTemperatureAt(x, y), 0);
          model.setTemperatureAt(x, y, temp);
          assert.equal(model.getTemperatureAt(x, y), temp);
          model.setTemperatureAt(x, y, 0);
          assert.equal(model.getTemperatureAt(x, y), 0);
        },
        'should allow to get and set average temperature at given point (x, y)': function (model) {
          var x = 5, y = 5, temp = 5;

          // This behavior is not logical, but it's consistent with the Java version.
          assert.equal(model.getAverageTemperatureAt(x, y), 0);
          model.changeAverageTemperatureAt(x, y, temp);
          assert.equal(model.getTemperatureAt(x, y), 1);
          model.changeAverageTemperatureAt(x, y, -temp);
          assert.equal(model.getAverageTemperatureAt(x, y), 0);
        }
      }
    }
  });
  suite.export(module);
});
