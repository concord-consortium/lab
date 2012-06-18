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
  if (source.buffer && source.buffer.__proto__.constructor) {
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
// lab/models/energy2d/engines/heat-solver.js
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

require.define("/physics-solvers/fluid-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK
//
// lab/models/energy2d/engines/fluid-solver.js
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

require.define("/part.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK (complaining only about Array(size) constructor)
//
// lab/models/energy2d/engines/this.js
//

// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
var
  default_config = require('./default-config.js'),

  pointInsidePolygon = function (nvert, vertx, verty, testx, testy) {
    'use strict';
    var c = 0, i, j;
    for (i = 0, j = nvert - 1; i < nvert; j = i += 1) {
      if (((verty[i] > testy) !== (verty[j] > testy)) && (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) {
        c = !c;
      }
    }
    return c;
  };

exports.Part = function (options) {
  'use strict';
  var count, i;

  options = default_config.fillWithDefaultValues(options, default_config.DEFAULT_VALUES.part);

  // Validate and process options.

  // Check shape
  if (options.rectangle) {
    this.rectangle = options.rectangle;
  } else if (options.ellipse) {
    this.ellipse = options.ellipse;
  } else if (options.ring) {
    this.ring = options.ring;
  } else if (options.polygon) {
    this.polygon = options.polygon;
  } else {
    throw new Error("Part: shape not defined.");
  }

  if (this.polygon && typeof (this.polygon.vertices) === "string") {
    count = this.polygon.count;
    this.polygon.vertices = this.polygon.vertices.split(', ');
    if (count * 2 !== this.polygon.vertices.length) {
      throw new Error("Part: polygon contains different vertices count than declared in the count parameter.");
    }
    for (i = 0; i < count * 2; i += 1) {
      this.polygon.vertices[i] = Number(this.polygon.vertices[i]);
    }
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

  // visual properties
  this.visible = options.visible;
  this.filled = options.filled;
  this.color = options.color;
  this.texture = options.texture;
  this.label = options.label;
};

exports.Part.prototype.getLabel = function () {
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
exports.Part.prototype.getGridCells = function (nx, ny, lx, ly) {
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
          if (pointInsidePolygon(count, x_coords, y_coords, i, j)) {
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
    "model_width": 10,
    "model_height": 10,
    "timestep": 0.1,
    "convective": true,

    "background_conductivity": 10 * constants.AIR_THERMAL_CONDUCTIVITY,
    "background_specific_heat": constants.AIR_SPECIFIC_HEAT,
    "background_density": constants.AIR_DENSITY,
    "background_temperature": 0,
    "background_viscosity": 10 * constants.AIR_VISCOSITY,

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

    "measurement_interval": 100,        // unnecessary
    "viewupdate_interval": 20,          // unnecessary
    "stoptime": undefined,              // unnecessary
    "sunny": true,                      // unnecessary (ray solver not implemented)
    "sun_angle": 1.5707964,             // unnecessary (ray solver not implemented)
    "solar_power_density": 20000,       // unnecessary (ray solver not implemented)
    "solar_ray_count": 24,              // unnecessary (ray solver not implemented)
    "solar_ray_speed": 0.001,           // unnecessary (ray solver not implemented)
    "photon_emission_interval": 5,      // unnecessary (ray solver not implemented)

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
    "transmission": 0,  // unnecessary, optical properties (not implemented)    
    "reflection": 0,    // unnecessary, optical properties (not implemented)
    "absorption": 1,    // unnecessary, optical properties (not implemented)
    "emissivity": 0,    // unnecessary, optical properties (not implemented)
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
});

require.define("/core-model.js", function (require, module, exports, __dirname, __filename) {
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

});
require("/core-model.js");
