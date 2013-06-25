/*global define: false, d3: false, model: true */

define(function (require) {
  // Dependencies.
  var Model          = require('energy2d/modeler'),
      ModelContainer = require('energy2d/views/model-container'),
      Benchmarks     = require('energy2d/benchmarks/benchmarks'),
      ScriptingAPI   = require('energy2d/controllers/scripting-api');

  return function (modelUrl, modelOptions) {

    var api = {},
        dispatch = d3.dispatch('modelLoaded');

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
        return true;
      },

      reload: function (newModelUrl, newModelOptions) {
        api.modelUrl = newModelUrl || api.modelUrl;
        modelOptions = newModelOptions || modelOptions;

        model = new Model(modelOptions);
        api.modelContainer.bindModel(model);

        dispatch.modelLoaded();
      },

      state: function () {
        return null;
      },

      ScriptingAPI: ScriptingAPI
    };

    api.benchmarks = new Benchmarks(api);

    // Export 'model' to global namespace.
    model = new Model(modelOptions);
    api.modelContainer.bindModel(model);

    return api;
  };
});
