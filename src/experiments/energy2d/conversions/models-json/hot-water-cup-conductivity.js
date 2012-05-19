var models_library = models_library || {};
models_library.hot_water_cup_conductivity = {
  "model": {
    "timestep": 0.5,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "background_conductivity": 0.1,
    "background_density": 1.0,
    "background_viscosity": 0.0010,
    "thermal_buoyancy": 5.0E-4,
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
          "rectangle": {
            "x": 0.0,
            "y": 6.0,
            "width": 5.0,
            "height": 1.0
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 5.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "filled": false
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 8.0,
            "width": 4.5,
            "height": 2.0
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1000.0,
          "density": 10.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 50.0,
          "constant_temperature": false,
          "filled": false
        },
        {
          "rectangle": {
            "x": 5.5,
            "y": 8.0,
            "width": 4.5,
            "height": 2.0
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1000.0,
          "density": 10.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 50.0,
          "constant_temperature": false,
          "filled": false
        },
        {
          "rectangle": {
            "x": 5.0,
            "y": 6.0,
            "width": 5.0,
            "height": 1.0
          },
          "thermal_conductivity": 100.0,
          "specific_heat": 1000.0,
          "density": 5.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "filled": false
        },
        {
          "rectangle": {
            "x": 4.5,
            "y": 7.0,
            "width": 1.0,
            "height": 3.0
          },
          "thermal_conductivity": 1.0E-9,
          "specific_heat": 1000.0,
          "density": 1.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "stencil": 9,
        "x": 2.0,
        "y": 6.2
      },
      {
        "stencil": 9,
        "x": 8.0,
        "y": 6.2
      },
      {
        "x": 8.0,
        "y": 9.0
      },
      {
        "x": 2.0,
        "y": 9.0
      }
    ]
  },
  "view": {
    "grid": true,
    "grid_size": 10,
    "color_palette": true,
    "color_palette_type": 1,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 75.0,
    "graph_xlabel": "Time"
  }
};