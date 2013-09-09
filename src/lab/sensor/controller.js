/*global define */

define(function (require) {
  // Dependencies.
  var ModelController   = require('common/controllers/model-controller'),
      Model             = require('sensor/modeler'),
      ModelContainer    = require('sensor/view'),
      ScriptingAPI      = function() {},
      Benchmarks        = function() {};

  return function (modelUrl, modelOptions, interactiveController) {
    var controller = new ModelController(modelUrl, modelOptions, interactiveController,
      Model, ModelContainer, ScriptingAPI, Benchmarks);

    // Note to self: modelController doesn't emit modelLoaded when the model first loads.
    // This was unexpected...

    function setupModelObservers() {
      var model = controller.model;

      model.addObserver('isSensorInitializing', function() {
        var view = controller.modelContainer;

        if (model.properties.isSensorInitializing) {
          view.showInitializationProgress();
        } else {
          view.hideInitializationProgress();
        }
      });
    }

    setupModelObservers();
    controller.on('modelLoaded.sensor-model-controller', setupModelObservers);

    return controller;
  };
});
