/*global define */

// A Verlet list (named after Loup Verlet) is a data structure in molecular dynamics simulations
// to efficiently maintain a list of all particles within a given cut-off distance of each other.
// See: http://en.wikipedia.org/wiki/Verlet_list

define(function (require) {
  // Dependencies.
  var arrays     = require('arrays'),
      arrayTypes = require('common/array-types');

  return function NeighborList(atomsNum, maxDisplacement) {
    var api,
        maxAtomsNum,
        listIdx,
        listCapacity,
        list,
        head,
        tail,
        x,
        y,
        forceUpdate,

        init = function () {
          // Keep maximum capacity of lists bigger than actual number of atoms.
          maxAtomsNum = atomsNum + 10;
          listIdx = 0;
          listCapacity = maxAtomsNum * (maxAtomsNum - 1) / 2;
          forceUpdate = true;

          list = arrays.create(listCapacity, 0, arrayTypes.int16Type);
          head = arrays.create(maxAtomsNum, -1, arrayTypes.int16Type);
          tail = arrays.create(maxAtomsNum, -1, arrayTypes.int16Type);
          // Fill x and y with Infinity, so shouldUpdate(..)
          // will return true during first call after initialization.
          x    = arrays.create(maxAtomsNum, Infinity, arrayTypes.floatType);
          y    = arrays.create(maxAtomsNum, Infinity, arrayTypes.floatType);
        };

    init();

    // Public API.
    api = {
      reinitialize: function (newAtomsNum, newMaxDisplacement) {
        atomsNum = newAtomsNum;
        maxDisplacement = newMaxDisplacement;
        forceUpdate = true;

        if (atomsNum > maxAtomsNum) {
          init();
        }
      },
      clear: function () {
        var i;
        listIdx = 0;
        for (i = 0; i < atomsNum; i++) {
          head[i] = tail[i] = -1;
        }
      },
      getList: function () {
        return list;
      },
      markNeighbors: function (i, j) {
        if (head[i] < 0) {
          head[i] = listIdx;
        }
        list[listIdx] = j;
        listIdx++;
        tail[i] = listIdx;
      },
      getStartIdxFor: function (i) {
        return head[i];
      },
      getEndIdxFor: function (i) {
        return tail[i];
      },
      saveAtomPosition: function (i, xCoord, yCoord) {
        x[i] = xCoord;
        y[i] = yCoord;
      },
      invalidate: function () {
        forceUpdate = true;
      },
      shouldUpdate: function (newX, newY) {
        var maxDx = -Infinity,
            maxDy = -Infinity,
            i;

        if (forceUpdate) {
          forceUpdate = false;
          return true;
        }

        for (i = 0; i < atomsNum; i++) {
          if (Math.abs(newX[i] - x[i]) > maxDx) {
            maxDx = Math.abs(newX[i] - x[i]);
          }
          if (Math.abs(newY[i] - y[i]) > maxDy) {
            maxDy = Math.abs(newY[i] - y[i]);
          }
        }

        return Math.sqrt(maxDx * maxDx + maxDy * maxDy) > maxDisplacement;
      }
    };

    return api;
  };

});
