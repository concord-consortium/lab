/*jslint indent: 2 */
// JSLint report: OK (complaining only about Array(size) constructor)
//
// lab/models/energy2d/engines/this.js
//

var
  default_config = require('./default-config.js'),

  // Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
  // It is optional to repeat the first vertex at the end of list of polygon vertices.
  pointInsidePolygon = function (nvert, vertx, verty, testx, testy) {
    'use strict';
    var c = 0, i, j;
    for (i = 0, j = nvert - 1; i < nvert; j = i, i += 1) {
      if (((verty[i] > testy) !== (verty[j] > testy)) &&
          (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) {
        c = !c;
      }
    }
    return c;
  };

exports.Part = function (options) {
  'use strict';
  var count, i;

  options = default_config.fillWithDefaultValues(options, default_config.DEFAULT_VALUES.part);

  // Validate and process options.

  // Check shape
  if (options.rectangle) {
    this.rectangle = options.rectangle;
  } else if (options.ellipse) {
    this.ellipse = options.ellipse;
  } else if (options.ring) {
    this.ring = options.ring;
  } else if (options.polygon) {
    this.polygon = options.polygon;
  } else {
    throw new Error("Part: shape not defined.");
  }

  if (this.polygon && typeof (this.polygon.vertices) === "string") {
    count = this.polygon.count;
    this.polygon.vertices = this.polygon.vertices.split(', ');
    this.polygon.x_coords = [];
    this.polygon.y_coords = [];
    if (count * 2 !== this.polygon.vertices.length) {
      throw new Error("Part: polygon contains different vertices count than declared in the count parameter.");
    }
    for (i = 0; i < count; i += 1) {
      this.polygon.x_coords[i] = this.polygon.vertices[2 * i]     = Number(this.polygon.vertices[2 * i]);
      this.polygon.y_coords[i] = this.polygon.vertices[2 * i + 1] = Number(this.polygon.vertices[2 * i + 1]);
    }
  }

  // source properties
  this.thermal_conductivity = options.thermal_conductivity;
  this.specific_heat = options.specific_heat;
  this.density = options.density;
  this.temperature = options.temperature;
  this.constant_temperature = options.constant_temperature;
  this.power = options.power;
  this.wind_speed = options.wind_speed;
  this.wind_angle = options.wind_angle;

  // visual properties
  this.visible = options.visible;
  this.filled = options.filled;
  this.color = options.color;
  this.texture = options.texture;
  this.label = options.label;
};

exports.Part.prototype.getLabel = function () {
  'use strict';
  var label = this.label, s;

  if (label === "%temperature") {
    s = this.temperature + " \u00b0C";
  } else if (label === "%density") {
    s = this.density + " kg/m\u00b3";
  } else if (label === "%specific_heat") {
    s = this.specific_heat + " J/(kg\u00d7\u00b0C)";
  } else if (label === "%thermal_conductivity") {
    s = this.thermal_conductivity + " W/(m\u00d7\u00b0C)";
  } else if (label === "%power_density") {
    s = this.power + " W/m\u00b3";
  } else if (label === "%area") {
    if (this.rectangle) {
      s = (this.rectangle.width * this.rectangle.height) + " m\u00b2";
    } else if (this.ellipse) {
      s = (this.ellipse.width * this.ellipse.height * 0.25 * Math.PI) + " m\u00b2";
    }
  } else if (label === "%width") {
    if (this.rectangle) {
      s = this.rectangle.width + " m";
    } else if (this.ellipse) {
      s = this.ellipse.width + " m";
    }
  } else if (label === "%height") {
    if (this.rectangle) {
      s = this.rectangle.height + " m";
    } else if (this.ellipse) {
      s = this.ellipse.height + " m";
    }
  } else {
    s = label;
  }
  return s;
};

// Returns cells occupied by part on the given grid
// Grid is described by:
//   nx - grid columns count
//   ny - grid rows count
//   lx - grid width
//   ly - grid height
exports.Part.prototype.getGridCells = function (nx, ny, lx, ly) {
  'use strict';
  var
    nx1 = nx - 1,
    ny1 = ny - 1,
    dx = nx1 / lx,
    dy = ny1 / ly,

    rectangleIndices = function (rect) {
      var i, j, i0, j0, i_max, j_max, idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(rect.x * dx), 0), nx1);
      j0 = Math.min(Math.max(Math.ceil(rect.y * dy), 0), ny1);
      i_max = Math.min(Math.max(Math.floor((rect.x + rect.width) * dx), 0), nx1);
      j_max = Math.min(Math.max(Math.floor((rect.y + rect.height) * dy), 0), ny1);
      indices = new Array((i_max - i0 + 1) * (j_max - j0 + 1));
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        for (j = j0; j <= j_max; j += 1) {
          indices[idx += 1] = i * ny + j;
        }
      }
      return indices;
    },

    ellipseIndices = function (ellipse) {
      var
        px = ellipse.x * dx,
        py = ellipse.y * dy,
        ra = ellipse.a * 0.5 * dx,
        rb = ellipse.b * 0.5 * dy,
        eq, i, i0, i_max, j, j0, j_max,
        idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
      i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);
      indices = [];
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
        // to get range of y (=> j)
        eq = Math.sqrt(1 - (i - px) * (i - px) / (ra * ra));
        j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
        j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);
        for (j = j0; j <= j_max; j += 1) {
          indices[idx += 1] = i * ny + j;
        }
      }
      return indices;
    },

    ringIndices = function (ring) {
      var
        px = ring.x * dx,
        py = ring.y * dy,
        ra = ring.outer * 0.5 * dx,
        rb = ring.outer * 0.5 * dy,
        ra_inner = ring.inner * 0.5 * dx,
        rb_inner = ring.inner * 0.5 * dy,
        i, i0, i_max, j, j0, j1, j2, j_max, eq,
        idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
      i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);

      for (i = i0; i <= i_max; i += 1) {
        // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
        // to get range of y (=> j)
        eq = Math.sqrt(1 - (i - px) * (i - px) / (ra * ra));
        j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
        j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);

        if (Math.abs(i - px) < ra_inner) {
          // also calculate inner ellipse
          eq = Math.sqrt(1 - (i - px) * (i - px) / (ra_inner * ra_inner));
          j1 = Math.min(Math.max(Math.ceil(py - rb_inner * eq), 0), ny1);
          j2 = Math.min(Math.max(Math.floor(py + rb_inner * eq), 0), ny1);
          for (j = j0; j <= j1; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
          for (j = j2; j <= j_max; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
        } else {
          // consider only outer ellipse
          for (j = j0; j <= j_max; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
        }
      }
      return indices;
    },

    polygonIndices = function (polygon) {
      var
        count = polygon.count,
        verts = polygon.vertices,
        x_coords = new Array(count),
        y_coords = new Array(count),
        x_min = Number.MAX_VALUE, x_max = Number.MIN_VALUE,
        y_min = Number.MAX_VALUE, y_max = Number.MIN_VALUE,
        i, i0, i_max, j, j0, j_max,
        idx, indices = [];

      for (i = 0; i < count; i += 1) {
        x_coords[i] = verts[i * 2] * dx;
        y_coords[i] = verts[i * 2 + 1] * dy;
        if (x_coords[i] < x_min) {
          x_min = x_coords[i];
        }
        if (x_coords[i] > x_max) {
          x_max = x_coords[i];
        }
        if (y_coords[i] < y_min) {
          y_min = y_coords[i];
        }
        if (y_coords[i] > y_max) {
          y_max = y_coords[i];
        }
      }

      i0 = Math.min(Math.max(Math.round(x_min), 0), nx1);
      j0 = Math.min(Math.max(Math.round(y_min), 0), ny1);
      i_max = Math.min(Math.max(Math.round(x_max), 0), nx1);
      j_max = Math.min(Math.max(Math.round(y_max), 0), ny1);
      indices = [];
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        for (j = j0; j <= j_max; j += 1) {
          if (pointInsidePolygon(count, x_coords, y_coords, i, j)) {
            indices[idx += 1] = i * ny + j;
          }
        }
      }
      return indices;
    };

  if (this.rectangle) {
    return rectangleIndices(this.rectangle);
  }
  if (this.ellipse) {
    return ellipseIndices(this.ellipse);
  }
  if (this.ring) {
    return ringIndices(this.ring);
  }
  if (this.polygon) {
    return polygonIndices(this.polygon);
  }
  throw new Error("Part: unknown shape.");
};

// Tests if the specified coordinates are inside the boundary of the Part.
exports.Part.prototype.contains = function (x, y) {
  'use strict';
  var
    rectangleContains = function (rect) {
      if (x >= rect.x && x <= rect.x + rect.width &&
          y >= rect.y && y <= rect.y + rect.height) {
        return true;
      }
      return false;
    },

    ellipseContains = function (ellipse) {
      var
        px = x - ellipse.x,
        py = y - ellipse.y,
        ra = ellipse.a * 0.5,
        rb = ellipse.b * 0.5;

      return px * px / (ra * ra) + py * py / (rb * rb) <= 1;
    },

    ringContains = function (ring) {
      var
        px = x - ring.x,
        py = y - ring.y,
        ra = ring.outer * 0.5,
        rb = ring.outer * 0.5,
        ra_inner = ring.inner * 0.5,
        rb_inner = ring.inner * 0.5;

      return (px * px / (ra * ra) + py * py / (rb * rb) <= 1) &&
             (px * px / (ra_inner * ra_inner) + py * py / (rb_inner * rb_inner) >= 1);
    },

    polygonContains = function (polygon) {
      return pointInsidePolygon(polygon.count, polygon.x_coords, polygon.y_coords, x, y);
    };

  if (this.rectangle) {
    return rectangleContains(this.rectangle);
  }
  if (this.ellipse) {
    return ellipseContains(this.ellipse);
  }
  if (this.ring) {
    return ringContains(this.ring);
  }
  if (this.polygon) {
    return polygonContains(this.polygon);
  }
  throw new Error("Part: unknown shape.");
};

// Test whether part reflects given Photon p.
exports.Part.prototype.reflect = function (p, time_step) {
  'use strict';
  var
    polygonize = 50,

    hypot = function (x, y) {
      var t;
      x = Math.abs(x);
      y = Math.abs(y);
      t = Math.min(x, y);
      x = Math.max(x, y);
      y = t;
      return x * Math.sqrt(1 + (y / x) * (y / x));
    },

    linesIntersection = function (line1, line2) {
      var
        result,
        a1 = {x: line1.x1, y: line1.y1},
        a2 = {x: line1.x2, y: line1.y2},
        b1 = {x: line2.x1, y: line2.y1},
        b2 = {x: line2.x2, y: line2.y2},
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
    },

    reflectFromLine = function (p, line, time_step) {
      var
        x1 = p.x,
        y1 = p.y,
        x2 = p.x - p.vx * time_step,
        y2 = p.y - p.vy * time_step,
        photon_line = {x1: x1, y1: y1, x2: x2, y2: y2},
        r12, sin, cos, u, w;

      if (linesIntersection(line, photon_line)) {
        x1 = line.x1;
        y1 = line.y1;
        x2 = line.x2;
        y2 = line.y2;
        r12 = 1.0 / hypot(x1 - x2, y1 - y2);
        sin = (y2 - y1) * r12;
        cos = (x2 - x1) * r12;
        // velocity component parallel to the line
        u = p.vx * cos + p.vy * sin;
        // velocity component perpendicular to the line
        w = p.vy * cos - p.vx * sin;
        p.vx = u * cos + w * sin;
        p.vy = u * sin - w * cos;
        return true;
      }
      return false;
    },

    rectangleReflect = function (r, p, time_step) {
      var
        x0 = r.x,
        y0 = r.y,
        x1 = r.x + r.width,
        y1 = r.y + r.height,
        dx, dy;

      dx = p.vx * time_step;
      if (p.x - dx < x0) {
        p.vx = -Math.abs(p.vx);
      } else if (p.x - dx > x1) {
        p.vx = Math.abs(p.vx);
      }
      dy = p.vy * time_step;
      if (p.y - dy < y0) {
        p.vy = -Math.abs(p.vy);
      } else if (p.y - dy > y1) {
        p.vy = Math.abs(p.vy);
      }
    },
    ellipseReflect = function (e, p, time_step) {
      var
        a = e.a * 0.5,
        b = e.b * 0.5,
        x = e.x,
        y = e.y,
        vx = new Array(polygonize),
        vy = new Array(polygonize),
        theta,
        delta = 2 * Math.PI / polygonize,
        line, i;

      for (i = 0; i < polygonize; i += 1) {
        theta = delta * i;
        vx[i] = x + a * Math.cos(theta);
        vy[i] = y + b * Math.sin(theta);
      }
      line = {};
      for (i = 0; i < polygonize - 1; i += 1) {
        line = {x1: vx[i], y1: vy[i], x2: vx[i + 1], y2: vy[i + 1]};
        if (reflectFromLine(p, line, time_step)) {
          return;
        }
      }
      line = {x1: vx[polygonize - 1], y1: vy[polygonize - 1], x2: vx[0], y2: vy[0]};
      reflectFromLine(p, line, time_step);
    },
    polygonReflect = function (poly, p, time_step) {
      var line, i, n = poly.count;

      for (i = 0; i < n - 1; i += 1) {
        line = {x1: poly.x_coords[i], y1: poly.y_coords[i], x2: poly.x_coords[i + 1], y2: poly.y_coords[i + 1]};
        if (reflectFromLine(p, line, time_step)) {
          return;
        }
      }
      line = {x1: poly.x_coords[n - 1], y1: poly.y_coords[n - 1], x2: poly.x_coords[0], y2: poly.y_coords[0]};
      reflectFromLine(p, line, time_step);
    };

  if (!this.contains(p.x, p.y)) {
    return false;
  }

  if (this.rectangle) {
    rectangleReflect(this.rectangle, p, time_step);
  } else if (this.ellipse) {
    ellipseReflect(this.ellipse, p, time_step);
  } else if (this.ring) {
    // TODO: implement ring support?
    return false;
  } else if (this.polygon) {
    polygonReflect(this.polygon, p, time_step);
  } else {
    throw new Error("Part: unsupported shape.");
  }
  return true;
};
