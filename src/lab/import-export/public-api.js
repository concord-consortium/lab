/*global define: false, window: false */

define(function (require) {
  'use strict';

  window.Lab = window.Lab || {};

  return window.Lab.importExport = {
    version: "0.0.1",
    // ==========================================================================
    // Functions and modules which should belong to this API:

    codapInterface: require('import-export/codap-interface'),
    netlogoImporter: require('import-export/netlogo-importer')
    // ==========================================================================
  };
});
