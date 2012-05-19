var models_library = models_library || {};
models_library.forced_convection1 = {
  "model": {
    "timestep": 0.5,
    "measurement_interval": 50,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "background_conductivity": 1.0,
    "background_viscosity": 1.0E-4,
    "thermal_buoyancy": 0.0,
    "buoyancy_approximation": 1,
    "boundary": {
      "flux_at_border": {
        "upper": 0.0,
        "lower": 0.0,
        "left": 0.0,
        "right": -2.0
      }
    },
    "structure": {
      "part": [
        {
          "rectangle": {
            "x": 0.0,
            "y": 0.0,
            "width": 0.2,
            "height": 5.0
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
          "wind_speed": 0.025,
          "uid": "upper_fan",
          "texture": {
            "texture_fg": -0x7f7f80,
            "texture_bg": -0x1000000,
            "texture_style": 15,
            "texture_width": 4,
            "texture_height": 4
          },
          "label": "Fan",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 5.0,
            "width": 0.2,
            "height": 5.0
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
          "wind_speed": 0.025,
          "uid": "lower_fan",
          "texture": {
            "texture_fg": -0x7f7f80,
            "texture_bg": -0x1000000,
            "texture_style": 15,
            "texture_width": 4,
            "texture_height": 4
          },
          "label": "Fan",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.1999999,
            "y": 4.9,
            "width": 9.6,
            "height": 0.2
          },
          "thermal_conductivity": 0.0,
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
            "texture_bg": -0x339a00,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "draggable": false
        },
        {
          "ellipse": {
            "x": 2.5,
            "y": 7.5,
            "a": 1.0,
            "b": 1.0
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 50.0,
          "constant_temperature": true,
          "uid": "lower_heater",
          "filled": false,
          "label": "%temperature"
        },
        {
          "ellipse": {
            "x": 2.5,
            "y": 2.5,
            "a": 1.0,
            "b": 1.0
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 25.0,
          "constant_temperature": true,
          "uid": "upper_heater",
          "filled": false,
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 8.85,
            "y": 0.099999815,
            "width": 0.9,
            "height": 4.8
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 10.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x7f7f80,
            "texture_bg": -0x339a00,
            "texture_style": 12,
            "texture_width": 10,
            "texture_height": 10
          },
          "filled": false
        },
        {
          "rectangle": {
            "x": 8.85,
            "y": 5.1,
            "width": 0.9,
            "height": 4.8
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 10.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "texture": {
            "texture_fg": -0x7f7f80,
            "texture_bg": -0x339a00,
            "texture_style": 12,
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
        "x": 9.0,
        "y": 2.95
      },
      {
        "x": 9.0,
        "y": 7.45
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
    "velocity": true,
    "graph_xlabel": "Time"
  }
};