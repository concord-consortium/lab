// var helpers   = require("../../helpers");
// helpers.setupBrowserEnvironment();

// var vows      = require("vows"),
//     assert    = require("assert"),
//     requirejs = helpers.getRequireJS(),

//     Model = requirejs('md2d/models/modeler'),

//     suite = vows.describe("models/md2d/models/modeler");


// var atoms = [],
//     model;

// var get_charge = function (i) {
//   return model.get_atoms().charge[i];
// };

// var initialization_options = {
//   mol_number: 50,
//   lennardJonesForces: true,
//   coulombForces: true,
//   timeStepsPerTick: 100
// };

// suite.addBatch({
//   "Empty model": {
//     topic: function() {
//       model = new Model({
//         mol_number: 0,
//         lennardJonesForces: true,
//         coulombForces: true,
//         timeStepsPerTick: 100
//       });
//       return model;
//     },
//     "should have empty results array": function(model) {
//       assert.equal(model.get_results().length, 0);
//     },
//     "has time = 0": function(model) {
//       assert.equal(model.get("time"), 0);
//     }
//   }
// });

// suite.addBatch({
//   "model initialization": {
//     topic: function() {
//       model = new Model(initialization_options);
//       return model;
//     },
//     "creates default molecular model": function(model) {
//       assert.equal(model.getNumberOfAtoms(), 50);
//       // FIXME: custom error strings
//       // expected [ 100, 100 ],
//       // got      [ 1, 1 ] (deepEqual) // molecules-test.js:46
//       assert.deepEqual(model.dimensions(), [0, 0, 10, 10]);
//     },
//     "creates 50 molecules without setting model size or initializing forces": function(model) {
//       assert.equal(model.getNumberOfAtoms(), 50);
//     },
//     "creates 50 molecules with a total charge of 0": function(model) {
//       var atoms, total_charge;

//       model.createNewAtoms(50);

//       atoms = model.get_atoms();
//       (dummyAtoms = []).length = model.getNumberOfAtoms();

//       assert.equal(dummyAtoms.length, 50);
//       total_charge = d3.sum(dummyAtoms, function(d, i) { return get_charge(i);  });
//       assert.equal(total_charge, 0);
//     },
//     "creates 100 molecules with a total charge of 0": function(model) {
//       model.createNewAtoms(100);

//       (atoms = []).length = model.getNumberOfAtoms();
//       assert.equal(atoms.length, 100);
//       var total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
//       assert.equal(total_charge, 0);
//     },
//     "creates first 50 and then 100 molecules with a total charge of 0": function(model) {
//       model.createNewAtoms(50);
//       (atoms = []).length = model.getNumberOfAtoms();
//       assert.equal(atoms.length, 50);
//       var total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
//       assert.equal(total_charge, 0);

//       model.createNewAtoms(100);
//       (atoms = []).length = model.getNumberOfAtoms();
//       assert.equal(atoms.length, 100);
//       total_charge = d3.sum(atoms, function(d, i) { return get_charge(i); });
//       assert.equal(total_charge, 0);
//     },
//     "creates a model with json and then gets values in json, modifies the model with new json, and confirms that settable properties change and immutable causes an error": function(model) {
//       var mol_number = 5;
//       var initialization_options = {
//         lennardJonesForces: true,
//         coulombForces: true,
//         mol_number: mol_number,
//         relax: false,
//         width: 3,
//         height: 4
//       };
//       model = new Model(initialization_options);

//       modelHash = model.serialize(true);
//       assert.equal(modelHash.lennardJonesForces, initialization_options.lennardJonesForces);
//       assert.equal(modelHash.coulombForces, initialization_options.coulombForces);
//       assert.equal(modelHash.atoms.x.length, mol_number);
//       assert.equal(modelHash.width, initialization_options.width);
//       assert.equal(modelHash.height, initialization_options.height);

//       mol_number = 10;
//       new_options = {
//         lennardJonesForces: false,
//         coulombForces: false
//       };
//       model.set(new_options);
//       model.createNewAtoms(mol_number);

//       modelHash = model.serialize(true);
//       assert.equal(modelHash.lennardJonesForces, new_options.lennardJonesForces);
//       assert.equal(modelHash.coulombForces, new_options.coulombForces);
//       assert.equal(modelHash.atoms.x.length, mol_number);

//       new_options = {
//         width: 4,
//         height: 5
//       };

//       assert.throws(function () { model.set(new_options); }, Error);
//     },
//     "creates a model, saves atom state, loads atom state": function(model) {
//       new_initialization_options = {
//         lennardJonesForces: true,
//         coulombForces: true,
//         mol_number: 5,
//         relax: false
//       };
//       model = new Model(new_initialization_options);

//       oldModelHash = model.serialize(true);
//       assert.isObject(oldModelHash.atoms);
//       assert.equal(oldModelHash.atoms.x.length, new_initialization_options.mol_number);

//       oldAtomStates = oldModelHash.atoms;

//       model = new Model(oldModelHash);
//       model.createNewAtoms(oldAtomStates);

//       newModelHash = model.serialize(true);

//       for (var prop in oldAtomStates) {
//         if (oldAtomStates.hasOwnProperty(prop)) {
//           array = oldAtomStates[prop];
//           for (i = 0, ii = array.length; i<ii; i++){
//             assert.equal(array[i], newModelHash.atoms[prop][i]);
//           }
//         }
//       }
//     },
//     "creates a model with elements, checks the total mass": function(model) {
//       // 5 atoms of mass 1
//       new_initialization_options = {
//         elements: {
//           id: [0],
//           mass: [1],
//           epsilon: [-0.1],
//           sigma: [0.07]
//         },
//         mol_number: 5
//       };
//       model = new Model(new_initialization_options).createNewAtoms(new_initialization_options.mol_number);
//       assert.equal(model.getTotalMass(), 5);

//       // 5 atoms of mass 2
//       new_initialization_options = {
//         elements: {
//           id: [0],
//           mass: [2],
//           epsilon: [-0.1],
//           sigma: [0.07]
//         },
//         mol_number: 5
//       };
//       model = new Model(new_initialization_options).createNewAtoms(new_initialization_options.mol_number);

//       assert.equal(model.getTotalMass(), 10);

//       // 100 atoms randomly created either with mass 1 or 2
//       new_initialization_options = {
//         elements: {
//           id: [0, 1],
//           mass: [1, 2],
//           epsilon: [-0.1, -0.1],
//           sigma: [0.07, 0.07]
//         },
//         mol_number: 100
//       };
//       model = new Model(new_initialization_options).createNewAtoms(new_initialization_options.mol_number);

//       assert(model.getTotalMass() > 100, "Total mass should be greater than 100. Actual: "+model.getTotalMass());
//       assert(model.getTotalMass() < 200, "Total mass should be less than 200. Actual: "+model.getTotalMass());

//       // three atoms created, two with mass 1 and one with mass 20
//       new_initialization_options = {
//         elements: {
//           id: [0, 1],
//           mass: [1, 20],
//           epsilon: [-0.1, -0.1],
//           sigma: [0.07, 0.07]
//         },
//         atoms: {
//           x: [0,0,0],
//           y: [0,0,0],
//           vx: [0,0,0],
//           vy: [0,0,0],
//           element: [0,0,1]
//         }
//       };
//       model = new Model(new_initialization_options).createNewAtoms(new_initialization_options.atoms);

//       assert.equal(model.getTotalMass(), 22);
//     }
//   }
// });

// suite.addBatch({
//   "model stepping": {
//     topic: function() {
//       model = new Model(initialization_options);
//       atom0InitialPosition = [model.get_atoms().x[0], model.get_atoms().y[0]];
//       return model;
//     },
//     "a newly initialized model has 1 step saved": function(model) {
//       assert.equal(model.steps(), 1);
//       assert.isTrue(model.isNewStep());
//     },
//     "a newly initialized model should be at step number 0": function(model) {
//       assert.equal(model.stepCounter(), 0);
//     },
//     "after running one tick the model is at step number 1": function(model) {
//       model.tick();
//       assert.equal(model.stepCounter(), 1);
//       assert.isTrue(model.isNewStep());
//     },
//     "after running one tick the model has 2 steps saved": function(model) {
//       assert.equal(model.steps(), 2);
//     },
//     "after stepping back one step the model is at step 0 and atom0 is in the same initial position": function(model) {
//       model.stepBack();
//       assert.equal(model.stepCounter(), 0);
//       assert.deepEqual(
//         [model.get_atoms().x[0], model.get_atoms().y[0]],
//         atom0InitialPosition
//       );
//     },
//     "after running 10 more ticks the model is at step 10": function(model) {
//       model.tick(10);
//       assert.equal(model.stepCounter(), 10);
//       assert.isTrue(model.isNewStep());
//     },
//     "after running 10 more ticks the model should have 11 steps saved": function(model) {
//       assert.equal(model.steps(), 11);
//     },
//     "the model should be at step 9 after stepBack() and still have 11 steps saved": function(model) {
//       model.stepBack();
//       assert.equal(model.stepCounter(), 9);
//       var total_steps = model.steps();
//       assert.equal(total_steps, 11, "total steps should equal 11 but instead it was " + total_steps);
//       assert.isFalse(model.isNewStep());
//     },
//     "the model should be at step 5 after stepBack(4) and still have 11 steps saved": function(model) {
//       model.stepBack(4);
//       assert.equal(model.stepCounter(), 5);
//       var total_steps = model.steps();
//       assert.equal(total_steps, 11, "total steps should equal 11 but instead it was " + total_steps);
//       assert.isFalse(model.isNewStep());
//     },
//     "the model should be at step 15 after stepForward(10) and have 16 steps saved": function(model) {
//       model.stepForward(10);
//       assert.equal(model.stepCounter(), 15);
//       var total_steps = model.steps();
//       assert.equal(total_steps, 16, "total steps should equal 16 but instead it was " + total_steps);
//       assert.isTrue(model.isNewStep());
//     },
//     "the model should be at step 0 after stepBack(15) and have 16 steps saved": function(model) {
//       model.stepBack(15);
//       assert.equal(model.stepCounter(), 0);
//       var total_steps = model.steps();
//       assert.equal(total_steps, 16, "total steps should equal 16 but instead it was " + total_steps);
//       assert.isFalse(model.isNewStep());
//     },
//     "the model should still be at step 0 after stepBack(100) and have 16 steps saved": function(model) {
//       model.stepBack(100);
//       assert.equal(model.stepCounter(), 0);
//       var total_steps = model.steps();
//       assert.equal(total_steps, 16, "total steps should equal 16 but instead it was " + total_steps);
//       assert.isFalse(model.isNewStep());
//     },
//     "after running 10 ticks and model.seek() is at step 0": function(model) {
//       model.tick(10);
//       model.seek();
//       assert.equal(model.stepCounter(), 0);
//       assert.isFalse(model.isNewStep());
//     }
//   }
// });

// suite.export(module);
