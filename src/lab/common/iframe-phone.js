/*global define: false */

define(function (require){
  var structuredClone = require('common/structured-clone');

  return function IFramePhone(iframe, afterConnectedCallback) {
    var iframeOrigin = iframe.src.match(/(.*?\/\/.*?)\//)[1],
        selfOrigin   = window.location.href.match(/(.*?\/\/.*?)\//)[1],
        postMessageQueue = [],
        connected = false,
        handlers = {};

    function post(message) {
      if (connected) {
        // if we are laready connected ... send the message
        message.origin = selfOrigin;
        // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
        //     https://github.com/Modernizr/Modernizr/issues/388
        //     http://jsfiddle.net/ryanseddon/uZTgD/2/
        if (structuredClone.supported()) {
          iframe.contentWindow.postMessage(message, iframeOrigin);
        } else {
          iframe.contentWindow.postMessage(JSON.stringify(message), iframeOrigin);
        }
      } else {
        // else queue up the messages to send after connection complete.
        postMessageQueue.push(message);
      }
    }

    function addListener(messageName, func) {
      handlers[messageName] = func;
    }

    function removeListener(messageName) {
      handlers[messageName] = null;
    }

    function addDispatchListener(eventName,func,properties) {
      addListener(eventName,func);
      post({
        'type': 'listenForDispatchEvent',
        'eventName': eventName,
        'properties': properties
      });
    }

    function removeDispatchListener(messageName) {
      post({
        'type': 'removeListenerForDispatchEvent',
        'eventName': messageName
      });
      removeListener(messageName);
    }

    function receiveMessage(message) {
      var messageData;

      if (message.source === iframe.contentWindow && message.origin === iframeOrigin) {
        messageData = message.data;
        if (typeof messageData === 'string') {
          messageData = JSON.parse(messageData);
        }
        if (handlers[messageData.type]){
          handlers[messageData.type](messageData.values);
        }
        else {
          console.log("cant handle type: " + messageData.type);
        }
      }
    }

    // when we receive 'hello':
    addListener('hello', function() {
      connected = true;

      // send hello response
      post({type: 'hello'});

      // give the user a chance to do things now that we are connected
      // note that is will happen before any queued messages
      if (afterConnectedCallback && typeof afterConnectedCallback === "function") {
        afterConnectedCallback();
      }

      // Now send any messages that have been queued up ...
      while(postMessageQueue.length > 0) {
        post(postMessageQueue.shift());
      }
    });

    window.addEventListener('message', receiveMessage, false);

    // public API
    return {
      post: post,
      addListener: addListener,
      removeListener: removeListener,
      addDispatchListener: addDispatchListener,
      removeDispatchListener: removeDispatchListener
    };
  };
});
