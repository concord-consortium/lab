/*global define, d3, alert, model: true */

define(function (require) {

  var labConfig = require('lab.config');

  function ModelController(modelUrl, modelOptions, interactivesController,
                                  Model, ModelContainer, ScriptingAPI, Benchmarks) {
    var controller = {},

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
      controller.modelContainer.update();
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
      repaint();
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
      controller.modelContainer = new ModelContainer(model, controller.modelUrl);
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

      controller.modelUrl = newModelUrl || controller.modelUrl;
      modelOptions = newModelOptions || modelOptions;
      setupModel();
      controller.modelContainer.bindModel(model, controller.modelUrl);

      if (!suppressEvents) {
        dispatch.modelLoaded(ModelController.LOAD_CAUSE.RELOAD);
      }
    }

    function reset(cause) {
      model.stop();
      // use the resetCause closure var to make the cause (which the model doesn't know about)
      // available to resetHandler()
      resetCause = cause;
      model.reset();
      resetCause = undefined;
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

    controller.getHeightForWidth = function (width, fontSizeChanged) {
      return controller.modelContainer.getHeightForWidth(width, fontSizeChanged);
    };

    controller.enableKeyboardHandlers = function () {
      return model.get("enableKeyboardHandlers");
    };

    controller.modelInDOM = function () {
      controller.modelContainer.setup();
    };

    /**
      Call this method once all post-load setup of the model object has been completed. It will
      cause the model to execute any post-load setup and issue its 'ready' event, if any.

      In general, this method must be called in order to put the model in a runnable state.
    */
    controller.modelSetupComplete = function() {
      if (model.ready) {
        model.ready();
      }
      dispatch.modelSetupComplete();
    };

    controller.updateView = function() {
      controller.modelContainer.update();
    };

    controller.reload = reload;
    controller.reset = reset;
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

    if (labConfig.environment === 'production') {
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
