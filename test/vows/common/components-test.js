require("../../env");

var requirejs = require('requirejs'),
    config    = require('../../requirejs-config'),
    vows = require("vows"),
    assert = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'cs!common/components/thermometer'
], function (Thermometer) {

  var suite = vows.describe("common/components");

  suite.addBatch({
    "Thermometer": {
      topic: function() {
        return new Thermometer("#thermometer", 3.0, 0, 25);
      },
      "creates thermometer": function(therm) {
        assert.equal(therm.max, 25);
        assert.equal(therm.min, 0);
        assert.equal(therm.value, 3);
      }
    }
  });

  suite.export(module);
});
