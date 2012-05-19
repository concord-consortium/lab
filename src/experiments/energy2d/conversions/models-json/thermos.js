var models_library = models_library || {};
models_library.thermos = {
  "model": {
    "model_width": 1.0,
    "model_height": 1.0,
    "timestep": 20.0,
    "measurement_interval": 20,
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
      "temperature_at_border": {
        "upper": 0.0,
        "lower": 0.0,
        "left": 0.0,
        "right": 0.0
      }
    },
    "structure": {
      "part": [
        {
          "ring": {
            "x": 0.5,
            "y": 0.5,
            "inner": 0.5,
            "outer": 0.6
          },
          "thermal_conductivity": 0.01,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false
        },
        {
          "ellipse": {
            "x": 0.5,
            "y": 0.5,
            "a": 0.5,
            "b": 0.5
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 30.0,
          "constant_temperature": false,
          "filled": false
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "x": 0.5,
        "y": 0.5
      },
      {
        "x": 0.20100503,
        "y": 0.80889446
      }
    ]
  },
  "view": {
    "grid": true,
    "grid_size": 10,
    "ruler": true,
    "color_palette_type": 1,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 40.0
  }
};