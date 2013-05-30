/*jslint indent: 2 */
/*globals define: false, window: false */
//main.js

define(function (require) {
  'use strict';
  var
    config  = require('../lab.config'),
    InteractiveController = require('energy2d/controllers/interactive'),
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

  // ###
  // Finally, export API to global namespace.
  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  // Export config modules.
  window.Lab.config = config;

  // Export this API under 'lab.energy2d' name.
  window.Lab.energy2d = public_api;

  // Also return public_api as module.
  return public_api;
});
