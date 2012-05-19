var models_library = models_library || {};
models_library.ht1 = {
  "model": {
    "model_width": 1.0,
    "model_height": 1.0,
    "timestep": 0.01,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "convective": false,
    "background_conductivity": 1.0,
    "background_density": 1.0,
    "background_specific_heat": 1000.0,
    "background_viscosity": 1.568E-4,
    "thermal_buoyancy": 2.5E-4,
    "buoyancy_approximation": 1,
    "boundary": {
      "flux_at_border": {
        "upper": 0.0,
        "lower": 0.0,
        "left": 0.0,
        "right": 0.0
      }
    },
    "structure": {
      "part": {
        "rectangle": {
          "x": 0.25,
          "y": 0.25,
          "width": 0.49,
          "height": 0.49
        },
        "thermal_conductivity": 1.0,
        "specific_heat": 1000.0,
        "density": 1.0,
        "transmission": 0.0,
        "reflection": 0.0,
        "absorption": 1.0,
        "emissivity": 0.0,
        "temperature": 50.0,
        "constant_temperature": false,
        "uid": "block",
        "texture": {
          "texture_fg": -0x1000000,
          "texture_bg": -0x7f7f80,
          "texture_style": 9,
          "texture_width": 12,
          "texture_height": 12
        },
        "filled": false
      }
    }
  },
  "sensor": {
    "thermometer": [
      {
        "x": 0.5125,
        "y": 0.525
      },
      {
        "x": 0.112500004,
        "y": 0.525
      }
    ]
  },
  "view": {
    "grid": true,
    "grid_size": 10,
    "rainbow": true,
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.0,
    "rainbow_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 50.0,
    "graph_xlabel": "Time",
    "text": {
      "string": "Completely insulated boundary",
      "name": "Arial",
      "size": 14,
      "style": 0,
      "color": 0xffffff,
      "x": 10.0,
      "y": 20.0
    }
  }
};