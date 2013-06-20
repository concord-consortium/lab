/*global define: false */

define(function (require) {
  'use strict';
  var metadata        = require('energy2d/metadata'),
      validator       = require('common/validator'),
      coremodel       = require('energy2d/models/core-model'),
      LabModelerMixin = require('common/lab-modeler-mixin'),

      unitsDefinition = {
        units: {
          time: {
            name: "second",
            pluralName: "seconds",
            symbol: "s"
          }
        }
      };

  return function Modeler(initialProperties) {
    var model,
        core_model,

        labModelerMixin = new LabModelerMixin({
          metadata: metadata,
          unitsDefinition: unitsDefinition,
          initialProperties: initialProperties
        }),
        dispatch = labModelerMixin.dispatchSupport;

    model = {
      tick: function () {
        var i, len;

        for (i = 0, len = model.properties.timeStepsPerTick; i < len; i++) {
          core_model.nextStep();
        }
        model.updateAllOutputProperties();
        dispatch.tick();
      },

      getTime: function () {
        return model.properties.timestep * core_model.getIndexOfStep();
      },
      isWebGLActive: function () {
        return core_model.isWebGLActive();
      },
      getWebGLError: function () {
        return core_model.getWebGLError();
      },
      getIndexOfStep: function () {
        return core_model.getIndexOfStep();
      },
      getTemperatureArray: function () {
        return core_model.getTemperatureArray();
      },
      getTemperatureTexture: function () {
        return core_model.getTemperatureTexture();
      },
      getUVelocityArray: function () {
        return core_model.getUVelocityArray();
      },
      getVVelocityArray: function () {
        return core_model.getVVelocityArray();
      },
      getVelocityTexture: function () {
        return core_model.getVelocityTexture();
      },
      getPhotonsArray: function () {
        return core_model.getPhotonsArray();
      },
      getPartsArray: function () {
        return core_model.getPartsArray();
      },
      updateTemperatureArray: function () {
        return core_model.updateTemperatureArray();
      },
      updateVelocityArrays: function () {
        return core_model.updateVelocityArrays();
      },
      setPerformanceTools: function () {
        return core_model.setPerformanceTools();
      }
    };

    (function () {
      labModelerMixin.mixInto(model);
      dispatch.addEventTypes("tick");

      core_model = coremodel.makeCoreModel(model.properties);

      model.defineOutput('time', {
        label: "Time",
        unitType: 'time',
        format: '.2f'
      }, function() {
        return model.getTime();
      });

      model.defineOutput('displayTime', {
        label: "Time",
        unitType: 'time',
        format: '.2f'
      }, function() {
        return model.getTime();
      });
    }());

    return model;
  };
});
