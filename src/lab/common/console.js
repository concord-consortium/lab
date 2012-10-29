/*globals define: false */

define(function (require) {
      // Object to be returned.
  var publicAPI,
      // Configuration option - logging is enabled by default.
      logging = true,
      // Configuration option - tracing is disabled by default.
      tracing = false,

      cons,
      emptyFunction = function () {};

  // Prevent a console.log from blowing things up if we are on a browser that
  // does not support it ... like IE9.
  if (typeof console === 'undefined') {
    window.console = {};
  }
  // Assign shortcut.
  cons = window.console;
  // Make sure that every method is defined.
  if (cons.log === undefined)
    cons.log = emptyFunction;
  if (cons.info === undefined)
    cons.info = emptyFunction;
  if (cons.warn === undefined)
    cons.warn = emptyFunction;
  if (cons.error === undefined)
    cons.error = emptyFunction;
  if (cons.time === undefined)
    cons.time = emptyFunction;
  if (cons.timeEnd === undefined)
    cons.timeEnd = emptyFunction;

  publicAPI = {
    log: function () {
      if (logging)
        cons.log.apply(cons, arguments);
    },
    info: function () {
      if (logging)
        cons.info.apply(cons, arguments);
    },
    warn: function () {
      if (logging)
        cons.warn.apply(cons, arguments);
    },
    error: function () {
      if (logging)
        cons.error.apply(cons, arguments);
    },
    time: function () {
      if (tracing)
        cons.time.apply(cons, arguments);
    },
    timeEnd: function () {
      if (tracing)
        cons.timeEnd.apply(cons, arguments);
    },

    // When called without arguments, returns information
    // whether logging is disabled or enabled.
    // Called with argument, sets logging enabled or disabled.
    logging: function (val) {
      if (arguments.length < 1)
        return logging;

      logging = val;
    },

    // When called without arguments, returns information
    // whether tracing is disabled or enabled.
    // Called with argument, sets tracing enabled or disabled.
    tracing: function (val) {
      if (arguments.length < 1)
        return tracing;

      tracing = val;
    }
  };

  return publicAPI;
});
