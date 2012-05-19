var models_library = models_library || {};
models_library.heatshield = {
  "model": {
    "timestep": 1000.0,
    "measurement_interval": 100,
    "viewupdate_interval": 20,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "convective": false,
    "thermal_buoyancy": 2.5E-4,
    "buoyancy_approximation": 1,
    "boundary": {
      "flux_at_border": {
        "upper": 0.0,
        "lower": -0.5,
        "left": 0.0,
        "right": 0.0
      }
    },
    "structure": {
      "part": {
        "ring": {
          "x": 5.0,
          "y": 5.0,
          "inner": 5.4,
          "outer": 6.0
        },
        "thermal_conductivity": 1.0E-5,
        "specific_heat": 1300.0,
        "density": 25.0,
        "transmission": 0.0,
        "reflection": 0.0,
        "absorption": 1.0,
        "emissivity": 0.0,
        "temperature": 0.0,
        "constant_temperature": false
      }
    }
  },
  "sensor": {
    "thermometer": [
      {
        "x": 5.0,
        "y": 5.0
      },
      {
        "x": 5.0,
        "y": 8.5
      },
      {
        "x": 5.0,
        "y": 1.5
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "color_palette": true,
    "color_palette_type": 0,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 100.0,
    "clock": false
  }
};