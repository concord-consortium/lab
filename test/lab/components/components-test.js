var fs  = require('fs');
var env = require("../../env");
require("d3");
components = require("../../../server/public/lab/lab.components");
jquery = require("../../../server/public/vendor/jquery/jquery.min");
$ = window.jQuery;

var vows = require("vows"),
    assert = require("assert");

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
