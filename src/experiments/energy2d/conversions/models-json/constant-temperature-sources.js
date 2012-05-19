var models_library = models_library || {};
models_library.constant_temperature_sources = {
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
    "background_temperature": 20.0,
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
          "ellipse": {
            "x": 3.0,
            "y": 7.0,
            "a": 1.0,
            "b": 1.0
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": true,
          "uid": "SOURCE2",
          "label": "%temperature"
        },
        {
          "ellipse": {
            "x": 6.0,
            "y": 4.0,
            "a": 1.0,
            "b": 1.0
          },
          "thermal_conductivity": 0.08,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 40.0,
          "constant_temperature": true,
          "uid": "SOURCE1",
          "label": "%temperature"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "x": 5.375552,
        "y": 4.772344
      },
      {
        "x": 3.6818852,
        "y": 6.391231
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
    "text": {
      "string": "Constant temperature sources",
      "name": "Arial",
      "size": 12,
      "style": 0,
      "color": 0xffffff,
      "x": 0.5,
      "y": 9.0
    }
  }
};