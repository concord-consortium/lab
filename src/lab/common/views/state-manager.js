/*global define, $ */

define(function () {
  return function StateManager(names) {
    var api,
        states = [],
        stateByName = {};

    api = {
      newState: function (stateName, stateDef) {
        var state = $.extend(true, {}, stateDef);
        names.forEach(function (v) {
          if (typeof state[v] === "undefined") {
            state[v] = [];
          }
        });
        states.push(state);
        stateByName[stateName] = state;
      },
      extendLastState: function (stateName, stateDef) {
        var state = $.extend(true, {}, states[states.length - 1], stateDef),
            objName;
        for (objName in state) {
          if (state.hasOwnProperty(objName)) {
            // Set all object that are undefined (or == null) in the new state
            // to [] (empty data set). So to keep previous object data, just
            // define it, but do not update anything.
            if (typeof stateDef[objName] === "undefined" || stateDef[objName] === null) {
              state[objName] = [];
            }
          }
        }
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
