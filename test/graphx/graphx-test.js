require("../env");
require("../../lib/lab.graphx");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.graphx");

suite.addBatch({
  "version": {
    topic: function() {
      return graphx.version;
    },
    "reports version": function(version) {
      assert.equal(version, "0.0.1");
    }
  }
});

suite.export(module);
