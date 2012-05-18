var models_library = models_library || {};
models_library.smoke_in_wind = {
  "model": {
    "timestep": 0.2,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "background_conductivity": 1.0,
    "background_viscosity": 1.0E-4,
    "thermal_buoyancy": 0.0010,
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
          "rectangle": {
            "x": 0.0,
            "y": 0.0,
            "width": 0.2,
            "height": 5.0
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "wind_speed": 0.2
        },
        {
          "ellipse": {
            "x": 5.0,
            "y": 6.0,
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
          "temperature": 20.0,
          "constant_temperature": true
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T1",
        "x": 2.0,
        "y": 5.0
      },
      {
        "label": "T2",
        "x": 4.0,
        "y": 5.0
      },
      {
        "label": "T3",
        "x": 8.0,
        "y": 5.0
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.0,
    "rainbow_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 40.0,
    "text": {
      "string": "Fan",
      "name": "Arial",
      "size": 12,
      "style": 0,
      "color": 0xffffff,
      "x": 1.0,
      "y": 9.0
    }
  }
};