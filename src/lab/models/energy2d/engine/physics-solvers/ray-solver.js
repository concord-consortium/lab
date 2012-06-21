/*jslint indent: 2 */
//
// lab/models/energy2d/engine/physics-solvers/ray-solver.js
//

var
  arrays = require('../arrays/arrays.js').arrays;
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
    sun_angle = model_options.sun_angle,
    ray_count = model_options.solar_ray_count,
    solar_power_density = model_options.solar_power_density,
    ray_power = model_options.solar_power_density,
    ray_speed = model_options.solar_ray_speed,

    deltaX = model_options.model_width / model.getGridWidth(),
    deltaY = model_options.model_height / model.getGridHeight(),

    relaxationSteps = RELAXATION_STEPS,

    // Simulation arrays provided by model.
    q       = model.getPowerArray(),
    photons = model.getPhotonsArray(),

    // Convenience variables.  
    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2;

    //
    // Private methods
    //
  return {
    solve: function () {

    }
  };
};
