/*global define, $ */

define(function () {
  return function StateManager(names) {
    var api,
        states = [],
        stateByName = {};

    api = {
      newState: function (stateName, stateDef) {
        var state = $.extend(true, {}, stateDef);
        names.forEach(function (n) {
          if (typeof state[n] === "undefined") {
            state[n] = [];
          }
        });
        states.push(state);
        stateByName[stateName] = state;
      },
      extendLastState: function (stateName, stateDef) {
        var prevState = states[states.length - 1],
            state = {};

        names.forEach(function (n) {
          state[n] = [];
          if (typeof stateDef[n] !== "undefined") {
            // Array expected!
            stateDef[n].forEach(function (objDef, idx) {
              state[n].push($.extend(true, {}, prevState[n][idx], objDef));
            });
          }
        });
        states.push(state);
        stateByName[stateName] = state;
      },
      getState: function (name) {
        var orgState = stateByName[name],
            state = $.extend(true, {}, orgState),
            objName;
        for (objName in state) {
          if (state.hasOwnProperty(objName)) {
            state[objName].forEach(function (d, i) {
              var value;
              for (value in d) {
                if (typeof d[value] === "function") {
                  // Very important - evaluate function from original state
                  // object, not from copy! It can be important where two
                  // functions call each other. It should still work.
                  d[value] = orgState[objName][i][value]();
                }
              }
            });
          }
        }
        return state;
      }
    };
    return api;
  };
});
