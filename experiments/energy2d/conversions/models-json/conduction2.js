var models_library = models_library || {};
models_library.conduction2 = {
  "model": {
    "model_width": 0.1,
    "model_height": 0.1,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "convective": false,
    "background_conductivity": 1.0E-9,
    "background_density": 1.0,
    "background_specific_heat": 100.0,
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
      "part": [
        {
          "rectangle": {
            "x": 0.0,
            "y": 0.0,
            "width": 0.02,
            "height": 0.04
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 50.0,
          "constant_temperature": true,
          "filled": false,
          "label": "%temperature",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.080000006,
            "y": 0.0,
            "width": 0.02,
            "height": 0.04
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 16,
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false,
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.020000001,
            "y": 0.0195,
            "width": 0.06,
            "height": 0.0010
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 900.0,
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
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 0.06,
            "width": 0.02,
            "height": 0.04
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 50.0,
          "constant_temperature": true,
          "filled": false,
          "label": "%temperature",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.080000006,
            "y": 0.06,
            "width": 0.02,
            "height": 0.04
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 16,
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false,
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.020000001,
            "y": 0.074999996,
            "width": 0.06,
            "height": 0.01
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 900.0,
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
            "texture_width": 12,
            "texture_height": 12
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
        "x": 0.09,
        "y": 0.08
      },
      {
        "label": "T1",
        "x": 0.09,
        "y": 0.020000003
      }
    ]
  },
  "view": {
    "grid": true,
    "grid_size": 10,
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.49333334,
    "rainbow_h": 0.033333335,
    "minimum_temperature": 0.0,
    "maximum_temperature": 100.0,
    "heat_flux_line": true,
    "graph_xlabel": "Time",
    "clock": false
  }
};