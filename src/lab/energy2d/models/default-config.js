/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

define(function (require, exports, module) {
  'use strict';
  var constants = require('energy2d/models/constants');

  // This object defines default values for different configuration objects.
  //
  // It's used to provide a default value of property if it isn't defined.
  // Object contains some undefined values to show that they are available, but optional.
  exports.DEFAULT_VALUES = {
    // Default model properties.
    "model": {
      "use_WebGL": false,
      "grid_width": 100,
      "grid_height": 100,

      "model_width": 10,
      "model_height": 10,
      "timeStep": 1,
      "convective": true,

      "background_temperature": 0,
      "background_conductivity": constants.AIR_THERMAL_CONDUCTIVITY,
      "background_specific_heat": constants.AIR_SPECIFIC_HEAT,
      "background_density": constants.AIR_DENSITY,
      "background_viscosity": constants.AIR_VISCOSITY,

      "thermal_buoyancy": 0.00025,
      "buoyancy_approximation": 1,

      "boundary": {
        "temperature_at_border": {
          "upper": 0,
          "lower": 0,
          "left": 0,
          "right": 0
        }
      },

      "measurement_interval": 500,        // unnecessary
      "viewupdate_interval": 100,         // unnecessary
      "stoptime": undefined,              // unnecessary
      "sunny": false,
      "sun_angle": 1.5707964,
      "solar_power_density": 2000,
      "solar_ray_count": 24,
      "solar_ray_speed": 0.1,
      "photon_emission_interval": 20,

      "structure": undefined
      // Structure can be undefined.
      // However, its desired form is:
      // "structure": {
      //   "part": [
      //     {
      //       ... part definition (see part fallback values below)
      //     },
      //     {
      //       ... second part definition
      //     },
      //   ]
      // }
    },

    // Default part properties.
    "part": {
      "thermal_conductivity": 1,
      "specific_heat": 1300,
      "density": 25,
      "transmission": 0,
      "reflection": 0,
      "absorption": 1,
      "emissivity": 0,
      "temperature": 0,
      "constant_temperature": false,
      "power": 0,
      "wind_speed": 0,
      "wind_angle": 0,
      "visible": true,
      "filled": true,
      "color": "gray",
      "label": undefined,
      "texture": undefined,
      // Texture can be undefined.
      // However, its desired form is (contains example values):
      // {
      //   "texture_fg": -0x1000000,
      //   "texture_bg": -0x7f7f80,
      //   "texture_style": 12,
      //   "texture_width": 12,
      //   "texture_height": 12
      // },
      "uid": undefined,       // unnecessary (not yet implemented)
      "draggable": true       // unnecessary (not yet implemented)

      // Part should declare also *ONE* of available shapes:
      //
      // "rectangle": {
      //   "x": 5,
      //   "y": 5,
      //   "width": 2,
      //   "height": 2
      // },
      // "ellipse": {
      //   "x": 5,
      //   "y": 5,
      //   "a": 3,
      //   "b": 3
      // },
      // "ring": {
      //   "x": 5,
      //   "y": 5,
      //   "inner": 1,
      //   "outer": 2
      // },
      // "polygon": {
      //   "count": 3,                    // Vertices count.
      //   "vertices": "1, 1, 2, 2, 3, 3" // String with coordinates.
      // },
    }
  };

  // Returns configuration with default properties if the given configuration is not declaring them.
  // Existing properties are copied into result.
  exports.fillWithDefaultValues = function (config, default_config) {
    var
      name,
      result,
      clone = function (obj) {
        // Clone to avoid situation when modification of the configuration
        // alters global default configuration.
        if (obj === undefined) {
          return undefined;
        }
        // a way of deep-cloning objects
        return JSON.parse(JSON.stringify(obj));
      };

    if (config === undefined) {
      // Return just default properties.
      return clone(default_config);
    }

    // Keep existing properties
    result = clone(config);
    // and add defaults.
    for (name in default_config) {
      if (default_config.hasOwnProperty(name) && config[name] === undefined) {
        result[name] = clone(default_config[name]);
      }
    }
    return result;
  };
});
