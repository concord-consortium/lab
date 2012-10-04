require("../../env");

var requirejs = require('requirejs'),
    config    = require('../../requirejs-config'),
    vows = require("vows"),
    assert = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'benchmark/benchmark'
], function (benchmark) {

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
});
