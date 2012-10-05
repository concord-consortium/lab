/*globals define: false, window: false */

define(function (require) {
  var interactivesController  = require('controllers/interactives-controller'),
      compareModelsController = require('controllers/compare-models-controller'),
      // Object to be returned.
      publicAPI;

  publicAPI = {
    version: "0.0.1",
    // ==========================================================================
    // Add functions and modules which should belong to this API:
    interactivesController: interactivesController,
    compareModelsController: compareModelsController
    // ==========================================================================
  };
  // Export this API under 'controllers' name.
  window.controllers = publicAPI;

  // Return public API as a module.
  return publicAPI;
});
