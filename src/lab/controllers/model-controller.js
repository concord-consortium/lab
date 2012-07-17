/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout
  $
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
controllers.modelController = function(molecule_view_id, modelConfig, playerConfig) {
  var controller          = {},

      layoutStyle,
      autostart,
      maximum_model_steps,

      elements,
      atoms_properties,
      mol_number,
      temperature_control,
      temperature,
      coulomb_forces,
      width,
      height,

      nodes,

      molecule_container,
      step_counter,
      therm,
      epsilon_slider;

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    function model_listener(e) {
      molecule_container.update_molecule_positions();
      if (step_counter >= model.stepCounter()) { modelStop(); }
    }


    // ------------------------------------------------------------
    //
    // Initialize (or update) local variables based on playerConfig and modelConfig objects
    //
    // ------------------------------------------------------------

    function initializeLocalVariables() {
      layoutStyle         = playerConfig.layoutStyle;
      autostart           = playerConfig.autostart;
      maximum_model_steps = playerConfig.maximum_model_steps;

      elements            = modelConfig.elements;
      atoms_properties    = modelConfig.atoms;
      mol_number          = modelConfig.mol_number;
      temperature_control = modelConfig.temperature_control;
      temperature         = modelConfig.temperature;
      coulomb_forces      = modelConfig.coulomb_forces;
      width               = modelConfig.width;
      height              = modelConfig.height;
    }

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      initializeLocalVariables();
      model = modeler.model({
          elements: elements,
          model_listener: model_listener,
          temperature: temperature,
          lennard_jones_forces: true,
          coulomb_forces: coulomb_forces,
          temperature_control: temperature_control,
          width: width,
          height: height
        });


      if (atoms_properties) {
        model.createNewAtoms(atoms_properties);
      } else if (mol_number) {
        model.createNewAtoms(mol_number);
        model.relax();
      } else {
        throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
      }
    }

    // ------------------------------------------------------------
    //
    // Create Model Player
    //
    // ------------------------------------------------------------

    function setupModelPlayer() {

      // ------------------------------------------------------------
      //
      // Create player and container view for model
      //
      // ------------------------------------------------------------

      layout.selection = layoutStyle;

      model_player = new ModelPlayer(model, autostart);
      molecule_container = layout.moleculeContainer(molecule_view_id,
        {
          xmax:                 width,
          ymax:                 height,
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); }
        }
      );

      molecule_container.updateMoleculeRadius();
      molecule_container.setup_particles();

      layout.addView('moleculeContainers', molecule_container);

      // FIXME: should not be here
      layout.setupScreen();
    }

    function resetModelPlayer() {

      // ------------------------------------------------------------
      //
      // reset player and container view for model
      //
      // ------------------------------------------------------------

      molecule_container.reset({
          xmax:                 width,
          ymax:                 height,
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); }
        }
      )

      // FIXME: should not be here
      layout.setupScreen(true);
    }


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

    function setupModel() {
      nodes = model.get_nodes();

      model.resetTime();

      modelStop();
      model.on("tick", model_listener);
      step_counter = model.stepCounter();
    }

    function finishSetup(firstTime) {
      createModel();
      setupModel();
      if (firstTime) {
        setupModelPlayer();
      } else {
        resetModelPlayer()
      }
    }

    function reload(newModelConfig, newPlayerConfig) {
      // ****
       modelConfig = newModelConfig;
       playerConfig = newPlayerConfig;
       finishSetup(false);
    }

    if (typeof DEVELOPMENT === 'undefined') {
      try {
        finishSetup(true);
      } catch(e) {
        alert(e);
        throw new Error(e);
      }
    } else {
      finishSetup(true);
    }

    // ------------------------------------------------------------
    //
    // Start if autostart is true
    //
    // ------------------------------------------------------------

    if (autostart) {
      modelGo();
    }

    controller.reload = reload;

    return controller;
};



