/*globals

*/

// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var autostart = false,
    mol_number = 50,
    temperature = 3,
    atoms,
    model,
    lj_epsilon_max = -0.01034,
    lj_epsilon_min = -0.4,
    model_stopped = true,
    model = modeler.model(),
    nodes,
    model_player,
    molecule_container;

$(window).load(function() {
  var controller;

  model_player = new ModelPlayer(model, autostart);
  molecule_container = layout.moleculeContainer("#molecule-container");
  controller = controllers.simpleModelController(molecule_container, {
    layoutStyle: 'simple-static-screen'
  });
});
