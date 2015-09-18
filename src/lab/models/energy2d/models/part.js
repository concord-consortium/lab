/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

define(function (require, exports, module) {
  'use strict';
  var
    constants      = require('models/energy2d/models/constants'),
    hypot          = require('models/energy2d/models/helpers').hypot,
    Photon         = require('models/energy2d/models/photon').Photon,
    shape_utils    = require('models/energy2d/models/shape'),
    Line           = require('models/energy2d/models/shape').Line,
    Polygon        = require('models/energy2d/models/shape').Polygon,
    Rectangle      = require('models/energy2d/models/shape').Rectangle,
    Ellipse        = require('models/energy2d/models/shape').Ellipse,
    Ring           = require('models/energy2d/models/shape').Ring,

    // Part's constants.
    RADIATOR_SPACING = 0.5,
    MINIMUM_RADIATING_TEMPERATUE = 20,
    UNIT_SURFACE_AREA = 100,
    SIN30 = Math.sin(Math.PI / 6),
    COS30 = Math.cos(Math.PI / 6),
    SIN60 = Math.sin(Math.PI / 3),
    COS60 = Math.cos(Math.PI / 3),

    // Constructor function.
    Part = exports.Part = function (options) {
      var vertices, count, i;
      this._options = options;

      // Validate and process options.
      if (options.shapeType === "rectangle") {
        this.shape = new Rectangle(options.x, options.y, options.width, options.height);
      } else if (options.shapeType === "ellipse") {
        this.shape = new Ellipse(options.x, options.y, options.a, options.b);
      } else if (options.shapeType === "ring") {
        this.shape = new Ring(options.x, options.y, options.inner, options.outer);
      } else if (options.shapeType === "polygon") {
        vertices = options.vertices.split(', ');
        this.x_coords = [];
        this.y_coords = [];
        for (i = 0, count = vertices.length * 0.5; i < count; i += 1) {
          this.x_coords[i] = Number(vertices[2 * i]);
          this.y_coords[i] = Number(vertices[2 * i + 1]);
        }
        this.shape = new Polygon(count, this.x_coords, this.y_coords, options.x, options.y);
      } else {
        throw new Error("Part: shape not defined or not supported.");
      }
    };

  Object.defineProperty(Part.prototype, "shapeType", {
    get: function () {
      return this._options.shapeType;
    }
  });

  ["x", "y", "width", "height", "inner", "outer", "a", "b", "raw_x_coords", "raw_y_coords"].forEach(function (key) {
    Object.defineProperty(Part.prototype, key, {
      get: function () {
        return this.shape[key];
      },
      set: function (v) {
        this.shape[key] = v;
        this.polygon_cache = undefined;
      }
    });
  });

  Object.defineProperty(Part.prototype, "vertices", {
    get: function () {
      if (this.shapeType !== "polygon") return undefined;
      var x = this.shape.raw_x_coords,
          y = this.shape.raw_y_coords,
          r = [], i, len;
      for (i = 0, len = x.length; i < len; i++) {
        r.push(x[i]);
        r.push(y[i]);
      }
      return r.join(", ");
    }
  });

  ["thermal_conductivity", "specific_heat", "density", "temperature", "constant_temperature", "power", "wind_speed", "wind_angle",
   "transmission", "reflection", "absorption", "emissivity",
   "visible", "filled", "color", "texture", "label", "draggable"].forEach(function (key) {
    Object.defineProperty(Part.prototype, key, {
      get: function () {
        return this._options[key];
      },
      set: function (v) {
        this._options[key] = v;
      }
    });
  });

  Part.prototype.getLabel = function () {
    var label = this.label, s;

    function formatLabel(value, suffix) {
      var valueStr;
      if (value >= 100) {
        valueStr = value.toFixed();
      } else if (value >= 10) {
        valueStr = value.toFixed(1);
      } else {
        valueStr = value.toFixed(2);
      }
      return valueStr + suffix;
    }

    if (label === "%temperature") {
      s = formatLabel(this.temperature, " \u00b0C");
    } else if (label === "%density") {
      s = formatLabel(this.density, " kg/m\u00b3");
    } else if (label === "%specific_heat") {
      s = formatLabel(this.specific_heat, " J/(kg\u00d7\u00b0C)");
    } else if (label === "%thermal_conductivity") {
      s = formatLabel(this.thermal_conductivity, " W/(m\u00d7\u00b0C)");
    } else if (label === "%power_density") {
      s = formatLabel(this.power, " W/m\u00b3");
    } else if (label === "%area") {
      if (this.shapeType === "rectangle") {
        s = formatLabel(this.width * this.height, " m\u00b2");
      } else if (this.shapeType === "ellipse") {
        s = formatLabel(this.a * this.b * 0.25 * Math.PI, " m\u00b2");
      }
    } else if (label === "%width") {
      if (this.shapeType === "rectangle") {
        s = formatLabel(this.width, " m");
      } else if (this.shapeType === "ellipse") {
        s = formatLabel(this.a, " m");
      }
    } else if (label === "%height") {
      if (this.shapeType === "rectangle") {
        s = formatLabel(this.height, " m");
      } else if (this.shapeType === "ellipse") {
        s = formatLabel(this.b, " m");
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
  // TODO: refactor it, probably using contains method.
  Part.prototype.getGridCells = function (nx, ny, lx, ly) {
    var
      nx1 = nx - 1,
      ny1 = ny - 1,
      dx = nx / lx,
      dy = ny / ly,

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
          count = polygon.x_coords.length,
          x_coords = new Array(count),
          y_coords = new Array(count),
          x_min = Number.MAX_VALUE, x_max = Number.MIN_VALUE,
          y_min = Number.MAX_VALUE, y_max = Number.MIN_VALUE,
          i, i0, i_max, j, j0, j_max,
          idx, indices = [];

        for (i = 0; i < count; i += 1) {
          x_coords[i] = polygon.x_coords[i] * dx;
          y_coords[i] = polygon.y_coords[i] * dy;
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
            if (shape_utils.pointInsidePolygon(count, x_coords, y_coords, i, j)) {
              indices[idx += 1] = i * ny + j;
            }
          }
        }
        return indices;
      };

    if (this.shapeType === "rectangle") {
      return rectangleIndices(this.shape);
    }
    if (this.shapeType === "ellipse") {
      return ellipseIndices(this.shape);
    }
    if (this.shapeType === "ring") {
      return ringIndices(this.shape);
    }
    if (this.shapeType === "polygon") {
      return polygonIndices(this.shape);
    }
    throw new Error("Part: unknown shape.");
  };

  // Tests if the specified coordinates are inside the boundary of the Part.
  Part.prototype.contains = function (x, y) {
    return this.shape.contains(x, y);
  };

  // Test whether part reflects given Photon p.
  Part.prototype.reflect = function (p, time_step) {
    // Try to reflect when part's reflection equals ~1.
    if (Math.abs(this.reflection - 1) < 0.001) {
      return p.reflect(this.shape, time_step);
    }
    // Other case.
    return false;
  };

  // Test whether part absorbs given Photon p.
  Part.prototype.absorb = function (p) {
    // Absorb when absorption equals ~1 and photon is inside part's shape.
    if (Math.abs(this.absorption - 1) < 0.001) {
      return this.shape.contains(p.x, p.y);
    }
    // Other case.
    return false;
  };

  Part.prototype.getIrradiance = function (temperature) {
    var t2;
    if (this.emissivity === 0) {
      return 0;
    }
    t2 = 273 + temperature;
    t2 *= t2;
    return this.emissivity * constants.STEFAN_CONSTANT * UNIT_SURFACE_AREA * t2 * t2;
  };

  // Emit photons if part meets radiation conditions.
  Part.prototype.radiate = function (model) {
    var
      // The shape is polygonized and radiateFromLine() is called for each line.
      poly = this.shape.polygonize(),
      line = new Line(),
      i, len;

    if (this.emissivity === 0) {
      return;
    }
    // Must follow the clockwise direction in setting lines.
    for (i = 0, len = poly.count - 1; i < len; i += 1) {
      line.x1 = poly.x_coords[i];
      line.y1 = poly.y_coords[i];
      line.x2 = poly.x_coords[i + 1];
      line.y2 = poly.y_coords[i + 1];
      this.radiateFromLine(model, line);
    }
    line.x1 = poly.x_coords[poly.count - 1];
    line.y1 = poly.y_coords[poly.count - 1];
    line.x2 = poly.x_coords[0];
    line.y2 = poly.y_coords[0];
    this.radiateFromLine(model, line);
  };

  // Helper function for radiate() method.
  Part.prototype.radiateFromLine = function (model, line) {
    var options, length, cos, sin, n, x, y, p, d, vx, vy, vxi, vyi, nray, ir,
      i, k;

    if (this.emissivity === 0) {
      return;
    }
    options = model.getModelOptions();
    length = hypot(line.x1 - line.x2, line.y1 - line.y2);
    cos = (line.x2 - line.x1) / length;
    sin = (line.y2 - line.y1) / length;
    n = Math.max(1, Math.round(length / RADIATOR_SPACING));
    vx = options.solar_ray_speed * sin;
    vy = -options.solar_ray_speed * cos;
    if (n === 1) {
      d = 0.5 * length;
      x = line.x1 + d * cos;
      y = line.y1 + d * sin;
      d = model.getAverageTemperatureAt(x, y);
      if (d > MINIMUM_RADIATING_TEMPERATUE) {
        d = model.getTemperatureAt(x, y);
        p = new Photon(x, y, this.getIrradiance(d), options.solar_ray_speed);
        p.vx = vx;
        p.vy = vy;
        model.addPhoton(p);
        if (!this.constant_temperature) {
          model.setTemperatureAt(x, y, d - p.energy / this.specific_heat);
        }
      }
    } else {
      vxi = new Array(4);
      vyi = new Array(4);
      vxi[0] = vx * COS30 - vy * SIN30;
      vyi[0] = vx * SIN30 + vy * COS30;
      vxi[1] = vy * SIN30 + vx * COS30;
      vyi[1] = vy * COS30 - vx * SIN30;
      vxi[2] = vx * COS60 - vy * SIN60;
      vyi[2] = vx * SIN60 + vy * COS60;
      vxi[3] = vy * SIN60 + vx * COS60;
      vyi[3] = vy * COS60 - vx * SIN60;
      nray = 1 + vxi.length;
      for (i = 0; i < n; i += 1) {
        d = (i + 0.5) * RADIATOR_SPACING;
        x = line.x1 + d * cos;
        y = line.y1 + d * sin;
        d = model.getAverageTemperatureAt(x, y);
        ir = this.getIrradiance(d) / nray;
        if (d > MINIMUM_RADIATING_TEMPERATUE) {
          p = new Photon(x, y, ir, options.solar_ray_speed);
          p.vx = vx;
          p.vy = vy;
          model.addPhoton(p);
          for (k = 0; k < nray - 1; k += 1) {
            p = new Photon(x, y, ir, options.solar_ray_speed);
            p.vx = vxi[k];
            p.vy = vyi[k];
            model.addPhoton(p);
          }
          if (!this.constant_temperature) {
            model.changeAverageTemperatureAt(x, y, -ir * nray / this.specific_heat);
          }
        }
      }
    }
  };
});
