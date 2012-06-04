require("../../../env");
require("../../../../server/public/lab/lab.grapher");
require("../../../../server/public/lab/lab.layout");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("grapher.axis");

suite.addBatch({
  "axis": {
    topic: function() {
      return grapher.axis.axisProcessDrag;
    },
    "axisProcessDrag: (20, 10, [0, 40]) => [0, 80]": function(axisProcessDrag) {
      assert.deepEqual(axisProcessDrag(20, 10, [0, 40]), [0, 80]);
    },
    "axisProcessDrag: (60, 50, [40, 80]) => [40, 120]": function(axisProcessDrag) {
      assert.deepEqual(axisProcessDrag(60, 50, [40, 80]), [40, 120]);
    },
    "axisProcessDrag: (10, 20, [0, 40]) => [0, 20]": function(axisProcessDrag) {
      assert.deepEqual(axisProcessDrag(10, 20, [0, 40]), [0, 20]);
    },
    "axisProcessDrag: (20, 10, [-40, 40]) => [-80, 80]": function(axisProcessDrag) {
      assert.deepEqual(axisProcessDrag(20, 10, [-40, 40]), [-80, 80]);
    },
    "axisProcessDrag: (-60, -50, [-80, -40]) => [-120, -40]": function(axisProcessDrag) {
      assert.deepEqual(axisProcessDrag(-60, -50, [-80, -40]), [-120, -40]);
    }
  }
});

suite.export(module);
