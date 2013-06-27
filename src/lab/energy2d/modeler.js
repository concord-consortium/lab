/*global define: false, d3: false */

define(function (require) {
  'use strict';
  var console         = require('common/console'),
      metadata        = require('energy2d/metadata'),
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
        coreModel,

        labModelerMixin = new LabModelerMixin({
          metadata: metadata,
          unitsDefinition: unitsDefinition,
          initialProperties: initialProperties,
          setters: {
            use_WebGL: function (v) {
              if (coreModel) {
                setWebGLEnabled(v);
              }
              ticksToGPUSync = model.properties.ticksPerGPUSync;
            },
            ticksPerGPUSync: function (v) {
              if (coreModel) syncGPU();
              ticksToGPUSync = Number(v); // support "Infinity" value
            }
          }
        }),
        propertySupport = labModelerMixin.propertySupport,
        dispatch = labModelerMixin.dispatchSupport,

        ticksToGPUSync = 0;

    function setWebGLEnabled(v) {
      try {
        coreModel.useWebGL(v);
      } catch (e) {
        console.warn("WebGL initialization failed. CPU solvers and rendering will be used.");
        console.warn(e.message);
      }
    }

    function syncGPU() {
      // In theory we should also call:
      // coreModel.syncVelocity();
      // However velocity array isn't used by any CPU-only visualization
      // (velocity arrows can be rendered using WebGL) and it isn't exposed
      // to the Scripting API. So for now there is no need to sync it.
      coreModel.syncTemperature();
    }

    model = {
      tick: function () {
        var i, len;
        for (i = 0, len = model.properties.timeStepsPerTick; i < len; i++) {
          coreModel.nextStep();
        }
        if (coreModel.isWebGLActive()) {
          if (ticksToGPUSync > 0) {
            ticksToGPUSync--;
          } else {
            syncGPU();
            ticksToGPUSync = Number(model.properties.ticksPerGPUSync); // support "Infinity" value
          }
        }
        model.updateAllOutputProperties();
        dispatch.tick();
      },

      syncTemperature: function () {
        propertySupport.invalidatingChangePreHook();
        coreModel.syncTemperature();
        propertySupport.invalidatingChangePostHook();
      },
      syncVelocity: function () {
        propertySupport.invalidatingChangePreHook();
        coreModel.syncVelocity();
        propertySupport.invalidatingChangePostHook();
      },

      getTime: function () {
        return model.properties.timeStep * coreModel.getIndexOfStep();
      },
      isWebGLActive: function () {
        return coreModel.isWebGLActive();
      },
      isWebGLCompatible: function() {
        return coreModel.isWebGLCompatible();
      },
      getWebGLError: function () {
        return coreModel.getWebGLError();
      },
      getIndexOfStep: function () {
        return coreModel.getIndexOfStep();
      },
      getTemperatureAt: function (x, y) {
        return coreModel.getTemperatureAt(x, y);
      },
      getAverageTemperatureAt: function (x, y) {
        return coreModel.getAverageTemperatureAt(x, y);
      },
      getTemperatureArray: function () {
        return coreModel.getTemperatureArray();
      },
      getTemperatureTexture: function () {
        return coreModel.getTemperatureTexture();
      },
      getUVelocityArray: function () {
        return coreModel.getUVelocityArray();
      },
      getVVelocityArray: function () {
        return coreModel.getVVelocityArray();
      },
      getVelocityTexture: function () {
        return coreModel.getVelocityTexture();
      },
      getPhotonsArray: function () {
        return coreModel.getPhotonsArray();
      },
      getPartsArray: function () {
        return coreModel.getPartsArray();
      },
      setPerformanceTools: function () {
        return coreModel.setPerformanceTools();
      }
    };

    (function () {
      labModelerMixin.mixInto(model);
      dispatch.addEventTypes("tick");

      coreModel = coremodel.makeCoreModel(model.properties);
      setWebGLEnabled(model.properties.use_WebGL);

      model.defineOutput('time', {
        label: "Time",
        unitType: 'time',
        format: '.2f'
      }, function() {
        return model.getTime();
      });

      model.defineOutput('displayTime', {
        label: "Time"
      }, (function() {
        var f = d3.format("02d");
        return function() {
          var time = model.getTime(),
              seconds, minutes, hours, days;
          time = Math.floor(time);
          seconds = time % 60;
          time = Math.floor(time / 60);
          minutes = time % 60;
          time = Math.floor(time / 60);
          hours = time % 24;
          time = Math.floor(time / 24);
          days = time;
          return days + ':' + f(hours) + ':' + f(minutes)  + ':' + f(seconds);
        };
      }()));
    }());

    return model;
  };
});
