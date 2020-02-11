var requirejs = require('requirejs'),
    path      = require('path'),
    jsdom     = require('jsdom');

var dom = new jsdom.JSDOM("<html><head></head><body></body></html>");

window = global.window = dom.window;
document = global.document = window.document;

$ = require(path.normalize(__dirname + "/../../../vendor/jquery/dist/jquery.min.js"));
require(path.normalize(__dirname + "/../../../vendor/d3/d3.min.js"));

// Use Lab RequireJS configuration.
requirejs.config({
  // Set baseUrl to lab/src/lab using relative path of this file.
  baseUrl: path.normalize(__dirname + '/../../lab'),
  nodeRequire: require,
  paths: {
    'arrays': '../modules/arrays/index',
    'browserified-cheerio': '../../vendor/browserified-cheerio/browserified-cheerio',
    'cs' :'../../vendor/require-cs/cs',
    'iframe-phone': '../../vendor/iframe-phone/dist/iframe-phone'
  }
});

// Export API for Node.js scripts.
exports.Modeler  = requirejs('models/md2d/models/modeler');
// Used by MML -> JSON conversion script.
exports.parseMML = requirejs('cs!mml-converter/mml-converter');
