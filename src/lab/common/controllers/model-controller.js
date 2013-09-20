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

    // ------------------------------------------------------------
    //
    // Create Model Player
    //
    // ------------------------------------------------------------
    function setupModelPlayer() {

      // ------------------------------------------------------------
      //
      // Create container view for model
      //
      // ------------------------------------------------------------
      modelContainer = new ModelContainer(model, controller.modelUrl);
    }

    /**
      Note: newModelConfig, newinteractiveViewConfig are optional. Calling this without
      arguments will simply reload the current model.
    */
    function reload(newModelUrl, newModelOptions, suppressEvents) {
      // Since we won't call model.reset() (instead, we will discard the model) we need to make sure
      // that the model knows to dispatch a willReset event.
      if (model.willReset) {
        model.willReset();
      }

      modelUrl = newModelUrl || modelUrl;
      modelOptions = newModelOptions || modelOptions;
      setupModel();
      modelContainer.bindModel(model, modelUrl);

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

      modelInDOM: function () {
        controller.modelContainer.setup();
      },

      state: function() {
        return model.serialize();
      },

      ScriptingAPI: ScriptingAPI,

      enableKeyboardHandlers: function () {
        return model.get("enableKeyboardHandlers");
      },

      /**
        Call this method once all post-load setup of the model object has been completed. It will
        cause the model to execute any post-load setup and issue its 'ready' event, if any.

        In general, this method must be called in order to put the model in a runnable state.
      */
      modelSetupComplete: function() {
        if (model.ready) {
          model.ready();
        }
        dispatch.modelSetupComplete();
      }

    };

    // ------------------------------------------------------------
    //
    // Initial setup of this modelController:
    //
    // ------------------------------------------------------------

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
      global.model = model;
    }

    benchmarks = new Benchmarks(controller);
    setupModelPlayer();
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
