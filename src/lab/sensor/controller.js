/*global define $ */

define(function (require) {
  // Dependencies.
  var ModelController   = require('common/controllers/model-controller'),
      Model             = require('sensor/modeler'),
      ModelContainer    = require('sensor/view'),
      ScriptingAPI      = function() {},
      Benchmarks        = function() {};

  return function (modelUrl, modelOptions, interactiveController) {
    return new ModelController(modelUrl, modelOptions, interactiveController,
                               Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});
