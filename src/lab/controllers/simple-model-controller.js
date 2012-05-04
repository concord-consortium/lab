/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout

  model: true
  model_player: true
  atoms: true
  nodes: true
*/
/*jslint onevar: true*/
controllers.simpleModelController = function(molecule_view_id, modelConfig, playerConfig) {

  var layoutStyle         = playerConfig.layoutStyle,
      autostart           = playerConfig.autostart,
      maximum_model_steps = playerConfig.maximum_model_steps,
      lj_epsilon_max      = playerConfig.lj_epsilon_max,
      lj_epsilon_min      = playerConfig.lj_epsilon_min,

      atoms_properties    = modelConfig.atoms,
      mol_number          = modelConfig.mol_number,
      epsilon             = modelConfig.epsilon,
      temperature         = modelConfig.temperature,
      coulomb_forces      = modelConfig.coulomb_forces,

      molecule_container,
      model_listener,
      step_counter,
      therm,
      epsilon_slider,
      viewLists;

  // ------------------------------------------------------------
  //
  // Main callback from model process
  //
  // Pass this function to be called by the model on every model step
  //
  // ------------------------------------------------------------

  model_listener = function(e) {
    molecule_container.update_molecule_positions();
    if (step_counter >= model.stepCounter()) { modelStop(); }
  };

  // ------------------------------------------------------------
  //
  // Create model and pass in properties
  //
  // ------------------------------------------------------------

  model = modeler.model({
      model_listener: model_listener,
      temperature: temperature,
      lennard_jones_forces: true,
      coulomb_forces: coulomb_forces,
      temperature_control: true,
      epsilon: epsilon
    });


  if (atoms_properties) {
    model.createNewAtoms(atoms_properties);
  } else if (mol_number) {
    model.createNewAtoms(mol_number);
  } else {
    throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
  }

  // ------------------------------------------------------------
  //
  // Create player and container view for model
  //
  // ------------------------------------------------------------

  layout.selection = layoutStyle;

  model_player = new ModelPlayer(model, autostart);
  molecule_container = layout.moleculeContainer(molecule_view_id);

  // ------------------------------------------------------------
  //
  // Setup list of views used by layout system
  //
  // ------------------------------------------------------------

  viewLists = {
    moleculeContainers:      [molecule_container]
  };

  // ------------------------------------------------------------
  //
  // Model Controller
  //
  // ------------------------------------------------------------

  function modelStop() {
    model.stop();
  }

  function modelGo() {
    model.on("tick", model_listener);
    if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
      model.resume();
    }
  }

  function modelStepBack() {
    modelStop();
    model.stepBack();
  }

  function modelStepForward() {
    if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
      model.stepForward();
    }
  }

  // ------------------------------------------------------------
  //
  //   Molecular Model Setup
  //

  function setup() {
    atoms = model.get_atoms();
    nodes = model.get_nodes();

    model.relax();
    model.resetTime();

    modelStop();
    model.on("tick", model_listener);
    molecule_container.updateMoleculeRadius();
    molecule_container.setup_particles();
    layout.setupScreen(viewLists);
    step_counter = model.stepCounter();
  }

  // ------------------------------------------------------------
  //
  //  Wire up screen-resize handlers
  //
  // ------------------------------------------------------------

  function onresize() {
    layout.setupScreen();
    therm.resize();
  }

  document.onwebkitfullscreenchange = onresize;
  window.onresize = onresize;

  // ------------------------------------------------------------
  //
  // Handle keyboard shortcuts for model operation
  //
  // ------------------------------------------------------------

  function handleKeyboardForModel(evt) {
    evt = (evt) ? evt : ((window.event) ? event : null);
    if (evt) {
      switch (evt.keyCode) {
        case 32:                // spacebar
          if (model.is_stopped()) {
            molecule_container.playback_component.action('play');
          } else {
            molecule_container.playback_component.action('stop');
          }
          evt.preventDefault();
        break;
        case 13:                // return
          molecule_container.playback_component.action('play');
          evt.preventDefault();
        break;
        case 37:                // left-arrow
          if (!model.is_stopped()) {
            molecule_container.playback_component.action('stop');
          }
          modelStepBack();
          evt.preventDefault();
        break;
        case 39:                // right-arrow
          if (!model.is_stopped()) {
            molecule_container.playback_component.action('stop');
          }
          modelStepForward();
          evt.preventDefault();
        break;
      }
    }
  }

  document.onkeydown = handleKeyboardForModel;

  // ------------------------------------------------------------
  //
  // Reset the model after everything else ...
  //
  // ------------------------------------------------------------

  setup();

  // ------------------------------------------------------------
  // Setup therm, epsilon_slider & sigma_slider components ... after fluid layout
  // ------------------------------------------------------------

  therm = new Thermometer('#thermometer', model.temperature(), 0, 25);

  function updateTherm(){
    therm.add_value(model.get("temperature"));
  }

  model.addPropertiesListener(["temperature"], updateTherm);
  updateTherm();

  epsilon_slider = new SliderComponent('#attraction_slider',
    function (v) {
      model.set({epsilon: v} );
    }, lj_epsilon_max, lj_epsilon_min, epsilon);

  function updateEpsilon(){
    epsilon_slider.set_scaled_value(model.get("epsilon"));
  }

  model.addPropertiesListener(["epsilon"], updateEpsilon);
  updateEpsilon();

  // ------------------------------------------------------------
  // Setup heat and cool buttons
  // ------------------------------------------------------------

  layout.heatCoolButtons("#heat_button", "#cool_button", 0, 25, model, function (t) { therm.add_value(t); });

  // ------------------------------------------------------------
  // Add listener for coulomb_forces checkbox
  // ------------------------------------------------------------

  // $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));

  function updateCoulombCheckbox() {
    $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));
    molecule_container.setup_particles();
  }

  model.addPropertiesListener(["coulomb_forces"], updateCoulombCheckbox);
  updateCoulombCheckbox();

  // ------------------------------------------------------------
  //
  // Start if autostart is true
  //
  // ------------------------------------------------------------

  if (autostart) {
    modelGo();
  }
};
