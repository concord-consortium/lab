var models_library = models_library || {};
models_library.double_cavities = {
  "model": {
    "timestep": 0.2,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "z_heat_diffusivity": 0.0,
    "background_conductivity": 0.5,
    "background_density": 1.0,
    "background_specific_heat": 1000.0,
    "background_viscosity": 1.0E-4,
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
            "y": 4.55,
            "width": 5.0,
            "height": 0.5
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": true,
          "uid": "COVER1",
          "color": 0xc080,
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 9.0,
            "width": 4.8,
            "height": 1.0
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 15.0,
          "constant_temperature": true,
          "uid": "BLOCK1",
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 4.8,
            "y": 9.0,
            "width": 0.4,
            "height": 1.0
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
          "uid": "HEATER",
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 5.2,
            "y": 9.0,
            "width": 4.8,
            "height": 1.0
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 15.0,
          "constant_temperature": true,
          "uid": "BLOCK2",
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 5.0,
            "y": 4.55,
            "width": 5.0,
            "height": 0.5
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": true,
          "uid": "COVER2",
          "label": "%temperature"
        }
      ]
    }
  },
  "sensor": "\n",
  "view": {
    "grid_size": 10,
    "color_palette": true,
    "color_palette_type": 0,
    "color_palette_x": 0.0,
    "color_palette_y": 0.0,
    "color_palette_w": 0.0,
    "color_palette_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 25.0,
    "graph_xlabel": "Time"
  }
};