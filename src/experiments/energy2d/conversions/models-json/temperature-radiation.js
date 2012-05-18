var models_library = models_library || {};
models_library.temperature_radiation = {
  "model": {
    "timestep": 0.1,
    "measurement_interval": 100,
    "viewupdate_interval": 20,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "convective": false,
    "background_conductivity": 1.0E-9,
    "background_density": 10.0,
    "background_specific_heat": 1000.0,
    "background_viscosity": 1.568E-4,
    "thermal_buoyancy": 2.5E-4,
    "buoyancy_approximation": 1,
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
            "x": 4.9,
            "y": 0.0,
            "width": 0.2,
            "height": 10.0
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 1.0,
          "absorption": 0.0,
          "emissivity": 0.0,
          "temperature": 0.0,
          "constant_temperature": false,
          "color": 0xccccff,
          "label": "Mirror"
        },
        {
          "rectangle": {
            "x": 4.25,
            "y": 4.5,
            "width": 0.5,
            "height": 1.0
          },
          "thermal_conductivity": 5.0,
          "specific_heat": 1000.0,
          "density": 10.0,
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
            "x": 5.25,
            "y": 4.5,
            "width": 0.5,
            "height": 1.0
          },
          "thermal_conductivity": 5.0,
          "specific_heat": 1000.0,
          "density": 10.0,
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
            "x": 0.55,
            "y": 2.5,
            "width": 0.5,
            "height": 5.0
          },
          "thermal_conductivity": 0.1,
          "specific_heat": 1000.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 1.0,
          "temperature": 100.0,
          "constant_temperature": true,
          "uid": "left_radiator",
          "filled": false,
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 8.95,
            "y": 2.5,
            "width": 0.5,
            "height": 5.0
          },
          "thermal_conductivity": 0.1,
          "specific_heat": 1000.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 1.0,
          "temperature": 500.0,
          "constant_temperature": true,
          "uid": "right_radiator",
          "filled": false,
          "label": "%temperature"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T2",
        "x": 5.5,
        "y": 5.0
      },
      {
        "label": "T1",
        "x": 4.5,
        "y": 5.0
      }
    ]
  },
  "view": {
    "grid_size": 10,
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.0,
    "rainbow_h": 0.0,
    "minimum_temperature": 0.0,
    "maximum_temperature": 100.0,
    "clock": false
  }
};