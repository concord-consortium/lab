/*global define: false alert: false */

/**
  Tiny module providing global way to show errors to user.

  It's better to use module, as in the future, we may want to replace basic
  alert with more sophisticated solution (for example jQuery UI dialog).
*/
define(function (require) {
  // Dependencies.
  var console = require('common/console'),

      // Try to use global alert. If it's not available, use console.error (node.js).
      alertFunc = typeof alert !== 'undefined' ? alert : console.error;

  return function alert(msg) {
    alertFunc(msg);
  };
});
