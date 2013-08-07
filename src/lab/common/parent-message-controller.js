/*global define: false */
/*jshint boss: true */

define(function(require) {

  var parentOrigin,
      listeners = {},
      structuredClone = require('iframe-phone/structured-clone'),
      controller;

  function postToTarget(message, target) {
    // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
    //     https://github.com/Modernizr/Modernizr/issues/388
    //     http://jsfiddle.net/ryanseddon/uZTgD/2/
    if (structuredClone.supported()) {
      window.parent.postMessage(message, target);
    } else {
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

  function messageListener(message) {
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
   }

  function initialize() {
    if (window.parent === window) return;

    // We kick off communication with the parent window by sending a "hello" message. Then we wait
    // for a handshake (another "hello" message) from the parent window.
    postHello({
      type: 'hello',
      origin: document.location.href.match(/(.*?\/\/.*?)\//)[1]
    });

    // Make sure that even if initialize() is called many times,
    // only one instance of messageListener will be registered as listener.
    // So, add closure function instead of anonymous function created here.
    window.addEventListener('message', messageListener, false);
  }

  return controller = {
    initialize         : initialize,
    getListenerNames   : getListenerNames,
    addListener        : addListener,
    removeAllListeners : removeAllListeners,
    post               : post
  };

});
