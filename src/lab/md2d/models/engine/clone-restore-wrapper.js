// Simple wrapper for cloning and restoring hash of arrays.
// Such structure is widely used in md2d engine for keeping
// state of various objects (like atoms and obstacles).
// Use it in the following way:
// var obj = saveRestoreWrapper(hashOfArrays)
// var state = obj.clone();
// (...)
// obj.restore(state);

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

  var arrays = require('arrays');

  exports.cloneRestoreWrapper = function (hashOfArrays) {
    // Public API.
    return {
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
      },

      // Restore internal arrays using saved state.
      restore: function (state) {
        var prop;

        for (prop in hashOfArrays) {
          if (hashOfArrays.hasOwnProperty(prop)) {
            arrays.copy(state[prop], hashOfArrays[prop]);
          }
        }
      }
    };
  };

});
