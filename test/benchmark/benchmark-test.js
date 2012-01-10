require("../env");
require("../../lab.benchmark");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.benchmark");

suite.addBatch({
  "version": {
    topic: function() {
      return benchmark.version;
    },
    "reports version": function(version) {
      assert.equal(version, "0.0.1");
    }
  }
});

suite.export(module);
