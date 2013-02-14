/*global define: false, window: false */

define(function (require) {
  'use strict';

  window.Lab = window.Lab || {};

  return window.Lab.importExport = {
    version: "0.0.1",
    // ==========================================================================
    // Functions and modules which should belong to this API:

    // Data Games exporter
    dgExporter:      require('import-export/dg-exporter'),
    netlogoImporter: require('import-export/netlogo-importer')
    // ==========================================================================
  };
});
