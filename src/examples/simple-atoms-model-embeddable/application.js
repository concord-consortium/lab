// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var autostart = false,
    mol_number = 50,
    sample_time = 0.01,
    temperature = 3,
    maximum_model_steps = false,
    atoms, model,
    lj_epsilon_max = -0.01034,
    lj_epsilon_min = -0.4,
    frame_number = 0,
    model_stopped = true,
    model = modeler.model(),
    nodes,
    model_player,
    molecule_container,
    modelController;

$(window).load(function() {
  model_player = new ModelPlayer(model, autostart);
  molecule_container = layout.moleculeContainer("#molecule-container");
  modelController = controllers.simpleModelController("simple-iframe", molecule_container);
});
