/*globals modeler, ModelPlayer, layout, graphx, molecules_lennard_jones, modelController */

// simplemolecules.js
//

// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var lj_graph, lj_data, lj_coefficients, lennard_jones_potential,
    speed_graph;

$(window).load(function() {
  var controller = controllers.complexModelController('#molecule-container', 'ke-chart', '#lj-potential-chart', '#speed-distribution-chart', {
    layoutStyle: 'full-static-screen',
    autostart: false,
    maximum_model_steps: 5000,

    mol_number: 50,

    epsilon_min: -0.4,
    epsilon_max: -0.01034,
    initial_epsilon: -0.1,

    temperature: 3
  });
});
