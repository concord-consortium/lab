/*jslint indent: 2, browser: true, newcap: true */
import { hypot } from 'models/energy2d/models/helpers';
import { Line, Rectangle } from 'models/energy2d/models/shape';

//
// Photon class.
//
export const Photon = function(x, y, energy, c, angle) {
  this.x = x;
  this.y = y;
  this.energy = energy;
  this.c = c;

  if (angle !== undefined) { this.vx = Math.cos(angle) * c; this.vy = Math.sin(angle) * c;
  }
};

Photon.prototype.isContained = function(xmin, xmax, ymin, ymax) {
  return this.x >= xmin && this.x <= xmax && this.y >= ymin && this.y <= ymax;
};

Photon.prototype.move = function(dt) {
  this.x += this.vx * dt;
  this.y += this.vy * dt;
};

Photon.prototype.reflectFromLine = function(line, time_step) {
  var x1 = this.x,
    y1 = this.y,
    x2 = this.x - this.vx * time_step,
    y2 = this.y - this.vy * time_step,
    photon_line = new Line(x1, y1, x2, y2),
    vx = this.vx,
    vy = this.vy,
    r12, sin, cos, u, w;

  if (photon_line.intersectsLine(line)) {
    x1 = line.x1;
    y1 = line.y1;
    x2 = line.x2;
    y2 = line.y2;
    r12 = 1.0 / hypot(x1 - x2, y1 - y2);
    sin = (y2 - y1) * r12;
    cos = (x2 - x1) * r12;
    // Velocity component parallel to the line.
    u = vx * cos + vy * sin;
    // Velocity component perpendicular to the line.
    w = vy * cos - vx * sin;
    // Update velocities.
    this.vx = u * cos + w * sin;
    this.vy = u * sin - w * cos;
    return true;
  }
  return false;
};

Photon.prototype.reflectFromRectangle = function(rectangle, time_step) {
  var
    x0 = rectangle.x,
    y0 = rectangle.y,
    x1 = rectangle.x + rectangle.width,
    y1 = rectangle.y + rectangle.height,
    dx, dy;

  dx = this.vx * time_step;
  if (this.x - dx < x0) {
    this.vx = -Math.abs(this.vx);
  } else if (this.x - dx > x1) {
    this.vx = Math.abs(this.vx);
  }
  dy = this.vy * time_step;
  if (this.y - dy < y0) {
    this.vy = -Math.abs(this.vy);
  } else if (this.y - dy > y1) {
    this.vy = Math.abs(this.vy);
  }
};

Photon.prototype.reflectFromPolygon = function(polygon, time_step) {
  var
    line = new Line(), // no params, as this object will be reused many times
    i, len;

  for (i = 0, len = polygon.count - 1; i < len; i += 1) {
    line.x1 = polygon.x_coords[i];
    line.y1 = polygon.y_coords[i];
    line.x2 = polygon.x_coords[i + 1];
    line.y2 = polygon.y_coords[i + 1];
    if (this.reflectFromLine(line, time_step)) {
      return;
    }
  }
  line.x1 = polygon.x_coords[polygon.count - 1];
  line.y1 = polygon.y_coords[polygon.count - 1];
  line.x2 = polygon.x_coords[0];
  line.y2 = polygon.y_coords[0];
  this.reflectFromLine(line, time_step);
};

Photon.prototype.reflect = function(shape, time_step) {
  // Check if part contains a photon BEFORE possible polygonization.
  if (!shape.contains(this.x, this.y)) {
    return false;
  }

  if (shape instanceof Rectangle) {
    // Rectangle also can be polygonized, but for performance reasons
    // use separate method.
    this.reflectFromRectangle(shape, time_step);
  } else {
    // Other shapes (ellipses, rings, polygons) - polygonize() first
    // (polygonize() for polygon returns itself).
    this.reflectFromPolygon(shape.polygonize(), time_step);
  }
  return true;
};
