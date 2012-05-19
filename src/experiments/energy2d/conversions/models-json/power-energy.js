var models_library = models_library || {};
models_library.power_energy = {
  "model": {
    "model_width": 1.0,
    "model_height": 1.0,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "stoptime": 7200.0,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "convective": false,
    "background_conductivity": 1.0E-9,
    "background_specific_heat": 1.0,
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
          "rectangle": {
            "x": 0.11,
            "y": 0.31,
            "width": 0.28,
            "height": 0.38
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 1.204,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x1,
            "texture_style": 10,
            "texture_width": 10,
            "texture_height": 10
          },
          "filled": false,
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.61,
            "y": 0.31,
            "width": 0.28,
            "height": 0.38
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 1.204,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x1,
            "texture_style": 10,
            "texture_width": 10,
            "texture_height": 10
          },
          "filled": false,
          "draggable": false
        },
        {
          "ellipse": {
            "x": 0.24999999441206455,
            "y": 0.49999999441206455,
            "a": 0.05,
            "b": 0.05
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
          "power": 400.0,
          "uid": "SOURCE1",
          "filled": false,
          "label": "%power_density"
        },
        {
          "ellipse": {
            "x": 0.7500000242143869,
            "y": 0.49999999441206455,
            "a": 0.05,
            "b": 0.05
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
          "power": 200.0,
          "uid": "SOURCE2",
          "filled": false,
          "label": "%power_density"
        },
        {
          "rectangle": {
            "x": 0.099999994,
            "y": 0.29500002,
            "width": 0.3,
            "height": 0.01
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.6,
            "y": 0.29500002,
            "width": 0.3,
            "height": 0.01
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.099999994,
            "y": 0.695,
            "width": 0.3,
            "height": 0.01
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.6,
            "y": 0.695,
            "width": 0.3,
            "height": 0.01
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.395,
            "y": 0.29500002,
            "width": 0.01,
            "height": 0.41
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.595,
            "y": 0.29500002,
            "width": 0.01,
            "height": 0.41
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.895,
            "y": 0.29500002,
            "width": 0.01,
            "height": 0.41
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.095,
            "y": 0.29500002,
            "width": 0.01,
            "height": 0.41
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
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T2",
        "x": 0.65,
        "y": 0.5
      },
      {
        "label": "T1",
        "x": 0.35,
        "y": 0.5
      }
    ]
  },
  "view": {
    "grid": true,
    "grid_size": 10,
    "color_palette_type": 0,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 10.0,
    "heat_flux_line": true,
    "text": {
      "string": "This model automatically pauses every two hours (model time).",
      "name": "Arial",
      "size": 14,
      "style": 0,
      "color": 0xffffff,
      "x": 0.1,
      "y": 0.2
    }
  }
};