/*global define: true */

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function (require, exports, module) {
  exports.coulomb = require('./coulomb');
  exports.lennardJones = require('./lennard-jones');
});
