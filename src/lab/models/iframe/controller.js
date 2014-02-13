/*global define */

define(function (require) {
  // Dependencies.
  var ModelController   = require('common/controllers/model-controller'),
      Model             = require('models/iframe/modeler'),
      ModelContainer    = require('models/iframe/iframe-container'),
      ScriptingAPI      = require('models/iframe/scripting-api'),
      Benchmarks        = function() {};

  return function (modelUrl, modelOptions, interactiveController) {
    return new ModelController(modelUrl, modelOptions, interactiveController,
                               Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});
