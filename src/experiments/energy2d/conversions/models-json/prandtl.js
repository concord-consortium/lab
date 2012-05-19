var models_library = models_library || {};
models_library.prandtl = {
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
    "background_viscosity": 0.001,
    "thermal_buoyancy": 5.0E-4,
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
          "thermal_conductivity": 10.0,
          "specific_heat": 1300.0,
          "density": 1.0,
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
          "filled": false
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 7.0,
            "width": 10.0,
            "height": 1.0
          },
          "thermal_conductivity": 1.0E-6,
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
            "x": 0.0,
            "y": 6.8,
            "width": 10.0,
            "height": 0.2
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 30.0,
          "constant_temperature": true
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "x": 5.0,
        "y": 6.5
      },
      {
        "x": 5.0,
        "y": 1.75
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
    "minimum_temperature": 0.0,
    "maximum_temperature": 40.0,
    "graph_xlabel": "Time",
    "text": {
      "string": "Prandtl = %Prandtl",
      "name": "Arial",
      "size": 14,
      "style": 0,
      "color": 0xffffff,
      "x": 4.0,
      "y": 1.0
    }
  }
};