import ModelController from "common/controllers/model-controller";
import Model from 'models/md2d/models/modeler';
import ModelContainer from 'models/md2d/views/view';
import ScriptingAPI from 'models/md2d/controllers/scripting-api';
import Benchmarks from 'models/md2d/benchmarks/benchmarks';

export default function(modelUrl, modelOptions, interactiveController) {
  return new ModelController(modelUrl, modelOptions, interactiveController,
    Model, ModelContainer, ScriptingAPI, Benchmarks);
}
