var models_library = models_library || {};
models_library.laminar_turbulent = {
  "model": {
    "timestep": 0.5,
    "measurement_interval": 100,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "background_conductivity": 0.5,
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
            "x": 0.099999994,
            "y": 2.75,
            "width": 0.5,
            "height": 1.8
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
          "wind_speed": 0.02,
          "filled": false,
          "label": "V=2"
        },
        {
          "rectangle": {
            "x": 0.05000019,
            "y": 2.4000003,
            "width": 9.9,
            "height": 0.2
          },
          "thermal_conductivity": 0.0010,
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
            "x": 0.05000019,
            "y": 4.7000003,
            "width": 9.9,
            "height": 0.2
          },
          "thermal_conductivity": 0.0010,
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
            "x": 0.099999994,
            "y": 0.45000005,
            "width": 0.5,
            "height": 1.8
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
          "wind_speed": 0.01,
          "filled": false,
          "label": "V=1"
        },
        {
          "rectangle": {
            "x": 0.05000019,
            "y": -0.049999997,
            "width": 9.9,
            "height": 0.3
          },
          "thermal_conductivity": 0.0010,
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
            "x": 0.07495928,
            "y": 7.1000004,
            "width": 9.9,
            "height": 0.2
          },
          "thermal_conductivity": 0.0010,
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
            "x": 0.099999994,
            "y": 5.100001,
            "width": 0.5,
            "height": 1.8
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
          "filled": false,
          "label": "V=5"
        },
        {
          "rectangle": {
            "x": 1.15,
            "y": 3.3,
            "width": 0.7,
            "height": 0.6
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 30.0,
          "constant_temperature": true,
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 1.15,
            "y": 0.99999994,
            "width": 0.7,
            "height": 0.6
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 30.0,
          "constant_temperature": true,
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 1.15,
            "y": 5.7,
            "width": 0.7,
            "height": 0.6
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 30.0,
          "constant_temperature": true,
          "label": "%temperature"
        },
        {
          "rectangle": {
            "x": 0.016638935,
            "y": 9.483334,
            "width": 9.9001665,
            "height": 0.48333332
          },
          "thermal_conductivity": 0.0010,
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
            "x": 0.099999994,
            "y": 7.5000005,
            "width": 0.5,
            "height": 1.8
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
          "wind_speed": 0.1,
          "filled": false,
          "label": "V=10"
        },
        {
          "rectangle": {
            "x": 1.15,
            "y": 8.2,
            "width": 0.7,
            "height": 0.6
          },
          "thermal_conductivity": 1.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 30.0,
          "constant_temperature": true,
          "label": "%temperature"
        }
      ]
    }
  },
  "sensor": {
    "thermometer": [
      {
        "label": "T2",
        "x": 8.8,
        "y": 3.7
      },
      {
        "label": "T1",
        "x": 8.8,
        "y": 1.3
      },
      {
        "label": "T3",
        "x": 8.8,
        "y": 6.0
      },
      {
        "label": "T4",
        "x": 8.8,
        "y": 8.4
      }
    ]
  },
  "view": {
    "grid": true,
    "grid_size": 10,
    "ruler": true,
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.49333334,
    "rainbow_h": 0.033333335,
    "minimum_temperature": 0.0,
    "maximum_temperature": 50.0,
    "velocity": true
  }
};