var models_library = models_library || {};
models_library.vertical_temperature_gradient_in_house = {
  "model": {
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 5000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.2,
    "photon_emission_interval": 2,
    "z_heat_diffusivity": 0.0,
    "background_conductivity": 1.0,
    "background_viscosity": 1.0,
    "thermal_buoyancy": 1.0E-4,
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
          "ellipse": {
            "x": 5.0,
            "y": 7.5,
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
          "temperature": 100.0,
          "constant_temperature": true,
          "uid": "HEATER",
          "color": 0x22ccff,
          "label": "%temperature",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 1.0,
            "y": 7.0,
            "width": 0.5,
            "height": 1.0
          },
          "thermal_conductivity": 0.0010,
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
            "texture_style": 12,
            "texture_width": 12,
            "texture_height": 12
          },
          "draggable": false
        },
        {
          "rectangle": {
            "x": 1.0,
            "y": 3.5,
            "width": 0.5,
            "height": 1.5
          },
          "thermal_conductivity": 0.0010,
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
            "texture_style": 12,
            "texture_width": 12,
            "texture_height": 12
          },
          "draggable": false
        },
        {
          "polygon": {
            "count": 6,
            "vertices": "0.5, 3.5, 5.0, 1.0, 9.5, 3.5, 8.5, 3.5, 5.0, 1.6499996, 1.5, 3.5"
          },
          "thermal_conductivity": 0.1,
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
            "texture_style": 7,
            "texture_width": 4,
            "texture_height": 4
          },
          "draggable": false
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
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x7f7f80,
            "texture_bg": -0xcccccd,
            "texture_style": 16,
            "texture_width": 12,
            "texture_height": 12
          },
          "label": "Ground",
          "draggable": false
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
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 12,
            "texture_width": 12,
            "texture_height": 12
          },
          "label": "Wall",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 1.15,
            "y": 5.0,
            "width": 0.2,
            "height": 2.0
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 1.0,
          "reflection": 0.0,
          "absorption": 0.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "color": 0xffffff,
          "label": "Window"
        },
        {
          "rectangle": {
            "x": 1.5,
            "y": 3.5,
            "width": 7.0,
            "height": 0.5
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 2000.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "color": 0x22cc33,
          "label": "Ceiling"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T3",
        "x": 8.2,
        "y": 6.6
      },
      {
        "label": "T2",
        "x": 8.2,
        "y": 5.5
      },
      {
        "label": "T1",
        "x": 8.2,
        "y": 4.4
      }
    ]
  },
  "view": {
    "grid": true,
    "grid_size": 10,
    "ruler": true,
    "color_palette_type": 0,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 40.0,
    "graph": true,
    "graph_xlabel": "Time"
  }
};