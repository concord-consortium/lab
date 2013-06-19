/*global
  define
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('solar-system/models/modeler'),
      ModelContainer    = require('solar-system/views/view'),
      ScriptingAPI      = require('solar-system/controllers/scripting-api'),
      Benchmarks        = require('solar-system/benchmarks/benchmarks');

  return function (modelUrl, modelOptions, interactiveController) {
    return new ModelController(modelUrl, modelOptions, interactiveController,
                                     Model, ModelContainer, ScriptingAPI, Benchmarks);
  }
});
