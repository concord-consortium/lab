/*globals views */

require("../../env");

require("../../../server/public/lab/lab.layout");
require("../../../server/public/lab/lab.views");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.views");

suite.addBatch({
  "version": {
    topic: function() {
      return views.version;
    },
    "reports version": function(version) {
      assert.equal(version, "0.0.1");
    }
  }
});

suite.export(module);
