/*global define */

import $__common_controllers_model_controller from 'common/controllers/model-controller';
import $__models_signal_generator_modeler from 'models/signal-generator/modeler';
import $__common_views_null_model_view from 'common/views/null-model-view';
// Dependencies.
var ModelController = $__common_controllers_model_controller,
  Model = $__models_signal_generator_modeler,
  ModelContainer = $__common_views_null_model_view,
  ScriptingAPI = function() {};

export default function(modelUrl, modelOptions, interactiveController) {
  return new ModelController(modelUrl, modelOptions, interactiveController,
    Model, ModelContainer, ScriptingAPI);
};
