/*global define */

// Special structure for keeping pressure probes data.
// Buffers store historical values used during interpolation
// (running average).

define(function (require) {
  // Dependencies.
  var arrays = require('arrays'),

      PRESSURE_BUFFERS_LEN = 50,
      ARRAY_TYPE = 'Float32Array';

  return function PressureBuffers() {
    var api,
        obstaclesData,
        obstaclesCount,
        pressureBuffers = {};

    // Public API.
    api = {
      // This function always validates all buffers and create
      // new if it's necessary (e.g. when obstacle was added).
      // To read final, interpolated pressure value in Bar, call this function:
      // getPressureFromProbe(i, name)
      // where 'obstacleIdx' is an index of obstacle containing this probe
      // and 'probeName' is: 'west', 'north', 'east', 'south'.
      initialize: function(newObstaclesData, newObstaclesCount) {
        var i;

        obstaclesData  = newObstaclesData;
        obstaclesCount = newObstaclesCount;

        for (i = 0; i < obstaclesCount; i++) {
          if (obstaclesData.westProbe[i]) {
            pressureBuffers[i] = pressureBuffers[i] || {};
            pressureBuffers[i].west = pressureBuffers[i].west || arrays.create(PRESSURE_BUFFERS_LEN, 0, ARRAY_TYPE);
            pressureBuffers[i].westIdx = pressureBuffers[i].westIdx || 0;
          }
          if (obstaclesData.northProbe[i]) {
            pressureBuffers[i] = pressureBuffers[i] || {};
            pressureBuffers[i].north = pressureBuffers[i].north || arrays.create(PRESSURE_BUFFERS_LEN, 0, ARRAY_TYPE);
            pressureBuffers[i].northIdx = pressureBuffers[i].northIdx || 0;
          }
          if (obstaclesData.eastProbe[i]) {
            pressureBuffers[i] = pressureBuffers[i] || {};
            pressureBuffers[i].east = pressureBuffers[i].east || arrays.create(PRESSURE_BUFFERS_LEN, 0, ARRAY_TYPE);
            pressureBuffers[i].eastIdx = pressureBuffers[i].eastIdx || 0;
          }
          if (obstaclesData.southProbe[i]) {
            pressureBuffers[i] = pressureBuffers[i] || {};
            pressureBuffers[i].south = pressureBuffers[i].south || arrays.create(PRESSURE_BUFFERS_LEN, 0, ARRAY_TYPE);
            pressureBuffers[i].southIdx = pressureBuffers[i].southIdx || 0;
          }
        }
      },

      // Returns final, interpolated pressure value in Bar.
      // 'obstacleIdx' is an index of obstacle containing desired probe,
      // 'probeName' is: 'west', 'north', 'east', 'south'.
      getPressureFromProbe: function (obstacleIdx, probeName) {
        var dim;

        if (pressureBuffers[obstacleIdx]            === undefined ||
            pressureBuffers[obstacleIdx][probeName] === undefined) {
          throw new Error("Pressure buffers for obstacle " + obstacleIdx +
                          " and side " + probeName + " doesn't exist");
        }

        if (probeName === 'west' || probeName === 'east')
          dim = obstaclesData.height[obstacleIdx];
        else
          dim = obstaclesData.width[obstacleIdx];

        // Classic MW converts impulses 2mv/dt to pressure in Bar using constant: 1666667.
        // See: the header of org.concord.mw2d.models.RectangularObstacle.
        // However, Classic MW also uses different units for mass and length:
        // - 120amu instead of 1amu,
        // - 0.1A instead of 1nm.
        // We should convert mass, velocity and obstacle height to Next Gen units.
        // Length units reduce themselves (velocity divided by height or width), only mass is left.
        // So, divide classic MW constant 1666667 by 120 - the result is 13888.89.
        // [ There is unit module available, however for reduction of computational cost,
        // include conversion in the pressure constant, especially considering the fact that
        // conversion from 120amu to amu is quite simple. ]
        return arrays.average(pressureBuffers[obstacleIdx][probeName]) *
          13888.89 / dim;
      },

      // Update special pressure buffers.
      updateBuffers: function(duration) {
        var i;
        for (i = 0; i < obstaclesCount; i++) {
          if (obstaclesData.westProbe[i]) {
            pressureBuffers[i].west[pressureBuffers[i].westIdx++] = obstaclesData.wProbeValue[i] / duration;
            obstaclesData.wProbeValue[i] = 0;
            if (pressureBuffers[i].westIdx > PRESSURE_BUFFERS_LEN) {
              pressureBuffers[i].westIdx = 0;
            }
          }
          if (obstaclesData.northProbe[i]) {
            pressureBuffers[i].north[pressureBuffers[i].northIdx++] = obstaclesData.nProbeValue[i] / duration;
            obstaclesData.nProbeValue[i] = 0;
            if (pressureBuffers[i].northIdx > PRESSURE_BUFFERS_LEN) {
              pressureBuffers[i].northIdx = 0;
            }
          }
          if (obstaclesData.eastProbe[i]) {
            pressureBuffers[i].east[pressureBuffers[i].eastIdx++] = obstaclesData.eProbeValue[i] / duration;
            obstaclesData.eProbeValue[i] = 0;
            if (pressureBuffers[i].eastIdx > PRESSURE_BUFFERS_LEN) {
              pressureBuffers[i].eastIdx = 0;
            }
          }
          if (obstaclesData.southProbe[i]) {
            pressureBuffers[i].south[pressureBuffers[i].southIdx++] = obstaclesData.sProbeValue[i] / duration;
            obstaclesData.sProbeValue[i] = 0;
            if (pressureBuffers[i].southIdx > PRESSURE_BUFFERS_LEN) {
              pressureBuffers[i].southIdx = 0;
            }
          }
        }
      },

      obstacleRemoved: function(idx) {
        var i;
        if (obstaclesCount > 0) {
          obstaclesCount--;
          for (i = idx; i < obstaclesCount; i++) {
            pressureBuffers[i] = pressureBuffers[i+1];
          }
          delete pressureBuffers[obstaclesCount];
        }
      },

      // ######################################################################
      //            Interface for saving and restoring internal state.

      // Clone current state of buffers.
      clone: function() {
        var copy = {},
            i, bufs, prop;

        // Iterate over all properties.
        for (i in pressureBuffers) {
          if (pressureBuffers.hasOwnProperty(i)) {
            bufs = pressureBuffers[i];
            copy[i] = {};
            for (prop in bufs) {
              if (bufs.hasOwnProperty(prop)) {
                if (typeof bufs[prop] === 'number') {
                  // Buffer index.
                  copy[i][prop] = bufs[prop];
                } else {
                  // Buffer array.
                  copy[i][prop] = arrays.clone(bufs[prop]);
                }
              }
            }
          }
        }

        return copy;
      },

      restore: function (state) {
        pressureBuffers = state;
      }

      // ######################################################################
    };

    return api;
  };

});
