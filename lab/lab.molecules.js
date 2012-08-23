(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

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

require.define("/node_modules/arrays/package.json", function (require, module, exports, __dirname, __filename) {
module.exports = {}
});

require.define("/node_modules/arrays/index.js", function (require, module, exports, __dirname, __filename) {
/*globals window Uint8Array Int8Array Uint16Array Int16Array Uint32Array Int32Array Float32Array Float64Array */
/*jshint newcap: false */

//
// 'requirified' version of Typed Array Utilities.
//

var arrays;

arrays = {};

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

// publish everything to exports
for (var key in arrays) {
  if (arrays.hasOwnProperty(key)) exports[key] = arrays[key];
}
});

require.define("/constants/index.js", function (require, module, exports, __dirname, __filename) {
/*jslint loopfunc: true */

/** A list of physical constants. To access any given constant, require() this module
    and call the 'as' method of the desired constant to get the constant in the desired unit.

    This module also provides a few helper functions for unit conversion.

    Usage:
      var constants = require('./constants'),

          ATOMIC_MASS_IN_GRAMS = constants.ATOMIC_MASS.as(constants.unit.GRAM),

          GRAMS_PER_KILOGRAM = constants.ratio(constants.unit.GRAM, { per: constants.unit.KILOGRAM }),

          // this works for illustration purposes, although the preferred method would be to pass
          // constants.unit.KILOGRAM to the 'as' method:

          ATOMIC_MASS_IN_KILOGRAMS = constants.convert(ATOMIC_MASS_IN_GRAMS, {
            from: constants.unit.GRAM,
            to:   constants.unit.KILOGRAM
          });
*/

var units = require('./units'),
    unit  = units.unit,
    ratio = units.ratio,
    convert = units.convert,

    constants = {

      ELEMENTARY_CHARGE: {
        value: 1,
        unit: unit.ELEMENTARY_CHARGE
      },

      ATOMIC_MASS: {
        value: 1,
        unit: unit.DALTON
      },

      BOLTZMANN_CONSTANT: {
        value: 1.380658e-23,
        unit: unit.JOULES_PER_KELVIN
      },

      AVAGADRO_CONSTANT: {
        // N_A is numerically equal to Dalton per gram
        value: ratio( unit.DALTON, { per: unit.GRAM }),
        unit: unit.INVERSE_MOLE
      },

      PERMITTIVITY_OF_FREE_SPACE: {
        value: 8.854187e-12,
        unit: unit.FARADS_PER_METER
      }
    },

    constantName, constant;


// Derived units
constants.COULOMB_CONSTANT = {
  value: 1 / (4 * Math.PI * constants.PERMITTIVITY_OF_FREE_SPACE.value),
  unit: unit.METERS_PER_FARAD
};

// Exports

exports.unit = unit;
exports.ratio = ratio;
exports.convert = convert;

// Require explicitness about units by publishing constants as a set of objects with only an 'as' property,
// which will return the constant in the specified unit.

for (constantName in constants) {
  if (constants.hasOwnProperty(constantName)) {
    constant = constants[constantName];

    exports[constantName] = (function(constant) {
      return {
        as: function(toUnit) {
          return units.convert(constant.value, { from: constant.unit, to: toUnit });
        }
      };
    }(constant));
  }
}

});

require.define("/constants/units.js", function (require, module, exports, __dirname, __filename) {
/** Provides a few simple helper functions for converting related unit types.

    This sub-module doesn't do unit conversion between compound unit types (e.g., knowing that kg*m/s^2 = N)
    only simple scaling between units measuring the same type of quantity.
*/

// Prefer the "per" formulation to the "in" formulation.
//
// If KILOGRAMS_PER_AMU is 1.660540e-27 we know the math is:
// "1 amu * 1.660540e-27 kg/amu = 1.660540e-27 kg"
// (Whereas the "in" forumulation might be slighty more error prone:
// given 1 amu and 6.022e-26 kg in an amu, how do you get kg again?)

    // These you might have to look up...
var KILOGRAMS_PER_DALTON  = 1.660540e-27,
    COULOMBS_PER_ELEMENTARY_CHARGE = 1.602177e-19,

    // 1 eV = 1 e * 1 V = (COULOMBS_PER_ELEMENTARY_CHARGE) C * 1 J/C
    JOULES_PER_EV = COULOMBS_PER_ELEMENTARY_CHARGE,

    // though these are equally important!
    SECONDS_PER_FEMTOSECOND = 1e-15,
    METERS_PER_NANOMETER    = 1e-9,
    ANGSTROMS_PER_NANOMETER = 10,
    GRAMS_PER_KILOGRAM      = 1000,

    types = {
      TIME: "time",
      LENGTH: "length",
      MASS: "mass",
      ENERGY: "energy",
      ENTROPY: "entropy",
      CHARGE: "charge",
      INVERSE_QUANTITY: "inverse quantity",

      FARADS_PER_METER: "farads per meter",
      METERS_PER_FARAD: "meters per farad",

      FORCE: "force",
      VELOCITY: "velocity",

      // unused as of yet
      AREA: "area",
      PRESSURE: "pressure"
    },

  unit,
  ratio,
  convert;

/**
  In each of these units, the reference type we actually use has value 1, and conversion
  ratios for the others are listed.
*/
exports.unit = unit = {

  FEMTOSECOND: { name: "femtosecond", value: 1,                       type: types.TIME },
  SECOND:      { name: "second",      value: SECONDS_PER_FEMTOSECOND, type: types.TIME },

  NANOMETER:   { name: "nanometer", value: 1,                           type: types.LENGTH },
  ANGSTROM:    { name: "Angstrom",  value: 1 * ANGSTROMS_PER_NANOMETER, type: types.LENGTH },
  METER:       { name: "meter",     value: 1 * METERS_PER_NANOMETER,    type: types.LENGTH },

  DALTON:   { name: "Dalton",   value: 1,                                             type: types.MASS },
  GRAM:     { name: "gram",     value: 1 * KILOGRAMS_PER_DALTON * GRAMS_PER_KILOGRAM, type: types.MASS },
  KILOGRAM: { name: "kilogram", value: 1 * KILOGRAMS_PER_DALTON,                      type: types.MASS },

  MW_ENERGY_UNIT: {
    name: "MW Energy Unit (Dalton * nm^2 / fs^2)",
    value: 1,
    type: types.ENERGY
  },

  JOULE: {
    name: "Joule",
    value: KILOGRAMS_PER_DALTON *
           METERS_PER_NANOMETER * METERS_PER_NANOMETER *
           (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND),
    type: types.ENERGY
  },

  EV: {
    name: "electron volt",
    value: KILOGRAMS_PER_DALTON *
            METERS_PER_NANOMETER * METERS_PER_NANOMETER *
            (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND) *
            (1/JOULES_PER_EV),
    type: types.ENERGY
  },

  EV_PER_KELVIN:     { name: "electron volts per Kelvin", value: 1,                 type: types.ENTROPY },
  JOULES_PER_KELVIN: { name: "Joules per Kelvin",         value: 1 * JOULES_PER_EV, type: types.ENTROPY },

  ELEMENTARY_CHARGE: { name: "elementary charge", value: 1,                             type: types.CHARGE },
  COULOMB:           { name: "Coulomb",           value: COULOMBS_PER_ELEMENTARY_CHARGE, type: types.CHARGE },

  INVERSE_MOLE: { name: "inverse moles", value: 1, type: types.INVERSE_QUANTITY },

  FARADS_PER_METER: { name: "Farads per meter", value: 1, type: types.FARADS_PER_METER },

  METERS_PER_FARAD: { name: "meters per Farad", value: 1, type: types.METERS_PER_FARAD },

  MW_FORCE_UNIT: {
    name: "MW force units (Dalton * nm / fs^2)",
    value: 1,
    type: types.FORCE
  },

  NEWTON: {
    name: "Newton",
    value: 1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND),
    type: types.FORCE
  },

  EV_PER_NM: {
    name: "electron volts per nanometer",
    value: 1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * METERS_PER_NANOMETER *
           (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND) *
           (1/JOULES_PER_EV),
    type: types.FORCE
  },

  MW_VELOCITY_UNIT: {
    name: "MW velocity units (nm / fs)",
    value: 1,
    type: types.VELOCITY
  },

  METERS_PER_SECOND: {
    name: "meters per second",
    value: 1 * METERS_PER_NANOMETER * (1 / SECONDS_PER_FEMTOSECOND),
    type: types.VELOCITY
  }

};


/** Provide ratios for conversion of one unit to an equivalent unit type.

   Usage: ratio(units.GRAM, { per: units.KILOGRAM }) === 1000
          ratio(units.GRAM, { as: units.KILOGRAM }) === 0.001
*/
exports.ratio = ratio = function(from, to) {
  var checkCompatibility = function(fromUnit, toUnit) {
    if (fromUnit.type !== toUnit.type) {
      throw new Error("Attempt to convert incompatible type '" + fromUnit.name + "'' to '" + toUnit.name + "'");
    }
  };

  if (to.per) {
    checkCompatibility(from, to.per);
    return from.value / to.per.value;
  } else if (to.as) {
    checkCompatibility(from, to.as);
    return to.as.value / from.value;
  } else {
    throw new Error("units.ratio() received arguments it couldn't understand.");
  }
};

/** Scale 'val' to a different unit of the same type.

  Usage: convert(1, { from: unit.KILOGRAM, to: unit.GRAM }) === 1000
*/
exports.convert = convert = function(val, fromTo) {
  var from = fromTo && fromTo.from,
      to   = fromTo && fromTo.to;

  if (!from) {
    throw new Error("units.convert() did not receive a \"from\" argument");
  }
  if (!to) {
    throw new Error("units.convert() did not receive a \"to\" argument");
  }

  return val * ratio(to, { per: from });
};

});

require.define("/math/index.js", function (require, module, exports, __dirname, __filename) {
exports.normal              = require('./distributions').normal;
exports.getWindowedAverager = require('./utils').getWindowedAverager;
exports.minimize            = require('./minimizer').minimize;

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

require.define("/math/minimizer.js", function (require, module, exports, __dirname, __filename) {
/*jshint eqnull:true */
/**
  Simple, good-enough minimization via gradient descent.
*/
exports.minimize = function(f, x0, opts) {
  opts = opts || {};

  if (opts.precision == null) opts.precision = 0.01;

  var // stop when the absolute difference between successive values of f is this much or less
      precision = opts.precision,

      // array of [min, max] boundaries for each component of x
      bounds    = opts.bounds,

      // maximum number of iterations
      maxiter   = opts.maxiter   || 1000,

      // optionally, stop when f is less than or equal to this value
      stopval   = opts.stopval   || -Infinity,

      // maximum distance to move x between steps
      maxstep   = opts.maxstep   || 0.01,

      // multiplied by the gradient
      eps       = opts.eps       || 0.01,
      dim       = x0.length,
      x,
      res,
      f_cur,
      f_prev,
      grad,
      maxstepsq,
      gradnormsq,
      iter,
      i,
      a;

  maxstepsq = maxstep*maxstep;

  // copy x0 into x (which we will mutate)
  x = [];
  for (i = 0; i < dim; i++) {
    x[i] = x0[i];
  }

  // evaluate f and get the gradient
  res = f.apply(null, x);
  f_cur = res[0];
  grad = res[1];

  iter = 0;
  do {
    if (f_cur <= stopval) {
      break;
    }

    if (iter > maxiter) {
      console.log("maxiter reached");
      // don't throw on error, but return some diagnostic information
      return { error: "maxiter reached", f: f_cur, iter: maxiter, x: x };
    }

    // Limit gradient descent step size to maxstep
    gradnormsq = 0;
    for (i = 0; i < dim; i++) {
      gradnormsq += grad[i]*grad[i];
    }
    if (eps*eps*gradnormsq > maxstepsq) {
      a = Math.sqrt(maxstepsq / gradnormsq) / eps;
      for (i = 0; i < dim; i++) {
        grad[i] = a * grad[i];
      }
    }

    // Take a step in the direction opposite the gradient
    for (i = 0; i < dim; i++) {
      x[i] -= eps * grad[i];

      // check bounds
      if (bounds && x[i] < bounds[i][0]) {
        x[i] = bounds[i][0];
      }
      if (bounds && x[i] > bounds[i][1]) {
        x[i] = bounds[i][1];
      }
    }

    f_prev = f_cur;

    res = f.apply(null, x);
    f_cur = res[0];
    grad = res[1];

    iter++;
  } while ( Math.abs(f_cur-f_prev) > precision );

  return [f_cur, x];
};

});

require.define("/potentials/index.js", function (require, module, exports, __dirname, __filename) {
var potentials = exports.potentials = {};

exports.coulomb = require('./coulomb');
exports.lennardJones = require('./lennard-jones');

});

require.define("/potentials/coulomb.js", function (require, module, exports, __dirname, __filename) {
var
constants = require('../constants'),
unit      = constants.unit,

COULOMB_CONSTANT_IN_METERS_PER_FARAD = constants.COULOMB_CONSTANT.as( constants.unit.METERS_PER_FARAD ),

NANOMETERS_PER_METER = constants.ratio(unit.NANOMETER, { per: unit.METER }),
COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ = Math.pow( constants.ratio(unit.COULOMB, { per: unit.ELEMENTARY_CHARGE }), 2),

EV_PER_JOULE = constants.ratio(unit.EV, { per: unit.JOULE }),
MW_FORCE_UNITS_PER_NEWTON = constants.ratio(unit.MW_FORCE_UNIT, { per: unit.NEWTON }),

// Coulomb constant for expressing potential in eV given elementary charges, nanometers
k_ePotential = COULOMB_CONSTANT_IN_METERS_PER_FARAD *
               COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ *
               NANOMETERS_PER_METER *
               EV_PER_JOULE,

// Coulomb constant for expressing force in Dalton*nm/fs^2 given elementary charges, nanometers
k_eForce = COULOMB_CONSTANT_IN_METERS_PER_FARAD *
           COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ *
           NANOMETERS_PER_METER *
           NANOMETERS_PER_METER *
           MW_FORCE_UNITS_PER_NEWTON,


// Exports

/** Input units:
     r: nanometers,
     q1, q2: elementary charges

    Output units: eV
*/
potential = exports.potential = function(r, q1, q2) {
  return k_ePotential * ((q1 * q2) / r);
},


/** Input units:
    r_sq: nanometers^2
    q1, q2: elementary charges

    Output units: "MW Force Units" (Dalton * nm / fs^2)
*/
forceFromSquaredDistance = exports.forceFromSquaredDistance = function(r_sq, q1, q2) {
  return -k_eForce * ((q1 * q2) / r_sq);
},


forceOverDistanceFromSquaredDistance = exports.forceOverDistanceFromSquaredDistance = function(r_sq, q1, q2) {
  return forceFromSquaredDistance(r_sq, q1, q2) / Math.sqrt(r_sq);
},

/** Input units:
     r: nanometers,
     q1, q2: elementary charges

    Output units: "MW Force Units" (Dalton * nm / fs^2)
*/
force = exports.force = function(r, q1, q2) {
  return forceFromSquaredDistance(r*r, q1, q2);
};

});

require.define("/potentials/lennard-jones.js", function (require, module, exports, __dirname, __filename) {
/*jshint eqnull:true boss:true */
var constants = require('../constants'),
    unit      = constants.unit,

    NANOMETERS_PER_METER = constants.ratio( unit.NANOMETER, { per: unit.METER }),
    MW_FORCE_UNITS_PER_NEWTON = constants.ratio( unit.MW_FORCE_UNIT, { per: unit.NEWTON });

/**
  Helper function that returns the correct pairwise epsilon value to be used
  when elements each have epsilon values epsilon1, epsilon2
*/
exports.pairwiseEpsilon = function(epsilon1, epsilon2) {
  return 0.5 * (epsilon1 + epsilon2);
},

/**
  Helper function that returns the correct pairwise sigma value to be used
  when elements each have sigma values sigma1, sigma2
*/
exports.pairwiseSigma = function(sigma1, sigma2) {
  return Math.sqrt(sigma1 * sigma2);
},

/**
  Helper function that returns the correct rmin value for a given sigma
*/
exports.rmin = function(sigma) {
  return Math.pow(2, 1/6) * sigma;
};

/**
  Helper function that returns the correct atomic radius for a given sigma
*/
exports.radius = function(sigma) {
  // See line 637 of Atom.java (org.concord.mw2d.models.Atom)
  // This assumes the "VdW percentage" is 100%. In classic MW the VdW percentage is settable.
  return 0.5 * sigma;
}

/**
  Returns a new object with methods for calculating the force and potential for a Lennard-Jones
  potential with particular values of its parameters epsilon and sigma. These can be adjusted.

  To avoid the needing to take square roots during calculation of pairwise forces, there are
  also methods which calculate the inter-particle potential directly from a squared distance, and
  which calculate the quantity (force/distance) directly from a squared distance.

  This function also accepts a callback function which will be called with a hash representing
  the new coefficients, whenever the LJ coefficients are changed for the returned calculator.
*/
exports.newLJCalculator = function(params, cb) {

  var epsilon,          // parameter; depth of the potential well, in eV
      sigma,            // parameter: characteristic distance from particle, in nm

      rmin,             // distance from particle at which the potential is at its minimum
      alpha_Potential,  // precalculated; units are eV * nm^12
      beta_Potential,   // precalculated; units are eV * nm^6
      alpha_Force,      // units are "MW Force Units" * nm^13
      beta_Force,       // units are "MW Force Units" * nm^7

      setCoefficients = function(e, s) {
        // Input units:
        //  epsilon: eV
        //  sigma:   nm

        epsilon = e;
        sigma   = s;
        rmin    = exports.rmin(sigma);

        if (epsilon != null && sigma != null) {
          alpha_Potential = 4 * epsilon * Math.pow(sigma, 12);
          beta_Potential  = 4 * epsilon * Math.pow(sigma, 6);

          // (1 J * nm^12) = (1 N * m * nm^12)
          // (1 N * m * nm^12) * (b nm / m) * (c MWUnits / N) = (abc MWUnits nm^13)
          alpha_Force = 12 * constants.convert(alpha_Potential, { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
          beta_Force =  6 * constants.convert(beta_Potential,  { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
        }

        if (typeof cb === 'function') cb(getCoefficients(), this);
      },

      getCoefficients = function() {
        return {
          epsilon: epsilon,
          sigma  : sigma,
          rmin   : rmin
        };
      },

      validateEpsilon = function(e) {
        if (e == null || parseFloat(e) !== e) {
          throw new Error("lennardJones: epsilon value " + e + " is invalid");
        }
      },

      validateSigma = function(s) {
        if (s == null || parseFloat(s) !== s || s <= 0) {
          throw new Error("lennardJones: sigma value " + s + " is invalid");
        }
      },

      // this object
      calculator;

      // At creation time, there must be a valid epsilon and sigma ... we're not gonna check during
      // inner-loop force calculations!
      validateEpsilon(params.epsilon);
      validateSigma(params.sigma);

      // Initialize coefficients to passed-in values
      setCoefficients(params.epsilon, params.sigma);

  return calculator = {

    coefficients: getCoefficients,

    setEpsilon: function(e) {
      validateEpsilon(e);
      setCoefficients(e, sigma);
    },

    setSigma: function(s) {
      validateSigma(s);
      setCoefficients(epsilon, s);
    },

    /**
      Input units: r_sq: nm^2
      Output units: eV

      minimum is at r=rmin, V(rmin) = 0
    */
    potentialFromSquaredDistance: function(r_sq) {
      if (!r_sq) return -Infinity
      return alpha_Potential*Math.pow(r_sq, -6) - beta_Potential*Math.pow(r_sq, -3);
    },

    /**
      Input units: r: nm
      Output units: eV
    */
    potential: function(r) {
      return calculator.potentialFromSquaredDistance(r*r);
    },

    /**
      Input units: r_sq: nm^2
      Output units: MW Force Units / nm (= Dalton / fs^2)
    */
    forceOverDistanceFromSquaredDistance: function(r_sq) {
      // optimizing divisions actually does appear to be *slightly* faster
      var r_minus2nd  = 1 / r_sq,
          r_minus6th  = r_minus2nd * r_minus2nd * r_minus2nd,
          r_minus8th  = r_minus6th * r_minus2nd,
          r_minus14th = r_minus8th * r_minus6th;

      return alpha_Force*r_minus14th - beta_Force*r_minus8th;
    },

    /**
      Input units: r: nm
      Output units: MW Force Units (= Dalton * nm / fs^2)
    */
    force: function(r) {
      return r * calculator.forceOverDistanceFromSquaredDistance(r*r);
    }
  };
};

});

require.define("/md2d.js", function (require, module, exports, __dirname, __filename) {
    /*globals Float32Array window:true */
/*jslint eqnull: true, boss: true, loopfunc: true*/

if (typeof window === 'undefined') window = {};

var arrays       = require('arrays'),
    constants    = require('./constants'),
    unit         = constants.unit,
    math         = require('./math'),
    coulomb      = require('./potentials').coulomb,
    lennardJones = require('./potentials').lennardJones,

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

    // make at least 2 atoms
    N_MIN = 2,

    // make no more than this many atoms:
    N_MAX = 1000,

    // from A. Rahman "Correlations in the Motion of Atoms in Liquid Argon", Physical Review 136 pp. A405–A411 (1964)
    ARGON_LJ_EPSILON_IN_EV = -120 * constants.BOLTZMANN_CONSTANT.as(unit.EV_PER_KELVIN),
    ARGON_LJ_SIGMA_IN_NM   = 0.34,

    ARGON_MASS_IN_DALTON = 39.95,
    ARGON_MASS_IN_KG = constants.convert(ARGON_MASS_IN_DALTON, { from: unit.DALTON, to: unit.KILOGRAM }),

    BOLTZMANN_CONSTANT_IN_JOULES = constants.BOLTZMANN_CONSTANT.as( unit.JOULES_PER_KELVIN ),

    INDICES,
    ELEMENT_INDICES,
    OBSTACLE_INDICES,
    SAVEABLE_INDICES,

    cross = function(a0, a1, b0, b1) {
      return a0*b1 - a1*b0;
    },

    sumSquare = function(a,b) {
      return a*a + b*b;
    },

    /**
      Convert total kinetic energy in the container of N atoms to a temperature in Kelvin.

      Input units:
        KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
      Output units:
        T: K
    */
    KE_to_T = function(totalKEinMWUnits, N) {
      // In 2 dimensions, kT = (2/N_df) * KE

      var N_df = 2 * N,
          averageKEinMWUnits = (2 / N_df) * totalKEinMWUnits,
          averageKEinJoules = constants.convert(averageKEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.JOULE });

      return averageKEinJoules / BOLTZMANN_CONSTANT_IN_JOULES;
    },

    /**
      Convert a temperature in Kelvin to the total kinetic energy in the container of N atoms.

      Input units:
        T: K
      Output units:
        KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
    */
    T_to_KE = function(T, N) {
      var N_df = 2 * N,
          averageKEinJoules  = T * BOLTZMANN_CONSTANT_IN_JOULES,
          averageKEinMWUnits = constants.convert(averageKEinJoules, { from: unit.JOULE, to: unit.MW_ENERGY_UNIT }),
          totalKEinMWUnits = averageKEinMWUnits * N_df / 2;

      return totalKEinMWUnits;
    },

    validateTemperature = function(t) {
      var temperature = parseFloat(t);

      if (isNaN(temperature)) {
        throw new Error("md2d: requested temperature " + t + " could not be understood.");
      }
      if (temperature < 0) {
        throw new Error("md2d: requested temperature " + temperature + " was less than zero");
      }
      if (temperature === Infinity) {
        throw new Error("md2d: requested temperature was Infinity!");
      }
    },

    copyTypedArray = function(arr) {
      var copy = [];
      for (var i=0,ii=arr.length; i<ii; i++){
        copy[i] = arr[i];
      }
      return copy;
    };

exports.ELEMENT_INDICES = ELEMENT_INDICES = {
  MASS: 0,
  EPSILON: 1,
  SIGMA: 2,
  RADIUS: 3
},

exports.INDICES = INDICES = {
  RADIUS :  0,
  PX     :  1,
  PY     :  2,
  X      :  3,
  Y      :  4,
  VX     :  5,
  VY     :  6,
  SPEED  :  7,
  AX     :  8,
  AY     :  9,
  CHARGE : 10,
  ELEMENT: 11
};

exports.OBSTACLE_INDICES = OBSTACLE_INDICES = {
  X       :  0,
  Y       :  1,
  WIDTH   :  2,
  HEIGHT  :  3,
  MASS    :  4,
  VX      :  5,
  VY      :  6,
  X_PREV  :  7,
  Y_PREV  :  8,
  COLOR_R :  9,
  COLOR_G :  10,
  COLOR_B :  11,
  VISIBLE :  12
};

exports.RADIAL_INDICES = RADIAL_INDICES = {
  ATOM1   :  0,
  ATOM2   :  1,
  LENGTH  :  2,
  STRENGTH:  3
};

exports.SAVEABLE_INDICES = SAVEABLE_INDICES = ["X", "Y","VX","VY", "CHARGE", "ELEMENT"];

exports.makeModel = function() {

  var // the object to be returned
      model,

      // Whether system dimensions have been set. This is only allowed to happen once.
      sizeHasBeenInitialized = false,

      // Whether "atoms" (particles) have been created & initialized. This is only allowed to happen once.
      atomsHaveBeenCreated = false,

      // Whether to simulate Coulomb forces between particles.
      useCoulombInteraction = false,

      // Whether any atoms actually have charges
      hasChargedAtoms = false,

      // Whether to simulate Lennard Jones forces between particles.
      useLennardJonesInteraction = true,

      // Whether to use the thermostat to maintain the system temperature near T_target.
      useThermostat = false,

      // Whether a transient temperature change is in progress.
      temperatureChangeInProgress = false,

      // Desired system temperature, in Kelvin.
      T_target,

      // Tolerance for (T_actual - T_target) relative to T_target
      tempTolerance = 0.001,

      // System dimensions as [x, y] in nanometers. Default value can be changed until particles are created.
      size = [10, 10],

      // The current model time, in femtoseconds.
      time = 0,

      // The current integration time step, in femtoseconds.
      dt,

      // Square of integration time step, in fs^2.
      dt_sq,

      // The number of molecules in the system.
      N,

      // Total mass of all particles in the system, in Dalton (atomic mass units).
      totalMass,

      // Element properties
      // elements is an array of elements, each one an array of properties
      // For now properties are just defined by index, with no additional lookup for
      // the index (e.g. elements[0][ELEM_MASS_INDEX] for the mass of elem 0). We
      // have few enough properties that we currently don't need this additional lookup.
      // element definition: [ MASS_IN_DALTONS, EPSILON, SIGMA ]
      elements,

      // Individual property arrays for the atoms, indexed by atom number
      radius, px, py, x, y, vx, vy, speed, ax, ay, charge, element,

      // An array of length max(INDICES)+1 which contains the above property arrays
      atoms,

      // Individual property arrays for the "radial" bonds, indexed by bond number
      radialBondAtom1Index,
      radialBondAtom2Index,
      radialBondLength,
      radialBondStrength,

      // An array of length 4 which contains the above 4 property arrays.
      // Left undefined if no radial bonds are defined.
      radialBonds,

      // Number of actual radial bonds (may be smaller than the length of the property arrays)
      N_radialBonds = 0,

      // Individual properties for the obstacles
      obstacleX,
      obstacleY,
      obstacleWidth,
      obstacleHeight,
      obstacleVX,
      obstacleVY,
      obstacleMass,
      obstacleXPrev,
      obstacleYPrev,
      obstacleColorR,
      obstacleColorG,
      obstacleColorB,

      // An array of length 12 which contains obstacles information
      obstacles,

      // Number of actual obstacles
      N_obstacles = 0,

      // The location of the center of mass, in nanometers.
      x_CM, y_CM,

      // Linear momentum of the system, in Dalton * nm / fs.
      px_CM, py_CM,

      // Velocity of the center of mass, in nm / fs.
      vx_CM, vy_CM,

      // Angular momentum of the system wrt its center of mass
      L_CM,

      // (Instantaneous) moment of inertia of the system wrt its center of mass
      I_CM,

      // Angular velocity of the system about the center of mass, in radians / fs.
      // (= angular momentum about CM / instantaneous moment of inertia about CM)
      omega_CM,

      // instantaneous system temperature, in Kelvin
      T,

      // Object containing observations of the sytem (temperature, etc)
      outputState = window.state = {},

      // The following are the pairwise values for elements i and j, indexed
      // like [i][j]
      epsilon = [],
      sigma = [],

      // cutoff for force calculations, as a factor of sigma
      cutoff = 5.0,
      cutoffDistance_LJ_sq = [],

      // Each object at ljCalculator[i,j] can calculate the magnitude of the Lennard-Jones force and
      // potential between elements i and j
      ljCalculator = [],

      // Callback that recalculates element radii  and cutoffDistance_LJ_sq when the Lennard-Jones
      // sigma parameter changes.
      ljCoefficientsChanged = function(el1, el2, coefficients) {
        cutoffDistance_LJ_sq[el1][el2] =
          cutoffDistance_LJ_sq[el2][el1] =
          cutoff * cutoff * coefficients.sigma * coefficients.sigma;

        if (el1 === el2) updateElementRadius(el1, coefficients);
      },

      // Update radius of element # 'el'. Also, if 'element' and 'radius' arrays are defined, update
      // all atom's radii to match the new radii of their corresponding elements.
      updateElementRadius = function(el, coefficients) {
        elements[el][ELEMENT_INDICES.RADIUS] = lennardJones.radius( coefficients.sigma );

        if (!radius || !element) return;
        for (var i = 0, len = radius.length; i < len; i++) {
          radius[i] = elements[element[i]][ELEMENT_INDICES.RADIUS];
        }
      },

      // Make the 'atoms' array bigger
      extendAtomsArray = function(num) {
        var savedArrays = [],
            savedTotalMass,
            i;

        for (i = 0; i < atoms.length; i++) {
          savedArrays[i] = atoms[i];
        }

        savedTotalMass = totalMass;
        atomsHaveBeenCreated = false;
        model.createAtoms({ num: num });

        for (i = 0; i < atoms.length; i++) {
          arrays.copy(savedArrays[i], atoms[i]);
        }

        // restore N and totalMass
        N = savedArrays[0].length;        // atoms[0].length is now > N!
        totalMass = savedTotalMass;
      },

      createRadialBondsArray = function(num) {
      var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
          uint16  = (hasTypedArrays && notSafari) ? 'Uint16Array' : 'regular', radialIndices = RADIAL_INDICES;

        radialBonds = model.radialBonds = [];

        radialBonds[radialIndices.ATOM1] = radialBondAtom1Index = arrays.create(num, 0, uint16);
        radialBonds[radialIndices.ATOM2] = radialBondAtom2Index = arrays.create(num, 0, uint16);
        radialBonds[radialIndices.LENGTH] = radialBondLength     = arrays.create(num, 0, float32);
        radialBonds[radialIndices.STRENGTH] = radialBondStrength   = arrays.create(num, 0, float32);
      },

      // Make the 'radialBonds' array bigger. FIXME: needs to be factored
      // into a common pattern with 'extendAtomsArray'
      extendRadialBondsArray = function(num) {
        var savedArrays = [],
            i;

        for (i = 0; i < radialBonds.length; i++) {
          savedArrays[i] = radialBonds[i];
        }

        createRadialBondsArray(num);

        for (i = 0; i < radialBonds.length; i++) {
          arrays.copy(savedArrays[i], radialBonds[i]);
        }
      },

      createObstaclesArray = function(num) {
        var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
            uint8   = (hasTypedArrays && notSafari) ? 'Uint8Array' : 'regular',
            ind     = OBSTACLE_INDICES;

        obstacles = model.obstacles = [];

        obstacles[ind.X]        = obstacleX      = arrays.create(num, 0, float32);
        obstacles[ind.Y]        = obstacleY      = arrays.create(num, 0, float32);
        obstacles[ind.WIDTH]    = obstacleWidth  = arrays.create(num, 0, float32);
        obstacles[ind.HEIGHT]   = obstacleHeight = arrays.create(num, 0, float32);
        obstacles[ind.MASS]     = obstacleMass   = arrays.create(num, 0, float32);
        obstacles[ind.VX]       = obstacleVX     = arrays.create(num, 0, float32);
        obstacles[ind.VY]       = obstacleVY     = arrays.create(num, 0, float32);
        obstacles[ind.X_PREV]   = obstacleXPrev  = arrays.create(num, 0, float32);
        obstacles[ind.Y_PREV]   = obstacleYPrev  = arrays.create(num, 0, float32);
        obstacles[ind.COLOR_R]  = obstacleColorR = arrays.create(num, 0, float32);
        obstacles[ind.COLOR_G]  = obstacleColorG = arrays.create(num, 0, float32);
        obstacles[ind.COLOR_B]  = obstacleColorB = arrays.create(num, 0, float32);
        obstacles[ind.VISIBLE]  = obstacleVisible = arrays.create(num, 0, uint8);
      },


      extendObstaclesArray = function(num) {
        var savedArrays = [],
            i;

        for (i = 0; i < obstacles.length; i++) {
          savedArrays[i] = obstacles[i];
        }

        createObstaclesArray(num);

        for (i = 0; i < obstacles.length; i++) {
          arrays.copy(savedArrays[i], obstacles[i]);
        }
      },



      // Function that accepts a value T and returns an average of the last n values of T (for some n).
      T_windowed,

      // Dynamically determine an appropriate window size for use when measuring a windowed average of the temperature.
      getWindowSize = function() {
        return useCoulombInteraction && hasChargedAtoms ? 1000 : 1000;
      },

      // Whether or not the thermostat is not being used, begins transiently adjusting the system temperature; this
      // causes the adjustTemperature portion of the integration loop to rescale velocities until a windowed average of
      // the temperature comes within `tempTolerance` of `T_target`.
      beginTransientTemperatureChange = function()  {
        temperatureChangeInProgress = true;
        T_windowed = math.getWindowedAverager( getWindowSize() );
      },

      // Calculates & returns instantaneous temperature of the system.
      computeTemperature = function() {
        var twoKE = 0,
            i;

        for (i = 0; i < N; i++) {
          twoKE += elements[element[i]][0] * (vx[i] * vx[i] + vy[i] * vy[i]);
        }
        return KE_to_T( twoKE/2, N );
      },

      // Scales the velocity vector of particle i by `factor`.
      scaleVelocity = function(i, factor) {
        vx[i] *= factor;
        vy[i] *= factor;

        // scale momentum too
        px[i] *= factor;
        py[i] *= factor;
      },

      // Adds the velocity vector (vx_t, vy_t) to the velocity vector of particle i
      addVelocity = function(i, vx_t, vy_t) {
        vx[i] += vx_t;
        vy[i] += vy_t;

        px[i] = vx[i]*elements[element[i]][0];
        py[i] = vy[i]*elements[element[i]][0];
      },

      // Adds effect of angular velocity omega, relative to (x_CM, y_CM), to the velocity vector of particle i
      addAngularVelocity = function(i, omega) {
        vx[i] -= omega * (y[i] - y_CM);
        vy[i] += omega * (x[i] - x_CM);

        px[i] = vx[i]*elements[element[i]][0];
        py[i] = vy[i]*elements[element[i]][0];
      },

      // Subtracts the center-of-mass linear velocity and the system angular velocity from the velocity vectors
      removeTranslationAndRotationFromVelocities = function() {
        for (var i = 0; i < N; i++) {
          addVelocity(i, -vx_CM, -vy_CM);
          addAngularVelocity(i, -omega_CM);
        }
      },

      // currently unused, implementation saved here for future reference:

      // // Adds the center-of-mass linear velocity and the system angular velocity back into the velocity vectors
      // addTranslationAndRotationToVelocities = function() {
      //   for (var i = 0; i < N; i++) {
      //     addVelocity(i, vx_CM, vy_CM);
      //     addAngularVelocity(i, omega_CM);
      //   }
      // },

      // Subroutine that calculates the position and velocity of the center of mass, leaving these in x_CM, y_CM,
      // vx_CM, and vy_CM, and that then computes the system angular velocity around the center of mass, leaving it
      // in omega_CM.
      computeSystemTranslation = function() {
        var x_sum = 0,
            y_sum = 0,
            px_sum = 0,
            py_sum = 0,
            i;

        for (i = 0; i < N; i++) {
          x_sum += x[i];
          y_sum += y[i];
          px_sum += px[i];
          py_sum += py[i];
        }

        x_CM = x_sum / N;
        y_CM = y_sum / N;
        px_CM = px_sum;
        py_CM = py_sum;
        vx_CM = px_sum / totalMass;
        vy_CM = py_sum / totalMass;
      },

      // Subroutine that calculates the angular momentum and moment of inertia around the center of mass, and then
      // uses these to calculate the weighted angular velocity around the center of mass.
      // Updates I_CM, L_CM, and omega_CM.
      // Requires x_CM, y_CM, vx_CM, vy_CM to have been calculated.
      computeSystemRotation = function() {
        var L = 0,
            I = 0,
            mass,
            i;

        for (i = 0; i < N; i++) {
          mass = elements[element[i]][0];
          // L_CM = sum over N of of mr_i x p_i (where r_i and p_i are position & momentum vectors relative to the CM)
          L += mass * cross( x[i]-x_CM, y[i]-y_CM, vx[i]-vx_CM, vy[i]-vy_CM);
          I += mass * sumSquare( x[i]-x_CM, y[i]-y_CM );
        }

        L_CM = L;
        I_CM = I;
        omega_CM = L_CM / I_CM;
      },

      computeCMMotion = function() {
        computeSystemTranslation();
        computeSystemRotation();
      },

      // Calculate x(t+dt, i) from v(t) and a(t)
      updatePosition = function(i) {
        x[i] += vx[i]*dt + 0.5*ax[i]*dt_sq;
        y[i] += vy[i]*dt + 0.5*ay[i]*dt_sq;
      },

      updateObstaclePosition = function(i) {
        var ob_vx = obstacleVX[i],
            ob_vy = obstacleVY[i];
        if (ob_vx || ob_vy) {
          obstacleXPrev[i] = obstacleX[i];
          obstacleYPrev[i] = obstacleY[i];
          obstacleX[i] += ob_vx*dt;
          obstacleY[i] += ob_vy*dt;
        }
      },

      // Constrain particle i to the area between the walls by simulating perfectly elastic collisions with the walls.
      // Note this may change the linear and angular momentum.
      bounceOffWalls = function(i) {
        var r = radius[i],
            leftwall = r,
            bottomwall = r,
            rightwall = size[0] - r,
            topwall = size[1] - r;

        // Bounce off vertical walls.
        if (x[i] < leftwall) {
          x[i]  = leftwall + (leftwall - x[i]);
          vx[i] *= -1;
          px[i] *= -1;
        } else if (x[i] > rightwall) {
          x[i]  = rightwall - (x[i] - rightwall);
          vx[i] *= -1;
          px[i] *= -1;
        }

        // Bounce off horizontal walls
        if (y[i] < bottomwall) {
          y[i]  = bottomwall + (bottomwall - y[i]);
          vy[i] *= -1;
          py[i] *= -1;
        } else if (y[i] > topwall) {
          y[i]  = topwall - (y[i] - topwall);
          vy[i] *= -1;
          py[i] *= -1;
        }
      },

      bounceOffObstacles = function(i, x_prev, y_prev) {
        // fast path if no obstacles
        if (N_obstacles < 1) return;

        var r,
            xi,
            yi,

            j,

            x_left,
            x_right,
            y_top,
            y_bottom,
            x_left_prev,
            x_right_prev,
            y_top_prev,
            y_bottom_prev,
            vxPrev,
            vyPrev,
            obs_vxPrev,
            obs_vyPrev,
            mass,
            obs_mass,
            totalMass,
            bounceDirection = 0; // if we bounce horz: 1, vert: -1

        r = radius[i];
        xi = x[i];
        yi = y[i];

        for (j = 0; j < N_obstacles; j++) {

          x_left = obstacleX[j] - r;
          x_right = obstacleX[j] + obstacleWidth[j] + r;
          y_top = obstacleY[j] + obstacleHeight[j] + r;
          y_bottom = obstacleY[j] - r;

          x_left_prev = obstacleXPrev[j] - r;
          x_right_prev = obstacleXPrev[j] + obstacleWidth[j] + r;
          y_top_prev = obstacleYPrev[j] + obstacleHeight[j] + r;
          y_bottom_prev = obstacleYPrev[j] - r;


          if (xi > x_left && xi < x_right && yi > y_bottom && yi < y_top) {
            if (x_prev <= x_left_prev) {
              x[i] = x_left - (xi - x_left);
              bounceDirection = 1;
            } else if (x_prev >= x_right_prev) {
              x[i] = x_right + (x_right - xi);
              bounceDirection = 1;
            } else if (y_prev <= y_top_prev) {
              y[i] = y_bottom - (yi - y_bottom);
              bounceDirection = -1;
            } else if (y_prev >= y_bottom_prev) {
              y[i] = y_top  + (y_top - yi);
              bounceDirection = -1;
            }
          }

          obs_mass = obstacleMass[j];

          if (bounceDirection) {
            if (obs_mass !== Infinity) {
              // if we have real mass, perform a perfectly-elastic collision
              mass = elements[element[i]][0];
              totalMass = obs_mass + mass;
              if (bounceDirection === 1) {
                vxPrev = vx[i];
                obs_vxPrev = obstacleVX[j];

                vx[i] = (vxPrev * (mass - obs_mass) + (2 * obs_mass * obs_vxPrev)) / totalMass;
                obstacleVX[j] = (obs_vxPrev * (obs_mass - mass) + (2 * px[i])) / totalMass;
              } else {
                vyPrev = vy[i];
                obs_vyPrev = obstacleVY[j];

                vy[i] = (vyPrev * (mass - obs_mass) + (2 * obs_mass * obs_vyPrev)) / totalMass;
                obstacleVY[j] = (obs_vyPrev * (obs_mass - mass) + (2 * py[i])) / totalMass;
              }
            } else {
              // if we have infinite mass, just reflect (like a wall)
              if (bounceDirection === 1) {
                vx[i] *= -1;
              } else {
                vy[i] *= -1;
              }
            }
          }
        }
      },


      // Half of the update of v(t+dt, i) and p(t+dt, i) using a; during a single integration loop,
      // call once when a = a(t) and once when a = a(t+dt)
      halfUpdateVelocity = function(i) {
        var mass = elements[element[i]][0];
        vx[i] += 0.5*ax[i]*dt;
        px[i] = mass * vx[i];
        vy[i] += 0.5*ay[i]*dt;
        py[i] = mass * vy[i];
      },

      // Accumulate accelerations into a(t+dt, i) and a(t+dt, j) for all pairwise interactions between particles i and j
      // where j < i. Note a(t, i) and a(t, j) (accelerations from the previous time step) should be cleared from arrays
      // ax and ay before calling this function.
      updatePairwiseAccelerations = function(i) {
        var j, dx, dy, r_sq, f_over_r, fx, fy,
            el_i = element[i],
            el_j,
            mass_inv = 1/elements[el_i][0], mass_j_inv, q_i = charge[i];

        for (j = 0; j < i; j++) {
          el_j = element[j];

          mass_j_inv = 1/elements[el_j][0];

          dx = x[j] - x[i];
          dy = y[j] - y[i];
          r_sq = dx*dx + dy*dy;

          f_over_r = 0;

          if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq[el_i][el_j]) {
            f_over_r += ljCalculator[el_i][el_j].forceOverDistanceFromSquaredDistance(r_sq);
          }

          if (useCoulombInteraction && hasChargedAtoms) {
            f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, q_i, charge[j]);
          }

          if (f_over_r) {
            fx = f_over_r * dx;
            fy = f_over_r * dy;
            ax[i] += fx * mass_inv;
            ay[i] += fy * mass_inv;
            ax[j] -= fx * mass_j_inv;
            ay[j] -= fy * mass_j_inv;
          }
        }
      },

      updateBondAccelerations = function() {
        // fast path if no radial bonds have been defined
        if (N_radialBonds < 1) return;

        var i,
            len,
            i1,
            i2,
            el1,
            el2,
            dx,
            dy,
            r_sq,
            r,
            k,
            r0,
            f_over_r,
            fx,
            fy,
            mass1_inv,
            mass2_inv;

        for (i = 0, len = radialBonds[0].length; i < len; i++) {
          i1 = radialBondAtom1Index[i];
          i2 = radialBondAtom2Index[i];
          el1 = element[i1];
          el2 = element[i2];

          mass1_inv = 1/elements[el1][0];
          mass2_inv = 1/elements[el2][0];

          dx = x[i2] - x[i1];
          dy = y[i2] - y[i1];
          r_sq = dx*dx + dy*dy;
          r = Math.sqrt(r_sq);

          // eV/nm^2
          k = radialBondStrength[i];

          // nm
          r0 = radialBondLength[i];

          // "natural" Next Gen MW force units / nm
          f_over_r = constants.convert(k*(r-r0), { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / r;

          // Subtract out the Lennard-Jones force between bonded pairs.
          //
          // (optimization assumption: the penalty for calculating the force twice for bonded pairs
          // will be much less than the overhead and possible loop deoptimization incurred by
          // checking against a list of bonded pairs each time through
          // updatePairwiseAccelerations()'s inner loop.)

          if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq[el1][el2]) {
            f_over_r -= ljCalculator[el1][el2].forceOverDistanceFromSquaredDistance(r_sq);
          }

          fx = f_over_r * dx;
          fy = f_over_r * dy;

          ax[i1] += fx * mass1_inv;
          ay[i1] += fy * mass1_inv;
          ax[i2] -= fx * mass2_inv;
          ay[i2] -= fy * mass2_inv;
        }
      },

      adjustTemperature = function(target, forceAdjustment) {
        var rescalingFactor,
            i;

        if (target == null) target = T_target;

        T = computeTemperature();

        if (temperatureChangeInProgress && Math.abs(T_windowed(T) - target) <= target * tempTolerance) {
          temperatureChangeInProgress = false;
        }

        if (forceAdjustment || useThermostat || temperatureChangeInProgress && T > 0) {
          rescalingFactor = Math.sqrt(target / T);
          for (i = 0; i < N; i++) {
            scaleVelocity(i, rescalingFactor);
          }
          T = target;
        }
      };


  return model = {

    outputState: outputState,

    useCoulombInteraction: function(v) {
      useCoulombInteraction = !!v;
    },

    useLennardJonesInteraction: function(v) {
      useLennardJonesInteraction = !!v;
    },

    useThermostat: function(v) {
      useThermostat = !!v;
    },

    setTargetTemperature: function(v) {
      validateTemperature(v);
      T_target = v;
    },

    // Our timekeeping is really a convenience for users of this lib, so let them reset time at will
    setTime: function(t) {
      outputState.time = time = t;
    },

    setSize: function(v) {
      // NB. We may want to create a simple state diagram for the md engine (as well as for the 'modeler' defined in
      // lab.molecules.js)
      if (sizeHasBeenInitialized) {
        throw new Error("The molecular model's size has already been set, and cannot be reset.");
      }
      var width  = (v[0] && v[0] > 0) ? v[0] : 10,
          height = (v[1] && v[1] > 0) ? v[1] : 10;
      size = [width, height];
    },

    getSize: function() {
      return [size[0], size[1]];
    },

    getLJCalculator: function() {
      return ljCalculator;
    },

    /*
      Expects an array of element properties such as
      [
        [ mass_of_elem_0 ],
        [ mass_of_elem_1 ]
      ]
    */
    setElements: function(elems) {
      var i, j, epsilon_i, epsilon_j, sigma_i, sigma_j;

      if (atomsHaveBeenCreated) {
        throw new Error("md2d: setElements cannot be called after atoms have been created");
      }
      elements = elems;

      for (i = 0; i < elements.length; i++) {
        epsilon[i] = [];
        sigma[i] = [];
        ljCalculator[i] = [];
        cutoffDistance_LJ_sq[i] = [];
      }

      for (i = 0; i < elements.length; i++) {
        epsilon_i = elements[i][ELEMENT_INDICES.EPSILON];
        sigma_i   = elements[i][ELEMENT_INDICES.SIGMA];

        // the radius is derived from sigma
        elements[i][ELEMENT_INDICES.RADIUS] = lennardJones.radius(sigma_i);

        for (j = i; j < elements.length; j++) {
          epsilon_j = elements[j][ELEMENT_INDICES.EPSILON];
          sigma_j   = elements[j][ELEMENT_INDICES.SIGMA];

          epsilon[i][j] = epsilon[j][i] = lennardJones.pairwiseEpsilon(epsilon_i, epsilon_j);
          sigma[i][j]   = sigma[j][i]   = lennardJones.pairwiseSigma(sigma_i, sigma_j);

          // bind i and j to the callback made below
          (function(i, j) {
            ljCalculator[i][j] = ljCalculator[j][i] = lennardJones.newLJCalculator({
              epsilon: epsilon[i][j],
              sigma:   sigma[i][j]
            }, function(coefficients) {
              ljCoefficientsChanged(i, j, coefficients);
            });
          }(i,j));
        }
      }
    },

    /**
      Allocates 'atoms' array of arrays, sets number of atoms.

      options:
        num: the number of atoms to create
    */
    createAtoms: function(options) {
      var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
          uint8 = (hasTypedArrays && notSafari) ? 'Uint8Array' : 'regular',
          numIndices,
          num;

      if (atomsHaveBeenCreated) {
        throw new Error("md2d: createAtoms was called even though the particles have already been created for this model instance.");
      }
      atomsHaveBeenCreated = true;
      sizeHasBeenInitialized = true;

      if (typeof options === 'undefined') {
        throw new Error("md2d: createAtoms was called without options specifying the atoms to create.");
      }

      num = options.num;

      if (typeof num === 'undefined') {
        throw new Error("md2d: createAtoms was called without the required 'num' option specifying the number of atoms to create.");
      }
      if (num !== Math.floor(num)) {
        throw new Error("md2d: createAtoms was passed a non-integral 'num' option.");
      }
      if (num < N_MIN) {
        throw new Error("md2d: create Atoms was passed an 'num' option equal to: " + num + " which is less than the minimum allowable value: N_MIN = " + N_MIN + ".");
      }
      if (num > N_MAX) {
        throw new Error("md2d: create Atoms was passed an 'N' option equal to: " + num + " which is greater than the minimum allowable value: N_MAX = " + N_MAX + ".");
      }

      numIndices = (function() {
        var n = 0, index;
        for (index in INDICES) {
          if (INDICES.hasOwnProperty(index)) n++;
        }
        return n;
      }());

      atoms  = model.atoms  = arrays.create(numIndices, null, 'regular');

      radius  = model.radius  = atoms[INDICES.RADIUS]  = arrays.create(num, 0, float32);
      px      = model.px      = atoms[INDICES.PX]      = arrays.create(num, 0, float32);
      py      = model.py      = atoms[INDICES.PY]      = arrays.create(num, 0, float32);
      x       = model.x       = atoms[INDICES.X]       = arrays.create(num, 0, float32);
      y       = model.y       = atoms[INDICES.Y]       = arrays.create(num, 0, float32);
      vx      = model.vx      = atoms[INDICES.VX]      = arrays.create(num, 0, float32);
      vy      = model.vy      = atoms[INDICES.VY]      = arrays.create(num, 0, float32);
      speed   = model.speed   = atoms[INDICES.SPEED]   = arrays.create(num, 0, float32);
      ax      = model.ax      = atoms[INDICES.AX]      = arrays.create(num, 0, float32);
      ay      = model.ay      = atoms[INDICES.AY]      = arrays.create(num, 0, float32);
      charge  = model.charge  = atoms[INDICES.CHARGE]  = arrays.create(num, 0, float32);
      element = model.element = atoms[INDICES.ELEMENT] = arrays.create(num, 0, uint8);

      N = 0;
      totalMass = 0;
    },

    /**
      The canonical method for adding an atom to the collections of atoms.

      If there isn't enough room in the 'atoms' array, it (somewhat inefficiently)
      extends the length of the typed arrays by one to contain one more atom with listed properties.
    */
    addAtom: function(atom_element, atom_x, atom_y, atom_vx, atom_vy, atom_charge) {
      var el, mass;

      if (N+1 > atoms[0].length) {
        extendAtomsArray(N+1);
      }

      el = elements[atom_element];
      mass = el[ELEMENT_INDICES.MASS];

      element[N] = atom_element;
      radius[N]  = elements[atom_element][ELEMENT_INDICES.RADIUS];
      x[N]       = atom_x;
      y[N]       = atom_y;
      vx[N]      = atom_vx;
      vy[N]      = atom_vy;
      px[N]      = atom_vx * mass;
      py[N]      = atom_vy * mass;
      ax[N]      = 0;
      ay[N]      = 0;
      speed[N]   = Math.sqrt(atom_vx*atom_vx + atom_vy*atom_vy);
      charge[N]  = atom_charge;

      if (atom_charge) hasChargedAtoms = true;

      totalMass += mass;
      N++;
    },

    /**
      The generic method to set properties on a single existing atom.

      Example: setAtomProperties(3, {x: 5, y: 8, px: 0.5, charge: -1})
    */
    setAtomProperties: function(i, props) {
      for (prop in props) {
        if (!props.hasOwnProperty(prop)) continue;
        this[prop][i] = props[prop];
      }
    },

    /**
      The canonical method for adding a radial bond to the collection of radial bonds.

      If there isn't enough room in the 'radialBonds' array, it (somewhat inefficiently)
      extends the length of the typed arrays by one to contain one more atom with listed properties.
    */
    addRadialBond: function(atomIndex1, atomIndex2, bondLength, bondStrength) {

      if (N_radialBonds+1 > radialBondAtom1Index.length) {
        extendRadialBondsArray(N_radialBonds+1);
      }

      radialBondAtom1Index[N_radialBonds] = atomIndex1;
      radialBondAtom2Index[N_radialBonds] = atomIndex2;
      radialBondLength[N_radialBonds]     = bondLength;
      radialBondStrength[N_radialBonds]   = bondStrength;

      N_radialBonds++;
    },


    addObstacle: function(x, y, width, height, density, color, visible) {
      var mass;

      if (N_obstacles+1 > obstacleX.length) {
        extendObstaclesArray(N_obstacles+1);
      }

      obstacleX[N_obstacles] = x;
      obstacleY[N_obstacles] = y;
      obstacleXPrev[N_obstacles] = x;
      obstacleYPrev[N_obstacles] = y;

      obstacleWidth[N_obstacles]  = width;
      obstacleHeight[N_obstacles] = height;

      obstacleVX[N_obstacles] = 0;
      obstacleVY[N_obstacles] = 0;

      density = parseFloat(density);      // may be string "Infinity"
      mass = density * width * height;

      obstacleMass[N_obstacles] = mass;

      obstacleColorR[N_obstacles] = color[0];
      obstacleColorG[N_obstacles] = color[1];
      obstacleColorB[N_obstacles] = color[2];

      obstacleVisible[N_obstacles] = visible;

      N_obstacles++;
    },

    /**
      Checks to see if an uncharged atom could be placed at location x,y
      without increasing the PE (i.e. overlapping with another atom), and
      without being on an obstacle.

      Optionally, an atom index i can be included which will tell the function
      to ignore the existance of atom i. (Used when moving i around.)
    */
    canPlaceAtom: function(element, _x, _y, i) {
      var orig_x, orig_y, r, PEAtLocation;

      // first do the simpler check to see if we're on an obstacle
      r = radius[i]
      for (j = 0; j < N_obstacles; j++) {
        if (_x > (obstacleX[j] - r) && _x < (obstacleX[j] + obstacleWidth[j] + r)
            && _y > (obstacleY[j] - r) && _y < (obstacleY[j] + obstacleHeight[j] + r)) {
          return false;
        }
      }

      // then check PE at location
      if (typeof i === "number") {
        orig_x = x[i];
        orig_y = y[i];
        x[i] = y[i] = Infinity;   // move i atom away
      }

      PEAtLocation = coreModel.newPotentialCalculator(element, 0, false)(_x, _y);

      if (typeof i === "number") {
        x[i] = orig_x;
        y[i] = orig_y;
      }

      return PEAtLocation <= 0;
    },

    // Sets the X, Y, VX, VY and ELEMENT properties of the atoms
    initializeAtomsFromProperties: function(props) {
      var x, y, vx, vy, charge, element,
          i, ii;

      if (!(props.X && props.Y)) {
        throw new Error("md2d: initializeAtomsFromProperties must specify at minimum X and Y locations.");
      }

      if (!(props.VX && props.VY)) {
        // We may way to support authored locations with random velocities in the future
        throw new Error("md2d: For now, velocities must be set when locations are set.");
      }

      for (i=0, ii=props.X.length; i<ii; i++){
        element = props.ELEMENT ? props.ELEMENT[i] : 0;
        x = props.X[i];
        y = props.Y[i];
        vx = props.VX[i];
        vy = props.VY[i];
        charge = props.CHARGE ? props.CHARGE[i] : 0;

        model.addAtom(element, x, y, vx, vy, charge);
      }

      // Publish the current state
      T = computeTemperature();
      model.computeOutputState();
    },

    initializeAtomsRandomly: function(options) {

      var // if a temperature is not explicitly requested, we just need any nonzero number
          temperature = options.temperature || 100,

          // fill up the entire 'atoms' array if not otherwise requested
          num         = options.num         || atoms[0].length,

          nrows = Math.floor(Math.sqrt(num)),
          ncols = Math.ceil(num/nrows),

          i, r, c, rowSpacing, colSpacing,
          vMagnitude, vDirection,
          x, y, vx, vy, charge, element;

      validateTemperature(temperature);

      colSpacing = size[0] / (1+ncols);
      rowSpacing = size[1] / (1+nrows);

      // Arrange molecules in a lattice. Not guaranteed to have CM exactly on center, and is an artificially low-energy
      // configuration. But it works OK for now.
      i = -1;

      for (r = 1; r <= nrows; r++) {
        for (c = 1; c <= ncols; c++) {
          i++;
          if (i === num) break;

          element    = Math.floor(Math.random() * elements.length);     // random element
          vMagnitude = math.normal(1, 1/4);
          vDirection = 2 * Math.random() * Math.PI;

          x = c*colSpacing;
          y = r*rowSpacing;
          vx = vMagnitude * Math.cos(vDirection);
          vy = vMagnitude * Math.sin(vDirection);

          charge = 2*(i%2)-1;      // alternate negative and positive charges

          model.addAtom(element, x, y, vx, vy, charge);
        }
      }

      // now, remove all translation of the center of mass and rotation about the center of mass
      computeCMMotion();
      removeTranslationAndRotationFromVelocities();

      // Scale randomized velocities to match the desired initial temperature.
      //
      // Note that although the instantaneous temperature will be 'temperature' exactly, the temperature will quickly
      // settle to a lower value because we are initializing the atoms spaced far apart, in an artificially low-energy
      // configuration.
      //
      adjustTemperature(temperature, true);

      // Publish the current state
      T = computeTemperature();
      model.computeOutputState();
    },

    initializeObstacles: function (props) {
      var num = props.x.length,
          i;

      createObstaclesArray(num);
      for (i = 0; i < num; i++) {
        model.addObstacle(props.x[i], props.y[i], props.width[i], props.height[i], props.density[i], props.color[i], props.visible[i]);
      }
    },

    initializeRadialBonds: function(props) {
      var num = props.atom1Index.length,
          i;

      createRadialBondsArray(num);

      for (i = 0; i < num; i++) {
        model.addRadialBond(
          props.atom1Index[i],
          props.atom2Index[i],
          props.bondLength[i],
          props.bondStrength[i]
        );
      }
    },

    relaxToTemperature: function(T) {

      // FIXME this method needs to be modified. It should rescale velocities only periodically
      // and stop when the temperature approaches a steady state between rescalings.

      if (T != null) T_target = T;

      validateTemperature(T_target);

      beginTransientTemperatureChange();
      while (temperatureChangeInProgress) {
        model.integrate();
      }
    },

    integrate: function(duration, opt_dt) {

      var radius;

      if (!atomsHaveBeenCreated) {
        throw new Error("md2d: integrate called before atoms created.");
      }

      if (duration == null)  duration = 100;  // how much time to integrate over, in fs

      dt = opt_dt || 1;
      dt_sq = dt*dt;                      // time step, squared

      // FIXME we still need to make bounceOffWalls respect each atom's actual radius, rather than
      // assuming just one radius as below
      radius = elements[element[0]][ELEMENT_INDICES.RADIUS];

      var t_start = time,
          n_steps = Math.floor(duration/dt),  // number of steps
          iloop,
          i,
          x_prev,
          y_prev;

      for (iloop = 1; iloop <= n_steps; iloop++) {
        time = t_start + iloop*dt;

        for (i = 0; i < N; i++) {
          x_prev = x[i];
          y_prev = y[i];

          // Update r(t+dt) using v(t) and a(t)
          updatePosition(i);
          bounceOffWalls(i);
          bounceOffObstacles(i, x_prev, y_prev);

          // First half of update of v(t+dt, i), using v(t, i) and a(t, i)
          halfUpdateVelocity(i);

          // Zero out a(t, i) for accumulation of a(t+dt, i)
          ax[i] = ay[i] = 0;

          // Accumulate accelerations for time t+dt into a(t+dt, k) for k <= i. Note that a(t+dt, i) won't be
          // usable until this loop completes; it won't have contributions from a(t+dt, k) for k > i
          updatePairwiseAccelerations(i);
        }

        // Move obstacles
        for (i = 0; i < N_obstacles; i++) {
          updateObstaclePosition(i);
        }

        // Accumulate accelerations from bonded interactions into a(t+dt)
        updateBondAccelerations();

        for (i = 0; i < N; i++) {
          // Second half of update of v(t+dt, i) using first half of update and a(t+dt, i)
          halfUpdateVelocity(i);

          // Now that we have velocity, update speed
          speed[i] = Math.sqrt(vx[i]*vx[i] + vy[i]*vy[i]);
        }

        adjustTemperature();
      } // end of integration loop
      model.computeOutputState();
    },

    getTotalMass: function() {
      return totalMass;
    },

    getRadiusOfElement: function(el) {
      return elements[el][ELEMENT_INDICES.RADIUS];
    },

    computeOutputState: function() {
      var i, j,
          i1, i2,
          el1, el2,
          dx, dy,
          r_sq,
          k,
          dr,
          KEinMWUnits,       // total kinetic energy, in MW units
          PE;                // potential energy, in eV

      // Calculate potentials in eV. Note that we only want to do this once per call to integrate(), not once per
      // integration loop!
      PE = 0;
      KEinMWUnits = 0;

      for (i = 0; i < N; i++) {
        KEinMWUnits += 0.5 * elements[element[i]][0] * (vx[i] * vx[i] + vy[i] * vy[i]);

        // pairwise interactions
        for (j = i+1; j < N; j++) {
          dx = x[j] - x[i];
          dy = y[j] - y[i];

          r_sq = dx*dx + dy*dy;

          // report total potentials as POSITIVE, i.e., - the value returned by potential calculators
          if (useLennardJonesInteraction) {
            PE += -ljCalculator[element[i]][element[j]].potentialFromSquaredDistance(r_sq);
          }
          if (useCoulombInteraction && hasChargedAtoms) {
            PE += -coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j]);
          }
        }
      }

      // radial bonds
      for (i = 0; i < N_radialBonds; i++) {
        i1 = radialBondAtom1Index[i];
        i2 = radialBondAtom2Index[i];
        el1 = element[i1];
        el2 = element[i2];

        dx = x[i2] - x[i1];
        dy = y[i2] - y[i1];
        r_sq = dx*dx + dy*dy;

        // eV/nm^2
        k = radialBondStrength[i];

        // nm
        dr = Math.sqrt(r_sq) - radialBondLength[i];

        PE += 0.5*k*dr*dr;

        // Remove the Lennard Jones potential for the bonded pair
        if (useLennardJonesInteraction) {
          PE += ljCalculator[el1][el2].potentialFromSquaredDistance(r_sq);
        }
      }

      // State to be read by the rest of the system:
      outputState.time     = time;
      outputState.pressure = 0;// (time - t_start > 0) ? pressure / (time - t_start) : 0;
      outputState.PE       = PE;
      outputState.KE       = constants.convert(KEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
      outputState.T        = T;
      outputState.pCM      = [px_CM, py_CM];
      outputState.CM       = [x_CM, y_CM];
      outputState.vCM      = [vx_CM, vy_CM];
      outputState.omega_CM = omega_CM;
    },

    /**
      Given a test element and charge, returns a function that returns for a location (x, y) in nm:
       * the potential energy, in eV, of an atom of that element and charge at location (x, y)
       * optionally, if calculateGradient is true, the gradient of the potential as an
         array [gradX, gradY]. (units: eV/nm)
    */
    newPotentialCalculator: function(testElement, testCharge, calculateGradient) {

      return function(testX, testY) {
        var PE = 0,
            fx = 0,
            fy = 0,
            gradX,
            gradY,
            ljTest = ljCalculator[testElement],
            i,
            dx,
            dy,
            r_sq,
            r,
            f_over_r,
            lj;

        for (i = 0; i < N; i++) {
          dx = testX - x[i];
          dy = testY - y[i];
          r_sq = dx*dx + dy*dy;
          f_over_r = 0;

          if (useLennardJonesInteraction) {
            lj = ljTest[element[i]];
            PE += -lj.potentialFromSquaredDistance(r_sq, testElement, element[i]);
            if (calculateGradient) {
              f_over_r += lj.forceOverDistanceFromSquaredDistance(r_sq);
            }
          }

          if (useCoulombInteraction && hasChargedAtoms && testCharge) {
            r = Math.sqrt(r_sq);
            PE += -coulomb.potential(r, testCharge, charge[i]);
            if (calculateGradient) {
              f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, testCharge, charge[i]);
            }
          }

          if (f_over_r) {
            fx += f_over_r * dx;
            fy += f_over_r * dy;
          }
        }

        if (calculateGradient) {
          gradX = constants.convert(fx, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
          gradY = constants.convert(fy, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
          return [PE, [gradX, gradY]];
        }

        return PE;
      };
    },

    /**
      Starting at (x,y), try to find a position which minimizes the potential energy change caused
      by adding at atom of element el.
    */
    findMinimumPELocation: function(el, x, y, charge) {
      var pot    = model.newPotentialCalculator(el, charge, true),
          radius = elements[el][ELEMENT_INDICES.RADIUS],

          res =  math.minimize(pot, [x, y], {
            bounds: [ [radius, size[0]-radius], [radius, size[1]-radius] ]
          });

      if (res.error) return false;
      return res[1];
    },

    /**
      Starting at (x,y), try to find a position which minimizes the square of the potential energy
      change caused by adding at atom of element el, i.e., find a "farthest from everything"
      position.
    */
    findMinimumPESquaredLocation: function(el, x, y, charge) {
      var pot = model.newPotentialCalculator(el, charge, true),

          // squared potential energy, with gradient
          potsq = function(x,y) {
            var res, f, grad;

            res = pot(x,y);
            f = res[0];
            grad = res[1];

            // chain rule
            grad[0] *= (2*f);
            grad[1] *= (2*f);

            return [f*f, grad];
          },

          radius = elements[el][ELEMENT_INDICES.RADIUS],

          res = math.minimize(potsq, [x, y], {
            bounds: [ [radius, size[0]-radius], [radius, size[1]-radius] ],
            stopval: 1e-4,
            precision: 1e-6
          });

      if (res.error) return false;
      return res[1];
    },

    atomsInMolecule: [],
    depth: 0,

    /**
      Returns all atoms in the same molecule as atom i
      (not including i itself)
    */
    getMoleculeAtoms: function(i) {
      this.atomsInMolecule.push(i);
      var moleculeAtoms = [];
      var bondedAtoms = this.getBondedAtoms(i);
      var depth = this.depth;
      this.depth++;
      for (var j=0, jj=bondedAtoms.length; j<jj; j++) {
        var atomNo = bondedAtoms[j];
        if (!~this.atomsInMolecule.indexOf(atomNo)) {
          moleculeAtoms = moleculeAtoms.concat(this.getMoleculeAtoms(atomNo)); // recurse
        }
      }
      if (depth === 0) {
        this.depth = 0;
        this.atomsInMolecule = [];
      } else {
        moleculeAtoms.push(i)
      }
      return moleculeAtoms;
    },

    /**
      Returns all atoms directly bonded to atom i
    */
    getBondedAtoms: function(i) {
      var bondedAtoms = [];
      for (j = 0, jj = radialBonds[0].length; j < jj; j++) {
        // console.log("looking at bond from "+radialBonds)
        if (radialBondAtom1Index[j] === i) {
          bondedAtoms.push(radialBondAtom2Index[j]);
        }
        if (radialBondAtom2Index[j] === i) {
          bondedAtoms.push(radialBondAtom1Index[j]);
        }
      }
      return bondedAtoms;
    },

    serialize: function() {
      var serializedData = {},
          prop,
          array,
          i, ii;
      for (i=0, ii=SAVEABLE_INDICES.length; i<ii; i++) {
        prop = SAVEABLE_INDICES[i];
        array = atoms[INDICES[prop]];
        serializedData[prop] = array.slice ? array.slice() : copyTypedArray(array);
      }
      return serializedData;
    }
  };
};
});
require("/md2d.js");
/*globals $ modeler:true, require, d3, benchmark, molecule_container */
/*jslint onevar: true devel:true eqnull: true */

// modeler.js
//

var md2d   = require('/md2d'),
    arrays = require('arrays'),
    coreModel;

modeler = {};
modeler.VERSION = '0.2.0';

modeler.model = function(initialProperties) {
  var model = {},
      elements = initialProperties.elements || [{id: 0, mass: 39.95, epsilon: -0.1, sigma: 0.34}],
      dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack", "seek"),
      temperature_control,
      chargeShading, showVDWLines,VDWLinesRatio,
      lennard_jones_forces, coulomb_forces,
      stopped = true,
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = 0,
      new_step = false,
      pressure, pressures = [0],
      sample_time, sample_times = [],

      // N.B. this is the thermostat (temperature control) setting
      temperature,

      // current model time, in fs
      time,

      // potential energy
      pe,

      // kinetic energy
      ke,

      modelOutputState,
      model_listener,

      width = initialProperties.width,
      height = initialProperties.height,

      //
      // A two dimensional array consisting of arrays of node property values
      //
      nodes,

      // list of obstacles
      obstacles,
      // Radial Bonds
      radialBonds,

      default_obstacle_properties = {
        vx: 0,
        vy: 0,
        density: Infinity,
        color: [128, 128, 128]
      },

      listeners = {},

      properties = {
        temperature           : 300,
        coulomb_forces        : true,
        lennard_jones_forces  : true,
        temperature_control   : true,
        chargeShading         : false,
        showVDWLines          : false,
        VDWLinesRatio         : 1.99,

        set_temperature: function(t) {
          this.temperature = t;
          if (coreModel) {
            coreModel.setTargetTemperature(t);
          }
        },

        set_temperature_control: function(tc) {
          this.temperature_control = tc;
          if (coreModel) {
            coreModel.useThermostat(tc);
          }
        },

        set_coulomb_forces: function(cf) {
          this.coulomb_forces = cf;
          if (coreModel) {
            coreModel.useCoulombInteraction(cf);
          }
        },

        set_epsilon: function(e) {
          console.log("set_epsilon: This method is temporarily deprecated");
        },

        set_sigma: function(s) {
          console.log("set_sigma: This method is temporarily deprecated");
        }
      };

  //
  // Indexes into the nodes array for the individual node property arrays
  // (re-export these from coreModel for convenience)
  //
  model.INDICES = {
    RADIUS   : md2d.INDICES.RADIUS,
    PX       : md2d.INDICES.PX,
    PY       : md2d.INDICES.PY,
    X        : md2d.INDICES.X,
    Y        : md2d.INDICES.Y,
    VX       : md2d.INDICES.VX,
    VY       : md2d.INDICES.VY,
    SPEED    : md2d.INDICES.SPEED,
    AX       : md2d.INDICES.AX,
    AY       : md2d.INDICES.AY,
    CHARGE   : md2d.INDICES.CHARGE,
    ELEMENT  : md2d.INDICES.ELEMENT
  };

  model.OBSTACLE_INDICES = {
    X        : md2d.OBSTACLE_INDICES.X,
    Y        : md2d.OBSTACLE_INDICES.Y,
    WIDTH    : md2d.OBSTACLE_INDICES.WIDTH,
    HEIGHT   : md2d.OBSTACLE_INDICES.HEIGHT,
    COLOR_R  : md2d.OBSTACLE_INDICES.COLOR_R,
    COLOR_G  : md2d.OBSTACLE_INDICES.COLOR_G,
    COLOR_B  : md2d.OBSTACLE_INDICES.COLOR_B,
    VISIBLE  : md2d.OBSTACLE_INDICES.VISIBLE,
  };

  model.RADIAL_INDICES = {
    ATOM1     : md2d.RADIAL_INDICES.ATOM1,
    ATOM2     : md2d.RADIAL_INDICES.ATOM2,
    LENGTH    : md2d.RADIAL_INDICES.LENGTH,
    STRENGTH  : md2d.RADIAL_INDICES.STRENGTH,
  };

  function notifyListeners(listeners) {
    $.unique(listeners);
    for (var i=0, ii=listeners.length; i<ii; i++){
      listeners[i]();
    }
  }

  function notifyListenersOfEvents(events) {
    var evt,
        evts,
        waitingToBeNotified = [],
        i, ii;

    if (typeof events === "string") {
      evts = [events];
    } else {
      evts = events;
    }
    for (i=0, ii=evts.length; i<ii; i++){
      evt = evts[i];
      if (listeners[evt]) {
        waitingToBeNotified = waitingToBeNotified.concat(listeners[evt]);
      }
    }
    if (listeners["all"]){      // listeners that want to be notified on any change
      waitingToBeNotified = waitingToBeNotified.concat(listeners["all"]);
    }
    notifyListeners(waitingToBeNotified);
  }

  function average_speed() {
    var i, s = 0, n = model.get_num_atoms();
    i = -1; while (++i < n) { s += coreModel.speed[i]; }
    return s/n;
  }

  function tick(elapsedTime, dontDispatchTickEvent) {
    var t;

    coreModel.integrate();

    pressure = modelOutputState.pressure;
    pe       = modelOutputState.PE;
    ke       = modelOutputState.KE;
    time     = modelOutputState.time;

    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

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
    }

    if (!dontDispatchTickEvent) dispatch.tick();
    return stopped;
  }

  function tick_history_list_is_empty() {
    return tick_history_list_index === 0;
  }

  function tick_history_list_push() {
    var i,
        newnodes = [],
        n = nodes.length;

    i = -1; while (++i < n) {
      newnodes[i] = arrays.clone(nodes[i]);
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({
      nodes:   newnodes,
      pressure: modelOutputState.pressure,
      pe:       modelOutputState.PE,
      ke:       modelOutputState.KE,
      time:     modelOutputState.time
    });
    if (tick_history_list_index > 1000) {
      tick_history_list.splice(0,1);
      tick_history_list_index = 1000;
    }
  }

  function reset_tick_history_list() {
    tick_history_list = [];
    tick_history_list_index = 0;
    tick_counter = 0;
  }

  function tick_history_list_reset_to_ptr() {
    tick_history_list.length = tick_history_list_index + 1;
  }

  function tick_history_list_extract(index) {
    var i, n=nodes.length;
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
    time = tick_history_list[index].time;
    coreModel.setTime(time);
  }

  function container_pressure() {
    return pressures.reduce(function(j,k) { return j+k; })/pressures.length;
  }

  function average_rate() {
    var i, ave, s = 0, n = sample_times.length;
    i = -1; while (++i < n) { s += sample_times[i]; }
    ave = s/n;
    return (ave ? 1/ave*1000: 0);
  }

  function set_temperature(t) {
    temperature = t;
    coreModel.setTargetTemperature(t);
  }

  function set_properties(hash) {
    var property, propsChanged = [];
    for (property in hash) {
      if (hash.hasOwnProperty(property) && hash[property] !== undefined && hash[property] !== null) {
        // look for set method first, otherwise just set the property
        if (properties["set_"+property]) {
          properties["set_"+property](hash[property]);
        // why was the property not set if the default value property is false ??
        // } else if (properties[property]) {
        } else {
          properties[property] = hash[property];
        }
        propsChanged.push(property);
      }
    }
    notifyListenersOfEvents(propsChanged);
  }

  function readModelState() {
    coreModel.computeOutputState();

    pressure = modelOutputState.pressure;
    pe       = modelOutputState.PE;
    ke       = modelOutputState.KE;
    time     = modelOutputState.time;
  }

  // ------------------------------
  // finish setting up the model
  // ------------------------------

  // who is listening to model tick completions
  model_listener = initialProperties.model_listener;

  // set the rest of the regular properties
  set_properties(initialProperties);

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

  // A convenience for interactively getting energy averages
  model.getStatsHistory = function() {
    var i, len,
        tick,
        ret = [];

    ret.push("time (fs)\ttotal PE (eV)\ttotal KE (eV)\ttotal energy (eV)");

    for (i = 0, len = tick_history_list.length; i < len; i++) {
      tick = tick_history_list[i];
      ret.push(tick.time + "\t" + tick.pe + "\t" + tick.ke + "\t" + (tick.pe+tick.ke));
    }
    return ret.join('\n');
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
    dispatch.seek();
    notifyListenersOfEvents("seek");
    if (model_listener) { model_listener(); }
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
      }
    }
    return tick_counter;
  };

  /**
    Creates a new md2d model with a new set of atoms and leaves it in 'coreModel'

    @config: either the number of atoms (for a random setup) or
             a hash specifying the x,y,vx,vy properties of the atoms
    When random setup is used, the option 'relax' determines whether the model is requested to
    relax to a steady-state temperature (and in effect gets thermalized). If false, the atoms are
    left in whatever grid the coreModel's initialization leaves them in.
  */
  model.createNewAtoms = function(config) {
    var elemsArray, element, i, ii, num;

    if (typeof config === 'number') {
      num = config;
    } else if (config.num != null) {
      num = config.num;
    } else if (config.X) {
      num = config.X.length;
    }

    // convert from easily-readble json format to simplified array format
    elemsArray = [];
    for (i=0, ii=elements.length; i<ii; i++){
      element = elements[i];
      elemsArray[element.id] = [element.mass, element.epsilon, element.sigma];
    }

    // get a fresh model
    coreModel = md2d.makeModel();
    coreModel.setSize([width,height]);
    coreModel.setElements(elemsArray);
    coreModel.createAtoms({
      num: num
    });

    nodes = coreModel.atoms;
    modelOutputState = coreModel.outputState;

    // Initialize properties
    temperature_control = properties.temperature_control;
    temperature         = properties.temperature;
    chargeShading       = properties.chargeShading;
    showVDWLines        = properties.showVDWLines;
    VDWLinesRatio       = properties.VDWLinesRatio;

    coreModel.useLennardJonesInteraction(properties.lennard_jones_forces);
    coreModel.useCoulombInteraction(properties.coulomb_forces);
    coreModel.useThermostat(temperature_control);

    coreModel.setTargetTemperature(temperature);

    if (config.X && config.Y) {
      coreModel.initializeAtomsFromProperties(config);
    } else {
      coreModel.initializeAtomsRandomly({
        temperature: temperature
      });
      if (config.relax) coreModel.relaxToTemperature();
    }

    readModelState();

    // tick history stuff
    reset_tick_history_list();
    tick_history_list_push();
    tick_counter = 0;
    new_step = true;

    // return model, for chaining (if used)
    return model;
  };

  model.createRadialBonds = function(_radialBonds) {
    coreModel.initializeRadialBonds(_radialBonds);
    radialBonds = coreModel.radialBonds;
    readModelState();
    return model;
  };

  model.createObstacles = function(_obstacles) {
    var numObstacles = _obstacles.x.length;

    // ensure that every property either has a value or the default value
    for (var i = 0; i < numObstacles; i++) {
      for (prop in default_obstacle_properties) {
        if (!default_obstacle_properties.hasOwnProperty(prop)) continue;
        if (!_obstacles[prop]) {
          _obstacles[prop] = [];
        }
        if (typeof _obstacles[prop][i] === "undefined") {
          _obstacles[prop][i] = default_obstacle_properties[prop];
        }
      }
    }

    coreModel.initializeObstacles(_obstacles);
    obstacles = coreModel.obstacles;
    return model;
  };

  // The next four functions assume we're are doing this for
  // all the atoms will need to be changed when different atoms
  // can have different LJ sigma values

  /** Accepts an epsilon value in eV.

      Example value for argon is 0.013 (positive)
  */
  model.setEpsilon = function(e) {
    coreModel.setLJEpsilon(e);
  };

  /** Accepts a sigma value in nm

    Example value for argon is 3.4 nm
  */
  model.setSigma = function(s) {
    coreModel.setLJSigma(s);
  };

  model.getEpsilon = function() {
    return coreModel.getLJEpsilon();
  };

  model.getSigma = function() {
    return coreModel.getLJSigma();
  };

  model.getLJCalculator = function() {
    return coreModel.getLJCalculator();
  };

  model.resetTime = function() {
    coreModel.setTime(0);
  };

  model.getTime = function() {
    return modelOutputState ? modelOutputState.time : undefined;
  };

  model.getTotalMass = function() {
    return coreModel.getTotalMass();
  };

  /**
    Attempts to add an 0-velocity atom to a random location. Returns false if after 10 tries it
    can't find a location. (Intended to be exposed as a script API method.)

    Optionally allows specifying the element (default is to randomly select from all elements) and
    charge (default is neutral).
  */
  model.addRandomAtom = function(el, charge) {
    if (el == null) el = Math.floor( Math.random() * elements.length );
    if (charge == null) charge = 0;

    var size   = model.size(),
        radius = coreModel.getRadiusOfElement(el),
        x,
        y,
        loc,
        numTries = 0,
        // try at most ten times.
        maxTries = 10;

    do {
      x = Math.random() * size[0] - 2*radius;
      y = Math.random() * size[1] - 2*radius;

      // findMinimimuPELocation will return false if minimization doesn't converge, in which case
      // try again from a different x, y
      loc = coreModel.findMinimumPELocation(el, x, y, 0, 0, charge);
      if (loc && model.addAtom(el, loc[0], loc[1], 0, 0, charge)) return true;
    } while (++numTries < maxTries);

    return false;
  },

  /**
    Adds a new atom with element 'el', charge 'charge', and velocity '[vx, vy]' to the model
    at position [x, y]. (Intended to be exposed as a script API method.)

    Adjusts (x,y) if needed so that the whole atom is within the walls of the container.

    Returns false and does not add the atom if the potential energy change of adding an *uncharged*
    atom of the specified element to the specified location would be positive (i.e, if the atom
    intrudes into the repulsive region of another atom.)

    Otherwise, returns true.
  */
  model.addAtom = function(el, x, y, vx, vy, charge) {
    var size      = model.size(),
        radius    = coreModel.getRadiusOfElement(el);

    // As a convenience to script authors, bump the atom within bounds
    if (x < radius) x = radius;
    if (x > size[0]-radius) x = size[0]-radius;
    if (y < radius) y = radius;
    if (y > size[1]-radius) y = size[1]-radius;

    // check the potential energy change caused by adding an *uncharged* atom at (x,y)
    if (coreModel.canPlaceAtom(el, x, y)) {
      coreModel.addAtom(el, x, y, vx, vy, charge);

      // reassign nodes to possibly-reallocated atoms array
      nodes = coreModel.atoms;
      coreModel.computeOutputState();
      if (model_listener) model_listener();

      return true;
    }
    // return false on failure
    return false;
  },

  /**
      A generic method to set properties on a single existing atom.

      Example: setAtomProperties(3, {x: 5, y: 8, px: 0.5, charge: -1})

      This can optionally check the new location of the atom to see if it would
      overlap with another another atom (i.e. if it would increase the PE).

      This can also optionally apply the same dx, dy to any atoms in the same
      molecule (if x and y are being changed), and check the location of all
      the bonded atoms together.
    */
  model.setAtomProperties = function(i, props, checkLocation, moveMolecule) {
    if (moveMolecule) {
      atoms = coreModel.getMoleculeAtoms(i);
      if (atoms.length > 0) {
        dx = typeof props.x === "number" ? props.x - coreModel.atoms[model.INDICES.X][i] : 0;
        dy = typeof props.y === "number" ? props.y - coreModel.atoms[model.INDICES.Y][i] : 0;
        for (var j = 0, jj=atoms.length; j<jj; j++) {
          new_x = coreModel.atoms[model.INDICES.X][atoms[j]] + dx;
          new_y = coreModel.atoms[model.INDICES.Y][atoms[j]] + dy;
          if (new_x == Infinity || new_x == -Infinity || new_y == Infinity || new_y == -Infinity) debugger;
          if (!model.setAtomProperties(atoms[j], {x: new_x, y: new_y}, checkLocation, false)) {
            return false;
          }
        }
      }
    }

    if (checkLocation) {
      var x  = typeof props.x === "number" ? props.x : coreModel.atoms[model.INDICES.X][i],
          y  = typeof props.y === "number" ? props.y : coreModel.atoms[model.INDICES.Y][i],
          el = typeof props.element === "number" ? props.y : coreModel.atoms[model.INDICES.ELEMENT][i];

      if (!coreModel.canPlaceAtom(el, x, y, i)) {
        return false;
      }
    }
    coreModel.setAtomProperties(i, props);
    return true;
  },

  // return a copy of the array of speeds
  model.get_speed = function() {
    return arrays.copy(coreModel.speed, []);
  };

  model.get_rate = function() {
    return average_rate();
  };

  model.is_stopped = function() {
    return stopped;
  };

  model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
   coreModel.useLennardJonesInteraction(lj);
  };

  model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
   coreModel.useCoulombInteraction(cf);
  };

  model.get_nodes = function() {
    return nodes;
  };

  model.get_num_atoms = function() {
    return nodes[0].length;
  };

  model.get_obstacles = function() {
    return obstacles;
  };
  model.get_radial_bonds = function() {
    return radialBonds;
  };

  model.on = function(type, listener) {
    dispatch.on(type, listener);
    return model;
  };

  model.tickInPlace = function() {
    dispatch.tick();
    return model;
  };

  model.tick = function(num, opts) {
    if (!arguments.length) num = 1;

    var dontDispatchTickEvent = opts && opts.dontDispatchTickEvent || false,
        i = -1;

    while(++i < num) {
      tick(null, dontDispatchTickEvent);
    }
    return model;
  };

  model.relax = function() {
    coreModel.relaxToTemperature();
    return model;
  };

  model.start = function() {
    return model.resume();
  };

  model.resume = function() {
    stopped = false;
    d3.timer(tick);
    dispatch.play();
    notifyListenersOfEvents("play");
    return model;
  };

  model.stop = function() {
    stopped = true;
    dispatch.stop();
    notifyListenersOfEvents("stop");
    return model;
  };

  model.ke = function() {
    return modelOutputState ? modelOutputState.KE : undefined;
  };

  model.ave_ke = function() {
    return modelOutputState? modelOutputState.KE / model.get_num_atoms() : undefined;
  };

  model.pe = function() {
    return modelOutputState ? modelOutputState.PE : undefined;
  };

  model.ave_pe = function() {
    return modelOutputState? modelOutputState.PE / model.get_num_atoms() : undefined;
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
    if (!arguments.length) return coreModel.getSize();
    coreModel.setSize(x);
    return model;
  };

  model.set = function(hash) {
    set_properties(hash);
  };

  model.get = function(property) {
    return properties[property];
  };

  /**
    Set the 'model_listener' function, which is called on tick events.
  */
  model.setModelListener = function(listener) {
    model_listener = listener;
    model.on('tick', model_listener);
    return model;
  };

  // Add a listener that will be notified any time any of the properties
  // in the passed-in array of properties is changed.
  // This is a simple way for views to update themselves in response to
  // properties being set on the model object.
  // Observer all properties with addPropertiesListener(["all"], callback);
  model.addPropertiesListener = function(properties, callback) {
    var i, ii, prop;
    for (i=0, ii=properties.length; i<ii; i++){
      prop = properties[i];
      if (!listeners[prop]) {
        listeners[prop] = [];
      }
      listeners[prop].push(callback);
    }
  };

  model.serialize = function(includeAtoms) {
    var propCopy = $.extend({}, properties);
    if (includeAtoms) {
      propCopy.atoms = coreModel.serialize();
    }
    if (elements) {
      propCopy.elements = elements;
    }
    propCopy.width = width;
    propCopy.height = height;
    return propCopy;
  };

  return model;
};
})();
