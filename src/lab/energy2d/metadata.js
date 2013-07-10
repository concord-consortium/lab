/*global define: false */

define(function(require) {
  var constants = require('energy2d/models/constants');

  return {
    mainProperties: {
      type: {
        defaultValue: "energy2d",
        immutable: true
      },
      use_WebGL: {
        defaultValue: false
      },
      grid_width: {
        defaultValue: 100,
        immutable: true
      },
      grid_height: {
        defaultValue: 100,
        immutable: true
      },
      model_width: {
        defaultValue: 10,
        immutable: true
      },
      model_height: {
        defaultValue: 10,
        immutable: true
      },
      timeStep: {
        defaultValue: 1
      },
      timeStepsPerTick: {
        defaultValue: 4
      },
      ticksPerGPUSync: {
        defaultValue: 30
      },
      convective: {
        defaultValue: true
      },
      background_temperature: {
        defaultValue: 0
      },
      background_conductivity: {
        defaultValue: constants.AIR_THERMAL_CONDUCTIVITY
      },
      background_specific_heat: {
        defaultValue: constants.AIR_SPECIFIC_HEAT
      },
      background_density: {
        defaultValue: constants.AIR_DENSITY
      },
      background_viscosity: {
        defaultValue: constants.AIR_VISCOSITY
      },
      thermal_buoyancy: {
        defaultValue: 0.00025
      },
      buoyancy_approximation: {
        defaultValue: 1
      },
      boundary: {
        defaultValue: {
          type: "temperature",
          upper: 0,
          lower: 0,
          left: 0,
          right: 0
        }
      },
      measurement_interval: {
        // unnecessary
        defaultValue: 500
      },
      viewupdate_interval: {
        // unnecessary
        defaultValue: 100
      },
      stoptime: {
        // unnecessary
      },
      sunny: {
        defaultValue: false
      },
      sun_angle: {
        defaultValue: 1.5707964
      },
      solar_power_density: {
        defaultValue: 2000
      },
      solar_ray_count: {
        defaultValue: 24
      },
      solar_ray_speed: {
        defaultValue: 0.1
      },
      photon_emission_interval: {
        defaultValue: 20
      },

      structure: {
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
      }
    },

    viewOptions: {
      showClock: {
        defaultValue: true,
        propertyChangeInvalidates: false
      },
      controlButtons: {
        defaultValue: "play_reset",
        propertyChangeInvalidates: false
      },
      color_palette_type: {
        defaultValue: 0
      },
      velocity: {
        defaultValue: false
      },
      minimum_temperature: {
        defaultValue: 0
      },
      maximum_temperature: {
        defaultValue: 40.0
      },
      enableKeyboardHandlers: {
        defaultValue: true
      }
    },

    part: {
      // Part should declare *ONE* of available shapes:
      rectangle: {
        conflictsWith: ["ellipse", "ring", "polygon"]
        // available properties with example values:
        // x: 5,
        // y: 5,
        // width: 2,
        // height: 2
      },
      ellipse: {
        conflictsWith: ["rectangle", "ring", "polygon"]
        // available properties with example values:
        // x: 5,
        // y: 5,
        // a: 3,
        // b: 3
      },
      ring: {
        conflictsWith: ["rectangle", "ellipse", "polygon"]
        // available properties with example values:
        // x: 5,
        // y: 5,
        // inner: 1,
        // outer: 2
      },
      polygon: {
        conflictsWith: ["rectangle", "ellipse", "ring"]
        // available properties with example values:
        // count: 3,                    // Vertices count.
        // vertices: 1, 1, 2, 2, 3, 3   // String with coordinates.
      },

      // Special shortcut properties which let user access shape properties
      // faster and more convenient. They can be used both to get and set
      // value (except 'shapeType' which is read-only). They are not serialized.
      shapeType: {
        readOnly: true,
        serialize: false
      },
      x: {
        serialize: false
      },
      y: {
        serialize: false
      },
      width: {
        serialize: false
      },
      height: {
        serialize: false
      },
      a: {
        serialize: false
      },
      b: {
        serialize: false
      },
      inner: {
        serialize: false
      },
      outer: {
        serialize: false
      },
      raw_x_coords: {
        serialize: false
      },
      raw_y_coords: {
        serialize: false
      },

      thermal_conductivity: {
        defaultValue: 1
      },
      specific_heat: {
        defaultValue: 1300
      },
      density: {
        defaultValue: 25
      },
      transmission: {
        defaultValue: 0
      },
      reflection: {
        defaultValue: 0
      },
      absorption: {
        defaultValue: 1
      },
      emissivity: {
        defaultValue: 0
      },
      temperature: {
        defaultValue: 0
      },
      constant_temperature: {
        defaultValue: false
      },
      power: {
        defaultValue: 0
      },
      wind_speed: {
        defaultValue: 0
      },
      wind_angle: {
        defaultValue: 0
      },
      visible: {
        defaultValue: true
      },
      filled: {
        defaultValue: true
      },
      color: {
        // Auto color means that part will use color matching its power or temperature
        // (when it has constant temperature) or gray color otherwise.
        defaultValue: "auto"
      },
      label: {},
      texture: {
      // Texture can be undefined.
      // However, its desired form is (contains example values):
      // {
      //   texture_fg: -0x1000000,
      //   texture_bg: -0x7f7f80,
      //   texture_style: 12,
      //   texture_width: 12,
      //   texture_height: 12
      // },
      },
      uid: {
        // unnecessary (not yet implemented)
      },
      draggable: {
        defaultValue: true
      }
    },

    sensor: {
      type: {
        required: true,
        immutable: true
      },
      x: {
        required: true,
        unitType: "length"
      },
      y: {
        required: true,
        unitType: "length"
      },
      angle: {
        // Optional, defined only for heat flux sensors.
        immutable: true
      },
      label: {
        defaultValue: ""
      },
      value: {
        readOnly: true,
        serialize: false
      }
    }
  };
});
