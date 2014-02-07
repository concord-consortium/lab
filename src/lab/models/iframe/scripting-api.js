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
  return function IframeScriptingAPI (parent) {
    return {
      /**
       * Posts a custom message to iframe model.
       * @param  {string} type    message type
       * @param  {any}    content message content
       */
      post: function resetModel(type, content) {
        parent.model.iframePhone.post(type, content);
      }
    };
  };
});
