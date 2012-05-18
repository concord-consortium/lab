var models_library = models_library || {};
models_library.wind_effect = {
  "model": {
    "timestep": 0.1,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "background_conductivity": 1.0,
    "background_density": 1.0,
    "background_specific_heat": 1000.0,
    "background_viscosity": 2.0E-4,
    "thermal_buoyancy": 1.0E-4,
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
            "x": 0.5166665,
            "y": 0.68333364,
            "width": 0.183333,
            "height": 7.683333
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
          "wind_speed": 0.05,
          "visible": false,
          "draggable": false
        },
        {
          "rectangle": {
            "x": 0.0,
            "y": 8.3,
            "width": 10.0,
            "height": 1.6
          },
          "thermal_conductivity": 0.0010,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "color": 0x333333,
          "label": "Ground",
          "draggable": false
        },
        {
          "rectangle": {
            "x": 2.0,
            "y": 6.4,
            "width": 0.25,
            "height": 2.0
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "label": "Wall"
        },
        {
          "rectangle": {
            "x": 7.5,
            "y": 6.4,
            "width": 0.25,
            "height": 2.0
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "label": "Wall"
        },
        {
          "rectangle": {
            "x": 1.7,
            "y": 2.7,
            "width": 6.3,
            "height": 0.3
          },
          "thermal_conductivity": 5.0,
          "specific_heat": 100.0,
          "density": 1.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "label": "Roof"
        },
        {
          "rectangle": {
            "x": 2.0,
            "y": 3.000001,
            "width": 0.25,
            "height": 1.0
          },
          "thermal_conductivity": 1.0,
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
            "x": 7.5,
            "y": 3.0,
            "width": 0.25,
            "height": 1.0
          },
          "thermal_conductivity": 1.0,
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
            "x": 3.1333332,
            "y": 7.883333,
            "width": 3.466667,
            "height": 0.366667
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1000.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 50.0,
          "constant_temperature": true,
          "label": "Heating board"
        },
        {
          "rectangle": {
            "x": 2.1000001,
            "y": 3.65,
            "width": 0.1,
            "height": 2.5
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
          "color": 0xccccff,
          "label": "Window"
        },
        {
          "rectangle": {
            "x": 7.5499997,
            "y": 3.65,
            "width": 0.1,
            "height": 2.5
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
          "color": 0xccccff,
          "label": "Window"
        }
      ]
    }
  },
  "sensor": "\n",
  "view": {
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.0,
    "rainbow_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 50.0,
    "velocity": true,
    "text": {
      "string": "East Wind",
      "name": "Arial",
      "size": 14,
      "style": 0,
      "color": 0xffffff,
      "x": 1.0,
      "y": 9.0
    }
  }
};