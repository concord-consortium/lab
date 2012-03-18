require("../../env");
require("d3");
require("../../../lab/lab.layout");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.layout");

suite.addBatch({
  "version": {
    topic: function() {
      return layout.version;
    },
    "reports version": function(version) {
      assert.equal(version, "0.0.1");
    }
  }
});

suite.export(module);
