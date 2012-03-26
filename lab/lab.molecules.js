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
  fill = fill || 0;
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
  dest.length = len;
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

require.define("/math/index.js", function (require, module, exports, __dirname, __filename) {
exports.normal              = require('./distributions').normal;
exports.getWindowedAverager = require('./utils').getWindowedAverager;

});

require.define("/math/distributions.js", function (require, module, exports, __dirname, __filename) {
/*jslint eqnull: true */

// Simple (Box-Muller) univariate-normal random number generator.
//
// The 'science.js' library includes a Box-Muller implementation which is likely to be slower, especially in a
// modern Javascript engine, because it uses a rejection method to pick the random point in the unit circle.
// See discussion on pp. 1-3 of:
// http://www.math.nyu.edu/faculty/goodman/teaching/MonteCarlo2005/notes/GaussianSampling.pdf
//
exports.normal = (function() {
  var next = null;

  return function(mean, sd) {
    if (mean == null) mean = 0;
    if (sd == null)   sd = 1;

    var r, ret, theta, u1, u2;

    if (next) {
      ret  = next;
      next = null;
      return ret;
    }

    u1    = Math.random();
    u2    = Math.random();
    theta = 2 * Math.PI * u1;
    r     = Math.sqrt(-2 * Math.log(u2));

    next = mean + sd * (r * Math.sin(theta));
    return mean + sd * (r * Math.cos(theta));
  };
}());

});

require.define("/math/utils.js", function (require, module, exports, __dirname, __filename) {
/*jslint eqnull: true */
/**
  Returns a function which accepts a single numeric argument and returns:

   * the arithmetic mean of the windowSize most recent inputs, including the current input
   * NaN if there have not been windowSize inputs yet.

  The default windowSize is 1000.

*/
exports.getWindowedAverager = function(windowSize) {
  if (windowSize == null) windowSize = 1000;      // default window size

  var i = 0,
      vals = [],
      sum_vals = 0;

  return function(val) {
    sum_vals -= (vals[i] || 0);
    sum_vals += val;
    vals[i] = val;

    if (++i === windowSize) i = 0;

    if (vals.length === windowSize) {
      return sum_vals / windowSize;
    }
    else {
      // don't allow any numerical comparisons with result to be true
      return NaN;
    }
  }
};

});

require.define("/potentials/index.js", function (require, module, exports, __dirname, __filename) {
var potentials = exports.potentials = {};

exports.coulomb = require('./coulomb').coulomb;
exports.getLennardJonesCalculator = require('./lennard-jones').getLennardJonesCalculator;

});

require.define("/potentials/coulomb.js", function (require, module, exports, __dirname, __filename) {
var coulomb = exports.coulomb = {};

var k_e = -50;            // Coulomb constant

coulomb.potential = function(r, q1, q2) {
  return -k_e * ((q1 * q2) / r);
};

coulomb.force = function(r, q1, q2) {
  return coulomb.forceFromSquaredDistance(r*r);
};

coulomb.forceFromSquaredDistance = function(r_sq, q1, q2) {
  return k_e * ((q1 * q2) / r_sq);
};

});

require.define("/potentials/lennard-jones.js", function (require, module, exports, __dirname, __filename) {
/**
  Returns a new object with methods for calculating the force and potential for a Lennard-Jones
  potential with particular values of its parameters epsilon and sigma. These can be adjusted.

  To avoid the needing to take square roots during calculation of pairwise forces, there are
  also methods which calculate the inter-particle potential directly from a squared distance, and
  which calculate the quantity (force/distance) directly from a squared distance.

  This function also accepts a callback function which will be called with a hash representing
  the new coefficients, whenever the LJ coefficients are changed for the returned calculator.
*/
exports.getLennardJonesCalculator = function(cb) {

  var epsilon = -1.0,   // depth of the potential well
      sigma   =  4.0,   // distance from particle at which the potential is 0

      rmin,             // distance from particle at which the potential is minimimal, and equal to -epsilon
      alpha,            // precalculated from epsilon and sigma for computational convenience
      beta,             // precalculated from epsilon and sigma for computational convenience

      coefficients = function(e, s) {
        if (arguments.length) {
          epsilon = e;
          sigma   = s;
          rmin    = Math.pow(2, 1/6) * sigma;
          alpha   = 4 * epsilon * Math.pow(sigma, 12);
          beta    = 4 * epsilon * Math.pow(sigma, 6);
        }

        var coefficients = {
          epsilon: epsilon,
          sigma  : sigma,
          rmin   : rmin,
          alpha  : alpha,
          beta   : beta
        };

        if (typeof cb === 'function') cb(coefficients);

        return coefficients;
      },

      potentialFromSquaredDistance = function(r_sq) {
        return -(alpha*Math.pow(r_sq, -6) - beta*Math.pow(r_sq, -3));
      },

      forceOverDistanceFromSquaredDistance = function(r_sq) {
        // optimizing divisions actually does appear to be *slightly* faster
        var r_minus2nd  = 1 / r_sq,
            r_minus6th  = r_minus2nd * r_minus2nd * r_minus2nd,
            r_minus8th  = r_minus6th * r_minus2nd,
            r_minus14th = r_minus8th * r_minus6th;

        return 12*alpha*r_minus14th - 6*beta*r_minus8th;
      };

  // initial calculation of values dependent on (epsilon, sigma)
  coefficients(epsilon, sigma);

  return {

    coefficients: coefficients,

    setEpsilon: function(e) {
      return coefficients(e, sigma);
    },

    setSigma: function(s) {
      return coefficients(epsilon, s);
    },

    // "fast" forms which avoid the need for a square root
    potentialFromSquaredDistance: potentialFromSquaredDistance,

    potential: function(r) {
      return potentialFromSquaredDistance(r*r);
    },

    forceOverDistanceFromSquaredDistance: forceOverDistanceFromSquaredDistance,

    force: function(r) {
      return r * forceOverDistanceFromSquaredDistance(r*r);
    }
  };
};

});

require.define("/md2d.js", function (require, module, exports, __dirname, __filename) {
    /*globals Float32Array */
/*jslint eqnull: true */

var model = exports.model = {},

    arrays       = require('./arrays/arrays').arrays,
    math         = require('./math'),
    coulomb      = require('./potentials').coulomb,
    lennardJones = require('./potentials').getLennardJonesCalculator(),

    makeIntegrator,
    ljfLimitsNeedCalculating = true,
    setup_ljf_limits,
    setup_coulomb_limits,

    // TODO: Actually check for Safari. Typed arrays are faster almost everywhere
    // ... except Safari.
    notSafari = true,

    hasTypedArrays = (function() {
      try {
        new Float32Array();
      }
      catch(e) {
        return false;
      }
      return true;
    }()),

    // revisit these for export:
    minLJAttraction =    0.001,
    maxLJRepulsion  = -200.0,
    cutoffDistance_LJ,

    minCoulombForce =   0.01,
    maxCoulombForce = 20.0,
    cutoffDistance_Coulomb,

    size = [100, 100],

    //
    // Individual property arrays for the nodes
    //
    radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge,

    //
    // Number of individual properties for a node
    //
    nodePropertiesCount = 12,

    //
    // A two dimensional array consisting of arrays of node property values
    //
    nodes,

    //
    // Indexes into the nodes array for the individual node property arrays
    //
    // Access to these within this module will be faster if they are vars in this closure rather than property lookups.
    // However, publish the indices to model.INDICES for use outside this module.
    //
    RADIUS_INDEX   =  0,
    PX_INDEX       =  1,
    PY_INDEX       =  2,
    X_INDEX        =  3,
    Y_INDEX        =  4,
    VX_INDEX       =  5,
    VY_INDEX       =  6,
    SPEED_INDEX    =  7,
    AX_INDEX       =  8,
    AY_INDEX       =  9,
    HALFMASS_INDEX = 10,
    CHARGE_INDEX   = 11;

model.INDICES = {
  RADIUS   : RADIUS_INDEX,
  PX       : PX_INDEX,
  PY       : PY_INDEX,
  X        : X_INDEX,
  Y        : Y_INDEX,
  VX       : VX_INDEX,
  VY       : VY_INDEX,
  SPEED    : SPEED_INDEX,
  AX       : AX_INDEX,
  AY       : AY_INDEX,
  HALFMASS : HALFMASS_INDEX,
  CHARGE   : CHARGE_INDEX
};

model.setSize = function(x) {
  size = x;
};

model.setLJEpsilon = function(e) {
  lennardJones.setEpsilon(e);
  ljfLimitsNeedCalculating = true;
};

model.setLJSigma = function(s) {
  lennardJones.setSigma(s);
  ljfLimitsNeedCalculating = true;
};

//
// Calculate the minimum and maximum distances for applying Lennard-Jones forces
//
setup_ljf_limits = function() {
  var i, f,
      min_ljf_distance;

  for (i = 0; i <= 100; i+=0.001) {
    f = lennardJones.force(i);
    if (f > maxLJRepulsion) {
      min_ljf_distance = i;
      break;
    }
  }

  for (;i <= 100; i+=0.001) {
    f = lennardJones.force(i);
    if (f > minLJAttraction) {
      break;
    }
  }

  for (;i <= 100; i+=0.001) {
    f = lennardJones.force(i);
    if (f < minLJAttraction) {
      cutoffDistance_LJ = i;
      break;
    }
  }
  ljfLimitsNeedCalculating = false;
};

//
// Calculate the minimum and maximum distances for applying Coulomb forces
//
setup_coulomb_limits = function() {
  var i, f,
      min_coulomb_distance;

  for (i = 0.001; i <= 100; i+=0.001) {
    f = coulomb.force(i, -1, 1);
    if (f < maxCoulombForce) {
      min_coulomb_distance = i;
      break;
    }
  }

  for (;i <= 100; i+=0.001) {
    f = coulomb.force(i, -1, 1);
    if (f < minCoulombForce) {
      break;
    }
  }
  cutoffDistance_Coulomb = i;
};

model.createNodes = function(options) {
  options = options || {};

  var num                    = options.num                    || 50,
      temperature            = options.temperature            || 1,
      rmin                   = options.rmin                   || 4.4,
      mol_rmin_radius_factor = options.mol_rmin_radius_factor || 0.38,

      // special-case:
      arrayType = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',

      v0,
      i, r, c, nrows, ncols, rowSpacing, colSpacing,
      vMagnitude, vDirection, v_CM_initial;

  nrows = Math.floor(Math.sqrt(num));
  ncols = Math.ceil(num/nrows);

  model.nodes = nodes = arrays.create(nodePropertiesCount, null, 'regular');

  // model.INDICES.RADIUS = 0
  nodes[model.INDICES.RADIUS] = arrays.create(num, rmin * mol_rmin_radius_factor, arrayType );
  model.radius = radius = nodes[model.INDICES.RADIUS];

  // model.INDICES.PX     = 1;
  nodes[model.INDICES.PX] = arrays.create(num, 0, arrayType);
  model.px = px = nodes[model.INDICES.PX];

  // model.INDICES.PY     = 2;
  nodes[model.INDICES.PY] = arrays.create(num, 0, arrayType);
  model.py = py = nodes[model.INDICES.PY];

  // model.INDICES.X      = 3;
  nodes[model.INDICES.X] = arrays.create(num, 0, arrayType);
  model.x = x = nodes[model.INDICES.X];

  // model.INDICES.Y      = 4;
  nodes[model.INDICES.Y] = arrays.create(num, 0, arrayType);
  model.y = y = nodes[model.INDICES.Y];

  // model.INDICES.VX     = 5;
  nodes[model.INDICES.VX] = arrays.create(num, 0, arrayType);
  model.vx = vx = nodes[model.INDICES.VX];

  // model.INDICES.VY     = 6;
  nodes[model.INDICES.VY] = arrays.create(num, 0, arrayType);
  model.vy = vy = nodes[model.INDICES.VY];

  // model.INDICES.SPEED  = 7;
  nodes[model.INDICES.SPEED] = arrays.create(num, 0, arrayType);
  model.speed = speed = nodes[model.INDICES.SPEED];

  // model.INDICES.AX     = 8;
  nodes[model.INDICES.AX] = arrays.create(num, 0, arrayType);
  model.ax = ax = nodes[model.INDICES.AX];

  // model.INDICES.AY     = 9;
  nodes[model.INDICES.AY] = arrays.create(num, 0, arrayType);
  model.ay = ay = nodes[model.INDICES.AY];

  // model.INDICES.HALFMASS = 10;
  nodes[model.INDICES.HALFMASS] = arrays.create(num, 0.5, arrayType);
  model.halfmass = halfmass = nodes[model.INDICES.HALFMASS];

  // model.INDICES.CHARGE   = 11;
  nodes[model.INDICES.CHARGE] = arrays.create(num, 0, arrayType);
  model.charge = charge = nodes[model.INDICES.CHARGE];

  // Actually arrange the atoms.
  v0 = Math.sqrt(2*temperature);

  colSpacing = size[0] / (1+ncols);
  rowSpacing = size[1] / (1+nrows);

  // Arrange molecules in a lattice. Not guaranteed to have CM exactly on center, and is an artificially low-energy
  // configuration. But it works OK for now.
  i = -1;

  v_CM_initial = [0, 0];

  for (r = 1; r <= nrows; r++) {
    for (c = 1; c <= ncols; c++) {
      i++;
      if (i === num) break;

      x[i] = c*colSpacing;
      y[i] = r*rowSpacing;

      // Randomize velocities, exactly balancing the motion of the center of mass by making the second half of the
      // set of atoms have the opposite velocities of the first half. (If the atom number is odd, the "odd atom out"
      // should have 0 velocity).
      //
      // Note that although the instantaneous temperature will be 'temperature' exactly, the temperature will quickly
      // settle to a lower value because we are initializing the atoms spaced far apart, in an artificially low-energy
      // configuration.

      if (i < Math.floor(num/2)) {      // 'middle' atom will have 0 velocity
        vMagnitude = math.normal(v0, v0/4);
        vDirection = 2 * Math.random() * Math.PI;
        vx[i] = vMagnitude * Math.cos(vDirection);
        vy[i] = vMagnitude * Math.sin(vDirection);
        vx[num-i-1] = -vx[i];
        vy[num-i-1] = -vy[i];
      }

      v_CM_initial[0] += vx[i];
      v_CM_initial[1] += vy[i];

      ax[i] = 0;
      ay[i] = 0;

      speed[i]  = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      charge[i] = 2*(i%2)-1;      // alternate negative and positive charges
    }
  }

  v_CM_initial[0] /= num;
  v_CM_initial[1] /= num;
};


makeIntegrator = function(args) {

  var time           = 0,
      setOnceState   = args.setOnceState,
      readWriteState = args.readWriteState,
      settableState  = args.settableState || {},

      outputState    = {},

      size                   = setOnceState.size,

      ax                   = readWriteState.ax,
      ay                   = readWriteState.ay,
      charge               = readWriteState.charge,
      nodes                = readWriteState.nodes,
      radius               = readWriteState.radius,
      speed                = readWriteState.speed,
      vx                   = readWriteState.vx,
      vy                   = readWriteState.vy,
      x                    = readWriteState.x,
      y                    = readWriteState.y,

      useCoulombInteraction      = settableState.useCoulombInteraction,
      useLennardJonesInteraction = settableState.useLennardJonesInteraction,
      useThermostat              = settableState.useThermostat,

      // Desired temperature. We will simulate coupling to an infinitely large heat bath at desired
      // temperature T_target.
      T_target                   = settableState.targetTemperature,

      // Set to true when a temperature change is requested, reset to false when system approaches temperature
      temperatureChangeInProgress = false,

      // Whether to immediately break out of the integration loop when the target temperature is reached.
      // Used only by relaxToTemperature()
      breakOnTargetTemperature = false,

      twoKE = (function() {
        var twoKE = 0, i, n = nodes[0].length;
        for (i = 0; i < n; i++) {
          twoKE += speed[i]*speed[i];
        }
        return twoKE;
      }()),

      // initial center of mass; used to calculate drift
      CM_initial = (function() {
        var CM = [0, 0], i, n = nodes[0].length;
        for (i = 0; i < n; i++) {
          CM[0] += x[i];
          CM[1] += y[i];
        }
        CM[0] /= n;
        CM[1] /= n;

        return CM;
      }()),

      driftCM = [0, 0],

      // Coupling factor for Berendsen thermostat.
      dt_over_tau = 0.5,

      // Tolerance for (T_actual - T_target) relative to T_target
      tempTolerance = 0.001,

      // Take a value T, return an average of the last n values
      T_windowed,

      getWindowSize = function() {
        // Average over a larger window if Coulomb force (which should result in larger temperature excursions)
        // is in effect. 50 vs. 10 below were chosen by fiddling around, not for any theoretical reasons.
        return useCoulombInteraction ? 1000 : 1000;
      },

      adjustTemperature = function(options)  {
        if (options == null) options = {};

        var windowSize = options.windowSize || getWindowSize();
        temperatureChangeInProgress = true;
        T_windowed = math.getWindowedAverager( windowSize );
      },

      KE_to_T = function(KE) {
        return KE / nodes[0].length;
      };

  outputState.time = time;

  return {

    useCoulombInteraction      : function(v) {
      if (v !== useCoulombInteraction) {
        useCoulombInteraction = v;
        adjustTemperature();
      }
    },

    useLennardJonesInteraction : function(v) {
      if (v !== useLennardJonesInteraction) {
        useLennardJonesInteraction = v;
        if (useLennardJonesInteraction) {
          adjustTemperature();
        }
      }
    },

    useThermostat              : function(v) {
      useThermostat = v;
    },

    setTargetTemperature       : function(v) {
      if (v !== T_target) {
        T_target = v;
        adjustTemperature();
      }
      T_target = v;
    },

    relaxToTemperature: function(T) {
      if (T != null) T_target = T;

      // doesn't work on IE9
      // console.log("T_target = ", T_target);
      // override window size
      adjustTemperature();

      breakOnTargetTemperature = true;
      while (temperatureChangeInProgress) {
        this.integrate();
      }
      breakOnTargetTemperature = false;
    },

    getOutputState: function() {
      return outputState;
    },

    integrate: function(duration, dt) {

      if (duration == null)  duration = 1;  // how much "time" to integrate over
      if (dt == null)        dt = 1/50;     // time step

      if (ljfLimitsNeedCalculating) setup_ljf_limits();

      var t_start = time,
          n_steps = Math.floor(duration/dt),  // number of steps
          dt_sq = dt*dt,                      // time step, squared
          n = nodes[0].length,                // number of particles
          i,
          j,
          v_sq, r_sq,

          cutoffDistance_LJ_sq      = cutoffDistance_LJ * cutoffDistance_LJ,
          cutoffDistance_Coulomb_sq = cutoffDistance_Coulomb * cutoffDistance_Coulomb,
          maxLJRepulsion_sq         = maxLJRepulsion * maxLJRepulsion,

          f, f_over_r, fx, fy,        // pairwise forces and their x, y components
          dx, dy,
          iloop,
          leftwall   = radius[0],
          bottomwall = radius[0],
          rightwall  = size[0] - radius[0],
          topwall    = size[1] - radius[0],

          PE,                               // potential energy
          CM,                               // center of mass as [x, y]
          vCM = [0,0],                      // velocity of center of mass, sort of.
          T = KE_to_T(twoKE/2),             // temperature
          vRescalingFactor;                 // rescaling factor for Berendsen thermostat

          // measurements to be accumulated during the integration loop:
          // pressure = 0;

      // update time
      for (iloop = 1; iloop <= n_steps; iloop++) {
        time = t_start + iloop*dt;

        if (temperatureChangeInProgress && Math.abs(T_windowed(T) - T_target) <= T_target * tempTolerance) {
          temperatureChangeInProgress = false;
          if (breakOnTargetTemperature) break;
        }

        // rescale velocities based on ratio of target temp to measured temp (Berendsen thermostat)
        vRescalingFactor = 1;
        if (temperatureChangeInProgress || useThermostat && T > 0) {
          vRescalingFactor = 1 + dt_over_tau * ((T_target / T) - 1);
        }

        // Initialize sums such as 'twoKE' which need be accumulated once per integration loop:
        twoKE = 0;
        CM = [0, 0];

        //
        // Use velocity Verlet integration to continue particle movement integrating acceleration with
        // existing position and previous position while managing collision with boundaries.
        //
        // Update positions for first half of verlet integration
        //
        for (i = 0; i < n; i++) {

          // Rescale v(t) using T(t)
          if (vRescalingFactor !== 1) {
            vx[i] *= vRescalingFactor;
            vy[i] *= vRescalingFactor;
          }

          // calculate x(t+dt) from v(t) and a(t)
          x[i] += vx[i]*dt + 0.5*ax[i]*dt_sq;
          y[i] += vy[i]*dt + 0.5*ay[i]*dt_sq;

          v_sq  = vx[i]*vx[i] + vy[i]*vy[i];
          speed[i] = Math.sqrt(v_sq);

          // Bounce off vertical walls
          if (x[i] < leftwall) {
            x[i]  = leftwall + (leftwall - x[i]);
            vx[i] *= -1;
          } else if (x[i] > rightwall) {
            x[i]  = rightwall - (x[i] - rightwall);
            vx[i] *= -1;
          }

          // Bounce off horizontal walls
          if (y[i] < bottomwall) {
            y[i]  = bottomwall + (bottomwall - y[i]);
            vy[i] *= -1;
          } else if (y[i] > topwall) {
            y[i]  = topwall - (y[i] - topwall);
            vy[i] *= -1;
          }

          // Accumulate xs & ys for CM (AFTER collision)
          CM[0] += x[i];
          CM[1] += y[i];

          // FIRST HALF of calculation of v(t+dt):  v1(t+dt) <- v(t) + 0.5*a(t)*dt;
          vx[i] += 0.5*ax[i]*dt;
          vy[i] += 0.5*ay[i]*dt;
        }

        // Calculate center of mass and change in center of mass between t and t+dt
        CM[0] /= n;
        CM[1] /= n;

        // Calculate a(t+dt), step 1: Zero out the acceleration, in order to accumulate pairwise interactions.
        for (i = 0; i < n; i++) {
          ax[i] = 0;
          ay[i] = 0;
        }

        // Calculate a(t+dt), step 2: Sum over all pairwise interactions.
        if (useLennardJonesInteraction || useCoulombInteraction) {
          for (i = 0; i < n; i++) {
            for (j = i+1; j < n; j++) {
              dx = x[j] - x[i];
              dy = y[j] - y[i];

              r_sq = dx*dx + dy*dy;

              if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq) {
                f_over_r = lennardJones.forceOverDistanceFromSquaredDistance(r_sq);

                // Cap force to maxLJRepulsion. This should be a relatively rare occurrence, so ignore
                // the cost of the (expensive) square root calculation.
                if (f_over_r * f_over_r * r_sq > maxLJRepulsion_sq) {
                  f_over_r = maxLJRepulsion / Math.sqrt(r_sq);
                }

                fx = f_over_r * dx;
                fy = f_over_r * dy;

                ax[i] += fx;
                ay[i] += fy;
                ax[j] -= fx;
                ay[j] -= fy;
              }
              if (useCoulombInteraction && r_sq < cutoffDistance_Coulomb_sq) {
                f = Math.min(coulomb.forceFromSquaredDistance(r_sq, charge[i], charge[j]), maxCoulombForce);

                f_over_r = f / Math.sqrt(r_sq);
                fx = f_over_r * dx;
                fy = f_over_r * dy;

                ax[i] += fx;
                ay[i] += fy;
                ax[j] -= fx;
                ay[j] -= fy;
              }
            }
          }
        }

        vCM[0] = 0;
        vCM[1] = 0;

        // SECOND HALF of calculation of v(t+dt): v(t+dt) <- v1(t+dt) + 0.5*a(t+dt)*dt
        for (i = 0; i < n; i++) {
          vx[i] += 0.5*ax[i]*dt;
          vy[i] += 0.5*ay[i]*dt;

          vCM[0] += vx[i];
          vCM[1] += vy[i];

          v_sq  = vx[i]*vx[i] + vy[i]*vy[i];
          twoKE += v_sq;
          speed[i] = Math.sqrt(v_sq);
        }

        vCM[0] /= n;
        vCM[1] /= n;

        driftCM[0] += vCM[0]*dt;
        driftCM[1] += vCM[1]*dt;

        // Calculate T(t+dt) from v(t+dt)
        T = KE_to_T( twoKE/2 );
      }

      // Calculate potentials. Note that we only want to do this once per call to integrate(), not once per
      // integration loop!
      PE = 0;

      for (i = 0; i < n; i++) {
        for (j = i+1; j < n; j++) {
          dx = x[j] - x[i];
          dy = y[j] - y[i];

          r_sq = dx*dx + dy*dy;

          if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq) {
            PE += lennardJones.potentialFromSquaredDistance(r_sq);
          }
          if (useCoulombInteraction && r_sq < cutoffDistance_Coulomb_sq) {
            PE += coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j]);
          }
        }
      }

      // State to be read by the rest of the system:
      outputState.time = time;
      outputState.pressure = 0;// (time - t_start > 0) ? pressure / (time - t_start) : 0;
      outputState.PE = PE;
      outputState.KE = twoKE / 2;
      outputState.T = T;
      outputState.CM = CM || CM_initial;
      outputState.vCM = vCM;
      outputState.driftCM = driftCM;
    }
  };
};

model.getIntegrator = function(options, integratorOutputState) {
  options = options || {};
  var lennard_jones_forces = options.lennard_jones_forces || true,
      coulomb_forces       = options.coulomb_forces       || false,
      temperature_control  = options.temperature_control  || false,
      temperature          = options.temperature          || 1,
      integrator;

  // just needs to be done once, right now.
  setup_coulomb_limits();

  integrator = makeIntegrator({

    setOnceState: {
      size                : size
    },

    settableState: {
      useLennardJonesInteraction : lennard_jones_forces,
      useCoulombInteraction      : coulomb_forces,
      useThermostat              : temperature_control,
      targetTemperature          : temperature
    },

    readWriteState: {
      ax     : ax,
      ay     : ay,
      charge : charge,
      nodes  : nodes,
      px     : px,
      py     : py,
      radius : radius,
      speed  : speed,
      vx     : vx,
      vy     : vy,
      x      : x,
      y      : y
    },

    outputState: integratorOutputState
  });

  // get initial state
  integrator.integrate(0);

  return integrator;
};

});
require("/md2d.js");
(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

// ------------------------------------------------------------
//
// Couloumb forces
//
// ------------------------------------------------------------

molecules_coulomb = {};
molecules_coulomb = { version: "0.0.1" };

var ke_constant = -50;            // coulomb constant

molecules_coulomb.force = function(distance, q1, q2) {
  return ke_constant * ((q1 * q2) / (distance * distance));
};

molecules_coulomb.potential = function(distance, q1, q2) {
  return -ke_constant * ((q1 * q2) / distance);
};
/*globals molecules_lennard_jones: true */
// ------------------------------------------------------------
//
// Lennard-Jones potential and forces
//
// ------------------------------------------------------------

molecules_lennard_jones = {};
molecules_lennard_jones = { version: "0.0.1" };

var epsilon = -1.0,                   // depth of the potential well
    sigma   =  4.0,                   // finite distance at which the inter-particle potential is zero
    rmin = Math.pow(2, 1/6) * sigma,  // distance at which the potential well reaches its minimum

    alpha = 4 * epsilon * Math.pow(sigma, 12),
    beta  = 4 * epsilon * Math.pow(sigma, 6);

molecules_lennard_jones.epsilon = function(e) {
  return molecules_lennard_jones.coefficients(e, sigma);
};

molecules_lennard_jones.sigma = function(s) {
  return molecules_lennard_jones.coefficients(epsilon, s);
};

molecules_lennard_jones.coefficients = function(e, s) {
  if (arguments.length)  {
    epsilon = e;
    sigma = s;
    rmin = Math.pow(2, 1/6) * sigma;
    alpha = 4 * epsilon * Math.pow(sigma, 12);
    beta  = 4 * epsilon * Math.pow(sigma, 6);
  }
  var coefficients = {
    epsilon: epsilon,
    sigma: sigma,
    rmin: rmin,
    alpha: alpha,
    beta: beta
  };
  return coefficients;
};

molecules_lennard_jones.potential = function(distance) {
  return (alpha/Math.pow(distance, 12) - beta/Math.pow(distance, 6)) * -1;
};

molecules_lennard_jones.force = function(distance) {
  var r_6th  = Math.pow(distance, 6),
      r_7th  = r_6th * distance,
      r_13th = r_6th * r_7th;

  return (12*alpha/r_13th - 6*beta/r_7th);
};
/*globals modeler:true, require, d3, arrays, benchmark */
/*jslint onevar: true devel:true eqnull: true */

// modeler.js
//

var coreModel = require('./md2d').model;

modeler = {};
modeler.VERSION = '0.2.0';

modeler.model = function() {
  var model = {},
      atoms = [],
      event = d3.dispatch("tick"),
      size = [100, 100],
      temperature_control,
      lennard_jones_forces, coulomb_forces,
      pe,
      ke,
      stopped = true,
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = 0,
      new_step = false,
      epsilon, sigma,
      pressure, pressures = [0],
      sample_time, sample_times = [],
      temperature,

      integrator,
      integratorOutputState,
      model_listener,

      //
      // Individual property arrays for the nodes
      //
      radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge,

      //
      // Number of individual properties for a node
      //
      node_properties_length = 12,

      //
      // A two dimensional array consisting of arrays of node property values
      //
      nodes;

  //
  // Indexes into the nodes array for the individual node property arrays
  // (re-export these from coreModel for convenience)
  //
  model.INDICES = {
    RADIUS   : coreModel.INDICES.RADIUS,
    PX       : coreModel.INDICES.PX,
    PY       : coreModel.INDICES.PY,
    X        : coreModel.INDICES.X,
    Y        : coreModel.INDICES.Y,
    VX       : coreModel.INDICES.VX,
    VY       : coreModel.INDICES.VY,
    SPEED    : coreModel.INDICES.SPEED,
    AX       : coreModel.INDICES.AX,
    AY       : coreModel.INDICES.AY,
    HALFMASS : coreModel.INDICES.HALFMASS,
    CHARGE   : coreModel.INDICES.CHARGE
  };

  coreModel.setSize(size);

  //
  // The abstract_to_real_temperature(t) function is used to map temperatures in abstract units
  // within a range of 0..10 to the 'real' temperature <mv^2>/2k (remember there's only 2 DOF)
  //
  function abstract_to_real_temperature(t) {
    return 0.19*t + 0.1;  // Translate 0..10 to 0.1..2
  }

  function average_speed() {
    var i, s = 0, n = nodes[0].length;
    i = -1; while (++i < n) { s += speed[i]; }
    return s/n;
  }

  function tick_history_list_is_empty() {
    return tick_history_list_index === 0;
  }

  function tick_history_list_push() {
    var i,
        newnodes = [],
        n = node_properties_length;

    i = -1; while (++i < n) {
      newnodes[i] = arrays.clone(nodes[i]);
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({ nodes: newnodes, ke:ke });
    if (tick_history_list_index > 1000) {
      tick_history_list.splice(0,1);
      tick_history_list_index = 1000;
    }
  }

  function tick() {
    var t;

    if (tick_history_list_is_empty()) {
      tick_history_list_push();
    }

    integrator.integrate();
    pressure = integratorOutputState.pressure;
    pe = integratorOutputState.PE;

    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    ke = integratorOutputState.KE;
    tick_history_list_push();
    if (!stopped) {
      t = Date.now();
      if (sample_time) {
        sample_time  = t - sample_time;
        if (sample_time) { sample_times.push(sample_time); }
        sample_time = t;
        sample_times.splice(0, sample_times.length - 128);
      } else {
        sample_time = t;
      }
      event.tick({type: "tick"});
    }
    return stopped;
  }

  function reset_tick_history_list() {
    tick_history_list = [];
    tick_history_list_index = 0;
    tick_counter = -1;
  }

  function tick_history_list_reset_to_ptr() {
    tick_history_list.length = tick_history_list_index + 1;
  }

  function tick_history_list_extract(index) {
    var i, n=node_properties_length;
    if (index < 0) {
      throw new Error("modeler: request for tick_history_list[" + index + "]");
    }
    if (index >= tick_history_list.length) {
      throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length);
    }
    i = -1; while(++i < n) {
      arrays.copy(tick_history_list[index].nodes[i], nodes[i]);
    }
    ke = tick_history_list[index].ke;
  }

  function container_pressure() {
    return pressures.reduce(function(j,k) { return j+k; })/pressures.length;
  }

  function speed_history(speeds) {
    if (arguments.length) {
      speed_history.push(speeds);
      // limit the pressures array to the most recent 16 entries
      speed_history.splice(0, speed_history.length - 100);
    } else {
      return speed_history.reduce(function(j,k) { return j+k; })/pressures.length;
    }
  }

  function average_rate() {
    var i, ave, s = 0, n = sample_times.length;
    i = -1; while (++i < n) { s += sample_times[i]; }
    ave = s/n;
    return (ave ? 1/ave*1000: 0);
  }

  function set_temperature(t) {
    temperature = t;
    if (integrator) integrator.setTargetTemperature(abstract_to_real_temperature(t));
  }

  // ------------------------------------------------------------
  //
  // Public functions
  //
  // ------------------------------------------------------------

  model.getStats = function() {
    return {
      speed       : average_speed(),
      ke          : ke,
      temperature : temperature,
      pressure    : container_pressure(),
      current_step: tick_counter,
      steps       : tick_history_list.length-1
    };
  };

  /**
    Current seek position
  */
  model.stepCounter = function() {
    return tick_counter;
  };

  /** Total number of ticks that have been run & are stored, regardless of seek
      position
  */
  model.steps = function() {

    // If no ticks have run, tick_history_list will be uninitialized.
    if (tick_history_list_is_empty()) {
      return 0;
    }

    // The first tick will push 2 states to the tick_history_list: the initialized state ("step 0")
    // and the post-tick model state ("step 1")
    // Subsequent ticks will push 1 state per tick. So subtract 1 from the length to get the step #.
    return tick_history_list.length - 1;
  };

  model.isNewStep = function() {
    return new_step;
  };

  model.seek = function(location) {
    if (!arguments.length) { location = 0; }
    stopped = true;
    new_step = false;
    tick_history_list_index = location;
    tick_counter = location;
    tick_history_list_extract(tick_history_list_index);
    return tick_counter;
  };

  model.stepBack = function(num) {
    if (!arguments.length) { num = 1; }
    var i = -1;
    stopped = true;
    new_step = false;
    while(++i < num) {
      if (tick_history_list_index > 1) {
        tick_history_list_index--;
        tick_counter--;
        tick_history_list_extract(tick_history_list_index-1);
        if (model_listener) { model_listener(); }
      }
    }
    return tick_counter;
  };

  model.stepForward = function(num) {
    if (!arguments.length) { num = 1; }
    var i = -1;
    stopped = true;
    while(++i < num) {
      if (tick_history_list_index < tick_history_list.length) {
        tick_history_list_extract(tick_history_list_index);
        tick_history_list_index++;
        tick_counter++;
        if (model_listener) { model_listener(); }
      } else {
        tick();
        if (model_listener) { model_listener(); }
      }
    }
    return tick_counter;
  };

  // The next four functions assume we're are doing this for
  // all the atoms will need to be changed when different atoms
  // can have different LJ sigma values

  model.set_lj_coefficients = function(e, s) {
    // am not using the coefficients beyond setting the ljf limits yet ...
    epsilon = e;
    sigma = s;

    // Does nothing useful now. TODO adapt for multiple models & multiple molecule types.
    coreModel.setLJEpsilon(e);
    coreModel.setLJSigma(s);
  };

  model.getEpsilon = function() {
    return epsilon;
  };

  model.getSigma = function() {
    return sigma;
  };

  model.set_radius = function(r) {
    var i, n = nodes[0].length;
    i = -1; while(++i < n) { radius[i] = r; }
  };

  // return a copy of the array of speeds
  model.get_speed = function() {
    return arrays.copy(speed, []);
  };

  model.get_rate = function() {
    return average_rate();
  };

  model.set_temperature_control = function(tc) {
   temperature_control = tc;
   if (integrator) integrator.useThermostat(tc);
  };

  model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
   if (integrator) integrator.useLennardJonesInteraction(lj);
  };

  model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
   if (integrator) integrator.useCoulombInteraction(cf);
  };

  model.get_nodes = function() {
    return nodes;
  };

  model.get_atoms = function() {
    return atoms;
  };

  model.initialize = function(options) {
    options = options || {};

    if (options.temperature != null) options.temperature = abstract_to_real_temperature(options.temperature);
    lennard_jones_forces = options.lennard_jones_forces || true;
    coulomb_forces       = options.coulomb_forces       || false;
    temperature_control  = options.temperature_control  || false;

    // who is listening to model tick completions
    model_listener = options.model_listener || false;

    reset_tick_history_list();
    new_step = true;
    // pressures.push(pressure);
    // pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

    integrator = coreModel.getIntegrator(options);
    integratorOutputState = integrator.getOutputState();

    return model;
  };

  model.relax = function() {
    // thermalize enough that relaxToTemperature doesn't need a ridiculous window size
    integrator.integrate(100, 1/20);
    integrator.relaxToTemperature();
    return model;
  };

  model.on = function(type, listener) {
    event.on(type, listener);
    return model;
  };

  model.tickInPlace = function() {
    event.tick({type: "tick"});
    return model;
  };

  model.tick = function(num) {
    if (!arguments.length) { num = 1; }
    var i = -1;
    while(++i < num) {
      tick();
    }
    return model;
  };

  model.nodes = function(options) {
    options = options || {};

    if (options.temperature != null) options.temperature = abstract_to_real_temperature(options.temperature);

    coreModel.createNodes(options);

    nodes    = coreModel.nodes;
    radius   = coreModel.radius;
    px       = coreModel.px;
    py       = coreModel.py;
    x        = coreModel.x;
    y        = coreModel.y;
    vx       = coreModel.vx;
    vy       = coreModel.vy;
    speed    = coreModel.speed;
    ax       = coreModel.ax;
    ay       = coreModel.ay;
    halfmass = coreModel.halfmass;
    charge   = coreModel.charge;

    // The d3 molecule viewer requires this length to be set correctly:
    atoms.length = nodes[0].length;

    return model;
  };

  model.start = function() {
    model.initialize();
    return model.resume();
  };

  model.resume = function() {
    stopped = false;
    d3.timer(tick);
    return model;
  };

  model.stop = function() {
    stopped = true;
    return model;
  };

  model.ke = function() {
    return integratorOutputState ? integratorOutputState.KE : undefined;
  };

  model.ave_ke = function() {
    return integratorOutputState? integratorOutputState.KE / nodes[0].length : undefined;
  };

  model.pe = function() {
    return integratorOutputState ? integratorOutputState.PE : undefined;
  };

  model.ave_pe = function() {
    return integratorOutputState? integratorOutputState.PE / nodes[0].length : undefined;
  };

  model.speed = function() {
    return average_speed();
  };

  model.pressure = function() {
    return container_pressure();
  };

  model.temperature = function(x) {
    if (!arguments.length) return temperature;
    set_temperature(x);
    return model;
  };

  model.size = function(x) {
    if (!arguments.length) return size;
    size = x;
    coreModel.setSize(x);
    return model;
  };

  return model;
};
})();
