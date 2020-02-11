/*global
  define
*/
/*jslint onevar: true*/
import $__common_controllers_model_controller from "common/controllers/model-controller";
import $__models_energy_d_modeler from 'models/energy2d/modeler';
import $__models_energy_d_views_view from 'models/energy2d/views/view';
import $__models_energy_d_benchmarks_benchmarks from 'models/energy2d/benchmarks/benchmarks';
import $__models_energy_d_controllers_scripting_api from 'models/energy2d/controllers/scripting-api';
// Dependencies.
var ModelController = $__common_controllers_model_controller,
  Model = $__models_energy_d_modeler,
  ModelContainer = $__models_energy_d_views_view,
  Benchmarks = $__models_energy_d_benchmarks_benchmarks,
  ScriptingAPI = $__models_energy_d_controllers_scripting_api;

export default function(modelUrl, modelOptions, interactiveController) {
  return new ModelController(modelUrl, modelOptions, interactiveController,
    Model, ModelContainer, ScriptingAPI, Benchmarks);
};

