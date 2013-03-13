/*global define, DEVELOPMENT, $, d3, alert, model: true, model_player: true */

define(function (require) {
  // Dependencies.
  var arrays            = require('arrays'),
      ModelPlayer       = require('cs!common/components/model_player');

  return function modelController(modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig,
                                  Model, ModelContainer, ScriptingAPI, Benchmarks) {
    var controller = {},

        // event dispatcher
        dispatch = d3.dispatch('modelReset'),

        // Options after processing performed by processOptions().
        modelOptions,
        viewOptions,

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
            reload(controller.modelUrl, modelConfig);
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
        controller.modelContainer.update();
      }


      function processOptions() {
        var meldOptions = function(base, overlay) {
          var p;
          for(p in base) {
            if (overlay[p] === undefined) {
              if (arrays.isArray(base[p])) {
                // Array.
                overlay[p] = $.extend(true, [], base[p]);
              } else if (typeof base[p] === "object") {
                // Object.
                overlay[p] = $.extend(true, {}, base[p]);
              } else {
                // Basic type.
                overlay[p] = base[p];
              }
            } else if (typeof overlay[p] === "object" && !(overlay[p] instanceof Array)) {
              overlay[p] = meldOptions(base[p], overlay[p]);
            }
          }
          return overlay;
        };

        // 1. Process view options.
        // Do not modify initial configuration.
        viewOptions = $.extend(true, {}, interactiveViewConfig);
        // Merge view options defined in interactive (interactiveViewConfig)
        // with view options defined in the basic model description.
        viewOptions = meldOptions(modelConfig.viewOptions || {}, viewOptions);

        // 2. Process model options.
        // Do not modify initial configuration.
        modelOptions = $.extend(true, {}, interactiveModelConfig);
        // Merge model options defined in interactive (interactiveModelConfig)
        // with the basic model description.
        modelOptions = meldOptions(modelConfig || {}, modelOptions);

        // Update view options in the basic model description after merge.
        // Note that many unnecessary options can be passed to Model constructor
        // because of that (e.g. view-only options defined in the interactive).
        // However, all options which are unknown for Model will be discarded
        // during options validation, so this is not a problem
        // (but significantly simplifies configuration).
        modelOptions.viewOptions = viewOptions;
      }

      // ------------------------------------------------------------
      //
      //   Benchmarks Setup
      //

      function setupBenchmarks() {
        controller.benchmarks = new Benchmarks(controller);
      }

      // ------------------------------------------------------------
      //
      //   Model Setup
      //

      function setupModel() {
        processOptions();
        model = new Model(modelOptions);
        model.resetTime();
        model.on('tick', tickHandler);
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
            controller.modelContainer.update();
          }
        };
        model_player.back = function() {
          model.stepBack();
          controller.modelContainer.update();
        };

        controller.modelContainer = new ModelContainer(controller.modelUrl, model);
      }

      function resetModelPlayer() {

        // ------------------------------------------------------------
        //
        // reset player and container view for model
        //
        // ------------------------------------------------------------
        controller.modelContainer.reset(controller.modelUrl, model);
      }

      /**
        Note: newModelConfig, newinteractiveViewConfig are optional. Calling this without
        arguments will simply reload the current model.
      */
      function reload(newModelUrl, newModelConfig, newInteractiveViewConfig, newInteractiveModelConfig) {
        controller.modelUrl = newModelUrl || controller.modelUrl;
        modelConfig = newModelConfig || modelConfig;
        interactiveViewConfig = newInteractiveViewConfig || interactiveViewConfig;
        interactiveModelConfig = newInteractiveModelConfig || interactiveModelConfig;
        setupModel();
        resetModelPlayer();
        dispatch.modelReset();
      }

      function repaint() {
        controller.modelContainer.repaint();
      }

      function resize() {
        controller.modelContainer.resize();
      }

      function state() {
        return model.serialize();
      }

      // ------------------------------------------------------------
      //
      // Public methods
      //
      // ------------------------------------------------------------

      controller.on = function(type, listener) {
        dispatch.on(type, listener);
      };

      controller.getViewContainer = function () {
        return controller.modelContainer.$el;
      };

      controller.getHeightForWidth = function (width) {
        return controller.modelContainer.getHeightForWidth(width);
      };

      controller.setPlaybackContainer = function (svgPlaybackContainer) {
        return controller.modelContainer.setPlaybackContainer(svgPlaybackContainer);
      }

      controller.reload = reload;
      controller.repaint = repaint;
      controller.resize = resize;
      controller.state = state;
      controller.ScriptingAPI = ScriptingAPI;

      // ------------------------------------------------------------
      //
      // Public variables
      //
      // ------------------------------------------------------------
      controller.modelContainer = null;
      controller.benchmarks = null;
      controller.type = Model.type;
      controller.modelUrl = modelUrl;

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

      setupBenchmarks();
      setupModelPlayer();
      dispatch.modelReset();

      return controller;
  };
});
