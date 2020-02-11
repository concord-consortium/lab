/*global define: false */

/**
  Class which handles tick history. It supports saving and restoring state
  of core state objects defined by the modeler and engine. However, while
  adding a new object which should also be saved in tick history, consider
  utilization of "external objects" - this is special object which should
  implement TickHistoryCompatible Interface:
    #setHistoryLength(number)
    #push()
    #extract(index)
    #invalidate(index)

    Note that index argument is *always* limited to [0, historyLength) range.

  "External objects" handle changes of the current step itself. TickHistory
  only sends requests to perform various operations. To register new
  external object use #registerExternalObject(object) method.

  It allows to decentralize management of tick history and tight coupling
  TickTistory with API of various objects.
*/
export default function TickHistory(modelState, model, size) {
  var tickHistory = {},
    initialState,
    list,
    listState,
    defaultSize = 1000,
    // List of objects defining TickHistoryCompatible Interface.
    externalObjects = [],

    // Provide the "old" interface for models that don't use PropertySupport yet, but provide
    // a different, new interface for models using PropertySupport for their parameters, etc.
    // Such models are smart enough to send a single hash of raw property values for all the
    // properties (parameters, main properties, view properties, etc) we need to save. Older
    // models need to provide us with separate lists of "regular" properties and parameters,
    // with their own separate restore callbacks.
    //
    //     ***      Remember to remove this when all models use PropertySupport!        ***
    //
    useNewInterface = !!modelState.getProperties;

  function newState() {
    return {
      input: {},
      state: [],
      parameters: {}
    };
  }

  function reset() {
    var i;

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
    // Send push request to external objects defining TickHistoryCompatible Interface.
    for (i = 0; i < externalObjects.length; i++) {
      if (externalObjects[i].reset) {
        externalObjects[i].reset();
      }
    }
  }

  function copyModelState(destination) {
    var i,
      prop,
      state,
      parameters,
      name;

    if (useNewInterface) {
      // we expect that modelState.getProperties returns us a hash we can keep
      destination.input = modelState.getProperties();
    } else {
      // save model input properties
      for (i = 0; i < modelState.input.length; i++) {
        prop = modelState.input[i];
        destination.input[prop] = modelState.getRawPropertyValue(prop);
      }

      // save model parameters
      parameters = modelState.parameters;
      for (name in parameters) {
        if (parameters.hasOwnProperty(name) && parameters[name].isDefined) {
          destination.parameters[name] = modelState.getRawPropertyValue(name);
        }
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
    var lastState = newState(),
      i;

    copyModelState(lastState);
    list[listState.index + 1] = lastState;

    // Drop the oldest state if we went over the max list size
    if (list.length > listState.maxSize) {
      list.splice(0, 1);
      listState.startCounter++;
    } else {
      listState.index++;
    }
    listState.counter = listState.index + listState.startCounter;

    // Send push request to external objects defining TickHistoryCompatible Interface.
    for (i = 0; i < externalObjects.length; i++) {
      externalObjects[i].push();
    }

    invalidateFollowingState();
    listState.length = list.length;
  }

  /** Invalidate (remove) all history after current index. For example, after seeking backwards
      and then pushing new state */
  function invalidateFollowingState() {
    var i;

    list.length = listState.index + 1;
    listState.length = list.length;

    // Invalidate external objects defining TickHistoryCompatible Interface.
    for (i = 0; i < externalObjects.length; i++) {
      externalObjects[i].invalidate(listState.index);
    }
  }

  function extract(savedState) {
    var i,
      state;

    // restore model input properties
    modelState.restoreProperties(savedState.input);

    if (!useNewInterface) {
      // old interface requires restoring parameters separately
      modelState.restoreParameters(savedState.parameters);
    }

    // restore model objects defining state
    state = savedState.state;
    for (i = 0; i < state.length; i++) {
      modelState.state[i].restore(state[i]);
    }

    // Send extract request to external objects defining TickHistoryCompatible Interface.
    for (i = 0; i < externalObjects.length; i++) {
      externalObjects[i].extract(listState.index);
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

  tickHistory.saveInitialState = function() {
    initialState = newState();
    copyModelState(initialState);
  };

  tickHistory.restoreInitialState = function() {
    reset();
    extract(initialState);
    push();
  };

  tickHistory.reset = reset;

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

  tickHistory.invalidateFollowingState = invalidateFollowingState;

  tickHistory.get = function(key) {
    return listState[key];
  };

  tickHistory.set = function(key, val) {
    return listState[key] = val;
  };

  /**
    Registers a new external object. It is a special object, which handles changes of step itself.
    TickHistory object only sends requests for various actions.
    External object should implement TickHistoryCompatible Interface:
      #setHistoryLength(number)
      #push()
      #extract(index)
      #invalidate(index)
  */
  tickHistory.registerExternalObject = function(externalObj) {
    externalObj.setHistoryLength(listState.maxSize);
    externalObjects.push(externalObj);
  };

  //
  // Initialization
  //
  if (size == null) size = defaultSize;

  reset();
  return tickHistory;
};
