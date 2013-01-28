/*global
  define
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('pta/models/modeler'),
      ModelContainer    = require('pta/views/view'),
      ScriptingAPI      = require('pta/controllers/scripting-api'),
      Benchmarks        = require('pta/benchmarks/benchmarks');

  return function (modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig, interactiveController) {
    return new ModelController(modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig, interactiveController,
                                     Model, ModelContainer, ScriptingAPI, Benchmarks);
  }
});
