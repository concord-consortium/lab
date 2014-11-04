var requirejs = require('requirejs'),
    path      = require('path'),
    document = global.document = require("jsdom").jsdom("<html><head></head><body></body></html>"),
    window = global.window = document.createWindow();

require(path.normalize(__dirname + "/../../../vendor/jquery/jquery.min.js"));
require(path.normalize(__dirname + "/../../../vendor/d3/d3.min.js"));
$  = window.jQuery;

// Use Lab RequireJS configuration.
requirejs.config({
  // Set baseUrl to lab/src/lab using relative path of this file.
  baseUrl: path.normalize(__dirname + '/../../lab'),
  nodeRequire: require,
  paths: {
    'browserified-cheerio': '../../vendor/browserified-cheerio/browserified-cheerio',
    'cs' :'../../vendor/require-cs/cs',
    'iframe-phone': '../../vendor/iframe-phone/dist/iframe-phone'
  }
});

// Export API for Node.js scripts.
exports.Modeler   = requirejs('models/md2d/models/modeler');
// Used by MML -> JSON conversion script.
exports.parseMML = requirejs('cs!mml-converter/mml-converter');
