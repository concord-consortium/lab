/*global define $ */

define(function (require) {
  // Dependencies.
  var ModelController   = require('common/controllers/model-controller'),
      Model             = require('sensor/modeler'),
      ModelContainer    = require('common/views/null-model-view'),
      ScriptingAPI      = function() {},
      Benchmarks        = function() {};

  return function (modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig, interactiveController) {
    return new ModelController(modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig, interactiveController,
                               Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});
