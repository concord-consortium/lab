/*globals energy2d */
/*jslint indent: 2 */
// JSLint report: OK
//
// lab/models/energy2d/modeler.js
//

// Why not require('./engine/core-model.js')?
// This file is not browserified, only concatenated with browserified engine.
var coremodel = require('./core-model.js');

// define namespace
energy2d.namespace('energy2d.modeler');

energy2d.modeler.makeModeler = function (options) {
  'use strict';
  var core_model = coremodel.makeCoreModel(options);

  return {
    nextStep: function () {
      core_model.nextStep();
    },
    getWidth: function () {
      return core_model.getModelOptions().model_width;
    },
    getHeight: function () {
      return core_model.getModelOptions().model_height;
    },
    getTime: function () {
      return core_model.getModelOptions().timestep * core_model.getIndexOfStep();
    },
    getIndexOfStep: core_model.getIndexOfStep,
    getGridWidth: core_model.getGridWidth,
    getGridHeight: core_model.getGridHeight,
    getTemperatureArray: core_model.getTemperatureArray,
    getUVelocityArray: core_model.getUVelocityArray,
    getVVelocityArray: core_model.getVVelocityArray,
    getPhotonsArray: core_model.getPhotonsArray,
    getPartsArray: core_model.getPartsArray
  };
};
