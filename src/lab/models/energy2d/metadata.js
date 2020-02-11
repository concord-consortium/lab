/*global define: false */

import $__models_energy_d_models_constants from 'models/energy2d/models/constants';
var constants = $__models_energy_d_models_constants;

export default {
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
    controlButtonStyle: {
      defaultValue: "video",
      propertyChangeInvalidates: false,
      serialize: false
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
    shapeType: {
      // Available options: "rectangle", "ellipse", "ring" or "polygon".
      required: true,
      immutable: true
    },
    x: {
      defaultValue: 0
    },
    y: {
      defaultValue: 0
    },
    width: {},
    height: {},
    a: {},
    b: {},
    inner: {},
    outer: {},
    vertices: {},

    // Special shortcut properties which let user access polygon properties
    // faster and more convenient. They can be used both to get and set
    // value. They are not serialized.
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
    label: {
      defaultValue: ""
    },
    texture: {
      defaultValue: false
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
