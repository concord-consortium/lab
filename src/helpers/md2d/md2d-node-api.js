// Enable ES6 import syntax support using esm package.
require = require("esm")(module);
// Lab is using paths relative to src/lab. Set node paths here to ensure that modules are found.
process.env.NODE_PATH = "src/lab";
require("module").Module._initPaths(); // magic to get NODE_PATHS updated

const jsdom = require('jsdom');
const dom = new jsdom.JSDOM("<html><head></head><body></body></html>");
global.window = dom.window;
global.document = window.document;
global.d3 = require("d3");
global.$ = global.jQuery = require("jquery")(window);

// Export API for Node.js scripts.
exports.Modeler  = require('models/md2d/models/modeler').default;
// Used by MML -> JSON conversion script.
exports.parseMML = require('mml-converter/mml-converter').default;
