/*global define $ */

define(function (require) {
  // Dependencies.
  var ModelController   = require('common/controllers/model-controller'),
      Model             = require('iframe-model/modeler'),
      ModelContainer    = require('iframe-model/iframe-container'),
      ScriptingAPI      = function() {},
      Benchmarks        = function() {};

  return function (modelUrl, modelOptions, interactiveController) {
    return new ModelController(modelUrl, modelOptions, interactiveController,
                               Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});
