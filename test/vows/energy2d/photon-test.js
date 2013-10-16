var helpers   = require("../../helpers");
helpers.setupBrowserEnvironment();

var vows      = require("vows"),
    assert    = require("assert"),
    requirejs = helpers.getRequireJS(),

    photon    = requirejs('models/energy2d/models/photon'),
    shape     = requirejs('models/energy2d/models/shape'),
    Photon    = photon.Photon,
    Line      = shape.Line,
    Polygon   = shape.Polygon,
    Rectangle = shape.Rectangle,
    Ellipse   = shape.Ellipse,
    Ring      = shape.Ring,

    suite = vows.describe("energy2d/models/photon");

suite.addBatch({
  'Photon should reflect': {
    topic: function () {
      return new Photon();
    },
    'from line': function (p) {
      var
        dt = 1,
        err_delta = 0.01,
        line = new Line(1, 1, 10, 1);
      // top
      p.x = 5; p.y = 0.9; p.vx = 0.2; p.vy = -0.2;
      assert.isTrue(p.reflectFromLine(line, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, 0.2);
      // bottom
      p.x = 2; p.y = 1.1; p.vx = 0.2; p.vy = 0.2;
      assert.isTrue(p.reflectFromLine(line, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, -0.2);
      // another line
      line = new Line(1, 1, 10, 10);
      p.x = 5.1; p.y = 5; p.vx = 0.2; p.vy = 0.0;
      assert.isTrue(p.reflectFromLine(line, dt));
      assert.inDelta(p.vx, 0.0, err_delta);
      assert.inDelta(p.vy, 0.2, err_delta);
      // far away
      p.x = 50; p.y = 25; p.vx = 0.2; p.vy = 0.2;
      assert.isFalse(p.reflectFromLine(line, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, 0.2);
    },
    'from rectangle': function (p) {
      var
        dt = 1,
        rectangle = new Rectangle(1, 1, 2, 2);
      // top
      p.x = 2; p.y = 2.9; p.vx = 0.2; p.vy = -0.2;
      assert.isTrue(p.reflect(rectangle, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, 0.2);
      // right
      p.x = 2.9; p.y = 2; p.vx = -0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(rectangle, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, 0.2);
      // bottom
      p.x = 2; p.y = 1.1; p.vx = 0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(rectangle, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, -0.2);
      // left
      p.x = 1.1; p.y = 2; p.vx = 0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(rectangle, dt));
      assert.equal(p.vx, -0.2);
      assert.equal(p.vy, 0.2);
      //corner
      p.x = 2; p.y = 2; p.vx = 1.5; p.vy = 1.5;
      assert.isTrue(p.reflect(rectangle, dt));
      assert.equal(p.vx, -1.5);
      assert.equal(p.vy, -1.5);
      // far away
      p.x = 10; p.y = 10; p.vx = 0.2; p.vy = 0.2;
      assert.isFalse(p.reflect(rectangle, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, 0.2);
    },
    'from ellipse': function (p) {
      var
        dt = 1,
        ellipse = new Ellipse(5, 5, 2, 4);
      // top
      p.x = 5; p.y = 6.9; p.vx = 0.2; p.vy = -0.2;
      assert.isTrue(p.reflect(ellipse, dt));
      // Due to polygonization it's impossible to guess exact value of new speed.
      assert.isTrue(p.vy > 0);
      // right
      p.x = 5.9; p.y = 5; p.vx = -0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(ellipse, dt));
      assert.isTrue(p.vx > 0);
      // bottom
      p.x = 5; p.y = 3.1; p.vx = 0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(ellipse, dt));
      assert.isTrue(p.vy < 0);
      // left
      p.x = 4.1; p.y = 5; p.vx = 0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(ellipse, dt));
      assert.isTrue(p.vx < 0);
      // far away
      p.x = 10; p.y = 10; p.vx = 0.2; p.vy = 0.2;
      assert.isFalse(p.reflect(ellipse, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, 0.2);
    },
    'from ring': function (p) {
      var
        dt = 1,
        ring = new Ring(5, 5, 2, 4);
      // top
      p.x = 5; p.y = 6.9; p.vx = 0.2; p.vy = -0.2;
      assert.isTrue(p.reflect(ring, dt));
      // Due to polygonization it's impossible to guess exact value of new speed.
      assert.isTrue(p.vy > 0);
      // right
      p.x = 6.9; p.y = 5; p.vx = -0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(ring, dt));
      assert.isTrue(p.vx > 0);
      // bottom
      p.x = 5; p.y = 3.1; p.vx = 0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(ring, dt));
      assert.isTrue(p.vy < 0);
      // left
      p.x = 3.1; p.y = 5; p.vx = 0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(ring, dt));
      assert.isTrue(p.vx < 0);
      // far away
      p.x = 10; p.y = 10; p.vx = 0.2; p.vy = 0.2;
      assert.isFalse(p.reflect(ring, dt));
      assert.equal(p.vx, 0.2);
      assert.equal(p.vy, 0.2);
    },
    'from polygon': function (p) {
      var
        dt = 1,
        err_delta = 0.01,
        count = 6,
        x_coords = [1, 3, 5, 7, 9, 5],
        y_coords = [1, 3, 1, 3, 1, -3],
        polygon = new Polygon(count, x_coords, y_coords);
      // top
      p.x = 2; p.y = 1.9; p.vx = 0.0; p.vy = -0.2;
      assert.isTrue(p.reflect(polygon, dt));
      assert.inDelta(p.vx, -0.2, err_delta);
      assert.equal(p.vy, 0);
      // right
      p.x = 3.9; p.y = 2; p.vx = -0.2; p.vy = 0.0;
      assert.isTrue(p.reflect(polygon, dt));
      assert.equal(p.vx, 0);
      assert.inDelta(p.vy, 0.2, err_delta);
      // bottom-left
      p.x = 3.1; p.y = -1; p.vx = 0.2; p.vy = 0.2;
      assert.isTrue(p.reflect(polygon, dt));
      assert.inDelta(p.vy, -0.2, err_delta);
      assert.inDelta(p.vy, -0.2, err_delta);
    }
  }
});
suite.export(module);
