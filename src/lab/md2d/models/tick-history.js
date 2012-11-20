/*global define: false */
/*jslint onevar: true devel:true eqnull: true */

define(function(require) {

  return function TickHistory(modelState, model, size) {
    var tickHistory = {},
        initialState,
        list,
        listState,
        defaultSize = 1000;

    function newState() {
      return { input: {}, state: [], parameters: {} };
    }

    function reset() {
      list = [];
      listState = {
        // Equal to list.length:
        length: 0,
        // Drop oldest state in order to keep list no longer than this:
        maxSize: size,
        // Index into `list` of the current state:
        index: -1,
        // Total length of "total history" (counting valid history states that have been dropped)
        counter: -1,
        // Index in "total history" of the oldest state in the list.
        // Invariant: counter == index + startCounter
        startCounter: 0
      };
    }

    function copyModelState(destination) {
      var i,
          prop,
          state,
          parameters,
          name;

      // save model input properties
      for (i = 0; i < modelState.input.length; i++) {
        prop = modelState.input[i];
        destination.input[prop] = model.get(prop);
      }

      // save model parameters
      parameters = modelState.parameters;
      for (name in parameters) {
        if (parameters.hasOwnProperty(name) && parameters[name].isDefined) {
          destination.parameters[name] = model.get(name);
        }
      }

      // save model objects defining state
      state = modelState.state;
      for (i = 0; i < state.length; i++) {
        destination.state[i] = state[i].clone();
      }
    }

    /** Copy the current model state into the list at list[listState.index+1] and updates listState.
        Removes any (now-invalid) states in the list that come after the newly pushed state.
    */
    function push() {
      var lastState = newState();

      copyModelState(lastState);
      list[listState.index+1] = lastState;

      // Drop the oldest state if we went over the max list size
      if (list.length > listState.maxSize) {
        list.splice(0,1);
        listState.startCounter++;
      } else {
        listState.index++;
      }
      listState.counter = listState.index + listState.startCounter;

      invalidateFollowingState();
      listState.length = list.length;
    }

    /** Invalidate (remove) all history after current index. For example, after seeking backwards
        and then pushing new state */
    function invalidateFollowingState() {
      list.length = listState.index+1;
      listState.length = list.length;
    }

    function extract(savedState) {
      var i,
          prop,
          setter,
          state;

      // restore model input properties
      model.set(savedState.input);

      // restore parameters
      model.restoreParameters(savedState.parameters);

      // restore model objects defining state
      state = savedState.state;
      for (i = 0; i < state.length; i++) {
        modelState.state[i].restore(state[i]);
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
      var i;
      if (typeof ptr === 'number') {
        i = ptr;
      } else {
        i = listState.index;
      }
      checkIndexArg(i);
      return list[i];
    };

    tickHistory.extract = function(ptr) {
      var i;
      if (typeof ptr === 'number') {
        i = ptr;
      } else {
        i = listState.index;
      }
      checkIndexArg(i);
      extract(list[i]);
    };

    tickHistory.restoreInitialState = function() {
      reset();
      extract(initialState);
      push();
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
      if (ptr < listState.startCounter) ptr = listState.startCounter;
      if (ptr >= listState.startCounter + listState.length) ptr = listState.startCounter + listState.length - 1;
      listState.counter = ptr;
      listState.index = ptr - listState.startCounter;
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
    if (size == null) size = defaultSize;
    initialState = newState();
    copyModelState(initialState);

    reset();
    push();
    return tickHistory;
  };
});
