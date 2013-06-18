/* global define */

define(function (require) {
  // Dependencies.
  var ModelController   = require('common/controllers/model-controller'),
      Model             = require('energy2d/modeler'),
      ModelContainer    = require('energy2d/views/view'),
      ScriptingAPI      = function() {},
      Benchmarks        = function() {};

  return function (modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig, interactiveController) {
    return new ModelController(modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig, interactiveController,
                               Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});
