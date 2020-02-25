
import labConfig from 'lab.config';
// Dependencies.
var // Object to be returned.
  publicAPI,
  cons,
  emptyFunction = function() {};

// Prevent a console.log from blowing things up if we are on a browser that
// does not support it ... like IE9.
if (typeof console === 'undefined') {
  console = {};
  if (window) window.console = console;
}

// Assign shortcut.
cons = console;
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

// Make sure that every method has access to an 'apply' method
// This is a hack for IE9 and IE10 when using the built-in developer tools.
// See: http://stackoverflow.com/questions/5472938/does-ie9-support-console-log-and-is-it-a-real-function
if (cons.log.apply === undefined)
  cons.log = Function.prototype.bind.call(console.log, console);
if (cons.info.apply === undefined)
  cons.info = Function.prototype.bind.call(console.info, console);
if (cons.warn.apply === undefined)
  cons.warn = Function.prototype.bind.call(console.warn, console);
if (cons.error.apply === undefined)
  cons.error = Function.prototype.bind.call(console.error, console);
if (cons.time.apply === undefined)
  cons.time = Function.prototype.bind.call(console.time, console);
if (cons.timeEnd.apply === undefined)
  cons.timeEnd = Function.prototype.bind.call(console.timeEnd, console);

publicAPI = {
  log: function() {
    if (labConfig.logging)
      cons.log.apply(cons, arguments);
  },
  info: function() {
    if (labConfig.logging)
      cons.info.apply(cons, arguments);
  },
  warn: function() {
    if (labConfig.logging)
      cons.warn.apply(cons, arguments);
  },
  error: function() {
    if (labConfig.logging)
      cons.error.apply(cons, arguments);
  },
  time: function() {
    if (labConfig.tracing)
      cons.time.apply(cons, arguments);
  },
  timeEnd: function() {
    if (labConfig.tracing)
      cons.timeEnd.apply(cons, arguments);
  }
};

export default publicAPI;
