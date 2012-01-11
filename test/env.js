var fs  = require('fs');
var html = fs.readFileSync("./test/layout.html").toString();

document = require('jsdom').jsdom(html);
window = document.createWindow();
navigator = window.navigator;

CSSStyleDeclaration = window.CSSStyleDeclaration;

require("../vendor/sizzle/sizzle");
Sizzle = window.Sizzle;

process.env.TZ = "America/Los_Angeles";

require("./env-assert");
require("./env-xhr");
require("./env-fragment");
