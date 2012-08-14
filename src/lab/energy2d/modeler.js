/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

// TODO: Remove this, as it's redundant.
define(function (require) {
  'use strict';
  var coremodel = require('models/core-model');

  return function Modeler(options) {
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
      isWebGLActive: core_model.isWebGLActive,
      getWebGLError: core_model.getWebGLError,
      getIndexOfStep: core_model.getIndexOfStep,
      getGridWidth: core_model.getGridWidth,
      getGridHeight: core_model.getGridHeight,
      getTemperatureArray: core_model.getTemperatureArray,
      getTemperatureTexture: core_model.getTemperatureTexture,
      getUVelocityArray: core_model.getUVelocityArray,
      getVVelocityArray: core_model.getVVelocityArray,
      getVelocityTexture: core_model.getVelocityTexture,
      getPhotonsArray: core_model.getPhotonsArray,
      getPartsArray: core_model.getPartsArray,
      updateTemperatureArray: core_model.updateTemperatureArray,
      updateVelocityArrays: core_model.updateVelocityArrays,
      setPerformanceTools: core_model.setPerformanceTools
    };
  };
});
