var helpers   = require("../../helpers");
helpers.setupBrowserEnvironment();

var vows      = require("vows"),
    assert    = require("assert"),
    requirejs = helpers.getRequireJS(),

    validator = requirejs('common/validator'),
    metadata  = requirejs('models/energy2d/metadata'),
    core   = requirejs('models/energy2d/models/core-model'),
    photon = requirejs('models/energy2d/models/photon'),
    Photon = photon.Photon,

    suite = vows.describe("energy2d/models/core-model"),

    OPTIONS = validator.validateCompleteness(metadata.mainProperties, {});

suite.addBatch({
  'Core model': {
    '(initialized with empty options)': {
      topic: function () {
        return core.makeCoreModel(OPTIONS);
      },
      'should start at the step 0': function (model) {
        assert.equal(model.getIndexOfStep(), 0);
      },
      'should have all simulation arrays initialized': function (model) {
        var
          nx = OPTIONS.grid_width,
          ny = OPTIONS.grid_height,
          array_size = nx * ny;

        assert.equal(model.getTemperatureArray().length, array_size);
        assert.equal(model.getUVelocityArray().length, array_size);
        assert.equal(model.getVVelocityArray().length, array_size);
        assert.equal(model.getUWindArray().length, array_size);
        assert.equal(model.getVWindArray().length, array_size);
        assert.equal(model.getBoundaryTemperatureArray().length, array_size);
        assert.equal(model.getPowerArray().length, array_size);
        assert.equal(model.getConductivityArray().length, array_size);
        assert.equal(model.getCapacityArray().length, array_size);
        assert.equal(model.getDensityArray().length, array_size);
        assert.equal(model.getFluidityArray().length, array_size);
        assert.equal(model.getPhotonsArray().length, 0);
        assert.equal(model.getPartsArray().length, 0);
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