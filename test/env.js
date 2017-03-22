/*global screen: true, $: true, jQuery: true, Sizzle: true*/

var fs = require('fs'),
    jsdom = require('jsdom'),
    html = fs.readFileSync('test/layout.html');

process.env.TZ = "America/New_York";

document = jsdom.jsdom(html);
window = document.defaultView;
jsdom.changeURL(window, "https://lab.concord.org/");
navigator = window.navigator;
screen = window.screen;

// Sizzle is required for d3 to work well in a jsdom environment; we require the version from
// node_modules instead of 'public' because d3 doesn't require Sizzle to operate in our target
// browser environments.
Sizzle = require('sizzle');

// Set up any vendored libraries that are normally included via script tag in the modules under test:
require("../public/lab/vendor/d3/d3.min.js");
require("../public/lab/vendor/jquery/jquery.js");
$ = jQuery = window.jQuery;
// Setup libraries which depend on jQuery.
require("../public/lab/vendor/jquery-ui/jquery-ui.js");
require("../public/lab/vendor/jquery-context-menu/jquery.contextMenu.js");
require("../public/lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js");

// Additional environment features for testing.
require("./env-assert");
require("./env-fragment");
