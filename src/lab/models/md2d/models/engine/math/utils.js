/*global define: true */
/*jslint eqnull: true */

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

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
    };
  };

  /**
    Returns angle in radians between vectors AC and BC.
    Point A is defined by (xa, ya), B by (xb, yb) and C by (xc, yc) arguments.
   */
  exports.getAngleBetweenVec = function(xa, ya, xb, yb, xc, yc) {
    var dxij = xa - xc;
    var dxkj = xb - xc;
    var dyij = ya - yc;
    var dykj = yb - yc;
    var rijSquared = dxij * dxij + dyij * dyij;
    var rkjSquared = dxkj * dxkj + dykj * dykj;
    var rij = Math.sqrt(rijSquared);
    var rkj = Math.sqrt(rkjSquared);
    // Calculate cos using dot product definition.
    var cosTheta = (dxij * dxkj + dyij * dykj) / (rij * rkj);
    if (cosTheta > 1.0) cosTheta = 1.0;
    else if (cosTheta < -1.0) cosTheta = -1.0;

    return Math.acos(cosTheta);
  };
});
