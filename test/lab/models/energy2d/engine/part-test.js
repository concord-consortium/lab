/*jslint indent: 2, sloppy: true */

var
  vows   = require("vows"),
  assert = require("assert"),
  Part   = require('../../../../../src/lab/models/energy2d/engine/part').Part,
  core   = require('../../../../../src/lab/models/energy2d/engine/core-model'),
  Rectangle = require('../../../../../src/lab/models/energy2d/engine/utils/shape').Rectangle,
  Ellipse   = require('../../../../../src/lab/models/energy2d/engine/utils/shape').Ellipse,
  Ring      = require('../../../../../src/lab/models/energy2d/engine/utils/shape').Ring,
  Polygon   = require('../../../../../src/lab/models/energy2d/engine/utils/shape').Polygon,

  suite  = vows.describe("models/energy2d/engine/part");

suite.addBatch({
  'Part': {
    'initialized with empty options (no shape defined)': {
      'should throw an exception': function () {
        assert.throws(function () { var test = new part.Part({}); }, Error);
      }
    },
    'initialized with (dummy) options': {
      topic: function () {
        var
          options = {
            rectangle: {
              x: 1, y: 2, width: 3, height: 4
            },
            thermal_conductivity: 5,
            specific_heat: 6,
            density: 7,
            temperature: 8,
            constant_temperature: 9,
            power: 10,
            wind_speed: 11,
            wind_angle: 12,

            transmission: 13,
            reflection: 14,
            absorption: 15,
            emissivity: 16,

            visible: 17,
            filled: 18,
            color: 19,
            texture: 20,
            label: 21
          },
          part = new Part(options);

        return { part: part, options: options };
      },
      'should have properties set': function (pair) {
        assert.deepEqual(pair.part.rectangle, pair.options.rectangle);
        assert.instanceOf(pair.part.shape, Rectangle);
        assert.equal(pair.part.thermal_conductivity, pair.options.thermal_conductivity);
        assert.equal(pair.part.specific_heat, pair.options.specific_heat);
        assert.equal(pair.part.density, pair.options.density);
        assert.equal(pair.part.temperature, pair.options.temperature);
        assert.equal(pair.part.constant_temperature, pair.options.constant_temperature);
        assert.equal(pair.part.power, pair.options.power);
        assert.equal(pair.part.wind_speed, pair.options.wind_speed);
        assert.equal(pair.part.wind_angle, pair.options.wind_angle);

        assert.equal(pair.part.transmission, pair.options.transmission);
        assert.equal(pair.part.reflection, pair.options.reflection);
        assert.equal(pair.part.absorption, pair.options.absorption);
        assert.equal(pair.part.emissivity, pair.options.emissivity);

        assert.equal(pair.part.visible, pair.options.visible);
        assert.equal(pair.part.filled, pair.options.filled);
        assert.equal(pair.part.color, pair.options.color);
        assert.equal(pair.part.texture, pair.options.texture);
        assert.equal(pair.part.label, pair.options.label);
      }
    },
    'created in context of the simulation model, which is emmisive': {
      topic: function () {
        var options = {
          structure: {
            part: [
              {
                rectangle: {
                  x: 4, y: 4, width: 2, height: 2
                },
                emissivity: 1,
                temperature: 50 // greater than MINIMAL_RADIATING_TEMPERATURE = 20
              }
            ]
          }
        };
        return new core.makeCoreModel(options);
      },
      'should radiate': function (model) {
        var part = model.getPartsArray()[0];

        assert.lengthOf(model.getPhotonsArray(), 0);
        assert.equal(model.getTemperatureAt(5, 4), 50);
        part.radiate(model);
        assert.isTrue(model.getPhotonsArray().length > 0);
      }
    }
  }
});
suite.export(module);
