/*globals Float64Array */
/*jslint indent: 2 */
// JSLint report: OK (complains about 'new' for side effect and Array(size) constructor)
//
// lab/models/energy2d/engines/core-model.js
//

var
  arrays         = require('./arrays/arrays.js').arrays,
  heatsolver     = require('./physics-solvers/heat-solver.js'),
  fluidsolver    = require('./physics-solvers/fluid-solver.js'),
  part           = require('./part.js'),
  default_config = require('./default-config.js'),

  array_type = (function () {
    'use strict';
    try {
      new Float64Array();
    } catch (e) {
      return 'regular';
    }
    return 'Float64Array';
  }()),

  // Local constants 
  NX = 100,
  NY = 100,
  ARRAY_SIZE = NX * NY;

exports.makeCoreModel = function (model_options) {
  'use strict';
  var
    // Validate provided options.
    opt = (function () {
      var boundary;

      model_options = default_config.fillWithDefaultValues(model_options, default_config.DEFAULT_VALUES.model);

      // Validation.
      //
      // Check boundary settings, as they have complex structure.
      boundary = model_options.boundary.temperature_at_border || model_options.boundary.flux_at_border;
      if (!boundary) {
        throw new Error("Core model: missing boundary settings.");
      } else if (boundary.upper === undefined ||
                 boundary.right === undefined ||
                 boundary.lower === undefined ||
                 boundary.left  === undefined) {
        throw new Error("Core model: incomplete boundary settings.");
      }

      return model_options;
    }()),

    // Simulation grid dimensions.
    nx = NX,
    ny = NY,

    // Simulation steps counter.
    indexOfStep = 0,

    // Physics solvers 
    // (initialized later, when core model object is built).
    heatSolver,
    fluidSolver,

    //
    // Simulation arrays:
    //
    // - temperature array
    t = arrays.create(ARRAY_SIZE, opt.background_temperature, array_type),
    // - internal temperature boundary array
    tb = arrays.create(ARRAY_SIZE, NaN, array_type),
    // - velocity x-component array (m/s)
    u = arrays.create(ARRAY_SIZE, 0, array_type),
    // - velocity y-component array (m/s)
    v = arrays.create(ARRAY_SIZE, 0, array_type),
    // - internal heat generation array
    q = arrays.create(ARRAY_SIZE, 0, array_type),
    // - wind speed
    uWind = arrays.create(ARRAY_SIZE, 0, array_type),
    vWind = arrays.create(ARRAY_SIZE, 0, array_type),
    // - conductivity array
    conductivity = arrays.create(ARRAY_SIZE, opt.background_conductivity, array_type),
    // - specific heat capacity array
    capacity = arrays.create(ARRAY_SIZE, opt.background_specific_heat, array_type),
    // - density array
    density = arrays.create(ARRAY_SIZE, opt.background_density, array_type),
    // - fluid cell array
    fluidity = arrays.create(ARRAY_SIZE, true, array_type),

    // Generate parts array.
    parts = (function () {
      var
        result = [],
        parts_options,
        i, len;

      if (opt.structure && opt.structure.part) {
        parts_options = opt.structure.part;
        if (parts_options.constructor !== Array) {
          parts_options = [parts_options];
        }

        result = new Array(parts_options.length);
        for (i = 0, len = parts_options.length; i < len; i += 1) {
          result[i] = new part.Part(parts_options[i]);
        }
      }
      return result;
    }()),

    //  
    // Private methods  
    //      
    setupMaterialProperties = function () {
      var
        lx = opt.model_width,
        ly = opt.model_height,
        part, indices, idx,
        i, ii, len;

      if (!parts || parts.length === 0) {
        return;
      }

      // workaround, to treat overlapping parts as original Energy2D
      for (i = parts.length - 1; i >= 0; i -= 1) {
        part = parts[i];
        indices = part.getGridCells(nx, ny, lx, ly);
        for (ii = 0, len = indices.length; ii < len; ii += 1) {
          idx = indices[ii];

          fluidity[idx] = false;
          t[idx] = part.temperature;
          q[idx] = part.power;
          conductivity[idx] = part.thermal_conductivity;
          capacity[idx] = part.specific_heat;
          density[idx] = part.density;

          if (part.wind_speed !== 0) {
            uWind[idx] = part.wind_speed * Math.cos(part.wind_angle);
            vWind[idx] = part.wind_speed * Math.sin(part.wind_angle);
          }

          if (part.constant_temperature) {
            tb[idx] = part.temperature;
          }
        }
      }
    },

    //
    // Public API
    //
    core_model = {
      // Performs next step of a simulation.
      nextStep: function () {
        if (opt.convective) {
          fluidSolver.solve(u, v);
        }
        heatSolver.solve(opt.convective, t, q);
        indexOfStep += 1;
      },
      getIndexOfStep: function () {
        return indexOfStep;
      },
      // Returns loaded options after validation.
      getModelOptions: function () {
        return opt;
      },
      // Simple getters.
      getArrayType: function () {
        // return module variable
        return array_type;
      },
      getGridWidth: function () {
        return nx;
      },
      getGridHeight: function () {
        return ny;
      },
      // Arrays.
      getTemperatureArray: function () {
        return t;
      },
      getUVelocityArray: function () {
        return u;
      },
      getVVelocityArray: function () {
        return v;
      },
      getUWindArray: function () {
        return uWind;
      },
      getVWindArray: function () {
        return vWind;
      },
      getBoundaryTemperatureArray: function () {
        return tb;
      },
      getPowerArray: function () {
        return q;
      },
      getConductivityArray: function () {
        return conductivity;
      },
      getCapacityArray: function () {
        return capacity;
      },
      getDensityArray: function () {
        return density;
      },
      getFluidityArray: function () {
        return fluidity;
      },
      getPartsArray: function () {
        return parts;
      }
    };

  // 
  // One-off initialization.
  //
  heatSolver = heatsolver.makeHeatSolver(core_model);
  fluidSolver = fluidsolver.makeFluidSolver(core_model);

  setupMaterialProperties();

  // Finally, return public API object.
  return core_model;
};
