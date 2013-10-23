/*global
  define
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('models/energy2d/modeler'),
      ModelContainer    = require('models/energy2d/views/view'),
      Benchmarks        = require('models/energy2d/benchmarks/benchmarks'),
      ScriptingAPI      = require('models/energy2d/controllers/scripting-api');

  return function (modelUrl, modelOptions, interactiveController) {
    return new ModelController(modelUrl, modelOptions, interactiveController,
                               Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});

