/*global

  define
  DEVELOPMENT
  d3
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var Model             = require('md2d/models/modeler'),
      MoleculeContainer = require('md2d/views/molecule-container'),
      ModelPlayer       = require('cs!common/components/model_player');

  return function modelController(moleculeViewId, modelConfig, playerConfig) {
    var controller = {},

        // event dispatcher
        dispatch = d3.dispatch('modelReset'),

        viewOptions,

        moleculeContainer,

        // We pass this object to the "ModelPlayer" to intercept messages for the model
        // instead of allowing the ModelPlayer to talk to the model directly.
        // This allows us, for example, to reload the model instead of trying to call a 'reset' event
        // on models which don't know how to reset themselves.

        modelProxy = {
          resume: function() {
            model.resume();
          },

          stop: function() {
            model.stop();
          },

          reset: function() {
            model.stop();
            // if the model has a reset function then call it so anything the application
            // sets up outside the interactive itself that is listening for a model.reset
            // event gets notified. Example the Energy Graph Extra Item.
            if (model.reset) {
              model.reset();
            }
            reload(modelConfig, playerConfig);
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
      //   Molecular Model Setup
      //

      function createModel() {
        var meldOptions = function(base, overlay) {
          var p;
          for(p in base) {
            if (overlay[p] === undefined) {
              overlay[p] = base[p];
            } else if (typeof overlay[p] === "object") {
              overlay[p] = meldOptions(base[p], overlay[p]);
            }
          }
          return overlay;
        };

        // Merge view options defined in interactive (playerConfig)
        // with view options defined in the basic model description.
        viewOptions = meldOptions(modelConfig.viewOptions || {}, playerConfig);

        // Update view options in the basic model description after merge.
        // Note that many unnecessary options can be passed to Model constructor
        // because of that (e.g. view-only options defined in the interactive).
        // However, all options which are unknown for Model will be discarded
        // during options validation, so this is not a problem
        // (but significantly simplifies configuration).
        modelConfig.viewOptions = viewOptions;
        model = Model(modelConfig);
      }

      function setupModel() {
        createModel();
        model.resetTime();
        model.on('tick', tickHandler);
        model.on('addAtom', resetModelPlayer);
      }

      /**
        Returns a customized interface to the model for use by the view
      */
      function getModelInterface() {
        return {
          model:                   model,
          fit_to_parent:           viewOptions.fit_to_parent,
          xmax:                    modelConfig.width,
          ymax:                    modelConfig.height,
          keShading:               viewOptions.keShading,
          chargeShading:           viewOptions.chargeShading,
          velocityVectors:         viewOptions.velocityVectors,
          forceVectors:            viewOptions.forceVectors,
          atomTraceId:             viewOptions.atomTraceId,
          atomTraceColor:          viewOptions.atomTraceColor,
          enableAtomTooltips:      viewOptions.enableAtomTooltips,
          enableKeyboardHandlers:  viewOptions.enableKeyboardHandlers,
          images:                  viewOptions.images,
          interactiveUrl:          viewOptions.interactiveUrl,
          textBoxes:               viewOptions.textBoxes,
          imageMapping:            viewOptions.imageMapping,
          get_results:             function() { return model.get_results(); },
          get_radial_bond_results: function() { return model.get_radial_bond_results(); },
          get_radial_bonds:        function() { return model.get_radial_bonds(); },
          get_restraints:          function() { return model.get_restraints(); },
          get_obstacles:           function() { return model.get_obstacles(); },
          get_vdw_pairs:           function() { return model.get_vdw_pairs(); },
          set_atom_properties:     function() { return model.setAtomProperties.apply(model, arguments);  },
          is_stopped:              function() { return model.is_stopped(); },

          controlButtons:      viewOptions.controlButtons,
          modelTimeLabel:      viewOptions.modelTimeLabel
        };
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
        model_player.forward = function() {
          model.stepForward();
          if (!model.isNewStep()) {
            moleculeContainer.update_drawable_positions();
          }
        },
        model_player.back = function() {
          model.stepBack();
          moleculeContainer.update_drawable_positions();
        },

        moleculeContainer = MoleculeContainer(moleculeViewId, getModelInterface());

        moleculeContainer.updateMoleculeRadius();
        moleculeContainer.setup_drawables();
      }

      function resetModelPlayer() {

        // ------------------------------------------------------------
        //
        // reset player and container view for model
        //
        // ------------------------------------------------------------
        moleculeContainer.reset(getModelInterface());
        moleculeContainer.updateMoleculeRadius();
        moleculeContainer.setup_drawables();
      }

      /**
        Note: newModelConfig, newPlayerConfig are optional. Calling this without
        arguments will simply reload the current model.
      */
      function reload(newModelConfig, newPlayerConfig) {
        modelConfig = newModelConfig || modelConfig;
        playerConfig = newPlayerConfig || playerConfig;
        setupModel();
        resetModelPlayer();
        dispatch.modelReset();
      }

      function repaint() {
        moleculeContainer.setup_drawables();
      }

      // ------------------------------------------------------------
      //
      // Initial setup of this modelController:
      //
      // ------------------------------------------------------------

      if (typeof DEVELOPMENT === 'undefined') {
        try {
          setupModel();
        } catch(e) {
          alert(e);
          throw new Error(e);
        }
      } else {
        setupModel();
      }

      setupModelPlayer();
      dispatch.modelReset();

      // ------------------------------------------------------------
      //
      // Public methods
      //
      // ------------------------------------------------------------

      controller.on = function(type, listener) {
        dispatch.on(type, listener);
      };

      controller.reload = reload;
      controller.repaint = repaint;
      controller.moleculeContainer = moleculeContainer;

      return controller;
  };
});
