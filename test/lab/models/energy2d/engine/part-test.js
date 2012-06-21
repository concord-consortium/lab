/*jslint indent: 2, sloppy: true */

var
  vows = require("vows"),
  assert = require("assert"),
  suite = vows.describe("models/energy2d/engine/part"),
  Part = require('../../../../../src/lab/models/energy2d/engine/part').Part,
  Photon = require('../../../../../src/lab/models/energy2d/engine/photon').Photon;


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
  },
  'Part': {
    '(rectangle-shaped)': {
      topic: function () {
        var options = {
            rectangle: { x: 1, y: 1, width: 2, height: 2 }
          };
        return new Part(options);
      },
      'should contain points laying indside': function (part) {
        assert.equal(part.contains(1.01, 1.01), true);
        assert.equal(part.contains(2.00, 2.00), true);
        assert.equal(part.contains(2.99, 2.99), true);
        // Boundary
        assert.equal(part.contains(1, 1), true);
        assert.equal(part.contains(3, 3), true);
      },
      'should not contain points laying outside': function (part) {
        assert.equal(part.contains(0.99, 1.50), false);
        assert.equal(part.contains(1.50, 0.99), false);
        assert.equal(part.contains(3.01, 1.50), false);
        assert.equal(part.contains(1.50, 3.01), false);
      },
      'should reflect photons': function (part) {
        var p = new Photon(), dt = 1;
        // corner
        p.x = 2; p.y = 2; p.vx = 1.5; p.vy = 1.5;
        assert.isTrue(part.reflect(p, dt));
        assert.equal(p.vx, -1.5);
        assert.equal(p.vy, -1.5);
        // top
        p.x = 2; p.y = 2.9; p.vx = 0.2; p.vy = -0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.equal(p.vx, 0.2);
        assert.equal(p.vy, 0.2);
        // right
        p.x = 2.9; p.y = 2; p.vx = -0.2; p.vy = 0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.equal(p.vx, 0.2);
        assert.equal(p.vy, 0.2);
        // bottom
        p.x = 2; p.y = 1.1; p.vx = 0.2; p.vy = 0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.equal(p.vx, 0.2);
        assert.equal(p.vy, -0.2);
        // left
        p.x = 1.1; p.y = 2; p.vx = 0.2; p.vy = 0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.equal(p.vx, -0.2);
        assert.equal(p.vy, 0.2);
        // far away
        p.x = 10; p.y = 10; p.vx = 0.2; p.vy = 0.2;
        assert.isFalse(part.reflect(p, dt));
        assert.equal(p.vx, 0.2);
        assert.equal(p.vy, 0.2);
      }
    },
    '(ellipse-shaped)': {
      topic: function () {
        var options = {
            ellipse: { x: 5, y: 5, a: 2, b: 4 }
          };
        return new Part(options);
      },
      'should contain points laying indside': function (part) {
        assert.equal(part.contains(4.01, 5.00), true);
        assert.equal(part.contains(5.00, 5.00), true);
        assert.equal(part.contains(5.00, 6.99), true);
        // Boundary
        assert.equal(part.contains(4, 5), true);
        assert.equal(part.contains(5, 7), true);
      },
      'should not contain points laying outside': function (part) {
        assert.equal(part.contains(3.99, 5.0), false);
        assert.equal(part.contains(5.0, 2.99), false);
        assert.equal(part.contains(6.01, 5.0), false);
        assert.equal(part.contains(5.0, 7.01), false);
      },
      'should reflect photons': function (part) {
        var p = new Photon(), dt = 1;
        // top
        p.x = 5; p.y = 6.9; p.vx = 0.2; p.vy = -0.2;
        assert.isTrue(part.reflect(p, dt));
        // Due to polygonization it's impossible to guess exact value of new speed.
        assert.isTrue(p.vy > 0);
        // right
        p.x = 5.9; p.y = 5; p.vx = -0.2; p.vy = 0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.isTrue(p.vx > 0);
        // bottom
        p.x = 5; p.y = 3.1; p.vx = 0.2; p.vy = 0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.isTrue(p.vy < 0);
        // left
        p.x = 4.1; p.y = 5; p.vx = 0.2; p.vy = 0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.isTrue(p.vx < 0);
        // far away
        p.x = 10; p.y = 10; p.vx = 0.2; p.vy = 0.2;
        assert.isFalse(part.reflect(p, dt));
        assert.equal(p.vx, 0.2);
        assert.equal(p.vy, 0.2);
      }
    },
    '(ring-shaped)': {
      topic: function () {
        var options = {
            ring: { x: 5, y: 5, inner: 2, outer: 4 }
          };
        return new Part(options);
      },
      'should contain points laying indside': function (part) {
        assert.equal(part.contains(3.01, 5.00), true);
        assert.equal(part.contains(3.99, 5.00), true);
        assert.equal(part.contains(5.00, 6.01), true);
        assert.equal(part.contains(5.00, 6.99), true);
        // Boundary
        assert.equal(part.contains(3, 5), true);
        assert.equal(part.contains(4, 5), true);
        assert.equal(part.contains(5, 3), true);
        assert.equal(part.contains(5, 4), true);
        assert.equal(part.contains(5, 6), true);
        assert.equal(part.contains(5, 7), true);
        assert.equal(part.contains(6, 5), true);
        assert.equal(part.contains(7, 5), true);
      },
      'should not contain points laying outside': function (part) {
        assert.equal(part.contains(2.99, 5.0), false);
        assert.equal(part.contains(5.0, 2.99), false);
        assert.equal(part.contains(4.01, 5.0), false);
        assert.equal(part.contains(5.0, 4.01), false);
        assert.equal(part.contains(5.0, 5.0), false);
        assert.equal(part.contains(5.0, 5.99), false);
        assert.equal(part.contains(5.99, 5.0), false);
        assert.equal(part.contains(5.0, 7.01), false);
        assert.equal(part.contains(7.01, 5.0), false);
      },
      "should not reflect photons, as it's not implemented yet": function (part) {
        assert.isFalse(part.reflect(new Photon(), 1));
      }
    },
    '(polygon-shaped)': {
      topic: function () {
        var options = {
            polygon: {
              count: 6,
              vertices: '1, 1, 3, 3, 5, 1, 7, 3, 9, 1, 5, -3'
            }
          };
        return new Part(options);
      },
      'should contain points laying indside': function (part) {
        assert.equal(part.contains(1.5, 1.5), true);
        assert.equal(part.contains(1.01, 1.00), true);
        assert.equal(part.contains(8.99, 1.00), true);
        assert.equal(part.contains(5.00, 0.99), true);
        assert.equal(part.contains(5.0, -2.99), true);
        assert.equal(part.contains(3.00, 2.99), true);
        assert.equal(part.contains(7.00, 2.99), true);
        assert.equal(part.contains(5.00, 0.00), true);
      },
      'should not contain points laying outside': function (part) {
        assert.equal(part.contains(0.99, 1.00), false);
        assert.equal(part.contains(9.01, 1.00), false);
        assert.equal(part.contains(5.00, 1.01), false);
        assert.equal(part.contains(5.0, -3.01), false);
        assert.equal(part.contains(3.00, 3.01), false);
        assert.equal(part.contains(7.00, 3.01), false);
        assert.equal(part.contains(5.00, 2.00), false);
      },
      'should reflect photons': function (part) {
        var p = new Photon(), dt = 1, err_delta = 0.01;
        // top
        p.x = 2; p.y = 1.9; p.vx = 0.0; p.vy = -0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.inDelta(p.vx, -0.2, err_delta);
        assert.equal(p.vy, 0);
        // right
        p.x = 3.9; p.y = 2; p.vx = -0.2; p.vy = 0.0;
        assert.isTrue(part.reflect(p, dt));
        assert.equal(p.vx, 0);
        assert.inDelta(p.vy, 0.2, err_delta);
        // bottom-left
        p.x = 3.1; p.y = -1; p.vx = 0.2; p.vy = 0.2;
        assert.isTrue(part.reflect(p, dt));
        assert.inDelta(p.vy, -0.2, err_delta);
        assert.inDelta(p.vy, -0.2, err_delta);
      }
    }
  }
});

suite.export(module);