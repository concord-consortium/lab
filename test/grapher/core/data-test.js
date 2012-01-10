require("../../env");
require("../../../lab.grapher");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("grapher.data");

suite.addBatch({
  "data": {
    topic: function() {
      return grapher.data;
    },
    "creates dataset from array": function(data) {
      assert.deepEqual(data([1, 0, 3, 4]), [{x:1, y:0}, {x:3, y:4}]);
    },
    "creates empty dataset from empty array": function(data) {
      assert.deepEqual(data([]), []);
    }
  }
});

suite.export(module);
