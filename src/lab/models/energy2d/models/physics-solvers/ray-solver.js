/*global define: false*/

define(function (require, exports) {
  'use strict';
  var
    Photon = require('models/energy2d/models/photon').Photon;

  exports.makeRaySolver = function (model) {
    var
      // Basic simulation parameters.
      props = model.getModelOptions(),

      // Simulation arrays provided by model.
      q       = model.getPowerArray(),
      parts   = model.getPartsArray(),
      photons = model.getPhotonsArray(),

      // Convenience variables.
      lx = props.model_width,
      ly = props.model_height,

      nx = props.grid_width,
      ny = props.grid_height,
      nx1 = nx - 1,
      ny1 = ny - 1,

      delta_x = props.model_width / props.grid_width,
      delta_y = props.model_height / props.grid_height,

      //
      // Private methods
      //

      sunAngle = function () {
        return Math.PI - props.sun_angle;
      },

      // TODO: implement something efficient. Linked list?
      cleanupPhotonsArray = function () {
        var i = 0;
        while (i < photons.length) {
          if (photons[i] === undefined) {
            photons.splice(i, 1);
          } else {
            i += 1;
          }
        }
      },

      applyBoundary = function () {
        var i, len;
        for (i = 0, len = photons.length; i < len; i += 1) {
          if (!photons[i].isContained(0, lx, 0, ly)) {
            photons[i] = undefined;
          }
        }
        cleanupPhotonsArray();
      },

      isContained = function (x, y) {
        var i, len;
        for (i = 0, len = parts.length; i < len; i += 1) {
          if (parts[i].contains(x, y)) {
            return true;
          }
        }
        return false;
      },

      shootAtAngle = function (dx, dy) {
        var
          sun_angle = sunAngle(),
          ray_power = props.solar_power_density,
          ray_speed = props.solar_ray_speed,
          m = Math.floor(lx / dx),
          n = Math.floor(ly / dy),
          x, y, i;
        if (sun_angle >= 0 && sun_angle < 0.5 * Math.PI) {
          y = 0;
          for (i = 1; i <= m; i += 1) {
            x = dx * i;
            if (!isContained(x, y)) {
              photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
            }
          }
          x = 0;
          for (i = 0; i <= n; i += 1) {
            y = dy * i;
            if (!isContained(x, y)) {
              photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
            }
          }
        } else if (sun_angle < 0 && sun_angle >= -0.5 * Math.PI) {
          y = ly;
          for (i = 1; i <= m; i += 1) {
            x = dx * i;
            if (!isContained(x, y)) {
              photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
            }
          }
          x = 0;
          for (i = 0; i <= n; i += 1) {
            y = ly - dy * i;
            if (!isContained(x, y)) {
              photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
            }
          }
        } else if (sun_angle < Math.PI + 0.001 && sun_angle >= 0.5 * Math.PI) {
          y = 0;
          for (i = 0; i <= m; i += 1) {
            x = lx - dx * i;
            if (!isContained(x, y)) {
              photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
            }
          }
          x = lx;
          for (i = 1; i <= n; i += 1) {
            y = dy * i;
            if (!isContained(x, y)) {
              photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
            }
          }
        } else if (sun_angle >= -Math.PI && sun_angle < -0.5 * Math.PI) {
          y = ly;
          for (i = 0; i <= m; i += 1) {
            x = lx - dx * i;
            if (!isContained(x, y)) {
              photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
            }
          }
          x = lx;
          for (i = 1; i <= n; i += 1) {
            y = ly - dy * i;
            if (!isContained(x, y)) {
              photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
            }
          }
        }
      };

    return {
      solve: function () {
        var
          timeStep = props.timeStep,
          photon_emission_interval = props.photon_emission_interval,

          factor = 1.0 / (timeStep * photon_emission_interval),
          idx = 1.0 / delta_x,
          idy = 1.0 / delta_y,
          photon, part, x, y,
          i, j, photons_len, parts_len;

        for (i = 0, photons_len = photons.length; i < photons_len; i += 1) {
          photon = photons[i];
          photon.move(timeStep);

          for (j = 0, parts_len = parts.length; j < parts_len; j += 1) {
            part = parts[j];
            if (part.reflect(photon, timeStep)) {
              break;
            } else if (part.absorb(photon)) {
              x = Math.max(Math.min(Math.round(photon.x * idx), nx1), 0);
              y = Math.max(Math.min(Math.round(photon.y * idy), ny1), 0);
              q[x * ny + y] = photon.energy * factor;
              // Remove photon.
              photons[i] = undefined;
              break;
            }
          }
        }
        // Clean up absorbed photons.
        cleanupPhotonsArray();
        // Remove photons that are out of bounds.
        applyBoundary();
      },

      radiate: function () {
        var part, i, len;
        for (i = 0, len = parts.length; i < len; i += 1) {
          part = parts[i];
          if (part.emissivity > 0) {
            part.radiate(model);
          }
        }
      },

      sunShine: function () {
        var
          sun_angle = sunAngle(),
          s, c, spacing;

        if (sun_angle < 0) {
          return;
        }
        s = Math.abs(Math.sin(sun_angle));
        c = Math.abs(Math.cos(sun_angle));
        spacing = s * ly < c * lx ? ly / c : lx / s;
        spacing /= props.solar_ray_count;
        shootAtAngle(spacing / s, spacing / c);
      }
    };
  };
});
