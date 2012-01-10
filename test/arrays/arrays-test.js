require("../env");
require("../../lab.arrays");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("molecules_arrays.create");

suite.addBatch({
  "create": {
    topic: function() {
      return molecules_arrays.create;
    },
    "creates array": function(create) {
      assert.deepEqual(create(4, 0), [0, 0, 0, 0]);
    }
  }
});

suite.export(module);
