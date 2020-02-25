
import ModelController from 'common/controllers/model-controller';
import Model from 'models/signal-generator/modeler';
import ModelContainer from 'common/views/null-model-view';
// Dependencies.
var ScriptingAPI = function() {};

export default function(modelUrl, modelOptions, interactiveController) {
  return new ModelController(modelUrl, modelOptions, interactiveController,
    Model, ModelContainer, ScriptingAPI);
};
