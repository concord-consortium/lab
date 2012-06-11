/*jslint indent: 2 */
//
// lab/models/energy2d/engines/default-config.js
//

var constants = require('./constants.js');

// TODO: add *ALL* available settings to this object!
// Contains all setting available in the original Energy2D application
// with their default values.
exports.DEFAULT_MODEL_OPTIONS = {
  model_width: 10,
  model_height: 10,
  timestep: 0.1,
  convective: true,

  background_conductivity: 10 * constants.AIR_THERMAL_CONDUCTIVITY,
  background_specific_heat: constants.AIR_SPECIFIC_HEAT,
  background_density: constants.AIR_DENSITY,
  background_temperature: 0,
  background_viscosity: 10 * constants.AIR_VISCOSITY,

  thermal_buoyancy: 0.00025,
  buoyancy_approximation: 1,

  measurement_interval: 100,        // unnecessary
  viewupdate_interval: 20,          // unnecessary
  stoptime: undefined,              // unnecessary
  sunny: true,                      // unnecessary (ray solver not implemented)
  sun_angle: 1.5707964,             // unnecessary (ray solver not implemented)
  solar_power_density: 20000,       // unnecessary (ray solver not implemented)
  solar_ray_count: 24,              // unnecessary (ray solver not implemented)
  solar_ray_speed: 0.001,           // unnecessary (ray solver not implemented)
  photon_emission_interval: 5,      // unnecessary (ray solver not implemented)

  boundary: {
    flux_at_border: {
      upper: 0,
      lower: 0,
      left: 0,
      right: 0
    }
  },

  sensor: undefined,                // unnecessary (sensors not implemented)

  // TODO: Default structure should be empty. 
  // TODO: Provide default part configuration.
  structure: {
    part: [
      {
        rectangle: {
          x: 4.5,
          y: 4.5,
          width: 1,
          height: 1
        },
        thermal_conductivity: 1,
        specific_heat: 1300,
        density: 25,
        transmission: 0,
        reflection: 0,
        absorption: 1,
        emissivity: 0,
        temperature: 50,
        constant_temperature: true,
        power: 0,
        windSpeed: 0,
        windAngle: 0,
        uid: undefined,
        color: "gray",
        texture: undefined,
        filled: true,
        label: undefined,
        visible: undefined,
        draggable: undefined
      }
    ]
  }
};