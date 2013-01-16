/*global define:false*/

define(function(require) {
  var parentMessageController = require('common/parent-message-controller');

  // Defines the default postMessage API used to communicate with parent window (i.e., an embedder)
  return function(model, view) {
    parentMessageController.removeAllListeners();

    function sendPropertyValue(propertyName) {
      parentMessageController.post({
        type: 'propertyValue',
        name:  propertyName,
        value: model.get(propertyName)
      });
    }

    // on message 'get' propertyName: return a 'propertyValue' message
    parentMessageController.addListener('setFocus', function(message) {
      if (view && view.setFocus) {
        view.setFocus();
      }
    });

    // on message 'get' propertyName: return a 'propertyValue' message
    parentMessageController.addListener('get', function(message) {
      sendPropertyValue(message.propertyName);
    });

    // on message 'observe' propertyName: send 'propertyValue' once, and then every time
    // the property changes.
    parentMessageController.addListener('observe', function(message) {
      model.addPropertiesListener(message.propertyName, function() {
        sendPropertyValue(message.propertyName);
      });
      // Don't forget to send the initial value of the property too:
      sendPropertyValue(message.propertyName);
    });

    // on message 'set' propertyName: set the relevant property
    parentMessageController.addListener('set', function(message) {
      var setter = {};
      setter[message.propertyName] = message.propertyValue;
      model.set(setter);
    });

    parentMessageController.addListener('tick', function(message) {
      model.tick(message.numTimes);
    });

    parentMessageController.addListener('play', function(message) {
      model.resume();
    });

    parentMessageController.initialize();
  };
});
