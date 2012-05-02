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
var modelConfig = {
      mol_number          : 50,
      temperature         : 3,
      epsilon             : -0.1,
      lennard_jones_forces: true,
      coulomb_forces      : false
    },

    playerConfig = {
      layoutStyle        : 'simple-static-screen',
      autostart          : false,
      maximum_model_steps: Infinity,
      lj_epsilon_min     : -0.4,
      lj_epsilon_max     : -0.01034
    };

$(window).load(function() {
  var controller = controllers.simpleModelController('#molecule-container', modelConfig, playerConfig);
});
