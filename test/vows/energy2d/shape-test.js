var helpers   = require("../../helpers");
helpers.setupBrowserEnvironment();

var vows      = require("vows"),
    assert    = require("assert"),
    requirejs = helpers.getRequireJS(),

    shape     = requirejs('models/energy2d/models/shape'),
    Line      = shape.Line,
    Rectangle = shape.Rectangle,
    Ellipse   = shape.Ellipse,
    Ring      = shape.Ring,
    Polygon   = shape.Polygon,

    suite = vows.describe("energy2d/models/shape");

suite.addBatch({
  'Rectangle': {
    topic: function () {
      return new Rectangle(1, 1, 2, 2);
    },
    'should contain points laying indside': function (rectangle) {
      assert.isTrue(rectangle.contains(1.01, 1.01), true);
      assert.isTrue(rectangle.contains(2.00, 2.00), true);
      assert.isTrue(rectangle.contains(2.99, 2.99), true);
      // Boundary
      assert.isTrue(rectangle.contains(1, 1), true);
      assert.isTrue(rectangle.contains(3, 3), true);
    },
    'should not contain points laying outside': function (rectangle) {
      assert.equal(rectangle.contains(0.99, 1.50), false);
      assert.equal(rectangle.contains(1.50, 0.99), false);
      assert.equal(rectangle.contains(3.01, 1.50), false);
      assert.equal(rectangle.contains(1.50, 3.01), false);
    }
  },
  'Ellipse': {
    topic: function () {
      return new Ellipse(5, 5, 2, 4);
    },
    'should contain points laying indside': function (ellipse) {
      assert.isTrue(ellipse.contains(4.01, 5.00));
      assert.isTrue(ellipse.contains(5.00, 5.00));
      assert.isTrue(ellipse.contains(5.00, 6.99));
      // Boundary
      assert.isTrue(ellipse.contains(4, 5));
      assert.isTrue(ellipse.contains(5, 7));
    },
    'should not contain points laying outside': function (ellipse) {
      assert.isFalse(ellipse.contains(3.99, 5.0));
      assert.isFalse(ellipse.contains(5.0, 2.99));
      assert.isFalse(ellipse.contains(6.01, 5.0));
      assert.isFalse(ellipse.contains(5.0, 7.01));
    }
  },
  'Ring': {
    topic: function () {
      return new Ring(5, 5, 2, 4);
    },
    'should contain points laying indside': function (ring) {
      assert.isTrue(ring.contains(3.01, 5.00));
      assert.isTrue(ring.contains(3.99, 5.00));
      assert.isTrue(ring.contains(5.00, 6.01));
      assert.isTrue(ring.contains(5.00, 6.99));
      // Boundary
      assert.isTrue(ring.contains(3, 5));
      assert.isTrue(ring.contains(4, 5));
      assert.isTrue(ring.contains(5, 3));
      assert.isTrue(ring.contains(5, 4));
      assert.isTrue(ring.contains(5, 6));
      assert.isTrue(ring.contains(5, 7));
      assert.isTrue(ring.contains(6, 5));
      assert.isTrue(ring.contains(7, 5));
    },
    'should not contain points laying outside': function (ring) {
      assert.isFalse(ring.contains(2.99, 5.0));
      assert.isFalse(ring.contains(5.0, 2.99));
      assert.isFalse(ring.contains(4.01, 5.0));
      assert.isFalse(ring.contains(5.0, 4.01));
      assert.isFalse(ring.contains(5.0, 5.0));
      assert.isFalse(ring.contains(5.0, 5.99));
      assert.isFalse(ring.contains(5.99, 5.0));
      assert.isFalse(ring.contains(5.0, 7.01));
      assert.isFalse(ring.contains(7.01, 5.0));
    }
  },
  'Polygon': {
    topic: function () {
      var
        count = 6,
        x_coords = [1, 3, 5, 7, 9, 5],
        y_coords = [1, 3, 1, 3, 1, -3];
      return new Polygon(count, x_coords, y_coords);
    },
    'should contain points laying indside': function (polygon) {
      assert.isTrue(polygon.contains(1.5, 1.5));
      assert.isTrue(polygon.contains(1.01, 1.00));
      assert.isTrue(polygon.contains(8.99, 1.00));
      assert.isTrue(polygon.contains(5.00, 0.99));
      assert.isTrue(polygon.contains(5.0, -2.99));
      assert.isTrue(polygon.contains(3.00, 2.99));
      assert.isTrue(polygon.contains(7.00, 2.99));
      assert.isTrue(polygon.contains(5.00, 0.00));
    },
    'should not contain points laying outside': function (polygon) {
      assert.isFalse(polygon.contains(0.99, 1.00));
      assert.isFalse(polygon.contains(9.01, 1.00));
      assert.isFalse(polygon.contains(5.00, 1.01));
      assert.isFalse(polygon.contains(5.0, -3.01));
      assert.isFalse(polygon.contains(3.00, 3.01));
      assert.isFalse(polygon.contains(7.00, 3.01));
      assert.isFalse(polygon.contains(5.00, 2.00));
    }
  },
  'Line': {
    topic: function () {
      return new Line(1, 1, 10, 10);
    },
    'should detect intersection': function (line) {
      var another_line;
      // identical
      another_line = new Line(1, 1, 10, 10);
      //assert.isTrue(line.intersectsLine(another_line));
      another_line = new Line(10, 10, 1, 1);
      assert.isTrue(line.intersectsLine(another_line));
      // intersecting
      another_line = new Line(1, 5, 10, 1);
      assert.isTrue(line.intersectsLine(another_line));
    },
    'should not detect intersection with parallel lines': function (line) {
      var another_line;
      another_line = new Line(1, 1.1, 10, 10.1);
      assert.isFalse(line.intersectsLine(another_line));
      another_line = new Line(10, 9.9, 1, 0.9);
      assert.isFalse(line.intersectsLine(another_line));
    },
    'should not detect intersection with lines laying far away': function (line) {
      var another_line;
      another_line = new Line(10, 12, 12, 10);
      assert.isFalse(line.intersectsLine(another_line));
      another_line = new Line(9.1, 12, 11.1, 8);
      assert.isFalse(line.intersectsLine(another_line));
    }
  }
});
suite.export(module);
