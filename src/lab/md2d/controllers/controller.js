/*global
  define
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('md2d/models/modeler'),
      ModelContainer    = require('md2d/views/molecule-container'),
      ScriptingAPI      = require('md2d/controllers/scripting-api'),
      Benchmarks        = require('md2d/benchmarks/benchmarks');

  return function (modelViewId, modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig) {
    return new ModelController(modelViewId, modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig,
                                     Model, ModelContainer, ScriptingAPI, Benchmarks);
  }
});
