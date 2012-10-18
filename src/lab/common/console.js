define(function (require) {

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it ... like IE9
  if (typeof console === 'undefined') {
    // Be sure to use 'self' to access the global object instead of 'window'. 'window' is not
    // available in web workers, in which case 'self' provides access to the worker's global object.
    // Note that 'self' is a venerable synonym for 'window' that is supported in all browsers, with
    // or without worker support.
    self.console = {};
    console.log = console.info = console.warn = console.error = function(){};
  }

});
