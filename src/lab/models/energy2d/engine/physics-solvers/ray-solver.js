/*jslint indent: 2 */
//
// lab/models/energy2d/engine/physics-solvers/ray-solver.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  Photon = require('../photon.js').Photon;

exports.makeRaySolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options = model.getModelOptions(),
    lx = model_options.model_width,
    ly = model_options.model_height,
    timestep = model_options.timestep,
    sun_angle = model_options.sun_angle,
    ray_count = model_options.solar_ray_count,
    solar_power_density = model_options.solar_power_density,
    ray_power = model_options.solar_power_density,
    ray_speed = model_options.solar_ray_speed,
    photon_emission_interval = model_options.photon_emission_interval,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    // Simulation arrays provided by model.
    q       = model.getPowerArray(),
    parts   = model.getPartsArray(),
    photons = model.getPhotonsArray(),

    // Convenience variables.  
    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    //
    // Private methods
    //
    
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
      var i, len, photon;
      for (i = 0, len = photons.length; i < len; i += 1) {
        if (!photons[i].isContained(0, lx, 0, ly)) {
          photons[i] = undefined;
        }
      }
      cleanupPhotonsArray();
    };

  return {
    solve: function () {
      var
        factor = 1.0 / (timestep * photon_emission_interval),
        idx = 1.0 / delta_x,
        idy = 1.0 / delta_y,
        photon, part, x, y,
        i, j, photons_len, parts_len;

      for (i = 0, photons_len = photons.length; i < photons_len; i += 1) {
        photon = photons[i];
        photon.move(timestep);

        for (j = 0, parts_len = parts.length; j < parts_len; j += 1) {
          part = parts[j];
          if (Math.abs(part.reflection - 1) < 0.001) {
            if (part.reflect(photon, timestep)) {
              break;
            }
          } else if (Math.abs(part.absorption - 1) < 0.001) {
            if (part.absorb(photon)) {
              x = Math.max(Math.min(Math.round(photon.x * idx), nx1), 0);
              y = Math.max(Math.min(Math.round(photon.y * idy), ny1), 0);
              // TODO: why not += ? Ask Charles Xie?
              q[x * ny + y] = photon.energy * factor;
              // Remove photon.
              photons[i] = undefined;
              break;
            }
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
    }
  };
};
