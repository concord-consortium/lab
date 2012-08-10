/*globals

  controllers

  modeler
  ModelPlayer
  layout
  DEVELOPMENT
  $
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
controllers.modelController = function(moleculeViewId, modelConfig, playerConfig) {
  var controller = {},

      // properties read from the playerConfig hash
      layoutStyle,
      autostart,
      maximum_model_steps,

      // properties read from the modelConfig hash
      elements,
      atoms,
      mol_number,
      temperature_control,
      temperature,
      width,
      height,
      radialBonds,
      obstacles,

      moleculeContainer;

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    function tickHandler() {
      moleculeContainer.update_drawable_positions();
      if (model.stepCounter() > maximum_model_steps) modelStop();
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
      atoms               = modelConfig.atoms;
      mol_number          = modelConfig.mol_number;
      temperature_control = modelConfig.temperature_control;
      temperature         = modelConfig.temperature;
      width               = modelConfig.width;
      height              = modelConfig.height;
      radialBonds         = modelConfig.radialBonds;
      obstacles           = modelConfig.obstacles;
    }

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      initializeLocalVariables();
      model = modeler.model({
          elements            : elements,
          model_listener      : tickHandler,
          temperature         : temperature,
          temperature_control : temperature_control,
          width               : width,
          height              : height
        });

      if (atoms) {
        model.createNewAtoms(atoms);
      } else if (mol_number) {
        model.createNewAtoms(mol_number);
        model.relax();
      } else {
        throw new Error("ModelController: tried to create a model without atoms or mol_number.");
      }

      if (radialBonds) model.createRadialBonds(radialBonds);
      if (obstacles) model.createObstacles(obstacles);
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
      moleculeContainer = layout.moleculeContainer(moleculeViewId,
        {
          xmax:          width,
          ymax:          height,
          get_nodes:     function() { return model.get_nodes(); },
          get_num_atoms: function() { return model.get_num_atoms(); },
          get_obstacles: function() { return model.get_obstacles(); }
        }
      );

      moleculeContainer.updateMoleculeRadius();
      moleculeContainer.setup_drawables();

      layout.addView('moleculeContainers', moleculeContainer);

      // FIXME: should not be here
      layout.setupScreen();
    }

    function resetModelPlayer() {

      // ------------------------------------------------------------
      //
      // reset player and container view for model
      //
      // ------------------------------------------------------------

      moleculeContainer.reset({
        xmax:          width,
        ymax:          height,
        get_nodes:     function() { return model.get_nodes(); },
        get_num_atoms: function() { return model.get_num_atoms(); },
        get_obstacles: function() { return model.get_obstacles(); }
      });

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
      model.on('tick', tickHandler);
      if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
        model.resume();
      }
    }

    // ------------------------------------------------------------
    //
    //   Molecular Model Setup
    //

    function setupModel() {
      model.resetTime();
      modelStop();
      model.on('tick', tickHandler);
    }

    function finishSetup(firstTime) {
      createModel();
      setupModel();
      if (firstTime) {
        setupModelPlayer();
      } else {
        resetModelPlayer();
      }
    }

    function reload(newModelConfig, newPlayerConfig) {
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
    //  Wire up screen-resize handlers
    //
    // ------------------------------------------------------------

    function onresize() {
      layout.setupScreen();
    }

    document.onwebkitfullscreenchange = onresize;
    window.onresize = onresize;

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
