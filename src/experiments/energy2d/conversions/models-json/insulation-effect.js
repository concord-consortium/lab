var models_library = models_library || {};
models_library.insulation_effect = {
  "model": {
    "timestep": 100.0,
    "measurement_interval": 100,
    "viewupdate_interval": 20,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "convective": false,
    "background_density": 1.0,
    "background_temperature": 20.0,
    "thermal_buoyancy": 2.5E-4,
    "buoyancy_approximation": 1,
    "boundary": {
      "temperature_at_border": {
        "upper": 20.0,
        "lower": 20.0,
        "left": 20.0,
        "right": 20.0
      }
    },
    "structure": {
      "part": [
        {
          "rectangle": {
            "x": 4.75,
            "y": 7.0,
            "width": 0.5,
            "height": 1.0
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 20.0,
          "constant_temperature": false,
          "power": 2.0,
          "uid": "HEATER",
          "label": "%power_density",
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
          "temperature": 20.0,
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
            "y": 4.0,
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
          "temperature": 20.0,
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
            "count": 5,
            "vertices": "0.5, 4.0, 0.5, 3.5, 5.0, 1.0, 9.5, 3.5, 9.5, 4.0"
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 20.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x1000000,
            "texture_bg": -0x7f7f80,
            "texture_style": 7,
            "texture_width": 4,
            "texture_height": 4
          },
          "label": "House A",
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
          "temperature": 20.0,
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
            "y": 4.0,
            "width": 0.5,
            "height": 4.0
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 20.0,
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
            "x": 1.15,
            "y": 5.0,
            "width": 0.2,
            "height": 2.0
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 20.0,
          "constant_temperature": false,
          "color": 0xffffff,
          "draggable": false
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T1",
        "x": 8.233334,
        "y": 5.983333
      },
      {
        "label": "T2",
        "x": 1.65,
        "y": 6.0
      },
      {
        "x": 0.2,
        "y": 6.0
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "color_palette_type": 0,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": -50.0,
    "maximum_temperature": 50.0,
    "graph_xlabel": "Time",
    "clock": false
  }
};