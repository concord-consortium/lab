/*global define */

import $__common_controllers_model_controller from 'common/controllers/model-controller';
import $__models_iframe_modeler from 'models/iframe/modeler';
import $__models_iframe_iframe_container from 'models/iframe/iframe-container';
import $__models_iframe_scripting_api from 'models/iframe/scripting-api';
// Dependencies.
var ModelController = $__common_controllers_model_controller,
  Model = $__models_iframe_modeler,
  ModelContainer = $__models_iframe_iframe_container,
  ScriptingAPI = $__models_iframe_scripting_api;

export default function(modelUrl, modelOptions, interactiveController) {
  return new ModelController(modelUrl, modelOptions, interactiveController,
    Model, ModelContainer, ScriptingAPI);
};
