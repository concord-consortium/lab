require("../../env");
require("../../../vendor/d3/d3.js");
require("../../../lab/lab.components");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.components");

suite.addBatch({
  "Thermometer": {
    topic: new Thermometer('#thermometer'),
    "creates thermometer": function(t) {
      assert.equal(t.max, 0.7)
    }
  }
});

suite.export(module);
