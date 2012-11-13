var requirejs = require('requirejs'),
    path      = require('path');

// Set up any vendored libraries that are normally included via script tag in the modules under test.
// Note that d3 handles all necessary dependencies like 'jsdom'.
d3 = require('d3');
require(path.normalize(__dirname + "/../../vendor/jquery/dist/jquery.min.js"));
$  = window.jQuery;

// Use Lab RequireJS configuration.
requirejs.config({
  // Set baseUrl to lab/src/lab using relative path of this file.
  baseUrl: path.normalize(__dirname + '/../../lab'),
  nodeRequire: require
});

requirejs([
  'md2d/models/modeler'
], function (Modeler) {
  // Export API for Node.js scripts.
  exports.Modeler = Modeler;
});
