/*jslint indent: 2, sloppy: true */

var
  vows   = require("vows"),
  assert = require("assert"),
  Part   = require('../../../../../src/lab/models/energy2d/engine/part').Part,
  Rectangle = require('../../../../../src/lab/models/energy2d/engine/utils/shape').Rectangle,
  Ellipse   = require('../../../../../src/lab/models/energy2d/engine/utils/shape').Ellipse,
  Ring      = require('../../../../../src/lab/models/energy2d/engine/utils/shape').Ring,
  Polygon   = require('../../../../../src/lab/models/energy2d/engine/utils/shape').Polygon,

  suite  = vows.describe("models/energy2d/engine/part");

suite.addBatch({
  'Part initialization': {
    'with empty options (no shape defined)': {
      'should throw an exception': function () {
        assert.throws(function () { var test = new part.Part({}) }, Error);
      }
    },
    'with options': {
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
            visible: 13,
            filled: 14,
            color: 15,
            texture: 16,
            label: 17
          },
          part = new Part(options);

        return { part: part, options: options };
      },
      'should return the Part object with properties set': function (pair) {
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
        assert.equal(pair.part.visible, pair.options.visible);
        assert.equal(pair.part.filled, pair.options.filled);
        assert.equal(pair.part.color, pair.options.color);
        assert.equal(pair.part.texture, pair.options.texture);
        assert.equal(pair.part.label, pair.options.label);
      }
    }
  }
});
suite.export(module);
