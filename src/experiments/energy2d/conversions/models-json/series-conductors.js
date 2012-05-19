var models_library = models_library || {};
models_library.series_conductors = {
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
    "z_heat_diffusivity": 0.0,
    "convective": false,
    "background_conductivity": 1.0E-9,
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
            "y": 0.024,
            "width": 0.02,
            "height": 0.05
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
            "x": 0.08,
            "y": 0.024,
            "width": 0.02,
            "height": 0.05
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
            "texture_bg": -0x1,
            "texture_style": 16,
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false,
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.035,
            "y": 0.023999998,
            "width": 0.015,
            "height": 0.05
          },
          "thermal_conductivity": 0.1,
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
            "texture_bg": -0x1,
            "texture_style": 10,
            "texture_width": 10,
            "texture_height": 10
          },
          "filled": false,
          "label": "R2"
        },
        {
          "rectangle": {
            "x": 0.02,
            "y": 0.023999998,
            "width": 0.015,
            "height": 0.05
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
            "texture_bg": -0x1,
            "texture_style": 9,
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false,
          "label": "R1"
        },
        {
          "rectangle": {
            "x": 0.05,
            "y": 0.023999998,
            "width": 0.015,
            "height": 0.05
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
            "texture_bg": -0x1,
            "texture_style": 9,
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false,
          "label": "R1"
        },
        {
          "rectangle": {
            "x": 0.065,
            "y": 0.023999998,
            "width": 0.015,
            "height": 0.05
          },
          "thermal_conductivity": 0.1,
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
            "texture_bg": -0x1,
            "texture_style": 10,
            "texture_width": 10,
            "texture_height": 10
          },
          "filled": false,
          "label": "R2"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T5",
        "x": 0.09,
        "y": 0.06
      },
      {
        "label": "T4",
        "x": 0.073,
        "y": 0.06
      },
      {
        "label": "T3",
        "x": 0.057,
        "y": 0.06
      },
      {
        "label": "T2",
        "x": 0.042,
        "y": 0.06
      },
      {
        "label": "T1",
        "x": 0.027,
        "y": 0.06
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
    "maximum_temperature": 100.0,
    "heat_flux_line": true,
    "graph_xlabel": "Time",
    "clock": false
  }
};