/*jslint indent: 2 */
//
// lab/models/energy2d/engine/utils/shape.js
//

// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
exports.pointInsidePolygon = function (nvert, vertx, verty, testx, testy) {
  'use strict';
  var c = 0, i, j;
  for (i = 0, j = nvert - 1; i < nvert; j = i, i += 1) {
    if (((verty[i] > testy) !== (verty[j] > testy)) &&
        (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) {
      c = !c;
    }
  }
  return !!c;
};

//
// Line in 2D.
// 
// It is defined by two points - (x1, y1) and (x2, y2).
var Line = exports.Line = function (x1, y1, x2, y2) {
  'use strict';
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
};

Line.prototype.intersectsLine = function (line) {
  'use strict';
  var
    result,
    a1 = {x: this.x1, y: this.y1},
    a2 = {x: this.x2, y: this.y2},
    b1 = {x: line.x1, y: line.y1},
    b2 = {x: line.x2, y: line.y2},
    ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
    ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x),
    u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y),
    ua, ub;

  if (u_b !== 0) {
    ua = ua_t / u_b;
    ub = ub_t / u_b;

    if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
      result = true;
    } else {
      result = false;
    }
  } else {
    if (ua_t === 0 || ub_t === 0) {
      result = true;  // Coincident.
    } else {
      result = false; // Parallel.
    }
  }
  return result;
};

//
// Polygon.
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Polygon = exports.Polygon = function (count, x_coords, y_coords) {
  'use strict';
  this.count = count;
  this.x_coords = x_coords;
  this.y_coords = y_coords;
};

Polygon.prototype.polygonize = function () {
  'use strict';
  return this;
};

// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
Polygon.prototype.contains = function (x, y) {
  'use strict';
  var
    x_coords = this.x_coords,
    y_coords = this.y_coords,
    count = this.count,
    c = 0, i, j;

  for (i = 0, j = count - 1; i < count; j = i, i += 1) {
    if (((y_coords[i] > y) !== (y_coords[j] > y)) &&
        (x < (x_coords[j] - x_coords[i]) * (y - y_coords[i]) / (y_coords[j] - y_coords[i]) + x_coords[i])) {
      c = !c;
    }
  }
  // Convert to Boolean.
  return !!c;
};

//
// Rectangle.
// x, y - left-top corner
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Rectangle = exports.Rectangle = function (x, y, width, height) {
  'use strict';
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.polygon_cache = undefined;
};

Rectangle.prototype.polygonize = function () {
  'use strict';
  var
    x, y, w, h;

  if (!this.polygon_cache) {
    x = this.x;
    y = this.y;
    w = this.width;
    h = this.height;
    this.polygon_cache = new Polygon(4, [x, x + w, x + w, x], [y, y, y + h, y + h]);
  }
  return this.polygon_cache;
};

Rectangle.prototype.contains = function (x, y) {
  'use strict';
  return x >= this.x && x <= this.x + this.width &&
         y >= this.y && y <= this.y + this.height;
};

// Helper function, used by Ellipse and Ring.
var polygonizeEllipse = function (x, y, ra, rb, segments) {
  'use strict';
  var
    vx = new Array(segments),
    vy = new Array(segments),
    delta = 2 * Math.PI / segments,
    theta, i;

  for (i = 0; i < segments; i += 1) {
    theta = delta * i;
    vx[i] = x + ra * Math.cos(theta);
    vy[i] = y + rb * Math.sin(theta);
  }
  return new Polygon(segments, vx, vy);
};

//
// Ellipse.
// x, y - center
// a, b - diameter (not radius)
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Ellipse = exports.Ellipse = function (x, y, a, b) {
  'use strict';
  this.x = x;
  this.y = y;
  this.a = a;
  this.b = b;
  this.polygon_cache = undefined;
};

Ellipse.prototype.POLYGON_SEGMENTS = 50;

Ellipse.prototype.polygonize = function () {
  'use strict';
  if (!this.polygon_cache) {
    this.polygon_cache = polygonizeEllipse(this.x, this.y, this.a * 0.5, this.b * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache;
};

Ellipse.prototype.contains = function (x, y) {
  'use strict';
  var
    px = x - this.x,
    py = y - this.y,
    ra = this.a * 0.5,
    rb = this.b * 0.5;

  return px * px / (ra * ra) + py * py / (rb * rb) <= 1;
};

//
// Ring.
// x, y - center
// inner, outer - diameter (not radius)
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Ring = exports.Ring = function (x, y, inner, outer) {
  'use strict';
  this.x = x;
  this.y = y;
  this.inner = inner;
  this.outer = outer;
  this.polygon_cache = undefined;
};

Ring.prototype.POLYGON_SEGMENTS = 50;

// Returns OUTER circle polygonization.
Ring.prototype.polygonize = function () {
  'use strict';
  if (!this.polygon_cache) {
    this.polygon_cache = polygonizeEllipse(this.x, this.y, this.outer * 0.5, this.outer * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache;
};

// Returns INNER circle polygonization.
Ring.prototype.polygonizeInner = function () {
  'use strict';
  var x, y, r, vx, vy, line, delta, theta, i, len;

  if (!this.polygon_cache_inner) {
    this.polygon_cache_inner = polygonizeEllipse(this.x, this.y, this.inner * 0.5, this.inner * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache_inner;
};

Ring.prototype.contains = function (x, y) {
  'use strict';
  var
    px = x - this.x,
    py = y - this.y,
    ra_outer = this.outer * 0.5,
    rb_outer = this.outer * 0.5,
    ra_inner = this.inner * 0.5,
    rb_inner = this.inner * 0.5;

  return (px * px / (ra_outer * ra_outer) + py * py / (rb_outer * rb_outer) <= 1) &&
         (px * px / (ra_inner * ra_inner) + py * py / (rb_inner * rb_inner) >= 1);
};