/*global
  define
*/
/*jslint onevar: true*/
import $__common_controllers_model_controller from "common/controllers/model-controller";
import $__models_md_d_models_modeler from 'models/md2d/models/modeler';
import $__models_md_d_views_view from 'models/md2d/views/view';
import $__models_md_d_controllers_scripting_api from 'models/md2d/controllers/scripting-api';
import $__models_md_d_benchmarks_benchmarks from 'models/md2d/benchmarks/benchmarks';
// Dependencies.
var ModelController = $__common_controllers_model_controller,
  Model = $__models_md_d_models_modeler,
  ModelContainer = $__models_md_d_views_view,
  ScriptingAPI = $__models_md_d_controllers_scripting_api,
  Benchmarks = $__models_md_d_benchmarks_benchmarks;

export default function(modelUrl, modelOptions, interactiveController) {
  return new ModelController(modelUrl, modelOptions, interactiveController,
    Model, ModelContainer, ScriptingAPI, Benchmarks);
};
