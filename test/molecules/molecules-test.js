require("../env");
require("../../lib/lab.molecules");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.molecules");

suite.addBatch({
  "version": {
    topic: function() {
      return modeler.VERSION;
    },
    "reports version": function(version) {
      assert.equal(version, "0.1.0");
    }
  }
});

suite.addBatch({
  "model initialization": {
    topic: function() {
      return model = modeler.layout.model();
    },
    "creates 50 molecules with a total charge of 0": function(model) {
      molecules = [];
      model.size([100, 100])
          .nodes(50, 100, 100, 3, 4.4,  0.38)
          .initialize(true, true);
      assert.equal(molecules.length, 50);
      var total_charge = d3.sum(molecules, function(d) { return d.charge });
      assert.equal(total_charge, 0);
    },
    "creates 100 molecules with a total charge of 0": function(model) {
      molecules = [];
      model.size([100, 100])
          .nodes(100, 100, 100, 3, 4.4,  0.38)
          .initialize(true, true);
      assert.equal(molecules.length, 100);
      var total_charge = d3.sum(molecules, function(d) { return d.charge });
      assert.equal(total_charge, 0);
    },
    "creates first 50 and then 100 molecules with a total charge of 0": function(model) {
      molecules = [];
      model.size([100, 100])
          .nodes(50, 100, 100, 3, 4.4,  0.38)
          .initialize(true, true);
      assert.equal(molecules.length, 50);
      var total_charge = d3.sum(molecules, function(d) { return d.charge });
      assert.equal(total_charge, 0);
      model.nodes(100, 100, 100, 3, 4.4,  0.38)
          .initialize(true, true);
      assert.equal(molecules.length, 100);
      var total_charge = d3.sum(molecules, function(d) { return d.charge });
      assert.equal(total_charge, 0);
    }
  }
});

suite.export(module);
