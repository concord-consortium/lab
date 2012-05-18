var models_library = models_library || {};
models_library.fixed_flux_boundary = {
  "model": {
    "timestep": 100.0,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "convective": false,
    "background_conductivity": 0.25,
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
        "ellipse": {
          "x": 5.0,
          "y": 5.0,
          "a": 1.0,
          "b": 1.0
        },
        "thermal_conductivity": 1.0,
        "specific_heat": 1300.0,
        "density": 25.0,
        "transmission": 0.0,
        "reflection": 0.0,
        "absorption": 1.0,
        "emissivity": 0.0,
        "temperature": 0.0,
        "constant_temperature": false,
        "power": 20.0
      }
    }
  },
  "sensor": "\n",
  "view": {
    "grid_size": 10,
    "isotherm": true,
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.0,
    "rainbow_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 40.0,
    "heat_flux_line": true,
    "text": {
      "string": "Insulative boundary",
      "name": "Arial",
      "size": 12,
      "style": 0,
      "color": 0xffffff,
      "x": 0.5,
      "y": 9.0
    }
  }
};