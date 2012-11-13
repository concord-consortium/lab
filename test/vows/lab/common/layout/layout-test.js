require("../../../../env");

var requirejs = require('requirejs'),
    config    = require('../../../../requirejs-config'),
    vows = require("vows"),
    assert = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'common/layout/layout'
], function (layout) {

  var suite = vows.describe("common/layout");

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
});
