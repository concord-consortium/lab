 
// Simple wrapper for cloning and restoring hash of arrays.
// Such structure is widely used in md2d engine for keeping
// state of various objects (like atoms and obstacles).
// Use it in the following way:
// var obj = saveRestoreWrapper(hashOfArrays)
// var state = obj.clone();
// (...)
// obj.restore(state);

import arrays from 'arrays';
// Dependencies.

export default function CloneRestoreWrapper(hashOfArrays, options) {
  options = options || {};

  // Public API.
  var ret = {
    // Clone hash of arrays
    clone: function() {
      var copy = {},
        prop;

      for (prop in hashOfArrays) {
        if (hashOfArrays.hasOwnProperty(prop)) {
          copy[prop] = arrays.clone(hashOfArrays[prop]);
        }
      }

      return copy;
    }
  };

  // Restore internal arrays using saved state. 2 paths, depending on options.padArraysWithZeroes
  if (options.padArraysWithZeroes) {
    ret.restore = function(state) {
      var prop, target, i, j;

      for (prop in hashOfArrays) {
        if (hashOfArrays.hasOwnProperty(prop)) {
          target = hashOfArrays[prop];
          arrays.copy(state[prop], target);
          for (i = state[prop].length, j = target.length; i < j; i++) {
            target[i] = 0;
          }
        }
      }
    };
  } else {
    ret.restore = function(state) {
      var prop;

      for (prop in hashOfArrays) {
        if (hashOfArrays.hasOwnProperty(prop)) {
          arrays.copy(state[prop], hashOfArrays[prop]);
        }
      }
    };
  }

  return ret;
};
