/*global screen: true, $: true Sizzle: true*/

var fs = require('fs');

process.env.TZ = "America/New_York";

document = require("jsdom").jsdom(fs.readFileSync('test/layout.html'));
window = document.createWindow();
navigator = window.navigator;
screen = window.screen;

// Sizzle is required for d3 to work well in a jsdom environment; we require the version from
// node_modules instead of server/public because d3 doesn't require Sizzle to operate in our target
// browser environments.
Sizzle = require('sizzle');

// Set up any vendored libraries that are ormally included via script tag in the modules under test:
require("../server/public/vendor/jquery/jquery.min.js");
require("../server/public/vendor/d3/d3.v2.min.js");
$ = window.jQuery;

// Additional environment features for testing.
require("./env-assert");
require("./env-xhr");
require("./env-fragment");
