/*global define: false */

define(function (require) {
  var version      = require('lab.version'),
      mmlConverter = require('mml-converter/mml-converter');

  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  window.Lab.version = version;
  window.Lab.mmlConverter = mmlConverter;
});
