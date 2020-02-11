/*global define: true */

// Tiny module which contains definition of preferred
// array types used across whole Lab project.
// It checks whether typed arrays are available and type of browser
// (as typed arrays are slower in Safari).

import $__arrays from 'arrays';
// Dependencies.
var arrays = $__arrays,

  // Check for Safari. Typed arrays are faster almost everywhere ... except Safari.
  notSafari = (function() {
    // Node.js?
    if (typeof navigator === 'undefined')
      return true;
    // Safari?
    var safarimatch = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
      match = navigator.userAgent.match(safarimatch);
    return !match || !match[3];
  }()),

  useTyped = arrays.typed && notSafari;

// Return all available types of arrays.
// If you need to use new type, declare it here.
export default {
  floatType: useTyped ? 'Float64Array' : 'regular',
  int32Type: useTyped ? 'Int32Array' : 'regular',
  int16Type: useTyped ? 'Int16Array' : 'regular',
  int8Type: useTyped ? 'Int8Array' : 'regular',
  uint16Type: useTyped ? 'Uint16Array' : 'regular',
  uint8Type: useTyped ? 'Uint8Array' : 'regular'
};
