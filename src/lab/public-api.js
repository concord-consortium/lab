/*global define: false */

define(function (require) {
  var version = require('lab.version'),
      config  = require('lab.config'),
      structuredClone = require('common/structured-clone');

  // Require public-api modules
  // defining other global variables.
  require('md2d/public-api');
  require('pta/public-api');
  require('grapher/public-api');
  require('import-export/public-api');

  // ###
  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  // Export config and version modules.
  window.Lab.version = version;
  window.Lab.config = config;
  window.Lab.structuredClone = structuredClone;
});
