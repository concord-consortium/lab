/*global define: false */

define(function (require) {
  var version = require('lab.version'),
      config  = require('lab.config'),
      interactivesController  = require('common/controllers/interactives-controller'),
      benchmark               = require('common/benchmark/benchmark'),
      structuredClone         = require('common/structured-clone');

  // Require public-api modules.
  require('grapher/public-api');
  require('import-export/public-api');

  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  window.Lab.version = version;
  window.Lab.config = config;
  window.Lab.structuredClone = structuredClone;
  // TODO: this should be under Lab namespace too!
  window.controllers = {
    interactivesController: interactivesController
  };
  window.benchmark = benchmark;
});
