/*globals modeler, ModelPlayer, layout, graphx, molecules_lennard_jones, modelController */

// simplemolecules.js
//

// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

$(window).load(function() {
  var options = {
        layoutStyle: 'full-static-screen',
        autostart: false,
        maximum_model_steps: 5000,
        mol_number: 50,
        epsilon_min: -0.4,
        epsilon_max: -0.01034,
        initial_epsilon: -0.1,
        temperature: 3
      };
  var controller = controllers.complexModelController('#molecule-container', 'ke-chart', '#lj-potential-chart', '#speed-distribution-chart', options);
});
