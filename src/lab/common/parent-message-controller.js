/*global define: false */
/*jshint boss: true */

define(function() {

  var parentOrigin,
      listeners = {},
      controller;

  function postToTarget(message, target) {
    try {
      window.parent.postMessage(message, target);
    } catch (e) {
      // Assume that failure means we can only post strings, not objects (IE9)
      // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
      window.parent.postMessage(JSON.stringify(message), target);
    }
  }

  function post(message) {
    postToTarget(message, parentOrigin);
  }

  // Only the initial 'hello' message goes permissively to a '*' target (because due to cross origin
  // restrictions we can't find out our parent's origin until they voluntarily send us a message
  // with it.)
  function postHello(message) {
    postToTarget(message, '*');
  }

  function addListener(type, fn) {
    listeners[type] = fn;
  }

  function removeAllListeners() {
    listeners = {};
  }

  function getListenerNames() {
    return Object.keys(listeners);
  }

  function initialize() {
    if (window.parent === window) return;

    // We kick off communication with the parent window by sending a "hello" message. Then we wait
    // for a handshake (another "hello" message) from the parent window.
    postHello({
      type: 'hello',
      origin: document.location.href.match(/(.*?\/\/.*?)\//)[1]
    });

    window.addEventListener('message', function(message) {
      // Anyone can send us a message. Only pay attention to messages from parent.
      if (message.source !== window.parent) return;

      var messageData = message.data;

      if (typeof messageData === 'string') messageData = JSON.parse(messageData);

      // We don't know origin property of parent window until it tells us.
      if (!parentOrigin) {
        // This is the return handshake from the embedding window.
        if (messageData.type === 'hello') {
          parentOrigin = messageData.origin;
        }
      }

      // Perhaps-redundantly insist on checking origin as well as source window of message.
      if (message.origin === parentOrigin) {
        if (listeners[messageData.type]) listeners[messageData.type](messageData);
      }
   }, false);
  }

  return controller = {
    initialize         : initialize,
    getListenerNames   : getListenerNames,
    addListener        : addListener,
    removeAllListeners : removeAllListeners,
    post               : post
  };

});
