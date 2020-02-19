
// The PluginController manages an array of plugins, and can call arbitrary functions
// on any registered plugin that responds to that function.

// TODO:
//
//  1. Plugins should define engine component and modeler component
//  2. Plugins should validate their own properties
//  3. Plugin controller should handle initialization of plugins and mixing of appropriate methods
//     and properties into the modeler layer. The main modeler and engine layers should not have to
//     know details about which plugins are available, what they're named, where they are located,
//     etc.
//  4. Plugin controller have a 'getPluginFunction' method which accepts a function name and returns
//     a function that, when called, does the same thing as callPluginFunction(<function name>,...).
//     This avoids having to look up the plugin function by name every time it is called.

export default function PluginController() {
  var plugins = [];

  // Public API.
  return {
    registerPlugin: function(plugin) {
      plugins.push(plugin);
    },

    /**
      Calls method 'funcName' of every plugin, for those plugins which have a property 'funcName',
      in the context of the plugin (i.e., 'this' value is the plugin object) and with the elements
      of the array 'args' as the argument array of the invocation.

      If 'callback' is defined, it will be invoked with the callback.

      The callback signature is callback(returnValue, index, plugin) where returnValue is the
      return value of the method called, i is the index of the plugin, and plugin is the plugin
      object itself.
    */
    callPluginFunction: function(funcName, args, callback) {
      var i, ii, func, retVal;

      for (i = 0, ii = plugins.length; i < ii; i++) {
        func = plugins[i][funcName];
        if (func) {
          retVal = func.apply(plugins[i], args);
        }
        if (callback) {
          callback(retVal, i, plugins[i]);
        }
      }
    }
  };
};
