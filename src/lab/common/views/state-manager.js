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
        return stateByName[name];
      }
    };
    return api;
  };
});
