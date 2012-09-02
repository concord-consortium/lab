/*global

  controllers
  Lab
  modeler
  ModelPlayer
  DEVELOPMENT
  d3
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
controllers.modelController = function(moleculeViewId, modelConfig, playerConfig) {
  var controller = {},

      // event dispatcher
      dispatch = d3.dispatch('modelReset'),

      // properties read from the playerConfig hash
      controlButtons,
      modelTimeLabel,
      fit_to_parent,

      // properties read from the modelConfig hash
      elements,
      atoms,
      mol_number,
      temperature_control,
      temperature,
      width,
      height,
      chargeShading,
      showVDWLines,
      radialBonds,
      obstacles,

      moleculeContainer,

      // We pass this object to the "ModelPlayer" to intercept messages for the model
      // instead of allowing the ModelPlayer to talk to the model directly.
      // In particular, we want to treat seek(1) as a reset event
      modelProxy = {
        resume: function() {
          model.resume();
        },

        stop: function() {
          model.stop();
        },

        reset: function() {
          model.stop();
          model.reset();
        },

        seek: function(n) {
          // Special case assumption: This is to intercept the "reset" button
          // of PlaybackComponentSVG, which calls seek(1) on the ModelPlayer
          if (n === 1) {
            reload(modelConfig, playerConfig);
          }
        },

        is_stopped: function() {
          return model.is_stopped();
        }
      };

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------
    function tickHandler() {
      moleculeContainer.update_drawable_positions();
    }


    // ------------------------------------------------------------
    //
    // Initialize (or update) local variables based on playerConfig and modelConfig objects
    //
    // ------------------------------------------------------------

    function initializeLocalVariables() {
      controlButtons      = playerConfig.controlButtons;
      modelTimeLabel      = playerConfig.modelTimeLabel;
      enableAtomTooltips  = playerConfig.enableAtomTooltips || false;
      fit_to_parent       = playerConfig.fit_to_parent;

      elements            = modelConfig.elements;
      atoms               = modelConfig.atoms;
      mol_number          = modelConfig.mol_number;
      temperature_control = modelConfig.temperature_control;
      temperature         = modelConfig.temperature;
      width               = modelConfig.width;
      height              = modelConfig.height;
      chargeShading       = modelConfig.chargeShading;
      showVDWLines        = modelConfig.showVDWLines;
      radialBonds         = modelConfig.radialBonds;
      obstacles           = modelConfig.obstacles;
      viscosity           = modelConfig.viscosity;
      gravitationalField  = modelConfig.gravitationalField;
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
          temperature         : temperature,
          temperature_control : temperature_control,
          width               : width,
          height              : height,
          chargeShading       : chargeShading,
          showVDWLines        : showVDWLines,
          viscosity           : viscosity,
          gravitationalField  : gravitationalField
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

      dispatch.modelReset();
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

      model_player = new ModelPlayer(modelProxy, false);
      // disable its 'forward' and 'back' actions:
      model_player.forward = function() {},
      model_player.back = function() {},

      moleculeContainer = Lab.moleculeContainer(moleculeViewId, {
        fit_to_parent:        fit_to_parent,
        xmax:                 width,
        ymax:                 height,
        chargeShading:        chargeShading,
        enableAtomTooltips:   enableAtomTooltips,
        get_radial_bonds:     function() { return model.get_radial_bonds(); },
        get_nodes:            function() { return model.get_nodes(); },
        get_num_atoms:        function() { return model.get_num_atoms(); },
        get_obstacles:        function() { return model.get_obstacles(); },
        set_atom_properties:  function() { return model.setAtomProperties.apply(model, arguments);  },
        is_stopped:           function() { return model.is_stopped() },

        controlButtons:      controlButtons,
        modelTimeLabel:      modelTimeLabel
      });

      moleculeContainer.updateMoleculeRadius();
      moleculeContainer.setup_drawables();
    }

    function resetModelPlayer() {

      // ------------------------------------------------------------
      //
      // reset player and container view for model
      //
      // ------------------------------------------------------------

      moleculeContainer.reset({
        fit_to_parent:        fit_to_parent,
        xmax:                 width,
        ymax:                 height,
        chargeShading:        chargeShading,
        get_radial_bonds:     function() { return model.get_radial_bonds(); },
        get_nodes:            function() { return model.get_nodes(); },
        get_num_atoms:        function() { return model.get_num_atoms(); },
        get_obstacles:        function() { return model.get_obstacles(); },
        set_atom_properties:  function() { return model.setAtomProperties.apply(model, arguments); },
        is_stopped:           function() { return model.is_stopped() },

        controlButtons:      controlButtons,
        modelTimeLabel:      modelTimeLabel
      });
      moleculeContainer.updateMoleculeRadius();
      moleculeContainer.setup_drawables();
    }


    // ------------------------------------------------------------
    //
    //   Molecular Model Setup
    //

    function setupModel() {
      model.resetTime();
      model.stop();
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

    /**
      Note: newModelConfig, newPlayerConfig are optional. Calling this without
      arguments will simply reload the current model.
    */
    function reload(newModelConfig, newPlayerConfig) {
      modelConfig = newModelConfig || modelConfig;
      playerConfig = newPlayerConfig || playerConfig;
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
    // Public methods
    //
    // ------------------------------------------------------------

    controller.on = function(type, listener) {
      dispatch.on(type, listener);
    };
    controller.reload = reload;
    controller.moleculeContainer = moleculeContainer;

    return controller;
};
