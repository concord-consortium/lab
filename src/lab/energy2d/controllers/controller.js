/*global define: false, $: false, d3: false, model: true */

define(function (require) {
  // Dependencies.
  var Model          = require('energy2d/modeler'),
      ModelContainer = require('energy2d/views/model-container'),
      arrays         = require('arrays');

  return function (modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig) {

    var api = {},
        // Options after processing performed by processOptions().
        modelOptions,
        viewOptions,

        dispatch = d3.dispatch('modelLoaded');

    // TODO FIXME: this should be moved to InteractiveController!
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

    api = {
      type: "energy2d",
      benchmarks: null,
      modelUrl: modelUrl,
      modelContainer: new ModelContainer(),

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      getViewContainer: function () {
        return api.modelContainer.$el;
      },

      getHeightForWidth: function (width) {
        return api.modelContainer.getHeightForWidth(width);
      },

      resize: function () {
        api.modelContainer.resize();
      },

      repaint: function () {
        api.modelContainer.repaint();
      },

      enableKeyboardHandlers: function () {
        return false;
      },

      reload: function (newModelUrl, newModelConfig, newInteractiveViewConfig, newInteractiveModelConfig) {
        api.modelUrl = newModelUrl || api.modelUrl;
        modelConfig = newModelConfig || modelConfig;
        interactiveViewConfig = newInteractiveViewConfig || interactiveViewConfig;
        interactiveModelConfig = newInteractiveModelConfig || interactiveModelConfig;
        processOptions();
        model = new Model(modelOptions);
        api.modelContainer.bindModel(model, viewOptions);

        dispatch.modelLoaded();
      },

      state: function () {
        return null;
      },

      ScriptingAPI: function () {}
    };

    processOptions();
    // Export 'model' to global namespace.
    model = new Model(modelOptions);
    api.modelContainer.bindModel(model);

    return api;
  };
});
