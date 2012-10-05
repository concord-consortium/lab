/*globals define: false, window: false */

define(function (require) {
  var benchmark = require('common/benchmark/benchmark');

  // Export API to the global namespace.
  window.benchmark = benchmark;

  // Return public API as a module.
  return benchmark;
});
