/*global define: false, d3: false, $: false */
/*jslint onevar: true devel:true eqnull: true */

define(function(require) {
  // Dependencies.
  var arrays  = require('arrays');

  return function TickHistory(modelState, outputState, model, engineSetTimeCallback, size) {
    var tickHistory = {},
        initialState,
        list = [],
        listState = {
          maxSize: size,
          index: 0,
          counter: 0,
          startCounter: 0,
          length: 0
        },
        defaultSize = 1000;

    function newState() {
      return { input: {}, output: {}, state: [] };
    }

    function reset() {
      list = [];
      listState.index = 0;
      listState.counter = 0;
    }

    function copyModelState(destination) {
      var i,
          prop,
          state;

      // save model input properties
      for (i = 0; i < modelState.input.length; i++) {
        prop = modelState.input[i];
        destination.input[prop] = model.get(prop);
      }
      // save model array state values
      state = modelState.state;
      for (i = 0; i < state.length; i++) {
        destination.state[i] = {};
        for (prop in state[i]) {
          if (state[i].hasOwnProperty(prop)) {
            destination.state[i][prop] = arrays.clone(state[i][prop]);
          }
        }
      }
      // save model output properties
      for (i = 0; i < modelState.output.length; i++) {
        prop = modelState.output[i];
        destination.output[prop] = outputState[prop];
      }
    }

    function push() {
      var prop,
          state,
          listItem,
          i;

      list.push(newState());
      listState.index++;
      listState.counter++;
      copyModelState(list[listState.index]);
      listState.length = list.length;
      if (listState.length > listState.maxSize) {
        list.splice(1,1);
        listState.length = list.length;
        listState.index = listState.maxSize-1;
        listState.startCounter++;
      }
    }

    function extract(savedState) {
      var i,
          prop,
          setter,
          state;

      // restore model input properties
      for (prop in savedState.input) {
        if (savedState.input.hasOwnProperty(prop) && model.hasOwnProperty(prop)) {
          setter = {};
          setter[prop] = savedState.input[prop];
          model.set(setter);
        }
      }
      // restore model array state values
      state = savedState.state;
      for (i = 0; i < state.length; i++) {
        for (prop in state[i]) {
          if (state[i].hasOwnProperty(prop)) {
            arrays.copy(state[i][prop], modelState.state[i][prop]);
          }
        }
      }
      // restore model output properties
      for (prop in savedState.output) {
        if (savedState.output.hasOwnProperty(prop) && outputState.hasOwnProperty(prop)) {
          outputState[prop] = savedState.output[prop];
        }
      }
      // reset model engine time
      if (typeof savedState.output.time === "number" && typeof engineSetTimeCallback === 'function') {
        engineSetTimeCallback(savedState.output.time);
      }
    }

    function checkIndexArg(index) {
      if (index < 0) {
        throw new Error("TickHistory: extract index [" + index + "] less than 0");
      }
      if (index >= list.length) {
        throw new Error("TickHistory: extract index [" + index + "] greater than list.length: " + list.length);
      }
      return index;
    }

    //
    // Public methods
    //
    tickHistory.isEmpty = function() {
      return listState.index === 0;
    };

    tickHistory.push = function() {
      push();
    };

    tickHistory.returnTick = function(ptr) {
      var i = ptr || listState.index;
      checkIndexArg(i);
      return list[i];
    };

    tickHistory.extract = function(ptr) {
      var i = ptr || listState.index;
      checkIndexArg(i);
      extract(list[i]);
    };

    tickHistory.restoreInitialState = function() {
      reset();
      extract(initialState);
      list[0] = newState();
      copyModelState(list[0]);
    };

    tickHistory.reset = function() {
      reset();
    };

    tickHistory.decrementExtract = function() {
      if (listState.counter > listState.startCounter) {
        listState.index--;
        listState.counter--;
        extract(list[listState.index]);
      }
    };

    tickHistory.incrementExtract = function() {
      listState.index++;
      listState.counter++;
      extract(list[listState.index]);
    };

    tickHistory.seekExtract = function(ptr) {
      listState.index = ptr;
      listState.counter = ptr;
      extract(list[listState.index]);
    };

    tickHistory.get = function(key) {
      return listState[key];
    };

    tickHistory.set = function(key, val) {
      return listState[key] = val;
    };

    //
    // Initialization
    //
    if (typeof listState.maxSize === 'undefined') listState.maxSize = defaultSize;

    initialState = newState();
    copyModelState(initialState);
    reset();
    list[0] = newState();
    copyModelState(list[0]);

    return tickHistory;

  };
});
