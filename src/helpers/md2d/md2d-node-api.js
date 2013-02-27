var requirejs = require('requirejs'),
    path      = require('path'),
    document = global.document = require("jsdom").jsdom("<html><head></head><body></body></html>"),
    window = global.window = document.createWindow();

require(path.normalize(__dirname + "/../../vendor/jquery/dist/jquery.min.js"));
$  = window.jQuery;

// Use Lab RequireJS configuration.
requirejs.config({
  // Set baseUrl to lab/src/lab using relative path of this file.
  baseUrl: path.normalize(__dirname + '/../../lab'),
  nodeRequire: require,
  paths: {
    'cs' :'../vendor/require-cs/cs'
  }
});

requirejs([
  'md2d/models/modeler',
  'common/validator',
  'md2d/models/metadata',
  'cs!md2d/models/solvent'
], function (Modeler, validator, metadata, Solvent) {
  // Export API for Node.js scripts.
  exports.Modeler   = Modeler;
  // Used by MML -> JSON conversion script.
  exports.validator = validator;
  exports.metadata  = metadata;
  exports.Solvent   = Solvent;
});
