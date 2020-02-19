import ModelController from "common/controllers/model-controller";
import Model from 'models/energy2d/modeler';
import ModelContainer from 'models/energy2d/views/view';
import Benchmarks from 'models/energy2d/benchmarks/benchmarks';
import ScriptingAPI from 'models/energy2d/controllers/scripting-api';

export default function(modelUrl, modelOptions, interactiveController) {
  return new ModelController(modelUrl, modelOptions, interactiveController,
    Model, ModelContainer, ScriptingAPI, Benchmarks);
}
