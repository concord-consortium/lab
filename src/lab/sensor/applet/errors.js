/*global define: false */

define(function(require) {

  var inherit = require('common/inherit');

  function errorConstructor(message) {
    Error.call(this); //super constructor
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor); //super helper method to include stack trace in error object
    }

    this.name = this.constructor.name; //set our function’s name as error name.
    this.message = message; //set the error message
  }

  function JavaLoadError() {
    errorConstructor.apply(this, Array.prototype.slice.apply(arguments));
  }
  inherit(JavaLoadError, Error);

  function AppletInitializationError() {
    errorConstructor.apply(this, Array.prototype.slice.apply(arguments));
  }
  inherit(AppletInitializationError, Error);

  function SensorConnectionError() {
    errorConstructor.apply(this, Array.prototype.slice.apply(arguments));
  }
  inherit(SensorConnectionError, Error);

  // temporary check:
  window.JavaLoadError = JavaLoadError;

  return {
    JavaLoadError: JavaLoadError,
    AppletInitializationError: AppletInitializationError,
    SensorConnectionError: SensorConnectionError
  };

});
