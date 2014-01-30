/*global define */

define(function (require) {
  // Dependencies.
  var ModelController   = require('common/controllers/model-controller'),
      Model             = require('./modeler'),
      ModelContainer    = require('./view'),
      ScriptingAPI      = require('./scripting-api'),
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

      model.addObserver('sensorReading', function() {
        // if the model is running, the tick handler will take care of it
        if (model.isStopped()) {
          controller.updateView();
        }
      });

      model.addObserver('needsReload', function() {
        if (model.properties.needsReload) {
          interactiveController.reloadModel();
        }
      });

      model.addPropertyDescriptionObserver('sensorReading', function() {
        var description = model.getPropertyDescription('sensorReading');
        var view = controller.modelContainer;

        view.updateUnits(description.getUnitAbbreviation());
      });
    }

    interactiveController.on('modelLoaded.sensor-model-controller', setupModelObservers);

    interactiveController.on('modelReset.sensor-model-controller', function() {
      controller.model.set('isNewRunInProgress', false);
    });

    interactiveController.on('willResetModel', function() {
      controller.model.set('isNewRunInProgress', true);
    });

    return controller;
  };
});
