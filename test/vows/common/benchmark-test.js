var helpers   = require("../../helpers");
helpers.setupBrowserEnvironment();

var vows      = require("vows"),
    assert    = require("assert"),
    requirejs = helpers.getRequireJS(),

    benchmark = requirejs('common/benchmark/benchmark'),

    suite = vows.describe("common/benchmark");

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
