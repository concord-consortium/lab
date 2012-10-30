/*globals define: false, Lab: true */

define(function (require) {
  require('md2d/public-api');
  require('grapher/public-api');
  var version = require('lab.version'),
      config  = require('lab.config'),
      console = require('common/console'),

      publicAPI;

  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  // Export some objects.
  window.Lab.console = {
    logging: console.logging,
    tracing: console.tracing
  };
  window.Lab.version = version;
  window.Lab.config = config;
});
