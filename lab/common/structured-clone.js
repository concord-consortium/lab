/*global define: false console: true */

define(function (require) {
  var featureSupported = false,
      publicAPI = {};

  function isStructuredCloneSupported() {
    var result = 0;

    if (!!window.postMessage) {
      try {
        // Safari 5.1 will sometimes throw an exception and sometimes won't, lolwut?
        // When it doesn't we capture the message event and check the
        // internal [[Class]] property of the message being passed through.
        // Safari will pass through DOM nodes as Null iOS safari on the other hand
        // passes it through as DOMWindow, gotcha.
        window.onmessage = function(e){
          var type = Object.prototype.toString.call(e.data);
          result = (type.indexOf("Null") != -1 || type.indexOf("DOMWindow") != -1) ? 1 : 0;
          featureSupported = {
            'structuredClones': result
          };
        };
        // Spec states you can't transmit DOM nodes and it will throw an error
        // postMessage implimentations that support cloned data will throw.
        window.postMessage(document.createElement("a"),"*");
      } catch(e) {
        // BBOS6 throws but doesn't pass through the correct exception
        // so check error message
        result = (e.DATA_CLONE_ERR || e.message == "Cannot post cyclic structures.") ? 1 : 0;
        featureSupported = {
          'structuredClones': result
        };
      }
    }
  }

  isStructuredCloneSupported();

  function supported() {
    return featureSupported && featureSupported.structuredClones > 0;
  }

  publicAPI.supported = supported;

  return publicAPI;

});
