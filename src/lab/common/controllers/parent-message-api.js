/*global define:false*/

define(function(require) {
  var parentMessageController = require('common/parent-message-controller'),
      benchmark               = require('common/benchmark/benchmark');

  // Defines the default postMessage API used to communicate with parent window (i.e., an embedder)
  return function(model, view, controller) {
    parentMessageController.removeAllListeners();

    function sendPropertyValue(propertyName) {
      parentMessageController.post({
        type: 'propertyValue',
        name:  propertyName,
        values: model.get(propertyName)
      });
    }

    // on message 'setFocus' call view.setFocus
    parentMessageController.addListener('setFocus', function(message) {
      if (view && view.setFocus) {
        view.setFocus();
      }
    });

    parentMessageController.addListener('getModelSnapshot', function() {
      //TODO: find the dom element for the model....
      var modelContainer = controller.modelController.modelContainer.$el;
      if(typeof window.getDomSnapshot === 'function') {
        window.getDomSnapshot(modelContainer,null, function(img) {
          parentMessageController.post({
            type: 'png',
            values: img
          });
        });
      } else {
        // TODO: log that getDomSnapshot isn't defined -- include snapshot.js
      }
    });

    parentMessageController.addListener('getInteractiveSnapshot', function() {
      //controller.interactiveContainer
      if(typeof window.getDomSnapshot === 'function') {
        window.getDomSnapshot(controller.interactiveContainer.parent(),null, function(img) {
          parentMessageController.post({
            type: 'png',
            values: img
          });
        });
      } else {
        // TODO: log that getDomSnapshot isn't defined -- include snapshot.js
      }
    });

   // on message 'loadInteractive' call controller.loadInteractive
    parentMessageController.addListener('loadInteractive', function(message) {
      if (controller && controller.loadInteractive) {
        controller.loadInteractive(message.data);
      }
    });

    // on message 'loadModel' call controller.loadModel
    parentMessageController.addListener('loadModel', function(message) {
      if (controller && controller.loadModel) {
        controller.loadModel(message.data.modelId, message.data.modelObject);
      }
    });

    // on message 'getModelState' call and return controller.getModelController().state()
    parentMessageController.addListener('getModelState', function(message) {
      if (controller && controller.getModelController) {
        parentMessageController.post({
          type:  'modelState',
          values: controller.getModelController().state()
        });
      }
    });

    // on message 'getInteractiveState' call and return controller.serialize() result
    parentMessageController.addListener('getInteractiveState', function(message) {
      if (controller && controller.getModelController) {
        parentMessageController.post({
          type:  'interactiveState',
          values: controller.serialize()
        });
      }
    });

    // on message 'runBenchmarks' call controller.runBenchmarks
    parentMessageController.addListener('runBenchmarks', function() {
      var modelController;
      if (controller && controller.getModelController) {
        modelController = controller.getModelController();
        benchmark.bench(modelController.benchmarks, function(results) {
          console.log(results);
          parentMessageController.post({
            'type':   'returnBenchmarks',
            'values': { 'results': results, 'benchmarks': modelController.benchmarks }
          }, function() {}, function() {});
        });
      }
    });

    // Listen for events in the model, and notify using message.post
    // uses D3 disaptch on model to trigger events
    // pass in message.properties ([names]) to also send model properties
    // in values object when triggering in parent Frame
    parentMessageController.addListener('listenForDispatchEvent', function(message) {
      var eventName    = message.eventName,
          properties   = message.properties,
          values       = {},
          i            = 0,
          propertyName = null;

      model.on(eventName, function() {
        if (properties) {
          for (i = 0 ; i < properties.length; i++) {
            propertyName = properties[i];
            values[propertyName] = model.get(propertyName);
          }
        }
        parentMessageController.post({
          'type':   eventName,
          'values': values
        });
      });
    });

    // Remove an existing Listener for events in the model
    parentMessageController.addListener('removeListenerForDispatchEvent', function(message) {
      var eventName    = message.eventName,
          properties   = message.properties,
          values       = {},
          i            = 0,
          propertyName = null;

      model.on(eventName, null);
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
      model.start();
    });

    parentMessageController.initialize();
  };
});
