var fs  = require('fs');

env = function(url) {
    var url  = url ?  url : "./test/layout.html",
        html = fs.readFileSync(url).toString();

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
}

module.exports = env;
