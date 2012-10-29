/*globals define: false, Lab: true */

define(function (require) {
  require('lab.version');
  require('lab.config');
  require('md2d/public-api');
  require('grapher/public-api');

  var console = require('common/console');
  // Export Lab.console API.
  if (typeof Lab === 'undefined') Lab = {};
  Lab.console = {
    logging: console.logging,
    tracing: console.tracing
  };
});
