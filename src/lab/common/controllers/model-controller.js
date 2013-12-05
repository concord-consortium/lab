/*global define, d3, alert */

define(function (require) {

  var labConfig   = require('lab.config'),
      performance = require('common/performance');

  var global = (function() { return this; }());

  function ModelController(modelUrl, modelOptions, interactivesController,
                           Model, ModelContainer, ScriptingAPI, Benchmarks) {
    var controller,
        model,
        benchmarks,
        modelContainer,

        // Used to track cause of model reset, if known; required to be kept in this closure because
        // it doesn't get passed directly to our model.reset handler
        resetCause,

        // event dispatcher
        dispatch = d3.dispatch('modelLoaded', 'modelReset', 'modelSetupComplete');

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------
    function tickHandler() {
      performance.enterScope("js-rendering");
      controller.modelContainer.update();
      performance.leaveScope("js-rendering");
    }

    // ------------------------------------------------------------
    //
    //   Model Setup
    // ------------------------------------------------------------
    function setupModel() {
      model = new Model(modelOptions, {
        waitForSetup: true
      });
      model.on('tick.modelController', tickHandler);
      model.on('reset.modelController', resetHandler);
    }

    function resetHandler() {
      // Just use the generic cause, "reset", if no more specific cause of the model reset is
      // available.
      resetCause = resetCause || ModelController.RESET_CAUSE.RESET;
      modelContainer.repaint();
      dispatch.modelReset(resetCause);
    }

    /**
      Note: newModelConfig, newinteractiveViewConfig are optional. Calling this without
      arguments will simply reload the current model.
    */
    // REF TODO rename to load
    function reload(newModelUrl, newModelOptions, suppressEvents) {
      // Since we won't call model.reset() (instead, we will discard the model) we need to make sure
      // that the model knows to dispatch a willReset event.
      if (model && model.willReset) {
        model.willReset();
      }

      modelUrl = newModelUrl || modelUrl;
      modelOptions = newModelOptions || modelOptions;
      setupModel();

      if (modelContainer) {
        modelContainer.bindModel(model, modelUrl);
      } else {
        modelContainer = new ModelContainer(model, controller.modelUrl);
      }

      if (!suppressEvents) {
        dispatch.modelLoaded(ModelController.LOAD_CAUSE.RELOAD);
      }

    }

    // ------------------------------------------------------------
    //
    // Public methods
    //
    // ------------------------------------------------------------

    controller = {

      get type() {
        return Model.type;
      },
      get benchmarks() {
        return benchmarks;
      },
      get modelUrl() {
        return modelUrl;
      },
      get model() {
        return model;
      },
      get modelContainer() {
        return modelContainer;
      },

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      getViewContainer: function () {
        return controller.modelContainer.$el;
      },

      getHeightForWidth: function (width, fontSizeChanged) {
        return controller.modelContainer.getHeightForWidth(width, fontSizeChanged);
      },

      /**
        Initializes the model-type-specific renderer within the model container and asks it to
        render.

        The model will not be rendered to the screen until this method is called. For their part,
        renderers should ignore render() and repaint() calls before they have been setup by calling
        this method.

        Call this when the  when the model is ready to be rendered (ie the container has been laid
        out and resized) and again after a new model has been bound to the container and
        has been initialized to the point that it is ready to render.
      */
      initializeView: function() {
        controller.modelContainer.setup();
        controller.modelContainer.repaint();
      },

      resize: function () {
        controller.modelContainer.resize();
      },

      repaint: function () {
        controller.modelContainer.repaint();
      },

      updateView: function() {
        controller.modelContainer.update();
      },

      reload: reload,

      reset: function (cause) {
        model.stop();
        // use the resetCause closure var to make the cause (which the model doesn't know about)
        // available to resetHandler()
        resetCause = cause;
        model.reset();
        resetCause = undefined;
      },

      state: function() {
        return model.serialize();
      },

      ScriptingAPI: ScriptingAPI,

      enableKeyboardHandlers: function () {
        return model.get("enableKeyboardHandlers");
      }
    };

    // ------------------------------------------------------------
    //
    // Initial setup of this modelController:
    //
    // ------------------------------------------------------------

    // REF TODO ugly
    if (modelOptions != null) {
      if (labConfig.environment === 'production') {
        try {
          setupModel();
        } catch(e) {
          alert(e);
          throw new Error(e);
        }
      } else {
        setupModel();
        // publish model so it can be inspected at console
        global.getModel = function() {
          return model;
        };
      }
    }

    benchmarks = new Benchmarks(controller);
    return controller;
  }

  ModelController.LOAD_CAUSE = {
    RELOAD: 'reload',
    INITIAL_LOAD: 'initialLoad'
  };

  ModelController.RESET_CAUSE = {
    RESET: 'reset'
  };

  return ModelController;
});
