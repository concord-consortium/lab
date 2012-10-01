/*global screen: true, $: true */

var fs = require('fs'),
    d3 = require('d3');

// Setup browser-specific variables.
var url  = url ?  url : "./test/layout.html",
    html = fs.readFileSync(url).toString();

// D3 automatically includes JSDOM, setups simple document
// and creates window (see: d3/index.js).
// Use "./test/layout.html" page instead.
window.document.innerHTML = html;

// Export 'screen' global variable, as lab/layout/layout.js access this name.
screen = window.screen;

process.env.TZ = "America/Los_Angeles";

// Setup additional libraries (as now DOM is ready).
require("../server/public/vendor/jquery/jquery.min");
$ = window.jQuery;

// Additional features.
require("./env-assert");
require("./env-xhr");
require("./env-fragment");
