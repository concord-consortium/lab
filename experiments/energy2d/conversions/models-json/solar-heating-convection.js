var models_library = models_library || {};
models_library.solar_heating_convection = {
  "model": {
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sunny": true,
    "sun_angle": 2.6179938,
    "solar_power_density": 50000.0,
    "solar_ray_count": 48,
    "solar_ray_speed": 0.04,
    "photon_emission_interval": 5,
    "background_conductivity": 1.0,
    "background_viscosity": 0.01,
    "thermal_buoyancy": 2.5E-4,
    "buoyancy_approximation": 0,
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
          "polygon": {
            "count": 4,
            "vertices": "8.0, 8.0, 8.5, 8.0, 8.5, 7.0, 8.0, 7.0"
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 1.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "color": 0x22ccff
        },
        {
          "rectangle": {
            "x": 2.0,
            "y": 7.0,
            "width": 0.5,
            "height": 1.0
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 1.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          }
        },
        {
          "rectangle": {
            "x": 2.0,
            "y": 3.5,
            "width": 0.5,
            "height": 1.5
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 1.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          }
        },
        {
          "polygon": {
            "count": 6,
            "vertices": "1.5, 3.5, 5.5, 1.0, 9.5, 3.5, 8.5, 3.5, 5.5, 1.6499996, 2.5, 3.5"
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 1.0,
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
          }
        },
        {
          "rectangle": {
            "x": -0.099999905,
            "y": 8.0,
            "width": 10.2,
            "height": 2.0
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 1.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x7f7f80,
            "texture_bg": -0x1000000,
            "texture_style": 10,
            "texture_width": 10,
            "texture_height": 10
          },
          "label": "Ground"
        },
        {
          "rectangle": {
            "x": 8.5,
            "y": 3.5,
            "width": 0.5,
            "height": 4.5
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 1.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "label": "Wall"
        },
        {
          "rectangle": {
            "x": 2.15,
            "y": 5.0,
            "width": 0.2,
            "height": 2.0
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 1.0,
          "reflection": 0.0,
          "absorption": 0.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "color": 0xccccff,
          "label": "Window"
        },
        {
          "rectangle": {
            "x": 2.5,
            "y": 3.5,
            "width": 6.0,
            "height": 0.5
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 1.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 7,
            "texture_width": 4,
            "texture_height": 4
          },
          "label": "Ceiling"
        },
        {
          "rectangle": {
            "x": 2.55,
            "y": 7.7,
            "width": 5.9,
            "height": 0.25
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
          "color": 0x444444,
          "label": "Floor"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T1",
        "x": 1.625,
        "y": 6.25
      },
      {
        "label": "T2",
        "x": 5.125,
        "y": 6.25
      },
      {
        "label": "T3",
        "x": 6.125,
        "y": 6.25
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "ruler": true,
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.0,
    "rainbow_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 40.0,
    "text": {
      "string": "Press 'Q' or 'W' to change the sun angle",
      "name": "Arial",
      "size": 14,
      "style": 0,
      "color": 0xffffff,
      "x": 0.5,
      "y": 9.5
    }
  }
};