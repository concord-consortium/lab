/*globals
  modeler
  ModelPlayer
  $
  layout
  controllers
*/

// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var mol_number = 50,
    temperature = 3,
    atoms,
    model_stopped = true,
    model = modeler.model(),
    nodes,
    model_player,
    molecule_container;

$(window).load(function() {
  var autostart = false,
      controller;

  model_player = new ModelPlayer(model, autostart);
  molecule_container = layout.moleculeContainer('#molecule-container');

  controller = controllers.simpleModelController(molecule_container, {
    layoutStyle: 'simple-static-screen',
    autostart: autostart,
    maximum_model_steps: Infinity,

    lj_epsilon_min: -0.4,
    lj_epsilon_max: -0.01034,
    initial_epsilon: -0.1
  });
});
