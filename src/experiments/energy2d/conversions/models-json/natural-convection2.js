var models_library = models_library || {};
models_library.natural_convection2 = {
  "model": {
    "timestep": 0.25,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "background_conductivity": 1.0,
    "background_density": 1.0,
    "background_specific_heat": 1000.0,
    "background_viscosity": 2.0E-4,
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
            "height": 2.0
          },
          "thermal_conductivity": 1.0,
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
            "texture_style": 9,
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false,
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 7.0,
            "width": 10.0,
            "height": 1.0
          },
          "thermal_conductivity": 1.0E-9,
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
            "texture_style": 10,
            "texture_width": 10,
            "texture_height": 10
          },
          "label": "Insulator",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 6.8,
            "width": 10.0,
            "height": 0.2
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 30.0,
          "constant_temperature": true,
          "uid": "HEATER",
          "label": "%temperature",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 5.0666647,
            "y": 2.0500002,
            "width": 4.9,
            "height": 4.7
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 1.0,
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
          "filled": false,
          "label": "Solid",
          "draggable": false
        },
        {
          "rectangle": {
            "x": -10.0,
            "y": 6.0,
            "width": 5.0,
            "height": 0.8
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false
        },
        {
          "rectangle": {
            "x": 10.0,
            "y": 6.0,
            "width": 5.0,
            "height": 0.8
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false
        },
        {
          "rectangle": {
            "x": 4.666666,
            "y": 1.9833333,
            "width": 0.4,
            "height": 4.766667
          },
          "thermal_conductivity": 1.0E-9,
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
            "texture_style": 16,
            "texture_width": 12,
            "texture_height": 12
          },
          "label": "Insulator",
          "draggable": false
        },
        {
          "rectangle": {
            "x": -0.0333333,
            "y": 8.05,
            "width": 10.016666,
            "height": 2.05
          },
          "thermal_conductivity": 1.0E-9,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "filled": false,
          "draggable": false
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T1",
        "x": 2.2,
        "y": 1.75
      },
      {
        "label": "T2",
        "x": 7.75,
        "y": 1.8000002
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "ruler": true,
    "color_palette_type": 1,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 50.0,
    "graph_xlabel": "Time",
    "text": {
      "string": "Air",
      "name": "Arial",
      "size": 14,
      "style": 0,
      "color": 0xffffff,
      "x": 2.0,
      "y": 5.5
    }
  }
};