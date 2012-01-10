require("../env");
require("../../lab.molecules");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.molecules");

suite.addBatch({
  "version": {
    topic: function() {
      return modeler.VERSION;
    },
    "reports version": function(version) {
      assert.equal(version, "0.1.0");
    }
  }
});

suite.export(module);
