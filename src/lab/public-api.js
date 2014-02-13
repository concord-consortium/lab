/*global define: false */

define(function (require) {
  var version = require('lab.version'),
      config  = require('lab.config'),
      InteractivesController  = require('common/controllers/interactives-controller'),
      benchmark               = require('common/benchmark/benchmark');

  // Require public-api modules.
  require('grapher/public-api');
  require('import-export/public-api');

  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  window.Lab.version = version;
  window.Lab.config = config;
  window.Lab.InteractivesController = InteractivesController;
  window.Lab.benchmark = benchmark;
});
