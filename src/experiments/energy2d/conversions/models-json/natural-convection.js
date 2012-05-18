var models_library = models_library || {};
models_library.natural_convection = {
  "model": {
    "timestep": 0.25,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "background_conductivity": 0.5,
    "background_viscosity": 5.0E-5,
    "thermal_buoyancy": 2.5E-4,
    "buoyancy_approximation": 0,
    "boundary": {
      "flux_at_border": {
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
            "width": 10.0,
            "height": 1.0
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 5.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 10,
            "texture_width": 10,
            "texture_height": 10
          },
          "filled": false
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 4.9,
            "width": 10.0,
            "height": 0.2
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 40.0,
          "constant_temperature": true
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 9.0,
            "width": 10.0,
            "height": 1.0
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 5.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 10,
            "texture_width": 10,
            "texture_height": 10
          },
          "filled": false
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T2",
        "x": 5.0,
        "y": 9.25
      },
      {
        "label": "T1",
        "x": 5.0,
        "y": 0.75
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "rainbow_x": 0.083333336,
    "rainbow_y": 0.033333335,
    "rainbow_w": 0.8333333,
    "rainbow_h": 0.033333335,
    "minimum_temperature": 0.0,
    "maximum_temperature": 50.0
  }
};