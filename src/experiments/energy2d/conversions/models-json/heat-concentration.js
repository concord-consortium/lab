var models_library = models_library || {};
models_library.heat_concentration = {
  "model": {
    "model_width": 0.5,
    "model_height": 0.5,
    "timestep": 0.1,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "background_conductivity": 0.0010,
    "background_viscosity": 1.0E-4,
    "thermal_buoyancy": 0.0,
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
            "x": 0.01,
            "y": 0.019999996,
            "width": 0.01,
            "height": 0.46
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
          "wind_speed": 0.0010,
          "uid": "SLAB4"
        },
        {
          "rectangle": {
            "x": 0.48000002,
            "y": 0.019999996,
            "width": 0.01,
            "height": 0.46
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
          "wind_speed": 0.0010,
          "wind_angle": 3.1415927,
          "uid": "SLAB2"
        },
        {
          "rectangle": {
            "x": 0.010000005,
            "y": 0.015,
            "width": 0.48,
            "height": 0.01
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
          "wind_speed": 0.0010,
          "wind_angle": 1.5707964,
          "uid": "SLAB1"
        },
        {
          "rectangle": {
            "x": 0.010000005,
            "y": 0.475,
            "width": 0.48,
            "height": 0.01
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
          "wind_speed": 0.0010,
          "wind_angle": 4.712389,
          "uid": "SLAB3"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": {
      "x": 0.25083333,
      "y": 0.25166667
    }
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
    "streamline": true,
    "graph_xlabel": "Time",
    "clock": false
  }
};