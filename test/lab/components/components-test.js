require("../../env");

var vows = require("vows"),
    assert = require("assert"),

    components = require("../../../server/public/lab/lab.components");

var suite = vows.describe("lab.components");

suite.addBatch({
  "Thermometer": {
    topic: function() {
      return new components.Thermometer("#thermometer", 3.0, 0, 25);
    },
    "creates thermometer": function(therm) {
      assert.equal(therm.max, 25);
      assert.equal(therm.min, 0);
      assert.equal(therm.value, 3);
    }
  }
});

suite.export(module);
