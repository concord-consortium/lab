require("../../../../env");

var requirejs = require('requirejs'),
    config    = require('../../../../requirejs-config'),
    vows = require("vows"),
    assert = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'grapher/core/data'
], function (data) {

var suite = vows.describe("grapher/core/data");

suite.addBatch({
  "data": {
    topic: function() {
      return data;
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
});
