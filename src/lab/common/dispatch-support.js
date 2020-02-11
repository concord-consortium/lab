/*global define: false, d3: false */
/**
 * This module provides event dispatch based on d3.dispatch:
 * https://github.com/mbostock/d3/wiki/Internals#wiki-d3_dispatch
 *
 * The main improvement over raw d3.dispatch is that this wrapper provides
 * event batching. You can start batch mode (.startBatch()) and while it is
 * active events won't be dispatched immediately. They will be dispatched
 * at the end of batch mode (.endBatch()) or when you call .flush() method.
 *
 * Note that there is one *significant limitation*: arguments passed during
 * event dispatching will be lost! All events will be merged into single
 * event without any argument. Please keep this in mind while using this module.
 *
 * e.g.
 *   dispatch.on("someEvent", function(arg) { console.log(arg); });
 *   dispatch.someEvent(123);     // console output: 123
 *   dispatch.someEvent("test");  // console output: "test"
 * However...
 *   dispatch.startBatch();
 *   dispatch.someEvent(123);
 *   dispatch.someEvent("test");
 *   dispatch.endBatch();         // console output: undefined (!)
 *
 * Rest of the interface is exactly the same like in d3.dispatch (.on()).
 * Under the hood delegation to d3.dispatch instance is used.
 */
// Converts arguments object to regular array.
function argsToArray(args) {
  return [].slice.call(args);
}

export default function DispatchSupport() {
  var api,
    d3dispatch,
    types,

    batchMode = false,
    suppressedEvents = d3.set();

  function init(newTypes) {
    var i, len;

    types = newTypes;

    d3dispatch = d3.dispatch.apply(null, types);

    // Provide wrapper around typical calls like dispatch.someEvent().
    for (i = 0, len = types.length; i < len; i++) {
      api[types[i]] = dispatchEvent(types[i]);
    }
  }

  function dispatchEvent(name) {
    return function() {
      if (!batchMode) {
        d3dispatch[name].apply(d3dispatch, arguments);
      } else {
        suppressedEvents.add(name);
      }
    };
  }

  function delegate(funcName) {
    return function() {
      d3dispatch[funcName].apply(d3dispatch, arguments);
    };
  }

  // Public API.
  api = {
    // Copy d3.dispatch API:

    /**
     * Adds or removes an event listener for the specified type. Please see:
     * https://github.com/mbostock/d3/wiki/Internals#wiki-dispatch_on
     */
    on: delegate("on"),

    // New API specific for Lab DispatchSupport:

    mixInto: function(target) {
      target.on = api.on;
      target.suppressEvents = api.suppressEvents;
    },

    /**
     * Adds new event types. Old event types are still supported, but
     * all previously registered listeners will be removed!
     *
     * e.g. dispatch.addEventTypes("newEvent", "anotherEvent")
     */
    addEventTypes: function() {
      if (arguments.length) {
        init(types.concat(argsToArray(arguments)));
      }
    },

    /**
     * Starts batch mode. Events won't be dispatched immediately after call.
     * They will be merged into single event and dispatched when .flush()
     * or .endBatch() is called.
     */
    startBatch: function() {
      batchMode = true;
    },

    /**
     * Ends batch mode and dispatches suppressed events.
     */
    endBatch: function() {
      batchMode = false;
      api.flush();
    },

    /**
     * Dispatches suppressed events.
     * @return {[type]} [description]
     */
    flush: function() {
      suppressedEvents.forEach(function(eventName) {
        d3dispatch[eventName]();
      });
      // Reset suppressed events.
      suppressedEvents = d3.set();
    },

    /**
     * Allows to execute some action without dispatching any events.
     * @param {function} action
     */
    suppressEvents: function(action) {
      batchMode = true;
      action();
      batchMode = false;
      // Reset suppressed events without dispatching them.
      suppressedEvents = d3.set();
    }
  };

  init(argsToArray(arguments));

  return api;
};
