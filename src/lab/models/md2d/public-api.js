/*globals define: false, window: false */

define(function (require) {
  var model  = require('models/md2d/modeler'),
      // Object to be returned.
      publicAPI;

  publicAPI = {
    VERSION: '0.2.0',
    // ==========================================================================
    // Add functions and modules which should belong to this API:
    model: model
    // ==========================================================================
  };
  // Export this API under 'controllers' name.
  window.modeler = publicAPI;

  // Return public API as a module.
  return publicAPI;
});
