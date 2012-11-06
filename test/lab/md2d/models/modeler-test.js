/*globals d3, model */

require("../../../env");

var requirejs = require('requirejs'),
    config    = require('../../../requirejs-config'),
    vows      = require("vows"),
    assert    = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'md2d/models/modeler'
], function (Model) {

  var suite = vows.describe("md2d/models/modeler");

  var atoms = [];

  var get_charge = function (i) {
    return model.get_atoms().charge[i];
  };

  var initialization_options = {
        mol_number: 50,
        lennardJonesForces: true,
        coulombForces: true,
        viewRefreshInterval: 100
      };

  suite.addBatch({
    "model initialization": {
      topic: function() {
        model = Model(initialization_options);
        model.createNewAtoms(initialization_options.mol_number);
        model.initializeHistory();
        return model;
      },
      "creates default molecular model": function(model) {
        assert.equal(model.get_num_atoms(), 50);
        // FIXME: custom error strings
        // expected [ 100, 100 ],
  	    // got      [ 1, 1 ] (deepEqual) // molecules-test.js:46
        assert.deepEqual(model.size(), [10, 10]);
      },
      "creates 50 molecules without setting model size or initializing forces": function(model) {
        assert.equal(model.get_num_atoms(), 50);
      },
      "creates 50 molecules with a total charge of 0": function(model) {
        var atoms, total_charge;

        model.createNewAtoms(50);

        atoms = model.get_atoms();
        (dummyAtoms = []).length = model.get_num_atoms();

        assert.equal(dummyAtoms.length, 50);
        total_charge = d3.sum(dummyAtoms, function(d, i) { return get_charge(i);  });
        assert.equal(total_charge, 0);
      },
      "creates 100 molecules with a total charge of 0": function(model) {
        model.createNewAtoms(100);

        (atoms = []).length = model.get_num_atoms();
        assert.equal(atoms.length, 100);
        var total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
        assert.equal(total_charge, 0);
      },
      "creates first 50 and then 100 molecules with a total charge of 0": function(model) {
        model.createNewAtoms(50);
        (atoms = []).length = model.get_num_atoms();
        assert.equal(atoms.length, 50);
        var total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
        assert.equal(total_charge, 0);

        model.createNewAtoms(100);
        (atoms = []).length = model.get_num_atoms();
        assert.equal(atoms.length, 100);
        var total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
        assert.equal(total_charge, 0);
      },
      "creates a model with json and then gets values in json, modifies the model with new json, and confirms that settable properties change and immutable ones don't": function(model) {
        var mol_number = 5;
        initialization_options = {
          lennardJonesForces: true,
          colombForces: true,
          mol_number: mol_number,
          relax: false,
          width: 3,
          height: 4
        };
        model = Model(initialization_options);

        modelHash = model.serialize(true);
        assert.equal(modelHash.lennardJonesForces, initialization_options.lennardJonesForces);
        assert.equal(modelHash.coulomb_forces, initialization_options.coulombForces);
        assert.equal(modelHash.atoms.x.length, mol_number);
        assert.equal(modelHash.width, initialization_options.width);
        assert.equal(modelHash.height, initialization_options.height);

        mol_number = 10;
        new_options = {
          lennardJonesForces: false,
          colombForces: false,
          width: 4,
          height: 5
        };
        model.set(new_options);
        model.createNewAtoms(mol_number);

        modelHash = model.serialize(true);
        assert.equal(modelHash.lennardJonesForces, new_options.lennardJonesForces);
        assert.equal(modelHash.colombForces, new_options.colombForces);
        assert.equal(modelHash.atoms.x.length, mol_number);
        assert.equal(modelHash.width, initialization_options.width);
        assert.equal(modelHash.height, initialization_options.height);
      },
      "creates a model, saves atom state, loads atom state": function(model) {
        new_initialization_options = {
          lennardJonesForces: true,
          coulombForces: true,
          mol_number: 5,
          relax: false
        };
        model = Model(new_initialization_options);

        oldModelHash = model.serialize(true);
        assert.isObject(oldModelHash.atoms);
        assert.equal(oldModelHash.atoms.x.length, new_initialization_options.mol_number);

        oldAtomStates = oldModelHash.atoms;

        model = Model(oldModelHash);
        model.createNewAtoms(oldAtomStates);

        newModelHash = model.serialize(true);

        for (var prop in oldAtomStates) {
          if (oldAtomStates.hasOwnProperty(prop)) {
            array = oldAtomStates[prop];
            for (i = 0, ii = array.length; i<ii; i++){
              assert.equal(array[i], newModelHash.atoms[prop][i]);
            }
          }
        }
      },
      "creates a model with elements, checks the total mass": function(model) {
        // 5 atoms of mass 1
        new_initialization_options = {
          elements: [
            {id: 0, mass: 1, epsilon: -0.1, sigma: 0.07}
          ],
          mol_number: 5
        };
        model = Model(new_initialization_options).createNewAtoms(new_initialization_options.mol_number);
        assert.equal(model.getTotalMass(), 5);

        // 5 atoms of mass 2
        new_initialization_options = {
          elements: [
            {id: 0, mass: 2, epsilon: -0.1, sigma: 0.07}
          ],
          mol_number: 5
        };
        model = Model(new_initialization_options).createNewAtoms(new_initialization_options.mol_number);

        assert.equal(model.getTotalMass(), 10);

        // 100 atoms randomly created either with mass 1 or 2
        new_initialization_options = {
          elements: [
            {id: 0, mass: 1, epsilon: -0.1, sigma: 0.07},
            {id: 1, mass: 2, epsilon: -0.1, sigma: 0.07}
          ],
          mol_number: 100
        };
        model = Model(new_initialization_options).createNewAtoms(new_initialization_options.mol_number);

        assert(model.getTotalMass() > 100, "Total mass should be greater than 100. Actual: "+model.getTotalMass());
        assert(model.getTotalMass() < 200, "Total mass should be less than 200. Actual: "+model.getTotalMass());

        // three atoms created, two with mass 1 and one with mass 2
        new_initialization_options = {
          elements: [
            {id: 0, mass: 1, epsilon: -0.1, sigma: 0.07},
            {id: 1, mass: 20, epsilon: -0.1, sigma: 0.07}
          ],
          atoms: {
            x: [0,0,0],
            y: [0,0,0],
            vx: [0,0,0],
            vy: [0,0,0],
            element: [0,0,1]
          }
        };
        model = Model(new_initialization_options).createNewAtoms(new_initialization_options.atoms);

        assert.equal(model.getTotalMass(), 22);
      }
    }
  });

  suite.addBatch({
    "model stepping": {
      topic: function() {
        model = Model(initialization_options);
        model.createNewAtoms(initialization_options.mol_number);
        model.initializeHistory();
        atom0InitialPosition = [model.get_atoms().x[0], model.get_atoms().y[0]];
        return model;
      },
      "a newly initialized model starts at step 0": function(model) {
        assert.equal(model.steps(), 0);
        assert.isTrue(model.isNewStep());
      },
      "a newly initialized model stepCounter also starts at 0": function(model) {
        assert.equal(model.stepCounter(), 0);
      },
      "after running one tick the model is at step 1": function(model) {
        model.tick();
        assert.equal(model.stepCounter(), 1);
        assert.isTrue(model.isNewStep());
      },
      "after stepping back one step the model is at step 0 and atom0 is in the same initial position": function(model) {
        model.stepBack();
        assert.equal(model.stepCounter(), 0);
        assert.deepEqual(
          [model.get_atoms().x[0], model.get_atoms().y[0]],
          atom0InitialPosition
        );
      },
      "after running 10 more ticks the model is at step 10": function(model) {
        model.tick(10);
        assert.equal(model.stepCounter(), 10);
        assert.isTrue(model.isNewStep());
      },
      "the model should be at step 9 after stepBack() and total steps: 11": function(model) {
        model.stepBack();
        assert.equal(model.stepCounter(), 9);
        var total_steps = model.steps();
        assert.equal(total_steps, 11, "total steps should equal 11 but instead it was " + total_steps);
        assert.isFalse(model.isNewStep());
      },
      "the model should be at step 5 after stepBack(4) and total steps: 11": function(model) {
        model.stepBack(4);
        assert.equal(model.stepCounter(), 5);
        var total_steps = model.steps();
        assert.equal(total_steps, 11, "total steps should equal 11 but instead it was " + total_steps);
        assert.isFalse(model.isNewStep());
      },
      "the model should be at step 15 after stepForward(10) and total steps: 16": function(model) {
        model.stepForward(10);
        assert.equal(model.stepCounter(), 15);
        var total_steps = model.steps();
        assert.equal(total_steps, 16, "total steps should equal 16 but instead it was " + total_steps);
        assert.isTrue(model.isNewStep());
      },
      "the model should be at step 0 after stepBack(15) and total steps: 16": function(model) {
        model.stepBack(15);
        assert.equal(model.stepCounter(), 0);
        var total_steps = model.steps();
        assert.equal(total_steps, 16, "total steps should equal 16 but instead it was " + total_steps);
        assert.isFalse(model.isNewStep());
      },
      "the model should still be at step 0 after stepBack(100) and total steps: 16": function(model) {
        model.stepBack(100);
        assert.equal(model.stepCounter(), 0);
        var total_steps = model.steps();
        assert.equal(total_steps, 16, "total steps should equal 15 but instead it was " + total_steps);
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

  suite.export(module);
});
