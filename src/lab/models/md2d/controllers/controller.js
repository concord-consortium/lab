/*global
  define
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('models/md2d/models/modeler'),
      ModelContainer    = require('models/md2d/views/view'),
      ScriptingAPI      = require('models/md2d/controllers/scripting-api'),
      Benchmarks        = require('models/md2d/benchmarks/benchmarks');

  return function (modelUrl, modelOptions, interactiveController) {
    return new ModelController(modelUrl, modelOptions, interactiveController,
                               Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});
