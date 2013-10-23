var requirejs = require('requirejs'),
    path      = require('path'),
    document = global.document = require("jsdom").jsdom("<html><head></head><body></body></html>"),
    window = global.window = document.createWindow();

require(path.normalize(__dirname + "/../../../vendor/jquery/dist/jquery.min.js"));
require(path.normalize(__dirname + "/../../../vendor/d3/d3.min.js"));
$  = window.jQuery;

// Use Lab RequireJS configuration.
requirejs.config({
  // Set baseUrl to lab/src/lab using relative path of this file.
  baseUrl: path.normalize(__dirname + '/../../lab'),
  nodeRequire: require,
  paths: {
    'cs' :'../../vendor/require-cs/cs'
  }
});

// Export API for Node.js scripts.
exports.Modeler   = requirejs('models/md2d/models/modeler');
// Used by MML -> JSON conversion script.
exports.validator = requirejs('common/validator');
exports.metadata  = requirejs('models/md2d/models/metadata');
exports.Solvent   = requirejs('cs!models/md2d/models/solvent');
