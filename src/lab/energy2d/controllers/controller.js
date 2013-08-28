/*global define: false, d3: false, model: true */

define(function (require) {
  // Dependencies.
  var Model          = require('energy2d/modeler'),
      SVGContainer   = require('common/views/svg-container'),
      Renderer       = require('energy2d/views/renderer'),
      Benchmarks     = require('energy2d/benchmarks/benchmarks'),
      ScriptingAPI   = require('energy2d/controllers/scripting-api');

  return function (modelUrl, modelOptions) {
    // Export model to global namespace;
    model = new Model(modelOptions);

    var api,
        dispatch = d3.dispatch('modelLoaded', 'modelReset'),
        modelContainer = new SVGContainer(model, modelUrl, Renderer, {origin: 'top-left'}),
        benchmarks;

    api = {
      get type() {
        return "energy2d";
      },
      get benchmarks() {
        return benchmarks;
      },
      get modelUrl() {
        return modelUrl;
      },
      get modelContainer() {
        return modelContainer;
      },

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
        return true;
      },

      reload: function (newModelUrl, newModelOptions, suppressEvents) {
        api.modelUrl = newModelUrl || api.modelUrl;
        modelOptions = newModelOptions || modelOptions;

        model = new Model(modelOptions);
        api.modelContainer.bindModel(model);

        if (!suppressEvents) dispatch.modelLoaded();
      },

      /**
        Note: suppressEvents optional.
      */
      reset: function (suppressEvents) {
        model.stop();
        model.reset();
        if (!suppressEvents) {
          dispatch.modelReset();
        }
      },

      modelInDOM: function () {
        api.modelContainer.setup();
      },

      state: function () {
        return model.serialize();
      },

      ScriptingAPI: ScriptingAPI
    };

    benchmarks = new Benchmarks(api);

    return api;
  };
});
