/*global
  define
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('models/solar-system/models/modeler'),
      ModelContainer    = require('models/solar-system/views/view'),
      ScriptingAPI      = require('models/solar-system/controllers/scripting-api'),
      Benchmarks        = require('models/solar-system/benchmarks/benchmarks');

  return function (modelUrl, modelOptions, interactiveController) {
    return new ModelController(modelUrl, modelOptions, interactiveController,
                                     Model, ModelContainer, ScriptingAPI, Benchmarks);
  }
});
