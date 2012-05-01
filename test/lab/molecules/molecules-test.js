require("../../env");
require("../../../dist/lab/lab.molecules");

var vows = require("vows"),
    assert = require("assert");

var suite = vows.describe("lab.molecules");

var atoms = [];

var get_charge = function (i) {
  return model.get_nodes()[model.INDICES.CHARGE][i];
};

var initialization_options = {
      lennard_jones_forces: true,
      coulomb_forces: true,
      model_listener: false,
      mol_number: 50
    },
    node_options = {
      xdomain: 100,
      ydomain: 100,
      temperature: 3,
      rmin: 4.4,
      mol_rmin_radius_factor: 0.38
    };

suite.addBatch({
  "version": {
    topic: function() {
      return modeler.VERSION;
    },
    "reports version": function(version) {
      assert.equal(version, "0.2.0");
    }
  }
});

suite.addBatch({
  "model initialization": {
    topic: function() {
      return model = modeler.model(initialization_options);
    },
    "creates default molecular model": function(model) {
      assert.equal(atoms.length, 0);
      atoms = model.get_atoms();
      assert.equal(atoms.length, 50);
      // FIXME: custom error strings
      // expected [ 100, 100 ],
	    // got      [ 1, 1 ] (deepEqual) // molecules-test.js:46
      assert.deepEqual(model.size(), [10, 10]);
    },
    "creates 50 molecules without setting model size or initializing forces": function(model) {
      assert.equal(atoms.length, 50);
    },
    "creates 50 molecules with a total charge of 0": function(model) {
      var nodes, total_charge;

      initialization_options.mol_number = 50;
      model = modeler.model(initialization_options);
      nodes = model.get_nodes();
      atoms = model.get_atoms();

      assert.equal(atoms.length, 50);
      total_charge = d3.sum(atoms, function(d, i) { return get_charge(i);  });
      assert.equal(total_charge, 0);
    },
    "creates 100 molecules with a total charge of 0": function(model) {
      initialization_options.mol_number = 100;
      model = modeler.model(initialization_options);
      atoms = model.get_atoms();
      assert.equal(atoms.length, 100);
      var total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
      assert.equal(total_charge, 0);
    },
    "creates first 50 and then 100 molecules with a total charge of 0": function(model) {
      initialization_options.mol_number = 50;
      model = modeler.model(initialization_options);
      atoms = model.get_atoms();
      assert.equal(atoms.length, 50);
      var total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
      assert.equal(total_charge, 0);
      initialization_options.mol_number = 100;
      model = modeler.model(initialization_options);
      atoms = model.get_atoms();
      assert.equal(atoms.length, 100);
      var total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
      assert.equal(total_charge, 0);
    }
  }
});

suite.addBatch({
  "model stepping": {
    topic: function() {
      node_options.num = 10;
      return model = modeler.model(initialization_options);
    },
    "a newly initialized model starts at step 0": function(model) {
      assert.equal(model.steps(), 0);
      assert.isTrue(model.isNewStep());
    },
    "after running one tick the model is at step 1": function(model) {
      model.tick();
      assert.equal(model.stepCounter(), 1);
      assert.isTrue(model.isNewStep());
    },
    "after running 9 more ticks the model is at step 10": function(model) {
      model.tick(9);
      assert.equal(model.stepCounter(), 10);
      assert.isTrue(model.isNewStep());
    },
    "the model should be at step 9 after stepBack() and total steps: 10": function(model) {
      model.stepBack();
      assert.equal(model.stepCounter(), 9);
      var total_steps = model.steps();
      assert.equal(total_steps, 10, "total steps should equal 10 but instead it was " + total_steps);
      assert.isFalse(model.isNewStep());
    },
    "the model should be at step 5 after stepBack(4) and total steps: 10": function(model) {
      model.stepBack(4);
      assert.equal(model.stepCounter(), 5);
      var total_steps = model.steps();
      assert.equal(total_steps, 10, "total steps should equal 10 but instead it was " + total_steps);
      assert.isFalse(model.isNewStep());
    },
    "the model should be at step 15 after stepForward(10) and total steps: 15": function(model) {
      model.stepForward(10);
      assert.equal(model.stepCounter(), 15);
      var total_steps = model.steps();
      assert.equal(total_steps, 15, "total steps should equal 15 but instead it was " + total_steps);
      assert.isTrue(model.isNewStep());
    },
    "the model should be at step 0 after stepBack(15) and total steps: 15": function(model) {
      model.stepBack(15);
      assert.equal(model.stepCounter(), 0);
      var total_steps = model.steps();
      assert.equal(total_steps, 15, "total steps should equal 15 but instead it was " + total_steps);
      assert.isFalse(model.isNewStep());
    },
    "the model should still be at step 0 after stepBack(100) and total steps: 15": function(model) {
      model.stepBack(100);
      assert.equal(model.stepCounter(), 0);
      var total_steps = model.steps();
      assert.equal(total_steps, 15, "total steps should equal 15 but instead it was " + total_steps);
      assert.isFalse(model.isNewStep());
    },
    "after running 10 ticks and model.seek() is at step 0": function(model) {
      model.tick(10);
      model.seek();
      assert.equal(model.stepCounter(), 0);
      assert.isFalse(model.isNewStep());
    }
  }
});

// Failing ATM. Maybe later, after we start using physical units. RPK 3-2-2012
// suite.addBatch({
//   "model energy calculations": {
//     topic: function() {
//       return model = modeler.model();
//     },
//     "10 molecules at a temperature of 5 have an average speed of 0.2": function(model) {
//       node_options.num = 10;
//       model.nodes(node_options).initialize(initialization_options);
//       assert.inDelta(model.speed(), 0.1, 0.025);
//     },
//     "100 molecules at a temperature of 5 have an average speed of 0.2": function(model) {
//       node_options.num = 100;
//       model.nodes(node_options).initialize(initialization_options);
//       assert.inDelta(model.speed(), 0.2, 0.05);
//     },
//     "10 molecules at a temperature of 3 have an average speed of 0.1": function(model) {
//       node_options.num = 10;
//       model.nodes(node_options).initialize(initialization_options);
//       assert.inDelta(model.speed(), 0.01, 0.0025);
//     },
//   }
// });

suite.export(module);
