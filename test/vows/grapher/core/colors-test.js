var helpers   = require("../../../helpers");
helpers.setupBrowserEnvironment();

var vows      = require("vows"),
    assert    = require("assert"),
    requirejs = helpers.getRequireJS(),

    colors = requirejs('grapher/core/colors'),

    suite = vows.describe("grapher/core/colors");

suite.addBatch({
  "colors": {
    topic: function() {
      return colors;
    },
    "returns six char hex color string from name": function(colors) {
      assert.equal(colors('bright_red'), '#ff0000');
    }
  }
});

suite.export(module);
