/*global define: true */
/*jslint eqnull: true */
/**
  Returns a function which accepts a single numeric argument and returns:

   * the arithmetic mean of the windowSize most recent inputs, including the current input
   * NaN if there have not been windowSize inputs yet.

  The default windowSize is 1000.

*/

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

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
    };
  };
});
