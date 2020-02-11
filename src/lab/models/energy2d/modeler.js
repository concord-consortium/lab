/*global define: false, d3: false */

import $__common_alert from 'common/alert';
import $__common_console from 'common/console';
import $__common_validator from 'common/validator';
import $__common_serialize from 'common/serialize';
import $__common_performance from 'common/performance';
import $__common_lab_modeler_mixin from 'common/lab-modeler-mixin';
import $__models_energy_d_metadata from 'models/energy2d/metadata';
import { makeCoreModel } from 'models/energy2d/models/core-model';

var alert = $__common_alert,
  console = $__common_console,
  validator = $__common_validator,
  serialize = $__common_serialize,
  performance = $__common_performance,
  LabModelerMixin = $__common_lab_modeler_mixin,
  metadata = $__models_energy_d_metadata,

  unitsDefinition = {
    units: {
      time: {
        name: "second",
        pluralName: "seconds",
        symbol: "s"
      },
      temperature: {
        name: "degree Celsius",
        pluralName: "degrees Celsius",
        symbol: "°C"
      },
      length: {
        name: "meter",
        pluralName: "meters",
        symbol: "m"
      },
      velocity: {
        name: "meter per second",
        pluralName: "meters per second",
        symbol: "m/s"
      }
    }
  },

  energy2dModelCount = 0;


export default function Modeler(initialProperties) {
  var model,
    coreModel,
    namespace = "energy2dModel" + (++energy2dModelCount),

    labModelerMixin = new LabModelerMixin({
      metadata: metadata,
      unitsDefinition: unitsDefinition,
      initialProperties: initialProperties,
      setters: {
        use_WebGL: function(v) {
          if (coreModel) {
            setWebGLEnabled(v);
          }
          ticksToGPUSync = model.properties.ticksPerGPUSync;
        },
        ticksPerGPUSync: function(v) {
          if (coreModel) syncGPU();
          ticksToGPUSync = Number(v); // support "Infinity" value
        }
      }
    }),
    propertySupport = labModelerMixin.propertySupport,
    dispatch = labModelerMixin.dispatchSupport,

    ticksToGPUSync = 0,

    // Sensors are modeler-level objects, they only define outputs
    // and have nothing to do with physics calculations.
    sensors = [],
    anemometers = [],

    viewModel = {
      parts: [],
      sensors: []
    },

    updatePartsViewModel = (function() {
      function PartWrapper(rawPart) {
        Object.defineProperty(this, '_rawPart', {
          enumerable: false,
          get: function() {
            return rawPart;
          }
        });
      }
      Object.keys(metadata.part).forEach(function(key) {
        Object.defineProperty(PartWrapper.prototype, key, {
          enumerable: true,
          get: function() {
            return this._rawPart[key];
          },
          set: function(v) {
            var WebGLOrg = model.properties.use_WebGL;
            // This will update CPU array.
            model.properties.use_WebGL = false;

            propertySupport.invalidatingChangePreHook();

            // Update raw part object.
            this._rawPart[key] = validator.validateSingleProperty(metadata.part[key], key, v);

            if (model.isStopped()) {
              // Recalculate all arrays, "authoring" mode.
              coreModel.reset();
            } else {
              // Update core model arrays based on part's properties.
              coreModel.partsChanged(this._rawPart, key);
            }

            propertySupport.invalidatingChangePostHook();

            // Restore original WebGL option value. It will
            // copy CPU arrays to GPU in case of need.
            model.properties.use_WebGL = WebGLOrg;
            dispatch.partsChanged();
          }
        });
      });
      PartWrapper.prototype.computeLabel = function() {
        return this._rawPart.getLabel();
      };

      return function() {
        var rawParts = coreModel.getPartsArray(),
          viewParts = viewModel.parts,
          i, len;
        viewParts.length = 0;
        for (i = 0, len = rawParts.length; i < len; i++) {
          viewParts.push(new PartWrapper(rawParts[i]));
        }
      };
    }()),

    updateSensorViewModel = (function() {
      function SensorWrapper(rawObj) {
        Object.defineProperty(this, '_rawObj', {
          enumerable: false,
          get: function() {
            return rawObj;
          }
        });
      }
      var constraint = {
        x: function(v) {
          return Math.max(0, Math.min(model.properties.model_width, v));
        },
        y: function(v) {
          return Math.max(0, Math.min(model.properties.model_height, v));
        }
      };
      Object.keys(metadata.sensor).forEach(function(key) {
        Object.defineProperty(SensorWrapper.prototype, key, {
          enumerable: true,
          get: function() {
            return this._rawObj[key];
          },
          set: function(v) {
            propertySupport.invalidatingChangePreHook();
            v = constraint[key] ? constraint[key](v) : v;
            this._rawObj[key] = validator.validateSingleProperty(metadata.sensor[key], key, v);
            propertySupport.invalidatingChangePostHook();
            dispatch.sensorsChanged();
          }
        });
      });

      return function() {
        var viewSensors = viewModel.sensors,
          i, len;
        viewSensors.length = 0;
        for (i = 0, len = sensors.length; i < len; i++) {
          viewSensors.push(new SensorWrapper(sensors[i]));
        }
      };
    }());

  function setWebGLEnabled(v) {
    try {
      coreModel.useWebGL(v);
    } catch (e) {
      console.warn("WebGL initialization failed. CPU solvers and rendering will be used.");
      console.warn(e.message);
    }
  }

  function syncGPU() {
    coreModel.syncTemperature();
    coreModel.syncVelocity();
  }

  function hasDiverged() {
    var t = model.getTemperatureArray(),
      i, len;

    for (i = 0, len = t.length; i < len; i++) {
      if (isNaN(t[i]) || Math.abs(t[i]) > 1e10) {
        model.stop();
        coreModel.reset();
        return true;
      }
    }
    return false;
  }

  function validateParts(partsArray) {
    var result = [];
    partsArray.forEach(function(v) {
      result.push(validator.validateCompleteness(metadata.part, v));
    });
    return result;
  }

  function createSensors(sensorsSpec) {
    var sensorValue = {
        thermometer: function() {
          return model.getTemperatureAt(this.x, this.y);
        },
        anemometer: function() {
          return this._rot;
        },
        heatFlux: function() {
          var flux = model.getHeatFluxAt(this.x, this.y);
          return flux[0] * this._sin + flux[1] * this._cos;
        }
      },
      sensorOutputDesc = {
        thermometer: {
          label: "Temperature",
          unitType: 'temperature',
          format: '.1f'
        },
        anemometer: {},
        heatFlux: {
          label: "Heat Flux",
          unitName: "Watt Per Square Meter",
          unitPluralName: "Watts Per Square Meter",
          unitAbbreviation: "W/m²",
          format: '.1f'
        }
      };

    sensors = [];
    sensorsSpec.forEach(function(s, idx) {
      s = validator.validateCompleteness(metadata.sensor, s);
      if (s.type === "anemometer") {
        s._rot = 0;
        anemometers.push(s);
      }
      if (s.type === "heatFlux") {
        s.angle = s.angle || 0;
        s._sin = Math.sin(-s.angle * Math.PI / 180);
        s._cos = Math.cos(s.angle * Math.PI / 180);
      }
      Object.defineProperty(s, "value", {
        enumerable: true,
        get: sensorValue[s.type]
      });
      sensors.push(s);

      model.defineOutput("sensor-" + idx, sensorOutputDesc[s.type], function() {
        return s.value;
      });
    });
  }

  function updateAnemometers() {
    var a, i, len;
    for (i = 0, len = anemometers.length; i < len; i++) {
      a = anemometers[i];
      a._rot += model.getSpeedAt(a.x, a.y) * (model.getVorticityAt(a.x, a.y) < 0 ? -1 : 1) *
        model.properties.timeStep * 700;
      a._rot = a._rot % 360;
    }
  }

  model = {
    namespace: namespace,

    tick: function() {
      var i, len, diverged;

      performance.enterScope("engine");
      for (i = 0, len = model.properties.timeStepsPerTick; i < len; i++) {
        coreModel.nextStep();
      }
      performance.leaveScope("engine");

      if (coreModel.isWebGLActive()) {
        if (ticksToGPUSync > 0) {
          ticksToGPUSync--;
        } else {
          syncGPU();
          ticksToGPUSync = Number(model.properties.ticksPerGPUSync); // support "Infinity" value
          diverged = hasDiverged();
        }
      } else {
        diverged = hasDiverged();
      }
      updateAnemometers();
      model.updateAllOutputProperties();
      dispatch.tick();

      if (diverged) {
        alert("The model has diverged and has been reset!\n\nTry changing its parameters " +
          "(e.g. 'timeStep', positions of parts etc.) or reload it to restore the initial configuration.");
      }
    },

    syncTemperature: function() {
      propertySupport.invalidatingChangePreHook();
      coreModel.syncTemperature();
      propertySupport.invalidatingChangePostHook();
    },
    syncVelocity: function() {
      propertySupport.invalidatingChangePreHook();
      coreModel.syncVelocity();
      propertySupport.invalidatingChangePostHook();
    },

    addPart: function(props) {
      var WebGLOrg = model.properties.use_WebGL;

      // This will update CPU array.
      model.properties.use_WebGL = false;

      props = validator.validateCompleteness(metadata.part, props);

      propertySupport.invalidatingChangePreHook();

      coreModel.addPart(props);
      updatePartsViewModel();

      propertySupport.invalidatingChangePostHook();

      // Restore original WebGL option value. It will
      // copy CPU arrays to GPU in case of need.
      model.properties.use_WebGL = WebGLOrg;
      dispatch.partsChanged();
    },

    removePart: function(i) {
      var WebGLOrg = model.properties.use_WebGL;

      // This will update CPU array.
      model.properties.use_WebGL = false;

      propertySupport.invalidatingChangePreHook();

      coreModel.removePart(i);
      updatePartsViewModel();

      propertySupport.invalidatingChangePostHook();

      // Restore original WebGL option value. It will
      // copy CPU arrays to GPU in case of need.
      model.properties.use_WebGL = WebGLOrg;
      dispatch.partsChanged();
    },

    // Beware. The "reset" button in Lab interactives do not call this method. Instead they "reload"
    // the model, discarding this model object and creating a new one from the model JSON.
    reset: function() {
      dispatch.willReset();
      propertySupport.invalidatingChangePreHook();

      model.stop();
      coreModel.reset();

      var parts;
      // Validate parts before passing options to coreModel.
      if (initialProperties.structure && initialProperties.structure.part) {
        parts = validateParts(initialProperties.structure.part);
      }
      coreModel = makeCoreModel(model.properties, parts);
      setWebGLEnabled(model.properties.use_WebGL);
      if (initialProperties.sensors) {
        createSensors(initialProperties.sensors);
      }
      updatePartsViewModel();
      updateSensorViewModel();

      propertySupport.invalidatingChangePostHook();
      model.resetAllOutputProperties();
      dispatch.reset();
      dispatch.invalidation();
    },

    stepCounter: function() {
      return coreModel.getIndexOfStep();
    },
    isNewStep: function() {
      return true;
    },
    stepBack: function(num) {
      return coreModel.getIndexOfStep();
    },
    stepForward: function(num) {
      if (!arguments.length) {
        num = 1;
      }
      if (!this.isStopped()) {
        this.stop();
      }
      var i = -1;
      while (++i < num) {
        model.tick();
      }
      return coreModel.getIndexOfStep();
    },
    getTime: function() {
      return model.properties.timeStep * coreModel.getIndexOfStep();
    },
    isWebGLActive: function() {
      return coreModel.isWebGLActive();
    },
    isWebGLCompatible: function() {
      return coreModel.isWebGLCompatible();
    },
    getWebGLError: function() {
      return coreModel.getWebGLError();
    },
    getIndexOfStep: function() {
      return coreModel.getIndexOfStep();
    },
    getTemperatureAt: function(x, y) {
      return coreModel.getTemperatureAt(x, y);
    },
    getAverageTemperatureAt: function(x, y) {
      return coreModel.getAverageTemperatureAt(x, y);
    },
    getVorticityAt: function(x, y) {
      return coreModel.getVorticityAt(x, y);
    },
    getHeatFluxAt: function(x, y) {
      return coreModel.getHeatFluxAt(x, y);
    },
    getAverageVorticityAt: function(x, y) {
      return coreModel.getAverageVorticityAt(x, y);
    },
    getSpeedAt: function(x, y) {
      return coreModel.getSpeedAt(x, y);
    },
    getTemperatureArray: function() {
      return coreModel.getTemperatureArray();
    },
    getTemperatureTexture: function() {
      return coreModel.getTemperatureTexture();
    },
    getUVelocityArray: function() {
      return coreModel.getUVelocityArray();
    },
    getVVelocityArray: function() {
      return coreModel.getVVelocityArray();
    },
    getVelocityTexture: function() {
      return coreModel.getVelocityTexture();
    },
    getPhotonsArray: function() {
      return coreModel.getPhotonsArray();
    },

    getPartsArray: function() {
      return viewModel.parts;
    },

    getSensorsArray: function() {
      return viewModel.sensors;
    },

    serialize: function() {
      var propCopy = {},
        rawProperties = propertySupport.rawValues;

      propCopy = serialize(metadata.mainProperties, rawProperties);
      propCopy.viewOptions = serialize(metadata.viewOptions, rawProperties);

      propCopy.structure = {
        part: []
      };
      viewModel.parts.forEach(function(p) {
        propCopy.structure.part.push(serialize(metadata.part, p));
      });

      propCopy.sensors = [];
      viewModel.sensors.forEach(function(s) {
        propCopy.sensors.push(serialize(metadata.sensor, s));
      });

      return propCopy;
    }
  };

  (function() {
    var parts;

    labModelerMixin.mixInto(model);
    dispatch.addEventTypes("tick", "partsChanged", "sensorsChanged");

    // Validate parts before passing options to coreModel.
    if (initialProperties.structure && initialProperties.structure.part) {
      parts = validateParts(initialProperties.structure.part);
    }

    coreModel = makeCoreModel(model.properties, parts);
    setWebGLEnabled(model.properties.use_WebGL);

    if (initialProperties.sensors) {
      createSensors(initialProperties.sensors);
    }

    updatePartsViewModel();
    updateSensorViewModel();

    // FIXME. More yuck: We still need a pattern for recompute model properties which don't depend
    // on physics (and which therefore can be recomputed without invalidating and recomputing all
    // the physics based properties) while still making them (1) observable and (2) read-only.

    // used to triggers recomputation of isPlayable property based on isStopped and isReady:
    model.on('play.model', recomputeProperties);
    model.on('stop.model', recomputeProperties);

    function recomputeProperties() {
      propertySupport.invalidatingChangePreHook();
      propertySupport.invalidatingChangePostHook();
    }

    // Temporal workaround. In fact width and height should
    // be outputs based on min / max.
    model.defineOutput('minX', {}, function() {
      return 0;
    });
    model.defineOutput('minY', {}, function() {
      return 0;
    });
    model.defineOutput('maxX', {}, function() {
      return model.properties.model_width;
    });
    model.defineOutput('maxY', {}, function() {
      return model.properties.model_height;
    });

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
        return days + ':' + f(hours) + ':' + f(minutes) + ':' + f(seconds);
      };
    }()));

    (function() {
      var hasPlayed = false;
      model.on('play.has-played-support', function() {
        hasPlayed = true;
      });
      model.on('reset.has-played-support', function() {
        hasPlayed = false;
      });
      model.defineOutput('hasPlayed', {
        label: "has Played"
      }, function() {
        return hasPlayed;
      });
    }());
  }());

  return model;
};
