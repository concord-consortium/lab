//
// lab/models/energy2d/engines/default-config.js
//

// TODO: add all available settings to this object
exports.DEFAULT_MODEL_OPTIONS = {
    timestep: 0.1,
    measurement_interval: 100,
    viewupdate_interval: 20,
    sunny: true,
    sun_angle: 1.5707964,
    solar_power_density: 20000,
    solar_ray_count: 24,
    solar_ray_speed: 0.001,
    photon_emission_interval: 5,
    convective: true,
    background_conductivity: 0.25,
    thermal_buoyancy: 0.00025,
    buoyancy_approximation: 1,
    background_density: 1,

    boundary: {
        flux_at_border: {
            upper: 0,
            lower: 0,
            left: 0,
            right: 0
        }
    },

    sensor: undefined,

    structure: {
        part: [
            {
                rectangle: {
                    x: 4.5,
                    y: 4.5,
                    width: 1,
                    height: 1
                },
                thermal_conductivity: 1,
                specific_heat: 1300,
                density: 25,
                transmission: 0,
                reflection: 0,
                absorption: 1,
                emissivity: 0,
                temperature: 50,
                constant_temperature: true,
                filled: false
            }
        ]
    }
};