var models_library = models_library || {};
models_library.infiltration = {
  "model": {
    "timestep": 0.1,
    "measurement_interval": 100,
    "viewupdate_interval": 20,
    "sun_angle": 1.5707964,
    "solar_power_density": 20000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.0010,
    "photon_emission_interval": 5,
    "z_heat_diffusivity": 0.0,
    "background_conductivity": 0.2,
    "background_density": 1.0,
    "background_specific_heat": 100.0,
    "background_viscosity": 1.0E-4,
    "thermal_buoyancy": 2.0E-4,
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
          "rectangle": {
            "x": 0.95000005,
            "y": 6.0,
            "width": 0.5,
            "height": 2.0
          },
          "thermal_conductivity": 0.01,
          "specific_heat": 1000.0,
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
            "texture_width": 10,
            "texture_height": 10
          },
          "label": "Wall"
        },
        {
          "rectangle": {
            "x": -0.099999905,
            "y": 8.0,
            "width": 10.2,
            "height": 2.0
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 3000.0,
          "density": 50.0,
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
          "label": "Ground"
        },
        {
          "rectangle": {
            "x": 4.5,
            "y": 2.75,
            "width": 1.0,
            "height": 5.25
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 2000.0,
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
            "texture_width": 10,
            "texture_height": 10
          },
          "label": "Wall"
        },
        {
          "rectangle": {
            "x": 0.78333336,
            "y": 2.25,
            "width": 2.2166667,
            "height": 0.5
          },
          "thermal_conductivity": 0.01,
          "specific_heat": 1000.0,
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
          }
        },
        {
          "rectangle": {
            "x": 2.25,
            "y": 7.475,
            "width": 1.5,
            "height": 0.45
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 10.0,
          "density": 1.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 60.0,
          "constant_temperature": false,
          "power": 1000.0,
          "filled": false,
          "label": "Heater"
        },
        {
          "rectangle": {
            "x": 3.2,
            "y": 2.25,
            "width": 3.6,
            "height": 0.5
          },
          "thermal_conductivity": 0.01,
          "specific_heat": 1000.0,
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
          "label": "Roof"
        },
        {
          "rectangle": {
            "x": 6.25,
            "y": 7.475,
            "width": 1.5,
            "height": 0.45
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 10.0,
          "density": 1.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 60.0,
          "constant_temperature": false,
          "power": 1000.0,
          "filled": false,
          "label": "Heater"
        },
        {
          "rectangle": {
            "x": 8.55,
            "y": 6.0,
            "width": 0.5,
            "height": 2.0
          },
          "thermal_conductivity": 0.01,
          "specific_heat": 1000.0,
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
            "texture_width": 10,
            "texture_height": 10
          },
          "label": "Wall"
        },
        {
          "rectangle": {
            "x": 6.8,
            "y": 2.25,
            "width": 2.4,
            "height": 0.5
          },
          "thermal_conductivity": 0.01,
          "specific_heat": 1000.0,
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
          }
        },
        {
          "rectangle": {
            "x": 8.55,
            "y": 2.9666667,
            "width": 0.5,
            "height": 0.78333336
          },
          "thermal_conductivity": 0.01,
          "specific_heat": 1000.0,
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
            "texture_width": 10,
            "texture_height": 10
          },
          "label": "Wall"
        },
        {
          "rectangle": {
            "x": 0.95000005,
            "y": 2.75,
            "width": 0.5,
            "height": 1.0
          },
          "thermal_conductivity": 0.01,
          "specific_heat": 1000.0,
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
            "texture_width": 10,
            "texture_height": 10
          },
          "label": "Wall"
        },
        {
          "rectangle": {
            "x": 1.125,
            "y": 3.675,
            "width": 0.15,
            "height": 2.35
          },
          "thermal_conductivity": 0.1,
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
            "x": 8.725,
            "y": 3.675,
            "width": 0.15,
            "height": 2.35
          },
          "thermal_conductivity": 0.1,
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
        }
      ]
    }
  },
  "sensor": "\n",
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
    "maximum_temperature": 50.0,
    "graph_xlabel": "Time",
    "text": {
      "string": "Where are the energy leaks?",
      "name": "Arial",
      "size": 14,
      "style": 0,
      "color": 0xffffff,
      "x": 3.5,
      "y": 9.5
    }
  }
};