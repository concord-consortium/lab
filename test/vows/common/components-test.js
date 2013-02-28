var helpers   = require("../../helpers");
helpers.setupBrowserEnvironment();

var vows      = require("vows"),
    assert    = require("assert"),
    requirejs = helpers.getRequireJS(),

    Thermometer = requirejs('cs!common/components/thermometer'),

    suite = vows.describe("common/components");

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
