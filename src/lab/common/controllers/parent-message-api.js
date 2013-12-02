/*global define:false*/

define(function(require) {
  var parentMessageController = require('common/parent-message-controller'),
      benchmark               = require('common/benchmark/benchmark');

  // Defines the default postMessage API used to communicate with parent window (i.e., an embedder)
  return function(controller) {
    var model;

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
      var view = controller.modelController.modelContainer;
      if (view.modelContainer && view.setFocus) {
        view.setFocus();
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

    // on message 'getModelState' call and return controller.modelController.state()
    parentMessageController.addListener('getModelState', function(message) {
      if (controller && controller.modelController) {
        parentMessageController.post({
          type:  'modelState',
          values: controller.modelController.state()
        });
      }
    });

    // on message 'getInteractiveState' call and return controller.serialize() result
    parentMessageController.addListener('getInteractiveState', function(message) {
      if (controller && controller.modelController) {
        parentMessageController.post({
          type:  'interactiveState',
          values: controller.serialize()
        });
      }
    });

    // on message 'runBenchmarks' call controller.runBenchmarks
    parentMessageController.addListener('runBenchmarks', function() {
      var modelController, benchmarks;
      if (controller && controller.modelController) {
        modelController = controller.modelController;
        benchmarks = controller.benchmarks.concat(modelController.benchmarks);
        benchmark.bench(benchmarks, function(results) {
          console.log(results);
          parentMessageController.post({
            'type':   'returnBenchmarks',
            'values': { 'results': results, 'benchmarks': benchmarks }
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
      model.on(message.eventName, null);
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

    parentMessageController.addListener('stop', function(message) {
      model.stop();
    });

    return {
      // REF FIXME: use scripting API object and avoid binding the model at all (as scripting
      // API is always guaranteed to have a current, valid model object).
      bindModel: function (newModel) {
        model = newModel;
        // Looks weird, but it's just consistent with current client code.
        // REF TODO FIXME: perhaps we should notify parent here that the a model was loaded
        // and client code should wait for that, not only for "hello" message that is being sent
        // during parentMessageController initialization.
        parentMessageController.initialize();
      }
    };
  };
});
