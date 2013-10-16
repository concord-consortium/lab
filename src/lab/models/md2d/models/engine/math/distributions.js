/*global define: true */
/*jslint eqnull: true */

// Simple (Box-Muller) univariate-normal random number generator.
//
// The 'science.js' library includes a Box-Muller implementation which is likely to be slower, especially in a
// modern Javascript engine, because it uses a rejection method to pick the random point in the unit circle.
// See discussion on pp. 1-3 of:
// http://www.math.nyu.edu/faculty/goodman/teaching/MonteCarlo2005/notes/GaussianSampling.pdf
//

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {

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
