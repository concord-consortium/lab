/*global define $ */

define(function (require) {
  // Dependencies.
  var ModelController   = require("common/controllers/model-controller"),
      Model             = require('signal-generator/modeler'),

      ModelContainer    = function() {
        return  {
          $el: $("<div id='model-container' class='container'/>"),
          getHeightForWidth: function() { return 0; },
          resize: function() {},
          reset: function() {},
          update: function() {}
        };
      },

      ScriptingAPI      = function() {},
      Benchmarks        = function() {};

  return function (modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig, interactiveController) {
    return new ModelController(modelUrl, modelConfig, interactiveViewConfig, interactiveModelConfig, interactiveController,
                               Model, ModelContainer, ScriptingAPI, Benchmarks);
  };
});
