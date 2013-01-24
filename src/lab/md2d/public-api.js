/*global define: false, window: false */

// TODO: just temporary solution, refactor it.
define(function (require) {
  var interactivesController  = require('common/controllers/interactives-controller'),
      layout                  = require('common/layout/layout'),
      benchmark               = require('common/benchmark/benchmark'),
      // Object to be returned.
      publicAPI;

  publicAPI = {
    version: "0.0.1",
    // ==========================================================================
    // Add functions and modules which should belong to this API:
    interactivesController: interactivesController
    // ==========================================================================
  };
  // Export this API under 'controllers' name.
  window.controllers = publicAPI;
  // Also export layout and benchmark.
  window.layout = layout;
  window.benchmark = benchmark;

  // Return public API as a module.
  return publicAPI;
});
