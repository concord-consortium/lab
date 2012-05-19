var models_library = models_library || {};
models_library.house_ceiling = {
  "model": {
    "timestep": 0.5,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 5000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.2,
    "photon_emission_interval": 2,
    "z_heat_diffusivity": 0.0,
    "background_conductivity": 5.0,
    "background_density": 1.0,
    "background_viscosity": 0.0010,
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
            "x": 5.066667258739471,
            "y": 7.066667139530182,
            "a": 0.983333,
            "b": 1.533333
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
          "power": 1000.0,
          "color": 0x22ccff,
          "label": "Heater"
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
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 8,
            "texture_height": 8
          }
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
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 8,
            "texture_height": 8
          }
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
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "color": 0x333333,
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
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x336700,
            "texture_style": 12,
            "texture_width": 8,
            "texture_height": 8
          }
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
          "color": 0xc0c0,
          "label": "Ceiling"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "x": 4.125,
        "y": 7.75
      },
      {
        "x": 5.125,
        "y": 4.45
      },
      {
        "x": 6.125,
        "y": 6.25
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "ruler": true,
    "color_palette": true,
    "color_palette_type": 0,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 50.0
  }
};