/*jslint indent: 2 */
/*globals define: false, window: false */
//main.js

define(function (require) {
  'use strict';
  var
    InteractiveController = require('controllers/interactive'),
    // Object to be returned.
    public_api;

  public_api = {
    // ==========================================================================
    // Add functions and modules which should belong to this API.
    // - InteractiveController constructor.
    InteractiveController: InteractiveController
    //
    // ==========================================================================
  };

  // Finally, export API to global namespace.
  // Create / get global 'lab' object.
  window.lab = window.lab || {};
  // Export this API under 'lab.energy2d' name.
  window.lab.energy2d = public_api;

  // Also return public_api as module.
  return public_api;
});
