var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/arrays/arrays.js", function (require, module, exports, __dirname, __filename) {
/*globals window Uint8Array Int8Array Uint16Array Int16Array Uint32Array Int32Array Float32Array Float64Array */
/*jshint newcap: false */

//
// 'requirified' version of Typed Array Utilities.
//

var arrays;

arrays = exports.arrays = {};

arrays.version = '0.0.1';
arrays.webgl = (typeof window !== 'undefined') && !!window.WebGLRenderingContext;
arrays.typed = false;
try {
  var a = new Float64Array(0);
  arrays.typed = true;
} catch(e) {

}

// regular
// Uint8Array
// Uint16Array
// Uint32Array
// Int8Array
// Int16Array
// Int32Array
// Float32Array

arrays.create = function(size, fill, array_type) {
  if (!array_type) {
    if (arrays.webgl || arrays.typed) {
      array_type = "Float32Array";
    } else {
      array_type = "regular";
    }
  }
  // fill = fill || 0; -> this doesn't handle NaN value
  if (fill === undefined)
    fill = 0;
  var a, i;
  if (array_type === "regular") {
    a = new Array(size);
  } else {
    switch(array_type) {
      case "Float64Array":
      a = new Float64Array(size);
      break;
      case "Float32Array":
      a = new Float32Array(size);
      break;
      case "Int32Array":
      a = new Int32Array(size);
      break;
      case "Int16Array":
      a = new Int16Array(size);
      break;
      case "Int8Array":
      a = new Int8Array(size);
      break;
      case "Uint32Array":
      a = new Uint32Array(size);
      break;
      case "Uint16Array":
      a = new Uint16Array(size);
      break;
      case "Uint8Array":
      a = new Uint8Array(size);
      break;
      default:
      a = new Array(size);
      break;
    }
  }
  i=-1; while(++i < size) { a[i] = fill; }
  return a;
};

arrays.constructor_function = function(source) {
  if (source.buffer && source.buffer.__proto__ && source.buffer.__proto__.constructor) {
    return source.__proto__.constructor;
  }
  if (source.constructor === Array) {
    return source.constructor;
  }
  throw new Error(
      "arrays.constructor_function: must be an Array or Typed Array: " +
      "  source: " + source +
      ", source.constructor: " + source.constructor +
      ", source.buffer: " + source.buffer +
      ", source.buffer.slice: " + source.buffer.slice +
      ", source.buffer.__proto__: " + source.buffer.__proto__ +
      ", source.buffer.__proto__.constructor: " + source.buffer.__proto__.constructor
    );
};

arrays.copy = function(source, dest) {
  var len = source.length,
      i = -1;
  while(++i < len) { dest[i] = source[i]; }
  if (arrays.constructor_function(dest) === Array) dest.length = len;
  return dest;
};

arrays.clone = function(source) {
  var i, len = source.length, clone, constructor;
  constructor = arrays.constructor_function(source);
  if (constructor === Array) {
    clone = new constructor(len);
    for (i = 0; i < len; i++) { clone[i] = source[i]; }
    return clone;
  }
  if (source.buffer.slice) {
    clone = new constructor(source.buffer.slice(0));
    return clone;
  }
  clone = new constructor(len);
  for (i = 0; i < len; i++) { clone[i] = source[i]; }
  return clone;
};

/** @return true if x is between a and b. */
// float a, float b, float x
arrays.between = function(a, b, x) {
  return x < Math.max(a, b) && x > Math.min(a, b);
};

// float[] array
arrays.max = function(array) {
  return Math.max.apply( Math, array );
};

// float[] array
arrays.min = function(array) {
  return Math.min.apply( Math, array );
};

// FloatxxArray[] array
arrays.maxTypedArray = function(array) {
  var test, i,
  max = Number.MIN_VALUE,
  length = array.length;
  for(i = 0; i < length; i++) {
    test = array[i];
    max = test > max ? test : max;
  }
  return max;
};

// FloatxxArray[] array
arrays.minTypedArray = function(array) {
  var test, i,
  min = Number.MAX_VALUE,
  length = array.length;
  for(i = 0; i < length; i++) {
    test = array[i];
    min = test < min ? test : min;
  }
  return min;
};

// float[] array
arrays.maxAnyArray = function(array) {
  try {
    return Math.max.apply( Math, array );
  }
  catch (e) {
    if (e instanceof TypeError) {
      var test, i,
      max = Number.MIN_VALUE,
      length = array.length;
      for(i = 0; i < length; i++) {
        test = array[i];
        max = test > max ? test : max;
      }
      return max;
    }
  }
};

// float[] array
arrays.minAnyArray = function(array) {
  try {
    return Math.min.apply( Math, array );
  }
  catch (e) {
    if (e instanceof TypeError) {
      var test, i,
      min = Number.MAX_VALUE,
      length = array.length;
      for(i = 0; i < length; i++) {
        test = array[i];
        min = test < min ? test : min;
      }
      return min;
    }
  }
};

arrays.average = function(array) {
  var i, acc = 0,
  length = array.length;
  for (i = 0; i < length; i++) {
    acc += array[i];
  }
  return acc / length;
};
});

require.define("/physics-solvers/heat-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK
// TODO: fix loops (nx vs ny)
//
// lab/models/energy2d/engine/physics-solvers/heat-solver.js
//

var
  arrays = require('../arrays/arrays.js').arrays,

  RELAXATION_STEPS = 5;

exports.makeHeatSolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options = model.getModelOptions(),
    timeStep = model_options.timestep,
    boundary = model_options.boundary,

    deltaX = model_options.model_width / model.getGridWidth(),
    deltaY = model_options.model_height / model.getGridHeight(),

    relaxationSteps = RELAXATION_STEPS,

    // Simulation arrays provided by model.
    conductivity = model.getConductivityArray(),
    capacity     = model.getCapacityArray(),
    density      = model.getDensityArray(),
    u            = model.getUVelocityArray(),
    v            = model.getVVelocityArray(),
    tb           = model.getBoundaryTemperatureArray(),
    fluidity     = model.getFluidityArray(),

    // Internal array that stores the previous temperature results.
    t0 = arrays.create(nx * ny, 0, model.getArrayType()),

    // Convenience variables.  
    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    //
    // Private methods
    //
    applyBoundary  = function (t) {
      var
        vN, vS, vW, vE,
        i, j, inx, inx_ny1;

      if (boundary.temperature_at_border) {
        vN = boundary.temperature_at_border.upper;
        vS = boundary.temperature_at_border.lower;
        vW = boundary.temperature_at_border.left;
        vE = boundary.temperature_at_border.right;
        for (i = 0; i < nx; i += 1) {
          inx = i * nx;
          t[inx] = vN;
          t[inx + ny1] = vS;
        }
        for (j = 0; j <  ny; j += 1) {
          t[j] = vW;
          t[nx1 * nx + j] = vE;
        }
      } else if (boundary.flux_at_border) {
        vN = boundary.flux_at_border.upper;
        vS = boundary.flux_at_border.lower;
        vW = boundary.flux_at_border.left;
        vE = boundary.flux_at_border.right;
        for (i = 0; i < nx; i += 1) {
          inx = i * nx;
          inx_ny1 = inx + ny1;
          t[inx] = t[inx + 1] + vN * deltaY / conductivity[inx];
          t[inx_ny1] = t[inx + ny2] - vS * deltaY / conductivity[inx_ny1];
        }
        for (j = 0; j < ny; j += 1) {
          t[j] = t[nx + j] - vW * deltaX / conductivity[j];
          t[nx1 * nx + j] = t[nx2 * nx + j] + vE * deltaX / conductivity[nx1 * nx + j];
        }
      } else {
        throw new Error("Heat solver: wrong boundary settings definition.");
      }
    },

    macCormack  = function (t) {
      var
        tx = 0.5 * timeStep / deltaX,
        ty = 0.5 * timeStep / deltaY,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          jinx_minus_nx = jinx - nx;
          jinx_plus_nx = jinx + nx;
          jinx_minus_1 = jinx - 1;
          jinx_plus_1 = jinx + 1;
          if (fluidity[jinx]) {
            t0[jinx] = t[jinx]
              - tx * (u[jinx_plus_nx] * t[jinx_plus_nx] - u[jinx_minus_nx] * t[jinx_minus_nx])
              - ty * (v[jinx_plus_1] * t[jinx_plus_1] - v[jinx_minus_1] * t[jinx_minus_1]);
          }
        }
      }
      applyBoundary(t0);

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            t[jinx] = 0.5 * (t[jinx] + t0[jinx]) - 0.5 * tx * u[jinx]
              * (t0[jinx_plus_nx] - t0[jinx_minus_nx]) - 0.5 * ty * v[jinx]
              * (t0[jinx_plus_1] - t0[jinx_minus_1]);
          }
        }
      }
      applyBoundary(t);
    };

  return {
    solve: function (convective, t, q) {
      var
        hx = 0.5 / (deltaX * deltaX),
        hy = 0.5 / (deltaY * deltaY),
        invTimeStep = 1.0 / timeStep,
        rij, sij, axij, bxij, ayij, byij,
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      arrays.copy(t, t0);

      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (isNaN(tb[jinx])) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              sij = capacity[jinx] * density[jinx] * invTimeStep;
              rij = conductivity[jinx];
              axij = hx * (rij + conductivity[jinx_minus_nx]);
              bxij = hx * (rij + conductivity[jinx_plus_nx]);
              ayij = hy * (rij + conductivity[jinx_minus_1]);
              byij = hy * (rij + conductivity[jinx_plus_1]);
              t[jinx] = (t0[jinx] * sij + q[jinx] + axij * t[jinx_minus_nx] + bxij
                        * t[jinx_plus_nx] + ayij * t[jinx_minus_1] + byij * t[jinx_plus_1])
                        / (sij + axij + bxij + ayij + byij);
            } else {
              t[jinx] = tb[jinx];
            }
          }
        }
        applyBoundary(t);
      }
      if (convective) {
        // advect(t)
        macCormack(t);
      }
    }
  };
};

});

require.define("/physics-solvers-gpu/heat-solver-gpu.js", function (require, module, exports, __dirname, __filename) {
/*globals lab: false, energy2d: false */
/*jslint indent: 2, node: true, browser: true, es5: true */
//
// lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-gpu.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  RELAXATION_STEPS = 10;

exports.makeHeatSolverGPU = function (model) {
  'use strict';
  var
    // Dependencies:
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,
    // - GPGPU utilities. It's a singleton instance.
    //   It should have been previously initialized by core-model.
    gpgpu = energy2d.utils.gpu.gpgpu,
    // - GLSL sources.
    glsl = lab.glsl,

    // Shader sources. One of Lab build steps converts sources to JavaScript file.
    GLSL_PREFIX = 'src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/',
    basic_vs            = glsl[GLSL_PREFIX + 'basic.vs.glsl'],
    solver_fs           = glsl[GLSL_PREFIX + 'solver.fs.glsl'],
    force_flux_t_fs     = glsl[GLSL_PREFIX + 'force-flux-t.fs.glsl'],
    force_flux_t0_fs    = glsl[GLSL_PREFIX + 'force-flux-t.fs.glsl'],
    t_to_t0             = glsl[GLSL_PREFIX + 't-to-t0.fs.glsl'],
    maccormack_step1_fs = glsl[GLSL_PREFIX + 'maccormack-step1.fs.glsl'],
    maccormack_step2_fs = glsl[GLSL_PREFIX + 'maccormack-step2.fs.glsl'],

    // ========================================================================
    // GLSL Shaders:
    // - Main solver.
    solver_program           = new gpu.Shader(basic_vs, solver_fs),
    // - Force flux boundary (for T).
    force_flux_t_program     = new gpu.Shader(basic_vs, force_flux_t_fs),
    // - Force flux boundary (for T0).
    force_flux_t0_program    = new gpu.Shader(basic_vs, force_flux_t0_fs),
    // - Copy single channel of texture (t to t0).
    t_to_t0_program          = new gpu.Shader(basic_vs, t_to_t0),
    // - MacCormack advection step 1.
    maccormack_step1_program = new gpu.Shader(basic_vs, maccormack_step1_fs),
    // - MacCormack advection step 2.
    maccormack_step2_program = new gpu.Shader(basic_vs, maccormack_step2_fs),
    // ========================================================================

    // Basic simulation parameters.
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    model_options = model.getModelOptions(),
    timestep = model_options.timestep,
    boundary = model_options.boundary,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    relaxation_steps = RELAXATION_STEPS,

    // Simulation textures provided by model.
    // texture 0: 
    // - R: t
    // - G: t0
    // - B: tb
    // - A: conductivity
    data0_tex = model.getSimulationTexture(0),
    // texture 1: 
    // - R: q
    // - G: capacity
    // - B: density
    // - A: fluidity
    data1_tex = model.getSimulationTexture(1),
    // texture 2: 
    // - R: u
    // - G: v
    // - B: u0
    // - A: v0
    data2_tex = model.getSimulationTexture(2),

    // Convenience variables.  
    data_0_1_2_array = [data0_tex, data1_tex, data2_tex],
    data_0_1_array = [data0_tex, data1_tex],
    data_0_array = [data0_tex],
    grid_vec = [1 / ny, 1 / nx],

    init = function () {
      var uniforms;

      // Solver program uniforms.
      uniforms = {
        // Texture units.
        data0_tex: 0,
        data1_tex: 1,
        // Uniforms.
        grid: grid_vec,
        enforce_temp: 0.0,
        hx: 0.5 / (delta_x * delta_x),
        hy: 0.5 / (delta_y * delta_y),
        inv_timestep: 1.0 / timestep
      };
      solver_program.uniforms(uniforms);

      // MacCormack step 1 program uniforms.
      uniforms = {
        // Texture units.
        data0_tex: 0,
        data1_tex: 1,
        data2_tex: 2,
        // Uniforms.
        grid: grid_vec,
        enforce_temp: 0.0,
        tx: 0.5 * timestep / delta_x,
        ty: 0.5 * timestep / delta_y,
      };
      maccormack_step1_program.uniforms(uniforms);
      maccormack_step2_program.uniforms(uniforms);

      if (boundary.temperature_at_border) {
        uniforms = {
          // Additional uniforms.
          enforce_temp: 1.0,
          vN:  boundary.temperature_at_border.upper,
          vS:  boundary.temperature_at_border.lower,
          vW:  boundary.temperature_at_border.left,
          vE:  boundary.temperature_at_border.right
        };
        // Integrate boundary conditions with other programs.
        // This is optimization that allows to limit render-to-texture calls.
        solver_program.uniforms(uniforms);
        maccormack_step1_program.uniforms(uniforms);
        maccormack_step2_program.uniforms(uniforms);
      } else if (boundary.flux_at_border) {
        uniforms = {
          // Texture units.
          data0_tex: 0,
          // Uniforms.
          grid: grid_vec,
          vN: boundary.flux_at_border.upper,
          vS: boundary.flux_at_border.lower,
          vW: boundary.flux_at_border.left,
          vE: boundary.flux_at_border.right,
          delta_x: delta_x,
          delta_y: delta_y
        };
        // Flux boundary conditions can't be integrated into solver program,
        // so use separate GLSL programs.
        force_flux_t_program.uniforms(uniforms);
        force_flux_t0_program.uniforms(uniforms);
      }
    },

    macCormack = function () {
      // MacCormack step 1.
      gpgpu.executeProgram(
        maccormack_step1_program,
        data_0_1_2_array,
        data0_tex
      );
      if (boundary.flux_at_border) {
        // Additional program for boundary conditions
        // is required only for "flux at border" option.
        // If "temperature at border" is used, boundary
        // conditions are enforced by the MacCormack program.
        gpgpu.executeProgram(
          force_flux_t0_program,
          data_0_array,
          data0_tex
        );
      }
      // MacCormack step 2.
      gpgpu.executeProgram(
        maccormack_step2_program,
        data_0_1_2_array,
        data0_tex
      );
      if (boundary.flux_at_border) {
        // Additional program for boundary conditions
        // is required only for "flux at border" option.
        // If "temperature at border" is used, boundary
        // conditions are enforced by the MacCormack program.
        gpgpu.executeProgram(
          force_flux_t_program,
          data_0_array,
          data0_tex
        );
      }
    },

    heat_solver_gpu = {
      solve: function (convective) {
        var k;
        // Store previous values of t in t0.
        gpgpu.executeProgram(
          t_to_t0_program,
          data_0_array,
          data0_tex
        );
        for (k = 0; k < relaxation_steps; k += 1) {
          gpgpu.executeProgram(
            solver_program,
            data_0_1_array,
            data0_tex
          );
          if (boundary.flux_at_border) {
            // Additional program for boundary conditions
            // is required only for "flux at border" option.
            // If "temperature at border" is used, boundary
            // conditions are enforced by the solver program.
            gpgpu.executeProgram(
              force_flux_t_program,
              data_0_array,
              data0_tex
            );
          }
        }
        if (convective) {
          macCormack();
        }
        // Synchronize. It's not required but it 
        // allows to measure time (for optimization).
        gpgpu.tryFinish();
      }
    };
  // One-off initialization.
  init();
  return heat_solver_gpu;
};

});

require.define("/physics-solvers/fluid-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK
//
// lab/models/energy2d/engine/physics-solvers/fluid-solver.js
//
var
  arrays = require('../arrays/arrays.js').arrays,

  RELAXATION_STEPS = 5,
  GRAVITY = 0,

  BUOYANCY_AVERAGE_ALL = 0,
  BUOYANCY_AVERAGE_COLUMN = 1;

exports.makeFluidSolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options         = model.getModelOptions(),
    timeStep              = model_options.timestep,
    thermalBuoyancy       = model_options.thermal_buoyancy,
    buoyancyApproximation = model_options.buoyancy_approximation,
    viscosity             = model_options.background_viscosity,

    deltaX = model_options.model_width / model.getGridWidth(),
    deltaY = model_options.model_height / model.getGridHeight(),

    relaxationSteps = RELAXATION_STEPS,
    gravity = GRAVITY,

    // Simulation arrays provided by model.
    t        = model.getTemperatureArray(),
    fluidity = model.getFluidityArray(),
    uWind    = model.getUWindArray(),
    vWind    = model.getVWindArray(),

    // Internal simulation arrays.
    array_type = model.getArrayType(),
    u0         = arrays.create(nx * ny, 0, array_type),
    v0         = arrays.create(nx * ny, 0, array_type),

    // Convenience variables.   
    i2dx  = 0.5 / deltaX,
    i2dy  = 0.5 / deltaY,
    idxsq = 1.0 / (deltaX * deltaX),
    idysq = 1.0 / (deltaY * deltaY),

    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    // 
    // Private methods
    //

    // b = 1 horizontal; b = 2 vertical 
    applyBoundary = function (b, f) {
      var
        horizontal = b === 1,
        vertical   = b === 2,
        nx1nx = nx1 * nx,
        nx2nx = nx2 * nx,
        i, j, inx, inx_plus1, inx_plus_ny1, inx_plus_ny2, nx_plusj;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        inx_plus1 = inx + 1;
        inx_plus_ny1 = inx + ny1;
        inx_plus_ny2 = inx + ny2;
        // upper side
        f[inx] = vertical ? -f[inx_plus1] : f[inx_plus1];
        // lower side
        f[inx_plus_ny1] = vertical ? -f[inx_plus_ny2] : f[inx_plus_ny2];
      }
      for (j = 1; j < ny1; j += 1) {
        // left side
        nx_plusj = nx + j;
        f[j] = horizontal ? -f[nx_plusj] : f[nx_plusj];
        // right side
        f[nx1nx + j] = horizontal ? -f[nx2nx + j] : f[nx2nx + j];
      }

      // upper-left corner
      f[0] = 0.5 * (f[nx] + f[1]);
      // upper-right corner
      f[nx1nx] = 0.5 * (f[nx2nx] + f[nx1nx + 1]);
      // lower-left corner
      f[ny1] = 0.5 * (f[nx + ny1] + f[ny2]);
      // lower-right corner
      f[nx1nx + ny1] = 0.5 * (f[nx2nx + ny1] + f[nx1nx + ny2]);
    },

    setObstacleVelocity = function (u, v) {
      var
        count = 0,
        uw, vw,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          jinx_minus_nx = jinx - nx;
          jinx_plus_nx = jinx + nx;
          jinx_minus_1 = jinx - 1;
          jinx_plus_1 = jinx + 1;

          if (!fluidity[jinx]) {
            uw = uWind[jinx];
            vw = vWind[jinx];
            count = 0;
            if (fluidity[jinx_minus_nx]) {
              count += 1;
              u[jinx] = uw - u[jinx_minus_nx];
              v[jinx] = vw + v[jinx_minus_nx];
            } else if (fluidity[jinx_plus_nx]) {
              count += 1;
              u[jinx] = uw - u[jinx_plus_nx];
              v[jinx] = vw + v[jinx_plus_nx];
            }
            if (fluidity[jinx_minus_1]) {
              count += 1;
              u[jinx] = uw + u[jinx_minus_1];
              v[jinx] = vw - v[jinx_minus_1];
            } else if (fluidity[jinx_plus_1]) {
              count += 1;
              u[jinx] = uw + u[jinx_plus_1];
              v[jinx] = vw - v[jinx_plus_1];
            }
            if (count === 0) {
              u[jinx] = uw;
              v[jinx] = vw;
            }
          }
        }
      }
    },

    // ensure dx/dn = 0 at the boundary (the Neumann boundary condition)
    // float[][] x
    setObstacleBoundary = function (x) {
      var i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (!fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            if (fluidity[jinx_minus_nx]) {
              x[jinx] = x[jinx_minus_nx];
            } else if (fluidity[jinx_plus_nx]) {
              x[jinx] = x[jinx_plus_nx];
            }
            if (fluidity[jinx_minus_1]) {
              x[jinx] = x[jinx_minus_1];
            } else if (fluidity[jinx_plus_1]) {
              x[jinx] = x[jinx_plus_1];
            }
          }
        }
      }
    },

    getMeanTemperature = function (i, j) {
      var
        lowerBound = 0,
        upperBound = ny,
        t0 = 0,
        k, inx_plus_k;

        // search for the upper bound
      for (k = j - 1; k > 0; k -= 1) {
        inx_plus_k = i * nx + k;
        if (!fluidity[inx_plus_k]) {
          lowerBound = k;
          break;
        }
      }

      for (k = j + 1; k < ny; k += 1) {
        inx_plus_k = i * nx + k;
        if (!fluidity[inx_plus_k]) {
          upperBound = k;
          break;
        }
      }

      for (k = lowerBound; k < upperBound; k += 1) {
        inx_plus_k = i * nx + k;
        t0 += t[inx_plus_k];
      }
      return t0 / (upperBound - lowerBound);
    },

    applyBuoyancy = function (f) {
      var
        g = gravity * timeStep,
        b = thermalBuoyancy * timeStep,
        t0,
        i, j, inx, jinx;

      switch (buoyancyApproximation) {
      case BUOYANCY_AVERAGE_ALL:
        t0 = (function (array) {
          // Returns average value of an array.
          var
            acc = 0,
            length = array.length,
            i;
          for (i = 0; i < length; i += 1) {
            acc += array[i];
          }
          return acc / length;
        }(t)); // Call with the temperature array.
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              f[jinx] += (g - b) * t[jinx] + b * t0;
            }
          }
        }
        break;
      case BUOYANCY_AVERAGE_COLUMN:
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              t0 = getMeanTemperature(i, j);
              f[jinx] += (g - b) * t[jinx] + b * t0;
            }
          }
        }
        break;
      }
    },

    conserve = function (u, v, phi, div) {
      var
        s = 0.5 / (idxsq + idysq),
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            div[jinx] = (u[jinx_plus_nx] - u[jinx_minus_nx]) * i2dx + (v[jinx_plus_1] - v[jinx_minus_1]) * i2dy;
            phi[jinx] = 0;
          }
        }
      }
      applyBoundary(0, div);
      applyBoundary(0, phi);
      setObstacleBoundary(div);
      setObstacleBoundary(phi);

      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              phi[jinx] = s
                  * ((phi[jinx_minus_nx] + phi[jinx_plus_nx]) * idxsq
                  + (phi[jinx_minus_1] + phi[jinx_plus_1]) * idysq - div[jinx]);
            }
          }
        }
      }

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            u[jinx] -= (phi[jinx_plus_nx] - phi[jinx_minus_nx]) * i2dx;
            v[jinx] -= (phi[jinx_plus_1] - phi[jinx_minus_1]) * i2dy;
          }
        }
      }
      applyBoundary(1, u);
      applyBoundary(2, v);
    },

    diffuse = function (b, f0, f) {
      var
        hx = timeStep * viscosity * idxsq,
        hy = timeStep * viscosity * idysq,
        dn = 1.0 / (1 + 2 * (hx + hy)),
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      arrays.copy(f, f0);
      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              f[jinx] = (f0[jinx] + hx * (f[jinx_minus_nx] + f[jinx_plus_nx]) + hy
                      * (f[jinx_minus_1] + f[jinx_plus_1]))
                      * dn;
            }
          }
        }
        applyBoundary(b, f);
      }
    },

    // MacCormack
    macCormack = function (b, f0, f) {
      var
        tx = 0.5 * timeStep / deltaX,
        ty = 0.5 * timeStep / deltaY,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            f[jinx] = f0[jinx]
                    - tx
                    * (u0[jinx_plus_nx] * f0[jinx_plus_nx] - u0[jinx_minus_nx]
                            * f0[jinx_minus_nx])
                    - ty
                    * (v0[jinx_plus_1] * f0[jinx_plus_1] - v0[jinx_minus_1]
                            * f0[jinx_minus_1]);
          }
        }
      }

      applyBoundary(b, f);

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            f0[jinx] = 0.5 * (f0[jinx] + f[jinx]) - 0.5 * tx
                    * u0[jinx] * (f[jinx_plus_nx] - f[jinx_minus_nx]) - 0.5
                    * ty * v0[jinx] * (f[jinx_plus_1] - f[jinx_minus_1]);
          }
        }
      }

      arrays.copy(f0, f);

      applyBoundary(b, f);
    },

    advect = function (b, f0, f) {
      macCormack(b, f0, f);
    };

  return {
    // TODO: swap the two arrays instead of copying them every time?
    solve: function (u, v) {
      if (thermalBuoyancy !== 0) {
        applyBuoyancy(v);
      }
      setObstacleVelocity(u, v);
      if (viscosity > 0) {
        // inviscid case
        diffuse(1, u0, u);
        diffuse(2, v0, v);
        conserve(u, v, u0, v0);
        setObstacleVelocity(u, v);
      }
      arrays.copy(u, u0);
      arrays.copy(v, v0);
      advect(1, u0, u);
      advect(2, v0, v);
      conserve(u, v, u0, v0);
      setObstacleVelocity(u, v);
    }
  };
};
});

require.define("/physics-solvers-gpu/fluid-solver-gpu.js", function (require, module, exports, __dirname, __filename) {
/*globals lab: false, energy2d: false */
/*jslint indent: 2, node: true, browser: true, es5: true */
//
// lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-gpu.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  RELAXATION_STEPS = 10,
  GRAVITY = 0,

  BUOYANCY_AVERAGE_ALL = 0,
  BUOYANCY_AVERAGE_COLUMN = 1;

exports.makeFluidSolverGPU = function (model) {
  'use strict';
  var
    // Dependencies:
    // - Energy2D GPU namespace.
    gpu = energy2d.utils.gpu,
    // - GPGPU utilities. It's a singleton instance.
    //   It should have been previously initialized by core-model.
    gpgpu = energy2d.utils.gpu.gpgpu,
    // - GLSL sources.
    glsl = lab.glsl,

    // Shader sources. One of Lab build steps converts sources to JavaScript file.
    GLSL_PREFIX = 'src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/',
    basic_vs                 = glsl[GLSL_PREFIX + 'basic.vs.glsl'],
    maccormack_step1_fs      = glsl[GLSL_PREFIX + 'maccormack-step1.fs.glsl'],
    maccormack_step2_fs      = glsl[GLSL_PREFIX + 'maccormack-step2.fs.glsl'],
    apply_uv_boundary_fs     = glsl[GLSL_PREFIX + 'apply-uv-boundary.fs.glsl'],
    apply_u0v0_boundary_fs   = glsl[GLSL_PREFIX + 'apply-u0v0-boundary.fs.glsl'],
    set_obstacle_boundary_fs = glsl[GLSL_PREFIX + 'set-obstacle-boundary.fs.glsl'],
    set_obstacle_velocity_fs = glsl[GLSL_PREFIX + 'set-obstacle-velocity.fs.glsl'],
    uv_to_u0v0_fs            = glsl[GLSL_PREFIX + 'uv-to-u0v0.fs.glsl'],
    conserve_step1_fs        = glsl[GLSL_PREFIX + 'conserve-step1.fs.glsl'],
    conserve_step2_fs        = glsl[GLSL_PREFIX + 'conserve-step2.fs.glsl'],
    conserve_step3_fs        = glsl[GLSL_PREFIX + 'conserve-step3.fs.glsl'],
    diffuse_fs               = glsl[GLSL_PREFIX + 'diffuse.fs.glsl'],
    apply_buoyancy_fs        = glsl[GLSL_PREFIX + 'apply-buoyancy.fs.glsl'],

    // ========================================================================
    // GLSL Shaders:
    // - MacCormack advection, first step.
    maccormack_step1_program      = new gpu.Shader(basic_vs, maccormack_step1_fs),
    maccormack_step2_program      = new gpu.Shader(basic_vs, maccormack_step2_fs),
    apply_uv_boundary_program     = new gpu.Shader(basic_vs, apply_uv_boundary_fs),
    apply_u0v0_boundary_program   = new gpu.Shader(basic_vs, apply_u0v0_boundary_fs),
    set_obstacle_boundary_program = new gpu.Shader(basic_vs, set_obstacle_boundary_fs),
    set_obstacle_velocity_program = new gpu.Shader(basic_vs, set_obstacle_velocity_fs),
    uv_to_u0v0_program            = new gpu.Shader(basic_vs, uv_to_u0v0_fs),
    conserve_step1_program        = new gpu.Shader(basic_vs, conserve_step1_fs),
    conserve_step2_program        = new gpu.Shader(basic_vs, conserve_step2_fs),
    conserve_step3_program        = new gpu.Shader(basic_vs, conserve_step3_fs),
    diffuse_program               = new gpu.Shader(basic_vs, diffuse_fs),
    apply_buoyancy_program        = new gpu.Shader(basic_vs, apply_buoyancy_fs),
    // ========================================================================

    // Simulation arrays provided by model.
    // texture 0: 
    // - R: t
    // - G: t0
    // - B: tb
    // - A: conductivity
    data0_tex = model.getSimulationTexture(0),
    // texture 1: 
    // - R: q
    // - G: capacity
    // - B: density
    // - A: fluidity
    data1_tex = model.getSimulationTexture(1),
    // texture 2: 
    // - R: u
    // - G: v
    // - B: u0
    // - A: v0
    data2_tex = model.getSimulationTexture(2),
    // texture 3: 
    // - R: uWind
    // - G: vWind
    // - B: undefined
    // - A: undefined
    data3_tex = model.getSimulationTexture(3),

    // Basic simulation parameters.
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    model_options          = model.getModelOptions(),
    timestep               = model_options.timestep,
    thermal_buoyancy       = model_options.thermal_buoyancy,
    buoyancy_approximation = model_options.buoyancy_approximation,
    viscosity              = model_options.background_viscosity,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    relaxation_steps = RELAXATION_STEPS,
    gravity = GRAVITY,

    // Convenience variables.   
    i2dx  = 0.5 / delta_x,
    i2dy  = 0.5 / delta_y,
    idxsq = 1.0 / (delta_x * delta_x),
    idysq = 1.0 / (delta_y * delta_y),
    s     = 0.5 / (idxsq + idysq),

    hx = timestep * viscosity * idxsq,
    hy = timestep * viscosity * idysq,
    dn = 1.0 / (1 + 2 * (hx + hy)),

    g = gravity * timestep,
    b = thermal_buoyancy * timestep,

    grid_vec = [1 / ny, 1 / nx],

    // Textures sets.
    data_2_array = [data2_tex],
    data_1_2_array = [data1_tex, data2_tex],
    data_0_1_2_array = [data0_tex, data1_tex, data2_tex],
    data_1_2_3_array = [data1_tex, data2_tex, data3_tex],

    init = function () {
      var uniforms;

      // MacCormack step 1 and 2 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        tx: 0.5 * timestep / delta_x,
        ty: 0.5 * timestep / delta_y
      };
      maccormack_step1_program.uniforms(uniforms);
      maccormack_step2_program.uniforms(uniforms);

      // Apply UV / U0V0 boundary uniforms.
      uniforms = {
        // Texture units.
        data2_tex: 0,
        // Uniforms.
        grid: grid_vec,
      };
      apply_uv_boundary_program.uniforms(uniforms);
      apply_u0v0_boundary_program.uniforms(uniforms);

      // Set obstacle boundary uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
      };
      set_obstacle_boundary_program.uniforms(uniforms);

      // Set obstacle velocity uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        data3_tex: 2,
        // Uniforms.
        grid: grid_vec,
      };
      set_obstacle_velocity_program.uniforms(uniforms);

      // Conserve step 1 and 3 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        i2dx: i2dx,
        i2dy: i2dy
      };
      conserve_step1_program.uniforms(uniforms);
      conserve_step3_program.uniforms(uniforms);

      // Conserve step 2 uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        s: s,
        idxsq: idxsq,
        idysq: idysq
      };
      conserve_step2_program.uniforms(uniforms);

      // Diffuse uniforms.
      uniforms = {
        // Texture units.
        data1_tex: 0,
        data2_tex: 1,
        // Uniforms.
        grid: grid_vec,
        hx: hx,
        hy: hy,
        dn: dn
      };
      diffuse_program.uniforms(uniforms);

      // Apply buoyancy uniforms.
      uniforms = {
        // Texture units.
        data0_tex: 0,
        data1_tex: 1,
        data2_tex: 2,
        // Uniforms.
        grid: grid_vec,
        g: g,
        b: b
      };
      apply_buoyancy_program.uniforms(uniforms);
    },

    applyBuoyancy = function () {
      gpgpu.executeProgram(
        apply_buoyancy_program,
        data_0_1_2_array,
        data2_tex
      );
    },

    macCormack = function () {
      // Step 1.
      gpgpu.executeProgram(
        maccormack_step1_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
      // Step 2.
      gpgpu.executeProgram(
        maccormack_step2_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary again.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
    },

    conserve = function () {
      var k;
      // Step 1.
      gpgpu.executeProgram(
        conserve_step1_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_u0v0_boundary_program,
        data_2_array,
        data2_tex
      );
      // Set obstacle boundary.
      gpgpu.executeProgram(
        set_obstacle_boundary_program,
        data_1_2_array,
        data2_tex
      );
      // Relaxation.
      for (k = 0; k < relaxation_steps; k += 1) {
        // Step 2.
        gpgpu.executeProgram(
          conserve_step2_program,
          data_1_2_array,
          data2_tex
        );
      }
      // Step 3.
      gpgpu.executeProgram(
        conserve_step3_program,
        data_1_2_array,
        data2_tex
      );
      // Apply boundary.
      gpgpu.executeProgram(
        apply_uv_boundary_program,
        data_2_array,
        data2_tex
      );
    },

    diffuse = function () {
      var k;
      // Copy UV to U0V0.
      gpgpu.executeProgram(
        uv_to_u0v0_program,
        data_2_array,
        data2_tex
      );
      // Relaxation.
      for (k = 0; k < relaxation_steps; k += 1) {
        // Step 2.
        gpgpu.executeProgram(
          diffuse_program,
          data_1_2_array,
          data2_tex
        );

        // Apply boundary.
        gpgpu.executeProgram(
          apply_uv_boundary_program,
          data_2_array,
          data2_tex
        );
      }
    },

    setObstacleVelocity = function () {
      gpgpu.executeProgram(
        set_obstacle_velocity_program,
        data_1_2_3_array,
        data2_tex
      );
    },

    copyUVtoU0V0 = function () {
      gpgpu.executeProgram(
        uv_to_u0v0_program,
        data_2_array,
        data2_tex
      );
    },

    fluid_solver_gpu = {
      solve: function () {
        if (thermal_buoyancy !== 0) {
          applyBuoyancy();
        }
        setObstacleVelocity();
        if (viscosity > 0) {
          diffuse();
          conserve();
          setObstacleVelocity();
        }
        copyUVtoU0V0();
        macCormack();
        conserve();
        setObstacleVelocity();
        // Synchronize. It's not required but it 
        // allows to measure time (for optimization).
        gpgpu.tryFinish();
      }
    };

  // One-off initialization.
  init();

  return fluid_solver_gpu;
};

});

require.define("/physics-solvers/ray-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engine/physics-solvers/ray-solver.js
//

var
  arrays = require('../arrays/arrays.js').arrays,
  Photon = require('../photon.js').Photon;

exports.makeRaySolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options = model.getModelOptions(),
    lx = model_options.model_width,
    ly = model_options.model_height,
    timestep = model_options.timestep,
    sun_angle = Math.PI - model_options.sun_angle,
    ray_count = model_options.solar_ray_count,
    solar_power_density = model_options.solar_power_density,
    ray_power = model_options.solar_power_density,
    ray_speed = model_options.solar_ray_speed,
    photon_emission_interval = model_options.photon_emission_interval,

    delta_x = model_options.model_width / model.getGridWidth(),
    delta_y = model_options.model_height / model.getGridHeight(),

    // Simulation arrays provided by model.
    q       = model.getPowerArray(),
    parts   = model.getPartsArray(),
    photons = model.getPhotonsArray(),

    // Convenience variables.  
    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    //
    // Private methods
    //

    // TODO: implement something efficient. Linked list?
    cleanupPhotonsArray = function () {
      var i = 0;
      while (i < photons.length) {
        if (photons[i] === undefined) {
          photons.splice(i, 1);
        } else {
          i += 1;
        }
      }
    },

    applyBoundary = function () {
      var i, len, photon;
      for (i = 0, len = photons.length; i < len; i += 1) {
        if (!photons[i].isContained(0, lx, 0, ly)) {
          photons[i] = undefined;
        }
      }
      cleanupPhotonsArray();
    },

    isContained = function (x, y) {
      var
        i, len, part;
      for (i = 0, len = parts.length; i < len; i += 1) {
        if (parts[i].contains(x, y)) {
          return true;
        }
      }
      return false;
    },

    shootAtAngle = function (dx, dy) {
      var
        m = Math.floor(lx / dx),
        n = Math.floor(ly / dy),
        x, y, i;
      if (sun_angle >= 0 && sun_angle < 0.5 * Math.PI) {
        y = 0;
        for (i = 1; i <= m; i += 1) {
          x = dx * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
        x = 0;
        for (i = 0; i <= n; i += 1) {
          y = dy * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
      } else if (sun_angle < 0 && sun_angle >= -0.5 * Math.PI) {
        y = ly;
        for (i = 1; i <= m; i += 1) {
          x = dx * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
        x = 0;
        for (i = 0; i <= n; i += 1) {
          y = ly - dy * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
      } else if (sun_angle < Math.PI + 0.001 && sun_angle >= 0.5 * Math.PI) {
        y = 0;
        for (i = 0; i <= m; i += 1) {
          x = lx - dx * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
        x = lx;
        for (i = 1; i <= n; i += 1) {
          y = dy * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
      } else if (sun_angle >= -Math.PI && sun_angle < -0.5 * Math.PI) {
        y = ly;
        for (i = 0; i <= m; i += 1) {
          x = lx - dx * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
        x = lx;
        for (i = 1; i <= n; i += 1) {
          y = ly - dy * i;
          if (!isContained(x, y)) {
            photons.push(new Photon(x, y, ray_power, ray_speed, sun_angle));
          }
        }
      }
    };

  return {
    solve: function () {
      var
        factor = 1.0 / (timestep * photon_emission_interval),
        idx = 1.0 / delta_x,
        idy = 1.0 / delta_y,
        photon, part, x, y,
        i, j, photons_len, parts_len;

      for (i = 0, photons_len = photons.length; i < photons_len; i += 1) {
        photon = photons[i];
        photon.move(timestep);

        for (j = 0, parts_len = parts.length; j < parts_len; j += 1) {
          part = parts[j];
          if (part.reflect(photon, timestep)) {
            break;
          } else if (part.absorb(photon)) {
            x = Math.max(Math.min(Math.round(photon.x * idx), nx1), 0);
            y = Math.max(Math.min(Math.round(photon.y * idy), ny1), 0);
            q[x * ny + y] = photon.energy * factor;
            // Remove photon.
            photons[i] = undefined;
            break;
          }
        }
      }
      // Clean up absorbed photons.
      cleanupPhotonsArray();
      // Remove photons that are out of bounds.
      applyBoundary();
    },

    radiate: function () {
      var part, i, len;
      for (i = 0, len = parts.length; i < len; i += 1) {
        part = parts[i];
        if (part.emissivity > 0) {
          part.radiate(model);
        }
      }
    },

    sunShine: function () {
      var s, c, spacing;
      if (sun_angle < 0) {
        return;
      }
      s = Math.abs(Math.sin(sun_angle));
      c = Math.abs(Math.cos(sun_angle));
      spacing = s * ly < c * lx ? ly / c : lx / s;
      spacing /= ray_count;
      shootAtAngle(spacing / s, spacing / c);
    }
  };
};

});

require.define("/photon.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engine/photon.js
//

var
  hypot     = require('./utils/math.js').hypot,
  Line      = require('./utils/shape.js').Line,
  Rectangle = require('./utils/shape.js').Rectangle;

// 
// Photon class.
//
var Photon = exports.Photon = function (x, y, energy, c, angle) {
  'use strict';
  this.x = x;
  this.y = y;
  this.energy = energy;
  this.c = c;

  if (angle !== undefined) {
    this.vx = Math.cos(angle) * c;
    this.vy = Math.sin(angle) * c;
  }
};

Photon.prototype.isContained = function (xmin, xmax, ymin, ymax) {
  'use strict';
  return this.x >= xmin && this.x <= xmax && this.y >= ymin && this.y <= ymax;
};

Photon.prototype.move = function (dt) {
  'use strict';
  this.x += this.vx * dt;
  this.y += this.vy * dt;
};

Photon.prototype.reflectFromLine = function (line, time_step) {
  'use strict';
  var
    x1 = this.x,
    y1 = this.y,
    x2 = this.x - this.vx * time_step,
    y2 = this.y - this.vy * time_step,
    photon_line = new Line(x1, y1, x2, y2),
    vx = this.vx,
    vy = this.vy,
    r12, sin, cos, u, w;

  if (photon_line.intersectsLine(line)) {
    x1 = line.x1;
    y1 = line.y1;
    x2 = line.x2;
    y2 = line.y2;
    r12 = 1.0 / hypot(x1 - x2, y1 - y2);
    sin = (y2 - y1) * r12;
    cos = (x2 - x1) * r12;
    // Velocity component parallel to the line.
    u = vx * cos + vy * sin;
    // Velocity component perpendicular to the line.
    w = vy * cos - vx * sin;
    // Update velocities.
    this.vx = u * cos + w * sin;
    this.vy = u * sin - w * cos;
    return true;
  }
  return false;
};

Photon.prototype.reflectFromRectangle = function (rectangle, time_step) {
  'use strict';
  var
    x0 = rectangle.x,
    y0 = rectangle.y,
    x1 = rectangle.x + rectangle.width,
    y1 = rectangle.y + rectangle.height,
    dx, dy;

  dx = this.vx * time_step;
  if (this.x - dx < x0) {
    this.vx = -Math.abs(this.vx);
  } else if (this.x - dx > x1) {
    this.vx = Math.abs(this.vx);
  }
  dy = this.vy * time_step;
  if (this.y - dy < y0) {
    this.vy = -Math.abs(this.vy);
  } else if (this.y - dy > y1) {
    this.vy = Math.abs(this.vy);
  }
};

Photon.prototype.reflectFromPolygon = function (polygon, time_step) {
  'use strict';
  var
    line = new Line(), // no params, as this object will be reused many times
    i, len;

  for (i = 0, len = polygon.count - 1; i < len; i += 1) {
    line.x1 = polygon.x_coords[i];
    line.y1 = polygon.y_coords[i];
    line.x2 = polygon.x_coords[i + 1];
    line.y2 = polygon.y_coords[i + 1];
    if (this.reflectFromLine(line, time_step)) {
      return;
    }
  }
  line.x1 = polygon.x_coords[polygon.count - 1];
  line.y1 = polygon.y_coords[polygon.count - 1];
  line.x2 = polygon.x_coords[0];
  line.y2 = polygon.y_coords[0];
  this.reflectFromLine(line, time_step);
};

Photon.prototype.reflect = function (shape, time_step) {
  'use strict';
  // Check if part contains a photon BEFORE possible polygonization.
  if (!shape.contains(this.x, this.y)) {
    return false;
  }

  if (shape instanceof Rectangle) {
    // Rectangle also can be polygonized, but for performance reasons
    // use separate method.
    this.reflectFromRectangle(shape, time_step);
  } else {
    // Other shapes (ellipses, rings, polygons) - polygonize() first
    // (polygonize() for polygon returns itself).
    this.reflectFromPolygon(shape.polygonize(), time_step);
  }
  return true;
};

});

require.define("/utils/math.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engine/utils/math.js
//

exports.hypot = function (x, y) {
  'use strict';
  var t;
  x = Math.abs(x);
  y = Math.abs(y);
  t = Math.min(x, y);
  x = Math.max(x, y);
  y = t;
  return x * Math.sqrt(1 + (y / x) * (y / x));
};
});

require.define("/utils/shape.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engine/utils/shape.js
//

// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
exports.pointInsidePolygon = function (nvert, vertx, verty, testx, testy) {
  'use strict';
  var c = 0, i, j;
  for (i = 0, j = nvert - 1; i < nvert; j = i, i += 1) {
    if (((verty[i] > testy) !== (verty[j] > testy)) &&
        (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) {
      c = !c;
    }
  }
  return !!c;
};

//
// Line in 2D.
// 
// It is defined by two points - (x1, y1) and (x2, y2).
var Line = exports.Line = function (x1, y1, x2, y2) {
  'use strict';
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
};

Line.prototype.intersectsLine = function (line) {
  'use strict';
  var
    result,
    a1 = {x: this.x1, y: this.y1},
    a2 = {x: this.x2, y: this.y2},
    b1 = {x: line.x1, y: line.y1},
    b2 = {x: line.x2, y: line.y2},
    ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
    ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x),
    u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y),
    ua, ub;

  if (u_b !== 0) {
    ua = ua_t / u_b;
    ub = ub_t / u_b;

    if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
      result = true;
    } else {
      result = false;
    }
  } else {
    if (ua_t === 0 || ub_t === 0) {
      result = true;  // Coincident.
    } else {
      result = false; // Parallel.
    }
  }
  return result;
};

//
// Polygon.
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Polygon = exports.Polygon = function (count, x_coords, y_coords) {
  'use strict';
  this.count = count;
  this.x_coords = x_coords;
  this.y_coords = y_coords;
};

Polygon.prototype.polygonize = function () {
  'use strict';
  return this;
};

// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
Polygon.prototype.contains = function (x, y) {
  'use strict';
  var
    x_coords = this.x_coords,
    y_coords = this.y_coords,
    count = this.count,
    c = 0, i, j;

  for (i = 0, j = count - 1; i < count; j = i, i += 1) {
    if (((y_coords[i] > y) !== (y_coords[j] > y)) &&
        (x < (x_coords[j] - x_coords[i]) * (y - y_coords[i]) / (y_coords[j] - y_coords[i]) + x_coords[i])) {
      c = !c;
    }
  }
  // Convert to Boolean.
  return !!c;
};

//
// Rectangle.
// x, y - left-top corner
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Rectangle = exports.Rectangle = function (x, y, width, height) {
  'use strict';
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.polygon_cache = undefined;
};

Rectangle.prototype.polygonize = function () {
  'use strict';
  var
    x, y, w, h;

  if (!this.polygon_cache) {
    x = this.x;
    y = this.y;
    w = this.width;
    h = this.height;
    this.polygon_cache = new Polygon(4, [x, x + w, x + w, x], [y, y, y + h, y + h]);
  }
  return this.polygon_cache;
};

Rectangle.prototype.contains = function (x, y) {
  'use strict';
  return x >= this.x && x <= this.x + this.width &&
         y >= this.y && y <= this.y + this.height;
};

// Helper function, used by Ellipse and Ring.
var polygonizeEllipse = function (x, y, ra, rb, segments) {
  'use strict';
  var
    vx = new Array(segments),
    vy = new Array(segments),
    delta = 2 * Math.PI / segments,
    theta, i;

  for (i = 0; i < segments; i += 1) {
    theta = delta * i;
    vx[i] = x + ra * Math.cos(theta);
    vy[i] = y + rb * Math.sin(theta);
  }
  return new Polygon(segments, vx, vy);
};

//
// Ellipse.
// x, y - center
// a, b - diameter (not radius)
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Ellipse = exports.Ellipse = function (x, y, a, b) {
  'use strict';
  this.x = x;
  this.y = y;
  this.a = a;
  this.b = b;
  this.polygon_cache = undefined;
};

Ellipse.prototype.POLYGON_SEGMENTS = 50;

Ellipse.prototype.polygonize = function () {
  'use strict';
  if (!this.polygon_cache) {
    this.polygon_cache = polygonizeEllipse(this.x, this.y, this.a * 0.5, this.b * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache;
};

Ellipse.prototype.contains = function (x, y) {
  'use strict';
  var
    px = x - this.x,
    py = y - this.y,
    ra = this.a * 0.5,
    rb = this.b * 0.5;

  return px * px / (ra * ra) + py * py / (rb * rb) <= 1;
};

//
// Ring.
// x, y - center
// inner, outer - diameter (not radius)
//
// Implements Shape2D interface:
// - polygonize()
// - contains(x, y)
var Ring = exports.Ring = function (x, y, inner, outer) {
  'use strict';
  this.x = x;
  this.y = y;
  this.inner = inner;
  this.outer = outer;
  this.polygon_cache = undefined;
};

Ring.prototype.POLYGON_SEGMENTS = 50;

// Returns OUTER circle polygonization.
Ring.prototype.polygonize = function () {
  'use strict';
  if (!this.polygon_cache) {
    this.polygon_cache = polygonizeEllipse(this.x, this.y, this.outer * 0.5, this.outer * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache;
};

// Returns INNER circle polygonization.
Ring.prototype.polygonizeInner = function () {
  'use strict';
  var x, y, r, vx, vy, line, delta, theta, i, len;

  if (!this.polygon_cache_inner) {
    this.polygon_cache_inner = polygonizeEllipse(this.x, this.y, this.inner * 0.5, this.inner * 0.5, this.POLYGON_SEGMENTS);
  }
  return this.polygon_cache_inner;
};

Ring.prototype.contains = function (x, y) {
  'use strict';
  var
    px = x - this.x,
    py = y - this.y,
    ra_outer = this.outer * 0.5,
    rb_outer = this.outer * 0.5,
    ra_inner = this.inner * 0.5,
    rb_inner = this.inner * 0.5;

  return (px * px / (ra_outer * ra_outer) + py * py / (rb_outer * rb_outer) <= 1) &&
         (px * px / (ra_inner * ra_inner) + py * py / (rb_inner * rb_inner) >= 1);
};
});

require.define("/part.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK (complaining only about Array(size) constructor)
//
// lab/models/energy2d/engines/this.js
//

var
  default_config = require('./default-config.js'),
  constants      = require('./constants.js'),
  Photon         = require('./photon.js').Photon,
  hypot          = require('./utils/math.js').hypot,
  shape_utils    = require('./utils/shape.js'),
  Line           = require('./utils/shape.js').Line,
  Polygon        = require('./utils/shape.js').Polygon,
  Rectangle      = require('./utils/shape.js').Rectangle,
  Ellipse        = require('./utils/shape.js').Ellipse,
  Ring           = require('./utils/shape.js').Ring,

  // Part's constants.
  RADIATOR_SPACING = 0.5,
  MINIMUM_RADIATING_TEMPERATUE = 20,
  UNIT_SURFACE_AREA = 100,
  SIN30 = Math.sin(Math.PI / 6),
  COS30 = Math.cos(Math.PI / 6),
  SIN60 = Math.sin(Math.PI / 3),
  COS60 = Math.cos(Math.PI / 3);

var Part = exports.Part = function (options) {
  'use strict';
  var count, i, s;

  options = default_config.fillWithDefaultValues(options, default_config.DEFAULT_VALUES.part);

  // Validate and process options.

  // Check shape
  if (options.rectangle) {
    s = this.rectangle = options.rectangle;
    this.shape = new Rectangle(s.x, s.y, s.width, s.height);
  } else if (options.ellipse) {
    s = this.ellipse = options.ellipse;
    this.shape = new Ellipse(s.x, s.y, s.a, s.b);
  } else if (options.ring) {
    s = this.ring = options.ring;
    this.shape = new Ring(s.x, s.y, s.inner, s.outer);
  } else if (options.polygon) {
    this.polygon = options.polygon;
    if (typeof (this.polygon.vertices) === "string") {
      count = this.polygon.count;
      this.polygon.vertices = this.polygon.vertices.split(', ');
      this.polygon.x_coords = [];
      this.polygon.y_coords = [];
      if (count * 2 !== this.polygon.vertices.length) {
        throw new Error("Part: polygon contains different vertices count than declared in the count parameter.");
      }
      for (i = 0; i < count; i += 1) {
        this.polygon.x_coords[i] = this.polygon.vertices[2 * i]     = Number(this.polygon.vertices[2 * i]);
        this.polygon.y_coords[i] = this.polygon.vertices[2 * i + 1] = Number(this.polygon.vertices[2 * i + 1]);
      }
      this.shape = new Polygon(count, this.polygon.x_coords, this.polygon.y_coords);
    }
  } else {
    throw new Error("Part: shape not defined.");
  }

  // source properties
  this.thermal_conductivity = options.thermal_conductivity;
  this.specific_heat = options.specific_heat;
  this.density = options.density;
  this.temperature = options.temperature;
  this.constant_temperature = options.constant_temperature;
  this.power = options.power;
  this.wind_speed = options.wind_speed;
  this.wind_angle = options.wind_angle;

  // optics properties
  this.transmission = options.transmission;
  this.reflection = options.reflection;
  this.absorption = options.absorption;
  this.emissivity = options.emissivity;

  // visual properties
  this.visible = options.visible;
  this.filled = options.filled;
  this.color = options.color;
  this.texture = options.texture;
  this.label = options.label;
};

Part.prototype.getLabel = function () {
  'use strict';
  var label = this.label, s;

  if (label === "%temperature") {
    s = this.temperature + " \u00b0C";
  } else if (label === "%density") {
    s = this.density + " kg/m\u00b3";
  } else if (label === "%specific_heat") {
    s = this.specific_heat + " J/(kg\u00d7\u00b0C)";
  } else if (label === "%thermal_conductivity") {
    s = this.thermal_conductivity + " W/(m\u00d7\u00b0C)";
  } else if (label === "%power_density") {
    s = this.power + " W/m\u00b3";
  } else if (label === "%area") {
    if (this.rectangle) {
      s = (this.rectangle.width * this.rectangle.height) + " m\u00b2";
    } else if (this.ellipse) {
      s = (this.ellipse.width * this.ellipse.height * 0.25 * Math.PI) + " m\u00b2";
    }
  } else if (label === "%width") {
    if (this.rectangle) {
      s = this.rectangle.width + " m";
    } else if (this.ellipse) {
      s = this.ellipse.width + " m";
    }
  } else if (label === "%height") {
    if (this.rectangle) {
      s = this.rectangle.height + " m";
    } else if (this.ellipse) {
      s = this.ellipse.height + " m";
    }
  } else {
    s = label;
  }
  return s;
};

// Returns cells occupied by part on the given grid
// Grid is described by:
//   nx - grid columns count
//   ny - grid rows count
//   lx - grid width
//   ly - grid height
// TODO: refactor it, probably using contains method.
Part.prototype.getGridCells = function (nx, ny, lx, ly) {
  'use strict';
  var
    nx1 = nx - 1,
    ny1 = ny - 1,
    dx = nx1 / lx,
    dy = ny1 / ly,

    rectangleIndices = function (rect) {
      var i, j, i0, j0, i_max, j_max, idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(rect.x * dx), 0), nx1);
      j0 = Math.min(Math.max(Math.ceil(rect.y * dy), 0), ny1);
      i_max = Math.min(Math.max(Math.floor((rect.x + rect.width) * dx), 0), nx1);
      j_max = Math.min(Math.max(Math.floor((rect.y + rect.height) * dy), 0), ny1);
      indices = new Array((i_max - i0 + 1) * (j_max - j0 + 1));
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        for (j = j0; j <= j_max; j += 1) {
          indices[idx += 1] = i * ny + j;
        }
      }
      return indices;
    },

    ellipseIndices = function (ellipse) {
      var
        px = ellipse.x * dx,
        py = ellipse.y * dy,
        ra = ellipse.a * 0.5 * dx,
        rb = ellipse.b * 0.5 * dy,
        eq, i, i0, i_max, j, j0, j_max,
        idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
      i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);
      indices = [];
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
        // to get range of y (=> j)
        eq = Math.sqrt(1 - (i - px) * (i - px) / (ra * ra));
        j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
        j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);
        for (j = j0; j <= j_max; j += 1) {
          indices[idx += 1] = i * ny + j;
        }
      }
      return indices;
    },

    ringIndices = function (ring) {
      var
        px = ring.x * dx,
        py = ring.y * dy,
        ra = ring.outer * 0.5 * dx,
        rb = ring.outer * 0.5 * dy,
        ra_inner = ring.inner * 0.5 * dx,
        rb_inner = ring.inner * 0.5 * dy,
        i, i0, i_max, j, j0, j1, j2, j_max, eq,
        idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
      i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);

      for (i = i0; i <= i_max; i += 1) {
        // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
        // to get range of y (=> j)
        eq = Math.sqrt(1 - (i - px) * (i - px) / (ra * ra));
        j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
        j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);

        if (Math.abs(i - px) < ra_inner) {
          // also calculate inner ellipse
          eq = Math.sqrt(1 - (i - px) * (i - px) / (ra_inner * ra_inner));
          j1 = Math.min(Math.max(Math.ceil(py - rb_inner * eq), 0), ny1);
          j2 = Math.min(Math.max(Math.floor(py + rb_inner * eq), 0), ny1);
          for (j = j0; j <= j1; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
          for (j = j2; j <= j_max; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
        } else {
          // consider only outer ellipse
          for (j = j0; j <= j_max; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
        }
      }
      return indices;
    },

    polygonIndices = function (polygon) {
      var
        count = polygon.count,
        verts = polygon.vertices,
        x_coords = new Array(count),
        y_coords = new Array(count),
        x_min = Number.MAX_VALUE, x_max = Number.MIN_VALUE,
        y_min = Number.MAX_VALUE, y_max = Number.MIN_VALUE,
        i, i0, i_max, j, j0, j_max,
        idx, indices = [];

      for (i = 0; i < count; i += 1) {
        x_coords[i] = verts[i * 2] * dx;
        y_coords[i] = verts[i * 2 + 1] * dy;
        if (x_coords[i] < x_min) {
          x_min = x_coords[i];
        }
        if (x_coords[i] > x_max) {
          x_max = x_coords[i];
        }
        if (y_coords[i] < y_min) {
          y_min = y_coords[i];
        }
        if (y_coords[i] > y_max) {
          y_max = y_coords[i];
        }
      }

      i0 = Math.min(Math.max(Math.round(x_min), 0), nx1);
      j0 = Math.min(Math.max(Math.round(y_min), 0), ny1);
      i_max = Math.min(Math.max(Math.round(x_max), 0), nx1);
      j_max = Math.min(Math.max(Math.round(y_max), 0), ny1);
      indices = [];
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        for (j = j0; j <= j_max; j += 1) {
          if (shape_utils.pointInsidePolygon(count, x_coords, y_coords, i, j)) {
            indices[idx += 1] = i * ny + j;
          }
        }
      }
      return indices;
    };

  if (this.rectangle) {
    return rectangleIndices(this.rectangle);
  }
  if (this.ellipse) {
    return ellipseIndices(this.ellipse);
  }
  if (this.ring) {
    return ringIndices(this.ring);
  }
  if (this.polygon) {
    return polygonIndices(this.polygon);
  }
  throw new Error("Part: unknown shape.");
};

// Tests if the specified coordinates are inside the boundary of the Part.
Part.prototype.contains = function (x, y) {
  'use strict';
  return this.shape.contains(x, y);
};

// Test whether part reflects given Photon p.
Part.prototype.reflect = function (p, time_step) {
  'use strict';
  // Try to reflect when part's reflection equals ~1.
  if (Math.abs(this.reflection - 1) < 0.001) {
    return p.reflect(this.shape, time_step);
  }
  // Other case.
  return false;
};

// Test whether part absorbs given Photon p.
Part.prototype.absorb = function (p) {
  'use strict';
  // Absorb when absorption equals ~1 and photon is inside part's shape.
  if (Math.abs(this.absorption - 1) < 0.001) {
    return this.shape.contains(p.x, p.y);
  }
  // Other case.
  return false;
};

Part.prototype.getIrradiance = function (temperature) {
  'use strict';
  var t2;
  if (this.emissivity === 0) {
    return 0;
  }
  t2 = 273 + temperature;
  t2 *= t2;
  return this.emissivity * constants.STEFAN_CONSTANT * UNIT_SURFACE_AREA * t2 * t2;
};

// Emit photons if part meets radiation conditions.
Part.prototype.radiate = function (model) {
  'use strict';
  var
    // The shape is polygonized and radiateFromLine() is called for each line.
    poly = this.shape.polygonize(),
    line = new Line(),
    i, len;

  if (this.emissivity === 0) {
    return;
  }
  // Must follow the clockwise direction in setting lines.
  for (i = 0, len = poly.count - 1; i < len; i += 1) {
    line.x1 = poly.x_coords[i];
    line.y1 = poly.y_coords[i];
    line.x2 = poly.x_coords[i + 1];
    line.y2 = poly.y_coords[i + 1];
    this.radiateFromLine(model, line);
  }
  line.x1 = poly.x_coords[poly.count - 1];
  line.y1 = poly.y_coords[poly.count - 1];
  line.x2 = poly.x_coords[0];
  line.y2 = poly.y_coords[0];
  this.radiateFromLine(model, line);
};

// Helper function for radiate() method.
Part.prototype.radiateFromLine = function (model, line) {
  'use strict';
  var options, length, cos, sin, n, x, y, p, d, vx, vy, vxi, vyi, nray, ir,
    i, k;

  if (this.emissivity === 0) {
    return;
  }
  options = model.getModelOptions();
  length = hypot(line.x1 - line.x2, line.y1 - line.y2);
  cos = (line.x2 - line.x1) / length;
  sin = (line.y2 - line.y1) / length;
  n = Math.max(1, Math.round(length / RADIATOR_SPACING));
  vx = options.solar_ray_speed * sin;
  vy = -options.solar_ray_speed * cos;
  if (n === 1) {
    d = 0.5 * length;
    x = line.x1 + d * cos;
    y = line.y1 + d * sin;
    d = model.getAverageTemperatureAt(x, y);
    if (d > MINIMUM_RADIATING_TEMPERATUE) {
      d = model.getTemperatureAt(x, y);
      p = new Photon(x, y, this.getIrradiance(d), options.solar_ray_speed);
      p.vx = vx;
      p.vy = vy;
      model.addPhoton(p);
      if (!this.constant_temperature) {
        model.setTemperatureAt(x, y, d - p.energy / this.specific_heat);
      }
    }
  } else {
    vxi = new Array(4);
    vyi = new Array(4);
    vxi[0] = vx * COS30 - vy * SIN30;
    vyi[0] = vx * SIN30 + vy * COS30;
    vxi[1] = vy * SIN30 + vx * COS30;
    vyi[1] = vy * COS30 - vx * SIN30;
    vxi[2] = vx * COS60 - vy * SIN60;
    vyi[2] = vx * SIN60 + vy * COS60;
    vxi[3] = vy * SIN60 + vx * COS60;
    vyi[3] = vy * COS60 - vx * SIN60;
    nray = 1 + vxi.length;
    for (i = 0; i < n; i += 1) {
      d = (i + 0.5) * RADIATOR_SPACING;
      x = line.x1 + d * cos;
      y = line.y1 + d * sin;
      d = model.getAverageTemperatureAt(x, y);
      ir = this.getIrradiance(d) / nray;
      if (d > MINIMUM_RADIATING_TEMPERATUE) {
        p = new Photon(x, y, ir, options.solar_ray_speed);
        p.vx = vx;
        p.vy = vy;
        model.addPhoton(p);
        for (k = 0; k < nray - 1; k += 1) {
          p = new Photon(x, y, ir, options.solar_ray_speed);
          p.vx = vxi[k];
          p.vy = vyi[k];
          model.addPhoton(p);
        }
        if (!this.constant_temperature) {
          model.changeAverageTemperatureAt(x, y, -ir * nray / this.specific_heat);
        }
      }
    }
  }
};

});

require.define("/default-config.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engines/default-config.js
//

var constants = require('./constants.js');

// This object defines default values for different configuration objects.
//
// It's used to provide a default value of property if it isn't defined.
// Object contains some undefined values to show that they are available, but optional.
exports.DEFAULT_VALUES = {
  // Default model properties.
  "model": {
    "use_WebGL": false,
    "grid_width": 100,
    "grid_height": 100,

    "model_width": 10,
    "model_height": 10,
    "timestep": 1,
    "convective": true,

    "background_temperature": 0,
    "background_conductivity": constants.AIR_THERMAL_CONDUCTIVITY,
    "background_specific_heat": constants.AIR_SPECIFIC_HEAT,
    "background_density": constants.AIR_DENSITY,
    "background_viscosity": constants.AIR_VISCOSITY,

    "thermal_buoyancy": 0.00025,
    "buoyancy_approximation": 1,

    "boundary": {
      "temperature_at_border": {
        "upper": 0,
        "lower": 0,
        "left": 0,
        "right": 0
      }
    },

    "measurement_interval": 500,        // unnecessary
    "viewupdate_interval": 100,         // unnecessary
    "stoptime": undefined,              // unnecessary
    "sunny": false,
    "sun_angle": 1.5707964,
    "solar_power_density": 2000,
    "solar_ray_count": 24,
    "solar_ray_speed": 0.1,
    "photon_emission_interval": 20,

    "structure": undefined
    // Structure can be undefined.
    // However, its desired form is:
    // "structure": {
    //   "part": [ 
    //     {
    //       ... part definition (see part fallback values below)
    //     },
    //     {
    //       ... second part definition
    //     },
    //   ]
    // }
  },

  // Default part properties.
  "part": {
    "thermal_conductivity": 1,
    "specific_heat": 1300,
    "density": 25,
    "transmission": 0,
    "reflection": 0,
    "absorption": 1,
    "emissivity": 0,
    "temperature": 0,
    "constant_temperature": false,
    "power": 0,
    "wind_speed": 0,
    "wind_angle": 0,
    "visible": true,
    "filled": true,
    "color": "gray",
    "label": undefined,
    "texture": undefined,
    // Texture can be undefined.
    // However, its desired form is (contains example values):
    // {
    //   "texture_fg": -0x1000000,
    //   "texture_bg": -0x7f7f80,
    //   "texture_style": 12,
    //   "texture_width": 12,
    //   "texture_height": 12
    // },
    "uid": undefined,       // unnecessary (not yet implemented)    
    "draggable": true       // unnecessary (not yet implemented)

    // Part should declare also *ONE* of available shapes:
    // 
    // "rectangle": {
    //   "x": 5,
    //   "y": 5,
    //   "width": 2,
    //   "height": 2
    // },
    // "ellipse": {
    //   "x": 5,
    //   "y": 5,
    //   "a": 3,
    //   "b": 3
    // },
    // "ring": {
    //   "x": 5,
    //   "y": 5,
    //   "inner": 1,
    //   "outer": 2
    // },
    // "polygon": {
    //   "count": 3,                    // Vertices count.
    //   "vertices": "1, 1, 2, 2, 3, 3" // String with coordinates.   
    // },
  }
};


// Returns configuration with default properties if the given configuration is not declaring them.
// Existing properties are copied into result.
exports.fillWithDefaultValues = function (config, default_config) {
  'use strict';
  var
    name,
    result,
    clone = function (obj) {
      // Clone to avoid situation when modification of the configuration
      // alters global default configuration.
      if (obj === undefined) {
        return undefined;
      }
      // a way of deep-cloning objects
      return JSON.parse(JSON.stringify(obj));
    };

  if (config === undefined) {
    // Return just default properties.
    return clone(default_config);
  }

  // Keep existing properties
  result = clone(config);
  // and add defaults.
  for (name in default_config) {
    if (default_config.hasOwnProperty(name) && config[name] === undefined) {
      result[name] = clone(default_config[name]);
    }
  }
  return result;
};

});

require.define("/constants.js", function (require, module, exports, __dirname, __filename) {
//
// lab/models/energy2d/engines/constants.js
//

// Basic constants used by Energy2D module
// TODO: follow convention of MD2D constants module


exports.AIR_THERMAL_CONDUCTIVITY = 0.025;       // Air's thermal conductivity = 0.025 W/(m*K)
exports.AIR_SPECIFIC_HEAT = 1012;               // Air's specific heat = 1012 J/(kg*K)
exports.AIR_DENSITY = 1.204;                    // Air's density = 1.204 kg/m^3 at 25 C

// By default, air's kinematic viscosity = 1.568 x 10^-5 m^2/s at 27 C is
// used. It can be set to zero for inviscid fluid.
exports.AIR_VISCOSITY = 0.00001568;


// Stefan's constant unit J/(s*m^2*K^-4)
exports.STEFAN_CONSTANT = 0.0000000567;
});

require.define("/core-model.js", function (require, module, exports, __dirname, __filename) {
    /*globals Float32Array: false, energy2d: false */
/*jslint indent: 2, node: true, browser: true */
// JSLint report: OK (complains about 'new' for side effect and Array(size) constructor)
//
// lab/models/energy2d/engines/core-model.js
//

var
  arrays          = require('./arrays/arrays.js').arrays,
  heatsolver      = require('./physics-solvers/heat-solver.js'),
  heatsolver_GPU  = require('./physics-solvers-gpu/heat-solver-gpu.js'),
  fluidsolver     = require('./physics-solvers/fluid-solver.js'),
  fluidsolver_GPU = require('./physics-solvers-gpu/fluid-solver-gpu.js'),
  raysolver       = require('./physics-solvers/ray-solver.js'),
  part            = require('./part.js'),
  default_config  = require('./default-config.js'),
  gpgpu,       // = energy2d.utils.gpu.gpgpu - assign it only when WebGL requested (initGPGPU), 
               //   as it is unavailable in the node.js environment.

  array_type = (function () {
    'use strict';
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

    // WebGL GPGPU optimization.
    use_WebGL = opt.use_WebGL,
    // This variable holds possible error message connected with WebGL.
    WebGL_error,

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

    // Performance model.
    // By default, mock this object.
    // To measure performance, set valid object
    // using core_model.setPerformanceTools(tools);
    perf = {
      start: function () {},
      stop: function () {},
      startFPS: function () {},
      updateFPS: function () {},
      stopFPS: function () {}
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
    initGPGPU = function () {
      // Make sure that environment is a browser.
      if (typeof window === 'undefined') {
        throw new Error("Core model: WebGL GPGPU unavailable in the node.js environment.");
      }
      // Request GPGPU utilities.
      gpgpu = energy2d.utils.gpu.gpgpu;
      // Init module.
      // Width is ny, height is nx (due to data organization).
      try {
        gpgpu.init(ny, nx);
      } catch (e) {
        // If WebGL initialization fails, just use CPU.
        use_WebGL = false;
        // Set error message.
        WebGL_error = e.message;
        // TODO: inform better.
        console.warn("WebGL initialization failed. Energy2D will use CPU solvers.");
        return;
      }
      // Create simulation textures.
      texture[0] = gpgpu.createTexture();
      texture[1] = gpgpu.createTexture();
      texture[2] = gpgpu.createTexture();
      texture[3] = gpgpu.createTexture();

      // Update textures as material properties should be already set.
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

      // Create GPU solvers.
      // GPU version of heat solver.
      heat_solver_gpu = heatsolver_GPU.makeHeatSolverGPU(core_model);
      // GPU version of fluid solver.
      fluid_solver_gpu = fluidsolver_GPU.makeFluidSolverGPU(core_model);
    },

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

    refreshPowerArray = function () {
      var part, x, y, i, iny, j, k, len;
      for (i = 0; i < nx; i += 1) {
        x = i * delta_x;
        iny = i * ny;
        for (j = 0; j < ny; j += 1) {
          y = j * delta_y;
          q[iny + j] = 0;
          if (has_part_power) {
            for (k = 0, len = parts.length; k < len; k += 1) {
              part = parts[k];
              if (part.power !== 0 && part.shape.contains(x, y)) {
                // No overlap of parts will be allowed.
                q[iny + j] = part.getPower();
                break;
              }
            }
          }
        }
      }
    },

    //
    // Public API
    //
    core_model = {
      // !!!
      // Performs next step of a simulation.
      // !!!
      nextStep: function () {
        perf.start('Core model step');
        if (use_WebGL) {
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
      setPerformanceTools: function (perf_tools) {
        perf = perf_tools;
      },

      isWebGLActive: function () {
        return use_WebGL;
      },

      getWebGLError: function () {
        return WebGL_error;
      },

      updateTemperatureArray: function () {
        if (use_WebGL) {
          perf.start('Read temperature texture');
          gpgpu.readTexture(texture[0], t);
          perf.stop('Read temperature texture');
        }
      },

      updateVelocityArrays: function () {
        if (use_WebGL) {
          perf.start('Read velocity texture');
          gpgpu.readTexture(texture[2], u, 0);
          gpgpu.readTexture(texture[2], v, 1);
          perf.stop('Read velocity texture');
        }
      },

      getIndexOfStep: function () {
        return indexOfStep;
      },
      // Returns loaded options after validation.
      getModelOptions: function () {
        return opt;
      },

      // Temperature manipulation.
      getTemperatureAt: function (x, y) {
        var
          i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0);

        return t[i * ny + j];
      },

      setTemperatureAt: function (x, y, temperature) {
        var
          i = Math.max(Math.min(nx - 1, Math.round(x / delta_x)), 0),
          j = Math.max(Math.min(ny - 1, Math.round(y / delta_y)), 0);

        t[i * ny + j] = temperature;
      },

      getAverageTemperatureAt: function (x, y) {
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
      changeAverageTemperatureAt: function (x, y, increment) {
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

      addPhoton: function (photon) {
        photons.push(photon);
      },

      removePhoton: function (photon) {
        var idx = photons.indexOf(photon);
        if (idx !== -1) {
          photons.splice(idx, 1);
        }
      },

      copyTextureToArray: function (tex, array) {
        gpgpu.readTexture(tex, array);
      },

      copyArrayToTexture: function (array, tex) {
        gpgpu.writeTexture(tex, array);
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
      getPerformanceModel: function () {
        return perf;
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
      getPhotonsArray: function () {
        return photons;
      },
      getPartsArray: function () {
        return parts;
      },
       // Textures.
      getTemperatureTexture: function () {
        return texture[0];
      },
      getVelocityTexture: function () {
        return texture[2];
      },
      getSimulationTexture: function (id) {
        return texture[id];
      }
    };

  // 
  // One-off initialization.
  //

  // Setup optimization flags.
  radiative = (function () {
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

  has_part_power = (function () {
    var i, len;
    for (i = 0, len = parts.length; i < len; i += 1) {
      if (parts[i].power > 0) {
        return true;
      }
    }
    return false;
  }());

  setupMaterialProperties();

  // CPU version of solvers.
  heatSolver = heatsolver.makeHeatSolver(core_model);
  fluidSolver = fluidsolver.makeFluidSolver(core_model);
  ray_solver = raysolver.makeRaySolver(core_model);

  if (use_WebGL) {
    initGPGPU();
  }

  // Finally, return public API object.
  return core_model;
};

});
require("/core-model.js");
