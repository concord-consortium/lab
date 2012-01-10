//
// Utilities
//

(function(){ 

  arrays = {};
  arrays = { version: "0.0.1" };
  arrays.webgl = !!window.WebGLRenderingContext;
  arrays.typed = false;
  try {
    var a = new Float64Array(0);
    arrays.typed = true
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
        array_type = "Float32Array"
      } else {
        array_type = "regular"
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
    i=-1; while(++i < size) { a[i] = fill };
    return a;
  }

  arrays.constructor_function = function(source) {
    if (source.buffer && source.buffer.__proto__.constructor) {
      return source.__proto__.constructor
    }
    if (source.constructor === Array) {
      return source.constructor
    }
    throw new Error(
        "arrays.constructor_function: must be an Array or Typed Array: " +
        "  source: " + source +
        ", source.constructor: " + source.constructor +
        ", source.buffer: " + source.buffer +
        ", source.buffer.slice: " + source.buffer.slice +
        ", source.buffer.__proto__: " + source.buffer.__proto__ +
        ", source.buffer.__proto__.constructor: " + source.buffer.__proto__.constructor
      )
  }

  arrays.copy = function(source, dest) {
    var len = source.length; i = -1; 
    while(++i < len) { dest[i] = source[i] }
    dest.length = len;
    return dest
  }

  arrays.clone = function(source) {
    var i, len = source.length, clone, constructor;
    constructor = arrays.constructor_function(source);
    if (constructor == Array) {
      clone = new constructor(len);
      for (i = 0; i < len; i++) { clone[i] = source[i]; }
      return clone
    }
    if (source.buffer.slice) {
      clone = new constructor(source.buffer.slice(0));
      return clone
    }
    clone = new constructor(len);
    for (i = 0; i < len; i++) { clone[i] = source[i]; }
    return clone
  }

  /** @return true if x is between a and b. */
  // float a, float b, float x
  arrays.between = function(a, b, x) {
    return x < Math.max(a, b) && x > Math.min(a, b);
  }

  // float[] array
  arrays.max = function(array) {
    return Math.max.apply( Math, array );
  }

  // float[] array
  arrays.min = function(array) {
    return Math.min.apply( Math, array );
  }

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
  }

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
  }

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
  }

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
  }

  arrays.average = function(array) {
    var i, acc = 0,
    length = array.length;
    for (i = 0; i < length; i++) {
      acc += array[i];
    }
    return acc / length;
  }

})()
