/*global define */

// The PluginController manages an array of plugins, and can call arbitrary functions
// on any registered plugin that responds to that function.

define(function () {

  return function PluginController() {
    var plugins = [];

    // Public API.
    api = {
      registerPlugin: function (plugin) {
        plugins.push(plugin);
      },

      // Calling pluginController.callPluginFunction('foo', args...)
      // will call the function 'foo' with arbitrary arguments args...
      // on each plugin registered with the controller
      callPluginFunction: function (funcName) {
        var args = [],
            i, ii, func;

        if (arguments.length > 1) {
          args = [].splice.call(arguments, 1);
        }

        for (i = 0, ii = plugins.length; i<ii; i++) {
          if (func = plugins[i][funcName]) {
            func.apply(plugins[i], args);
          }
        }
      }
    };

    return api;
  };

});
