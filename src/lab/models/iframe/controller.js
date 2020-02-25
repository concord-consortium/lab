
import ModelController from 'common/controllers/model-controller';
import Model from 'models/iframe/modeler';
import ModelContainer from 'models/iframe/iframe-container';
import ScriptingAPI from 'models/iframe/scripting-api';
// Dependencies.

export default function(modelUrl, modelOptions, interactiveController) {
  return new ModelController(modelUrl, modelOptions, interactiveController,
    Model, ModelContainer, ScriptingAPI);
};
