var models_library = models_library || {};
models_library.vortex_street = {
  "model": {
    "timestep": 0.5,
    "measurement_interval": 50,
    "viewupdate_interval": 10,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000.0,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,
    "background_conductivity": 0.1,
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
          "draggable": false
        },
        {
          "ellipse": {
            "x": 1.2999999523162842,
            "y": 7.5,
            "a": 0.5,
            "b": 0.5
          },
          "thermal_conductivity": 10.0,
          "specific_heat": 1300.0,
          "density": 25.0,
          "transmission": 0.0,
          "reflection": 0.0,
          "absorption": 1.0,
          "emissivity": 0.0,
          "temperature": 30.0,
          "constant_temperature": true,
          "filled": false
        },
        {
          "ellipse": {
            "x": 1.2999999523162842,
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
          "temperature": 30.0,
          "constant_temperature": true,
          "filled": false
        }
      ]
    }
  },
  "sensor": "\n",
  "view": {
    "grid_size": 10,
    "rainbow_x": 0.0,
    "rainbow_y": 0.0,
    "rainbow_w": 0.49333334,
    "rainbow_h": 0.033333335,
    "minimum_temperature": 0.0,
    "maximum_temperature": 40.0,
    "velocity": true,
    "streamline": true,
    "text": [
      {
        "string": "Vortex street forming",
        "name": "Arial",
        "size": 14,
        "style": 0,
        "color": 0xffffff,
        "x": 1.0,
        "y": 9.0
      },
      {
        "string": "Vortex street not forming",
        "name": "Arial",
        "size": 14,
        "style": 0,
        "color": 0xffffff,
        "x": 1.0,
        "y": 1.0
      }
    ]
  }
};