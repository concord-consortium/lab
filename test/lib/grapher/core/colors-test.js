require("../../../env");
require("../../../../lib/lab.grapher");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("grapher.colors");

suite.addBatch({
  "colors": {
    topic: function() {
      return grapher.colors;
    },
    "returns six char hex color string from name": function(colors) {
      assert.equal(colors('bright_red'), '#ff0000');
    }
  }
});

suite.export(module);
