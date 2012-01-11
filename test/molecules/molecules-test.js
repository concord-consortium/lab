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
      molecules = [];
      options = {
        xdomain: 100, 
        ydomain: 100, 
        temperature: 3, 
        rmin: 4.4, 
        mol_rmin_radius_factor: 0.38,
      };
      return model = modeler.layout.model();
    },
    "creates default molecular model": function(model) {
      model.nodes();
      assert.equal(molecules.length, 50);
      assert.deepEqual(model.size(), [1, 1]);
    },
    "creates 50 molecules without setting model size or initializing forces": function(model) {
      options.num = 50;
      model.nodes(options);
      assert.equal(molecules.length, 50);
    },
    "creates 50 molecules with a total charge of 0": function(model) {
      options.num = 50;
      model.size([100, 100])
          .nodes(options)
          .initialize(true, true);
      assert.equal(molecules.length, 50);
      var total_charge = d3.sum(molecules, function(d) { return d.charge });
      assert.equal(total_charge, 0);
      assert.equal(total_charge, d3.sum(model.charge()));
    },
    "creates 100 molecules with a total charge of 0": function(model) {
      options.num = 100;
      model.size([100, 100])
          .nodes(options)
          .initialize(true, true);
      assert.equal(molecules.length, 100);
      var total_charge = d3.sum(molecules, function(d) { return d.charge });
      assert.equal(total_charge, 0);
    },
    "creates first 50 and then 100 molecules with a total charge of 0": function(model) {
      options.num = 50;
      model.size([100, 100])
          .nodes(options)
          .initialize(true, true);
      assert.equal(molecules.length, 50);
      var total_charge = d3.sum(molecules, function(d) { return d.charge });
      assert.equal(total_charge, 0);
      options.num = 100;
      model.nodes(options)
          .initialize(true, true);
      assert.equal(molecules.length, 100);
      var total_charge = d3.sum(molecules, function(d) { return d.charge });
      assert.equal(total_charge, 0);
    }
  }
});

suite.export(module);
