var fs  = require('fs');
var html = fs.readFileSync("./test/layout.html").toString();

document = require('jsdom').jsdom(html);
window = document.createWindow();
screen = window.screen;
navigator = window.navigator;

CSSStyleDeclaration = window.CSSStyleDeclaration;

require("../src/vendor/sizzle/sizzle");
Sizzle = window.Sizzle;

process.env.TZ = "America/Los_Angeles";

require("./env-assert");
require("./env-xhr");
require("./env-fragment");
