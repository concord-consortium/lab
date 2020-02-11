/*global define: false */

import $__arrays from 'arrays';
import { makeHeatSolver } from 'models/energy2d/models/physics-solvers/heat-solver';
import { makeHeatSolverGPU } from 'models/energy2d/models/physics-solvers-gpu/heat-solver-gpu';
import { makeFluidSolver } from 'models/energy2d/models/physics-solvers/fluid-solver';
import { makeFluidSolverGPU } from 'models/energy2d/models/physics-solvers-gpu/fluid-solver-gpu';
import { makeRaySolver } from 'models/energy2d/models/physics-solvers/ray-solver';
import { Part } from 'models/energy2d/models/part';
import $__models_energy_d_gpu_gpgpu from 'models/energy2d/gpu/gpgpu';
import { hypot } from 'models/energy2d/models/helpers';

var
  arrays = $__arrays,
  gpgpu = $__models_energy_d_gpu_gpgpu,

  array_type = (function() {
    try {
      new Float32Array();
    } catch (e) {
      return 'regular';
    }
    return 'Float32Array';
  }());

// Core Energy2D model.
//
// It creates and manages all the data and parameters used for calculations.
export const makeCoreModel = function(opt, partsOpt) {
  var
  // Simulation grid dimensions.
    nx = opt.grid_width,
    ny = opt.grid_height,
    array_size = nx * ny,

    // Spacing.
    delta_x = opt.model_width / nx,
    delta_y = opt.model_height / ny,

    // Simulation steps counter.
    indexOfStep = 0,

    // Physics solvers
    // (initialized later, when core model object is built).
    heatSolver,
    fluidSolver,
    ray_solver,

    // GPU versions of solvers.
    heat_solver_gpu,
    fluid_solver_gpu,

    // Optimization flags.
    radiative,
    has_part_power,

    // WebGL GPGPU optimization.
    WebGL_active = false,
    // This variable holds possible error message connected with WebGL.
    WebGL_error,

    // Performance model.
    // By default, mock this object.
    // To measure performance, set valid object
    // using core_model.setPerformanceTools(tools);
    perf = {
      start: function() {},
      stop: function() {},
      startFPS: function() {},
      updateFPS: function() {},
      stopFPS: function() {}
    },

    //
    // Simulation arrays:
    //
    // - temperature array
    t = arrays.create(array_size, opt.background_temperature, array_type),
    // - internal temperature boundary array
    tb = arrays.create(array_size, NaN, array_type),
    // - velocity x-component array (m/s)
    u = arrays.create(array_size, 0, array_type),
    // - velocity y-component array (m/s)
    v = arrays.create(array_size, 0, array_type),
    // - internal heat generation array
    q = arrays.create(array_size, 0, array_type),
    // - wind speed
    uWind = arrays.create(array_size, 0, array_type),
    vWind = arrays.create(array_size, 0, array_type),
    // - conductivity array
    conductivity = arrays.create(array_size, opt.background_conductivity, array_type),
    // - specific heat capacity array
    capacity = arrays.create(array_size, opt.background_specific_heat, array_type),
    // - density array
    density = arrays.create(array_size, opt.background_density, array_type),
    // - fluid cell array
    fluidity = arrays.create(array_size, true, array_type),
    // - photons array
    photons = [],

    //
    // [GPGPU] Simulation textures:
    //
    // texture 0:
    // - R: t
    // - G: t0
    // - B: tb
    // - A: conductivity
    // texture 1:
    // - R: q
    // - G: capacity
    // - B: density
    // - A: fluidity
    // texture 2:
    // - R: u
    // - G: v
    // - B: u0
    // - A: v0
    // texture 3:
    // - R: uWind
    // - G: vWind
    // - B: undefined
    // - A: undefined
    texture = [],

    // Generate parts array.
    parts = (function() {
      var result = [],
        i, len;

      if (partsOpt) {
        if (!arrays.isArray(partsOpt)) {
          partsOpt = [partsOpt];
        }
        result = new Array(partsOpt.length);
        for (i = 0, len = partsOpt.length; i < len; i += 1) {
          result[i] = new Part(partsOpt[i]);
        }
      }
      return result;
    }()),

    //
    // Private methods
    //
    initGPGPU = function() {
      WebGL_active = false;

      // Make sure that environment is a browser.
      if (typeof window === 'undefined') {
        throw new Error("Core model: WebGL GPGPU unavailable in the node.js environment.");
      }
      // Init module.
      // Width is ny, height is nx (due to data organization).
      gpgpu.init(ny, nx);

      // Create simulation textures.
      texture[0] = gpgpu.createTexture();
      texture[1] = gpgpu.createTexture();
      texture[2] = gpgpu.createTexture();
      texture[3] = gpgpu.createTexture();

      // Update textures as material properties should be already set.
      fillGPGPUTextures();

      // Create GPU solvers.
      // GPU version of heat solver.
      heat_solver_gpu = makeHeatSolverGPU(core_model);
      // GPU version of fluid solver.
      fluid_solver_gpu = makeFluidSolverGPU(core_model);

      WebGL_active = true;
    },

    fillGPGPUTextures = function() {
      // texture 0:
      // - R: t
      // - G: t0
      // - B: tb
      // - A: conductivity
      gpgpu.writeRGBATexture(texture[0], t, t, tb, conductivity);
      // texture 1:
      // - R: q
      // - G: capacity
      // - B: density
      // - A: fluidity
      gpgpu.writeRGBATexture(texture[1], q, capacity, density, fluidity);
      // texture 2:
      // - R: u
      // - G: v
      // - B: u0
      // - A: v0
      gpgpu.writeRGBATexture(texture[2], u, v, u, v);
      // texture 3:
      // - R: uWind
      // - G: vWind
      // - B: undefined
      // - A: undefined
      gpgpu.writeRGBATexture(texture[3], uWind, vWind, uWind, vWind);
    },

    setupOptimizationFlags = function() {
      radiative = (function() {
        var i, len;
        if (opt.sunny) {
          return true;
        }
        for (i = 0, len = parts.length; i < len; i += 1) {
          if (parts[i].emissivity > 0) {
            return true;
          }
        }
        return false;
      }());

      has_part_power = (function() {
        var i, len;
        for (i = 0, len = parts.length; i < len; i += 1) {
          if (parts[i].power > 0) {
            return true;
          }
        }
        return false;
      }());
    },

    setupPart = function(part, updateOnly) {
      var
        lx = opt.model_width,
        ly = opt.model_height,
        indices, idx,
        ii, len;

      indices = part.getGridCells(nx, ny, lx, ly);
      for (ii = 0, len = indices.length; ii < len; ii += 1) {
        idx = indices[ii];

        if (!updateOnly) {
          t[idx] = part.temperature;
        }
        fluidity[idx] = false;
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
    },

    resetArrays = function(skipTempAndVelocity) {
      if (!skipTempAndVelocity) {
        arrays.fill(t, opt.background_temperature);
        arrays.fill(u, 0);
        arrays.fill(v, 0);
      }
      arrays.fill(tb, NaN);
      arrays.fill(q, 0);
      arrays.fill(uWind, 0);
      arrays.fill(vWind, 0);
      arrays.fill(conductivity, opt.background_conductivity);
      arrays.fill(capacity, opt.background_specific_heat);
      arrays.fill(density, opt.background_density);
      arrays.fill(fluidity, true);
    },

    setupMaterialProperties = function(updateOnly) {
      if (!parts || parts.length === 0) return;
      var i;
      // Treat overlapping parts as original Energy2D.
      for (i = parts.length - 1; i >= 0; i -= 1) {
        setupPart(parts[i], updateOnly);
      }
    },

    refreshPowerArray = function() {
      var part, x, y, i, iny, j, k, len, count;
      for (i = 0; i < nx; i += 1) {
        x = i * delta_x;
        iny = i * ny;
        for (j = 0; j < ny; j += 1) {
          y = j * delta_y;
          q[iny + j] = 0;
          count = 0;
          if (has_part_power) {
            for (k = 0, len = parts.length; k < len; k += 1) {
              part = parts[k];
              if (part.shape.contains(x, y)) {
                q[iny + j] += part.power;
                count++;
              }
            }
            if (count > 0) q[iny + j] /= count;
          }
        }
      }
    },

    getVorticityAt = function(i, j) {
      var du_dy = (u[i * ny + j + 1] - u[i * ny + j - 1]) / delta_x,
        dv_dx = (v[(i + 1) * ny + j] - v[(i - 1) * ny + j]) / delta_y;
      return 0.5 * (du_dy - dv_dx);
    },

    //
    // Public API
    //
    core_model = {
      // !!!
      // Performs next step of a simulation.
      // !!!
      nextStep: function() {
        perf.start('Core model step');
        if (WebGL_active) {
          // GPU solvers.
          if (opt.convective) {
            perf.start('Fluid solver GPU');
            fluid_solver_gpu.solve();
            perf.stop('Fluid solver GPU');
          }
          perf.start('Heat solver GPU');
          heat_solver_gpu.solve(opt.convective);
          perf.stop('Heat solver GPU');
        } else {
          // CPU solvers.
          if (radiative) {
            perf.start('Ray solver CPU');
            if (indexOfStep % opt.photon_emission_interval === 0) {
              refreshPowerArray();
              if (opt.sunny) {
                ray_solver.sunShine();
              }
              ray_solver.radiate();
            }
            ray_solver.solve();
            perf.stop('Ray solver CPU');
          }
          if (opt.convective) {
            perf.start('Fluid solver CPU');
            fluidSolver.solve(u, v);
            perf.stop('Fluid solver CPU');
          }
          perf.start('Heat solver CPU');
          heatSolver.solve(opt.convective, t, q);
          perf.stop('Heat solver CPU');
        }
        indexOfStep += 1;
        perf.stop('Core model step');
      },

      // Sets performance tools.
      // It's expected to be an object created by
      // energy2d.utils.performance.makePerformanceTools
      setPerformanceTools: function(perf_tools) {
        perf = perf_tools;
      },

      reset: function() {
        indexOfStep = 0;
        resetArrays();
        setupOptimizationFlags();
        setupMaterialProperties();
        refreshPowerArray();
        if (WebGL_active) {
          fillGPGPUTextures();
        }
      },

      partsChanged: function(part, propChanged) {
        // TODO: in theory we don't have to process all parts. If needed
        // implement something tricker.
        // Note that temperature and velocity aren't reset to provide better
        // interactivity.
        resetArrays(true);
        setupOptimizationFlags();
        setupMaterialProperties(true);
        refreshPowerArray();

        if (propChanged === "temperature") {
          setupPart(part);
        }
      },

      addPart: function(props) {
        var part = new Part(props);
        parts.push(part);
        setupPart(part);
      },

      removePart: function(i) {
        parts.splice(i, 1);
        core_model.partsChanged();
      },

      useWebGL: function(v) {
        if (WebGL_active === v) return;
        if (!core_model.isWebGLCompatible()) {
          // Some models are incompatible with WebGL.
          WebGL_active = false;
          return;
        }

        if (v) {
          // Initialize GPGPU, this will also copy current temperature
          // and velocity arrays into textures.
          initGPGPU();
        } else {
          // Copy data back from GPU to main memory.
          core_model.syncTemperature();
          core_model.syncVelocity();
          WebGL_active = false;
        }
      },

      isWebGLActive: function() {
        return WebGL_active;
      },

      isWebGLCompatible: function() {
        return !radiative;
      },

      getWebGLError: function() {
        return WebGL_error;
      },

      syncTemperature: function() {
        if (WebGL_active) {
          gpgpu.readTexture(texture[0], t);
        }
      },

      syncVelocity: function() {
        if (WebGL_active) {
          gpgpu.readTexture(texture[2], u, 0);
          gpgpu.readTexture(texture[2], v, 1);
        }
      },

      getIndexOfStep: function() {
        return indexOfStep;
      },
      // Returns loaded options after validation.
      getModelOptions: function() {
        return opt;
      },

      // Temperature manipulation.
      getTemperatureAt: function(x, y) {
        var
          i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0);

        return t[i * ny + j];
      },

      setTemperatureAt: function(x, y, temperature) {
        var
          i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0);

        t[i * ny + j] = temperature;
      },

      getAverageTemperatureAt: function(x, y) {
        var
          temp = 0,
          nx1 = nx - 1,
          ny1 = ny - 1,
          i0 = Math.round(x / delta_x),
          j0 = Math.round(y / delta_y),
          i, j;

        i = Math.max(Math.min(nx1, i0), 0);
        j = Math.max(Math.min(ny1, j0), 0);
        temp += t[i * ny + j];
        i = Math.max(Math.min(nx1, i0 + 1), 0);
        j = Math.max(Math.min(ny1, j0), 0);
        temp += t[i * ny + j];
        i = Math.max(Math.min(nx1, i0 - 1), 0);
        j = Math.max(Math.min(ny1, j0), 0);
        temp += t[i * ny + j];
        i = Math.max(Math.min(nx1, i0), 0);
        j = Math.max(Math.min(ny1, j0 + 1), 0);
        temp += t[i * ny + j];
        i = Math.max(Math.min(nx1, i0), 0);
        j = Math.max(Math.min(ny1, j0 - 1), 0);
        temp += t[i * ny + j];
        return temp * 0.2;
      },

      // TODO: based on Java version, check it as the logic seems to be weird.
      changeAverageTemperatureAt: function(x, y, increment) {
        var
          nx1 = nx - 1,
          ny1 = ny - 1,
          i0 = Math.round(x / delta_x),
          j0 = Math.round(y / delta_y),
          i, j;

        increment *= 0.2;
        i = Math.min(nx1, i0);
        j = Math.min(ny1, j0);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
        i = Math.min(nx1, i0 + 1);
        j = Math.min(ny1, j0);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
        i = Math.min(nx1, i0 - 1);
        j = Math.min(ny1, j0);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
        i = Math.min(nx1, i0);
        j = Math.min(ny1, j0 + 1);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
        i = Math.min(nx1, i0);
        j = Math.min(ny1, j0 - 1);
        if (i >= 0 && j >= 0) {
          t[i * ny + j] += increment;
        }
      },

      getVorticityAt: function(x, y) {
        var i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0);
        return getVorticityAt(i, j);
      },

      getAverageVorticityAt: function(x, y) {
        var i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0),
          vor = getVorticityAt(i, j);
        vor += getVorticityAt(i - 1, j);
        vor += getVorticityAt(i + 1, j);
        vor += getVorticityAt(i, j - 1);
        vor += getVorticityAt(i, j + 1);
        vor += getVorticityAt(i - 1, j - 1);
        vor += getVorticityAt(i - 1, j + 1);
        vor += getVorticityAt(i + 1, j - 1);
        vor += getVorticityAt(i + 1, j + 1);
        return vor / 9;
      },

      getSpeedAt: function(x, y) {
        var
          i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0);

        return hypot(u[i * ny + j], v[i * ny + j]);
      },

      getHeatFluxAt: function(x, y) {
        var
          i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0),
          fx = conductivity[i * ny + j] * (t[(i - 1) * ny + j] - t[(i + 1) * ny + j]) / (2 * delta_x),
          fy = conductivity[i * ny + j] * (t[i * ny + j - 1] - t[i * ny + j + 1]) / (2 * delta_y);
        return [fx, fy];
      },

      addPhoton: function(photon) {
        photons.push(photon);
      },

      removePhoton: function(photon) {
        var idx = photons.indexOf(photon);
        if (idx !== -1) {
          photons.splice(idx, 1);
        }
      },

      // Simple getters.
      getArrayType: function() {
        // return module variable
        return array_type;
      },
      getPerformanceModel: function() {
        return perf;
      },
      // Arrays.
      getTemperatureArray: function() {
        return t;
      },
      getUVelocityArray: function() {
        return u;
      },
      getVVelocityArray: function() {
        return v;
      },
      getUWindArray: function() {
        return uWind;
      },
      getVWindArray: function() {
        return vWind;
      },
      getBoundaryTemperatureArray: function() {
        return tb;
      },
      getPowerArray: function() {
        return q;
      },
      getConductivityArray: function() {
        return conductivity;
      },
      getCapacityArray: function() {
        return capacity;
      },
      getDensityArray: function() {
        return density;
      },
      getFluidityArray: function() {
        return fluidity;
      },
      getPhotonsArray: function() {
        return photons;
      },
      getPartsArray: function() {
        return parts;
      },
      // Textures.
      getTemperatureTexture: function() {
        return texture[0];
      },
      getVelocityTexture: function() {
        return texture[2];
      },
      getSimulationTexture: function(id) {
        return texture[id];
      }
    };

  //
  // One-off initialization.
  //
  setupOptimizationFlags();
  setupMaterialProperties();
  refreshPowerArray();

  // CPU version of solvers.
  heatSolver = makeHeatSolver(core_model);
  fluidSolver = makeFluidSolver(core_model);
  ray_solver = makeRaySolver(core_model);

  // Finally, return public API object.
  return core_model;
};
