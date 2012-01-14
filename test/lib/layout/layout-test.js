require("../../env");
require("../../../vendor/d3/d3.js");
require("../../../lib/lab.layout");

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
