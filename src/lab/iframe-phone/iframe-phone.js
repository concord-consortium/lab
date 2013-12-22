/*global define: false */

define(function (require){
  var structuredClone = require('iframe-phone/structured-clone');

  return function IFramePhone(iframe, modelLoadedCallback, afterConnectedCallback) {
    var selfOrigin   = window.location.href.match(/(.*?\/\/.*?)\//)[1],
        postMessageQueue = [],
        connected = false,
        handlers = {};

    function getIframeOrigin() {
      return iframe.src.match(/(.*?\/\/.*?)\//)[1];
    }

    function post(message) {
      if (connected) {
        // if we are laready connected ... send the message
        message.origin = selfOrigin;
        // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
        //     https://github.com/Modernizr/Modernizr/issues/388
        //     http://jsfiddle.net/ryanseddon/uZTgD/2/
        if (structuredClone.supported()) {
          iframe.contentWindow.postMessage(message, getIframeOrigin());
        } else {
          iframe.contentWindow.postMessage(JSON.stringify(message), getIframeOrigin());
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

      if (message.source === iframe.contentWindow && message.origin === getIframeOrigin()) {
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

    // When a model is loaded trigger a callback defined by the client code (if present).
    addListener('modelLoaded', function () {
      if (modelLoadedCallback && typeof modelLoadedCallback === "function") {
        modelLoadedCallback();
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
