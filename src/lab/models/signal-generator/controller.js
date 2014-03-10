/*global define */

define(function (require) {
  // Dependencies.
  var ModelController   = require('common/controllers/model-controller'),
      Model             = require('models/signal-generator/modeler'),
      ModelContainer    = require('common/views/null-model-view'),
      ScriptingAPI      = function() {};

  return function (modelUrl, modelOptions, interactiveController) {
    return new ModelController(modelUrl, modelOptions, interactiveController,
                               Model, ModelContainer, ScriptingAPI);
  };
});
