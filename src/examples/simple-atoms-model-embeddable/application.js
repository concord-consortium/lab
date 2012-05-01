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

var atoms,
    model_stopped = true,
    nodes,
    model_player,
    molecule_container;

$(window).load(function() {
  var autostart = false,
      controller;

  controller = controllers.simpleModelController('#molecule-container', {
    layoutStyle: 'simple-static-screen',
    autostart: autostart,
    maximum_model_steps: Infinity,

    mol_number = 50,

    lj_epsilon_min: -0.4,
    lj_epsilon_max: -0.01034,
    initial_epsilon: -0.1,

    temperature: 3
  });
});
