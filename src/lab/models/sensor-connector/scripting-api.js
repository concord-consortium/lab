define(function () {
  /**
    Define the model-specific Sensor scripting API used by 'action' scripts on interactive elements.

    The universal Interactive scripting API is extended with the properties of the
    object below which will be exposed to the interactive's 'action' scripts as if
    they were local vars. All other names (including all globals, but excluding
    Javascript builtins) will be unavailable in the script context; and scripts
    are run in strict mode so they don't accidentally expose or read globals.

    @param: parent Common Scripting API
  */
  return function SensorScriptingAPI (parent) {
    return {
      /**
       * Reset the model. The interactives controller will emit a 'willResetModel'.
       * The willResetModel observers can ask to wait for asynchronous confirmation before
       * the model is actually reset.
       * Note that the effect would be almost the same like after reload operation. However
       * the mechanism under the hood is completely different. The biggest difference for
       * authoring is that when .resetModel() is called, the "onLoad" script won't be
       * executed again. It may be also faster than reload.
       * @param  {object} options hash of options, supported properties:
       *                         * propertiesToRetain - a list of properties to save before
       *                           the model reset and restore after reset.
       *                         * cause - cause of the reset action.
       */
      resetModel: function resetModel(options) {
        parent.intController.resetModel(options);
      }
    };
  };
});
