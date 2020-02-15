var fs = require('fs'),
    jsdom = require('jsdom'),
    html = fs.readFileSync('test/layout.html');

process.env.TZ = "America/New_York";

global.dom = new jsdom.JSDOM(html, {
  url: "https://lab.concord.org/",
  referrer: "https://lab.concord.org/",
});
global.window = global.dom.window;
global.document = window.document;
global.navigator = window.navigator;
global.screen = window.screen;

// Sizzle is required for d3 to work well in a jsdom environment; we require the version from
// node_modules instead of 'public' because d3 doesn't require Sizzle to operate in our target
// browser environments.
global.Sizzle = require('sizzle');

// Set up any vendored libraries that are normally included via script tag in the modules under test:
global.d3 = require("d3");
global.$ = global.jQuery = require("jquery");
// Setup libraries which depend on jQuery.
require("jquery-ui");
require("../public/lab/vendor/jquery-context-menu/jquery.contextMenu.js");
require("../public/lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js");

// Additional environment features for testing.
require("./env-assert");
require("./env-fragment");
