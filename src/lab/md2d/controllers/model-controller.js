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


      function processOptions() {
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

        // Setup size of the container for view.
        viewOptions.xmax = modelConfig.width;
        viewOptions.ymax = modelConfig.height;

        // Move images and textBoxes the from model config to view options.
        viewOptions.images    = modelConfig.images;
        viewOptions.textBoxes = modelConfig.textBoxes;
        // This is not necessary (images and textBoxes properties would be
        // discarded by the properties validator), however clearly shows
        // that images and text boxes should be specified in viewOptions.
        // TODO: move images and textBoxes definition to viewOptions!
        delete modelConfig.images;
        delete modelConfig.textBoxes;

        // Update view options in the basic model description after merge.
        // Note that many unnecessary options can be passed to Model constructor
        // because of that (e.g. view-only options defined in the interactive).
        // However, all options which are unknown for Model will be discarded
        // during options validation, so this is not a problem
        // (but significantly simplifies configuration).
        modelConfig.viewOptions = viewOptions;
      }

      // ------------------------------------------------------------
      //
      //   Molecular Model Setup
      //

      function setupModel() {
        processOptions();
        model = new Model(modelConfig);
        model.resetTime();
        model.on('tick', tickHandler);
        model.on('addAtom', resetModelPlayer);
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

        moleculeContainer = new MoleculeContainer(moleculeViewId, viewOptions, model);

        moleculeContainer.updateMoleculeRadius();
        moleculeContainer.setup_drawables();
      }

      function resetModelPlayer() {

        // ------------------------------------------------------------
        //
        // reset player and container view for model
        //
        // ------------------------------------------------------------
        moleculeContainer.reset(viewOptions, model);
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
