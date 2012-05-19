var models_library = models_library || {};
models_library.compare_capacity = {
  "model": {
    "timestep": 10.0,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "convective": false,
    "background_conductivity": 10.0,
    "background_density": 1.0,
    "background_specific_heat": 1000.0,
    "thermal_buoyancy": 2.5E-4,
    "buoyancy_approximation": 1,
    "boundary": {
      "flux_at_border": {
        "upper": 20.0,
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
            "y": 3.5,
            "width": 5.0,
            "height": 3.0
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
            "texture_bg": -0x1,
            "texture_style": 10,
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false,
          "label": "%specific_heat"
        },
        {
          "rectangle": {
            "x": 5.0,
            "y": 3.5,
            "width": 5.0,
            "height": 3.0
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 10000.0,
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
            "texture_style": 9,
            "texture_width": 12,
            "texture_height": 12
          },
          "filled": false,
          "label": "%specific_heat"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "x": 4.0,
        "y": 5.0
      },
      {
        "x": 6.0,
        "y": 5.0
      },
      {
        "x": 3.0,
        "y": 1.0
      },
      {
        "x": 7.0,
        "y": 1.0
      },
      {
        "x": 3.0,
        "y": 9.0
      },
      {
        "x": 7.0,
        "y": 9.0
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "isotherm": true,
    "color_palette_type": 0,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 50.0,
    "heat_flux_line": true,
    "clock": false
  }
};