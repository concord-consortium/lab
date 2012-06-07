/*jslint indent: false */
// TODO: set JSHint/JSLint options
//
// lab/models/energy2d/engines/core-model.js
//

var heatsolver     = require('./physics-solvers/heat-solver.js'),
    fluidsolver    = require('./physics-solvers/fluid-solver.js'),
    part           = require('.part.js'),
    constants      = require('.constants.js'),
    default_config = require('.default-config.js'),
    
    array_type = "regular",
    
    // Local constants 
    NX = 100,
    NY = 100,
    ARRAY_SIZE = NX * NY,
    BUOYANCY_AVERAGE_ALL = 0,
    BUOYANCY_AVERAGE_COLUMN = 1;
    
    //
    // Utilities
    //
    
    // Return true if x is between a and b
    between = function (a, b, x) {
        return x < Math.max(a, b) && x > Math.min(a, b);
    },
    
    // float[] array
    getMax = function (array) {
        return Math.max.apply( Math, array );
    },
    
    // float[] array
    getMin = function (array) {
        return Math.min.apply( Math, array );
    },
    
    // FloatxxArray[] array
    getMaxTypedArray = function (array) {
        var max = Number.MIN_VALUE;
        var length = array.length;
        var test;
        for (var i = 0; i < length; i++) {
            test = array[i];
            max = test > max ? test : max;
        }
        return max;
    },
    
    // FloatxxArray[] array
    getMinTypedArray = function (array) {
        var min = Number.MAX_VALUE;
        var length = array.length;
        var test;
        for (var i = 0; i < length; i++) {
            test = array[i];
            min = test < min ? test : min;
        }
        return min;
    },
    
    // float[] array
    getMaxAnyArray = function (array) {
        try {
            return Math.max.apply( Math, array );
        }
        catch (e) {
            if (e instanceof TypeError) {
                var max = Number.MIN_VALUE;
                var length = array.length;
                var test;
                for (var i = 0; i < length; i++) {
                    test = array[i];
                    max = test > max ? test : max;
                }
                return max;
            }
        }
    },
    
    // float[] array
    getMinAnyArray = function(array) {
        try {
            return Math.min.apply( Math, array );
        }
        catch (e) {
            if (e instanceof TypeError) {
                var min = Number.MAX_VALUE;
                var length = array.length;
                var test;
                for (var i = 0; i < length; i++) {
                    test = array[i];
                    min = test < min ? test : min;
                }
                return min;
            }
        }
    },
    
    getAverage = function (array) {
        var acc = 0;
        var length = array.length;
        for (var i = 0; i < length; i++) {
            acc += array[i];
        };
        return acc / length;
    },
    
    // TODO: remove it, use array module!
    createArray = function (size, fill) {
      size = size || ARRAY_SIZE;
      fill = fill || 0;
      var a = new Array(size);
      
      if (a[size-1] == fill) {
          return a;
      } else {
          for (var i = 0; i < size; i++) {
              a[i] = fill;
          }
      } 
      return a;
    },
    
    copyArray = function (destination, source) {
        var source_length = source.length;
        for (var i = 0; i < source_length; i++) {
            destination[i] = source[i];
        }
    },
    
    // TODO: move this function (e.g. to MathUtils) during refactoring 
    // Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    // It is optional to repeat the first vertex at the end of list of polygon vertices.
    pointInsidePolygon = function(nvert, vertx, verty, testx, testy) {
        var i, j, c = 0;
        for (i = 0, j = nvert - 1; i < nvert; j = i++) {
            if (((verty[i]>testy) != (verty[j]>testy)) &&
                (testx < (vertx[j]-vertx[i]) * (testy-verty[i]) / (verty[j]-verty[i]) + vertx[i]))
                c = !c;
        }
        return c;
    };
    

exports.makeCoreModel = function(model_options, array_type) {
  var opt = validateConfiguration(model_options),
  
      timeStep = opt.timestep != undefined ? opt.timestep : 0.1,
      measurementInterval = opt.measurement_interval != undefined ? opt.measurement_interval : 100,
      viewUpdateInterval = opt.view_update_interval != undefined ? opt.view_update_interval : 20,
      sunny = opt.sunny != undefined ? opt.sunny : true,
      sun_angle = opt.sun_angle != undefined ? opt.sun_angle : 1.5707964,                
      solarPowerDensity = opt.solar_power_density != undefined ? opt.solar_power_density : 20000,
      solarRayCount = opt.solar_ray_count != undefined ? opt.solar_ray_count : 24,
      solarRaySpeed = opt.solar_ray_speed != undefined ? opt.solar_ray_speed : 0.001,
      photonEmissionInterval = opt.photon_emission_interval != undefined ? opt.photon_emission_interval : 5,
      convective = opt.convective != undefined ? opt.convective : true,
      thermalBuoyancy = opt.thermal_buoyancy != undefined ? opt.thermal_buoyancy : 0.00025,
      buoyancyApproximation = opt.buoyancy_approximation != undefined ? opt.buoyancy_approximation : 1,
    
      indexOfStep = 0,
  
      backgroundConductivity = opt.background_conductivity != undefined ? opt.background_conductivity : 10 * constants.AIR_THERMAL_CONDUCTIVITY,
      backgroundViscosity = opt.background_viscosity != undefined ? opt.background_viscosity : 10 * constants.AIR_VISCOSITY,
      backgroundSpecificHeat = opt.background_specific_heat != undefined ? opt.background_specific_heat : constants.AIR_SPECIFIC_HEAT,
      backgroundDensity = opt.background_density != undefined ? opt.background_density : constants.AIR_DENSITY,
      backgroundTemperature = opt.background_temperature != undefined ? opt.background_temperature : 0,
  
      boundary_settings = options.model.boundary || 
          { temperature_at_border: { upper: 0, lower: 0, left: 0, right: 0 } },
  
      nx = NX,
      ny = NY,
      nx1 = nx - 1,
      ny1 = ny - 1,
      
      // length in x direction (unit: meter)
      lx = opt.model_width != undefined ? opt.model_width : 10,
  
      // length in y direction (unit: meter)
      ly = opt.model_height != undefined ? opt.model_height : 10,
  
      deltaX = lx / nx,
      deltaY = ly / ny,
  
      // booleans
      running,
      notifyReset,
  
      // optimization flags (booleans)
      hasPartPower = false,
      radiative = false, // not fully implemented yet
  
      // temperature array
      t = createArray(ARRAY_SIZE, 0),
  
      // internal temperature boundary array
      tb = createArray(ARRAY_SIZE, 0),
  
      // velocity x-component array (m/s)
      u = createArray(ARRAY_SIZE, 0),
      
      // velocity y-component array (m/s)
      v = createArray(ARRAY_SIZE, 0),
  
      // internal heat generation array
      q = createArray(ARRAY_SIZE, 0),
      
      // wind speed
      uWind = createArray(ARRAY_SIZE, 0),
      vWind = createArray(ARRAY_SIZE, 0),
      
      // conductivity array
      conductivity = createArray(ARRAY_SIZE, 0),
      
      // specific heat capacity array
      capacity = createArray(ARRAY_SIZE, 0),
           
      // density array
      density = createArray(ARRAY_SIZE, 0),
          
      // fluid cell array
      fluidity = createArray(ARRAY_SIZE, 0),
      
      // parts array
      parts = (function () {
        var parts_options,
            result = [],
            i, len;
            
        if (opt.structure && opt.structure.part) {
          parts_options = opt.structure.part;
          if (parts_options.constructor !== Array)
            parts_options = [parts_options];
          result = new Array(parts_options.length);
          for (i = 0, len = parts_options.length; i < len; i += 1) {
            result[i] = new part.Part(parts_options[i]);
          }
        }
        return result;
      }()),

      heatSolver = (function () {
        var heat_solver;
        
        // TODO: use builder / fluent builder?
        heat_solver = heatsolver.makeHeatSolver(nx, ny);
        heat_solver.setTimeStep(timeStep);
        heat_solver.setCapacity(capacity);
        heat_solver.setConductivity(conductivity);
        heat_solver.setDensity(density);
        heat_solver.setPower(q);
        heat_solver.setU(u);
        heat_solver.setV(v);
        heat_solver.setTb(tb);
        heat_solver.setFluidity(fluidity);
        heat_solver.setBoundarySettings(boundary_settings);
        
        return heat_solver;    
      }()),
      
      fluidSolver = (function () {
        var fluid_solver;
        
        // TODO: use builder / fluent builder?
        fluid_solver = fluidsolver.makeFluidSolver(nx, ny);
        fluid_solver.setTimeStep(timeStep);
        fluid_solver.setFluidity(fluidity);
        fluid_solver.setTemperature(t);
        fluid_solver.setUWind(uWind);
        fluid_solver.setVWind(vWind);
        fluid_solver.setThermalBuoyancy(thermalBuoyancy);
        fluid_solver.setBuoyancyApproximation(buoyancyApproximation);
        fluid_solver.setViscosity(backgroundViscosity);
        
        return fluid_solver;  
      }()),
      
      //  
      // Private methods  
      //
      validateConfiguration = function(model_options) {
        // TODO: implement me!
        return model_options;
      },
      
      setupMaterialProperties = function () {
        var part, indexes, idx,
            // loop variables
            i, ii, len;
        
        if (!parts || parts.length === 0)
          return;
                
        // workaround, to treat overlapping parts as original Energy2D
        for (i = parts.length - 1; i >= 0; i -= 1) { 
          part = parts[i];
          indexes = getFieldsOccupiedByPart(part);
          for(ii = 0, len = indexes.length; ii < len; ii += 1) {
            idx = indexes[ii];

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
      
      // TODO: move this function to Part class / module
      getFieldsOccupiedByPart = function (part) {
        var indexes,
            dx = nx1 / lx,
            dy = ny1 / ly;
        
        if (part.rectangle) {
            var rect = part.rectangle;
            var i0 = Math.min(Math.max(Math.ceil(rect.x * dx), 0), nx1);
            var j0 = Math.min(Math.max(Math.ceil(rect.y * dy), 0), ny1);
            var i_max = Math.min(Math.max(Math.floor((rect.x + rect.width) * dx), 0), nx1);
            var j_max = Math.min(Math.max(Math.floor((rect.y + rect.height) * dy), 0), ny1);
            indexes = new Array((i_max - i0 + 1) * (j_max - j0 + 1));
            var idx = 0;
            for (var i = i0; i <= i_max; i++) {
                for (var j = j0; j <= j_max; j++) {
                    indexes[idx++] = i * ny + j;
                }
            }
            return indexes;
        }
        
        if (part.ellipse) {
            var ellipse = part.ellipse;
            var px = ellipse.x * dx;
            var py = ellipse.y * dy;
            var ra = ellipse.a * 0.5 * dx;
            var rb = ellipse.b * 0.5 * dy;
            
            var i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
            var i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);
            var j0, j_max, eq;
            indexes = [];
            var idx = 0;
            for (var i = i0; i <= i_max; i++) {
                // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
                // to get range of y (=> j)
                eq = Math.sqrt(1 - (i - px)*(i - px)/(ra * ra));
                j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
                j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);
                for (var j = j0; j <= j_max; j++) {
                    indexes[idx++] = i * ny + j;
                }
            }
            return indexes;
        }
        
        if (part.ring) {
            var ring = part.ring;
            var px = ring.x * dx;
            var py = ring.y * dy;
            var ra = ring.outer * 0.5 * dx;
            var rb = ring.outer * 0.5 * dy;
            var ra_inner = ring.inner * 0.5 * dx;
            var rb_inner = ring.inner * 0.5 * dy;
            
            var i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
            var i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);
            var j0, j1, j2, j_max, eq;
            indexes = [];
            var idx = 0;
            for (var i = i0; i <= i_max; i++) {
                // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
                // to get range of y (=> j)
                eq = Math.sqrt(1 - (i - px)*(i - px)/(ra * ra));
                j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
                j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);
                
                if (Math.abs(i - px) < ra_inner) {
                    // also calculate inner ellipse
                    eq = Math.sqrt(1 - (i - px)*(i - px)/(ra_inner * ra_inner));
                    j1 = Math.min(Math.max(Math.ceil(py - rb_inner * eq), 0), ny1);
                    j2 = Math.min(Math.max(Math.floor(py + rb_inner * eq), 0), ny1);
                    for (var j = j0; j <= j1; j++)
                        indexes[idx++] = i * ny + j;  
                    for (var j = j2; j <= j_max; j++)
                        indexes[idx++] = i * ny + j;
                } else {
                    // consider only outer ellipse
                    for (var j = j0; j <= j_max; j++) 
                        indexes[idx++] = i * ny + j;
                }
            }
            return indexes;
        }
        
        if (part.polygon) {
            var polygon = part.polygon;
            var count = polygon.count;
            var verts = polygon.vertices;
            var x_coords = new Array(count);
            var y_coords = new Array(count);
            var x_min = Number.MAX_VALUE, x_max = Number.MIN_VALUE; 
            var y_min = Number.MAX_VALUE, y_max = Number.MIN_VALUE;
            for (var i = 0; i < count; i++) {
                x_coords[i] = verts[i * 2] * dx;
                y_coords[i] = verts[i * 2 + 1] * dy;
                if (x_coords[i] < x_min)
                    x_min = x_coords[i];
                if (x_coords[i] > x_max)
                    x_max = x_coords[i];
                if (y_coords[i] < y_min)
                    y_min = y_coords[i];
                if (y_coords[i] > y_max)
                    y_max = y_coords[i];
            }
            
            var i0 = Math.min(Math.max(Math.round(x_min), 0), nx1);
            var j0 = Math.min(Math.max(Math.round(y_min), 0), ny1);
            var i_max = Math.min(Math.max(Math.round(x_max), 0), nx1);
            var j_max = Math.min(Math.max(Math.round(y_max), 0), ny1);
            indexes = [];
            var idx = 0;
            for (var i = i0; i <= i_max; i++) {
                for (var j = j0; j <= j_max; j++) {
                    if (pointInsidePolygon(count, x_coords, y_coords, i, j)) {
                        indexes[idx++] = i * ny + j;
                    }
                }
            }
            return indexes;
        }
        return [];
    },
    
    setGridCellSize = function() {
      heatSolver.setGridCellSize(deltaX, deltaY);
      fluidSolver.setGridCellSize(deltaX, deltaY);
    },
    
    nextStep = function () {
      if (convective) {
        fluidSolver.solve(u, v);
      }
      heatSolver.solve(convective, t, q);
      indexOfStep += 1;    
    };
  // End var  

  // 
  // One-off initialization
  // 
  for (var i = 0; i < ARRAY_SIZE; i++) {
      t[i] = backgroundTemperature;
      tb[i] = NaN;
  }
  
  for (var i = 0; i < ARRAY_SIZE; i++) {
      conductivity[i] = backgroundConductivity;
  }
  
  for (var i = 0; i < ARRAY_SIZE; i++) {
      capacity[i] = backgroundSpecificHeat;
  }
  
  for (var i = 0; i < ARRAY_SIZE; i++) {
      density[i] = backgroundDensity;
  }
  
  for (var i = 0; i < ARRAY_SIZE; i++) {
      fluidity[i] = true;
  }
  
  setGridCellSize();
  setupMaterialProperties();
  
  // Public API
  return {
    // Performs next step of a simulation
    nextStep: function () {
      if (convective) {
        fluidSolver.solve(u, v);
      }
      heatSolver.solve(convective, t, q);
      indexOfStep += 1;    
    },
    // Returns load configuration after validation
    getLoadedConfiguration: function() {
      return opt;
    }
  };
};

