/*globals $ controllers */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

$(window).load(function() {
  var controller = controllers.simpleModelController('#molecule-container', {
    layoutStyle: 'simple-static-screen',
    autostart: false,
    maximum_model_steps: Infinity,

    mol_number: 50,

    lj_epsilon_min: -0.4,
    lj_epsilon_max: -0.01034,
    initial_epsilon: -0.1,

    temperature: 3
  });
});
