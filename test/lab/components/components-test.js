require("../../env");
require("d3");
components = require("../../../dist/lab/lab.components");
jquery = require("../../../dist/vendor/jquery/jquery.min");
$ = window.jQuery;

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.components");

suite.addBatch({
  "Thermometer": {
    topic: function() {
      return new components.Thermometer("#thermometer", 25);
    },
    "creates thermometer": function(therm) {
      assert.equal(therm.max, 25)
    }
  }
});

suite.export(module);
