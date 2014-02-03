/*global define:false*/

define(function(require) {
  var parentMessageController = require('common/parent-message-controller'),
      benchmark               = require('common/benchmark/benchmark'),
      config                  = require('lab.config');

  // Defines the default postMessage API used to communicate with parent window (i.e., an embedder)
  return function(controller) {
    var model;

    parentMessageController.removeAllListeners();

    function sendPropertyValue(propertyName) {
      parentMessageController.post('propertyValue', {
        name: propertyName,
        value: model.get(propertyName)
      });
    }

    // on message 'setFocus' call view.setFocus
    parentMessageController.addListener('setFocus', function() {
      var view = controller.modelController.modelContainer;
      if (view && view.setFocus) {
        view.setFocus();
      }
    });

    // on message 'getLearnerUrl' return config.getVersionedUrl(loadLearnerData)
    parentMessageController.addListener('getLearnerUrl', function() {
      parentMessageController.post('setLearnerUrl', config.getVersionedUrl(true));
    });

    // on message 'loadInteractive' call controller.loadInteractive
    parentMessageController.addListener('loadInteractive', function(content) {
      if (controller && controller.loadInteractive) {
        controller.loadInteractive(content);
      }
    });

    // on message 'loadModel' call controller.loadModel
    parentMessageController.addListener('loadModel', function(content) {
      if (controller && controller.loadModel) {
        controller.loadModel(content.modelId, content.modelObject);
      }
    });

    // on message 'getModelState' call and return controller.modelController.state()
    parentMessageController.addListener('getModelState', function() {
      if (controller && controller.modelController) {
        parentMessageController.post('modelState', controller.modelController.state());
      }
    });

    // on message 'getInteractiveState' call and return controller.serialize() result
    parentMessageController.addListener('getInteractiveState', function() {
      if (controller && controller.modelController) {
        parentMessageController.post('interactiveState', controller.serialize());
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
          parentMessageController.post('returnBenchmarks', {
            results: results,
            benchmarks: benchmarks
          });
        });
      }
    });

    // Listen for events in the model, and notify using message.post
    // uses D3 disaptch on model to trigger events
    // pass in message.properties ([names]) to also send model properties
    // in content object when triggering in parent Frame
    parentMessageController.addListener('listenForDispatchEvent', function(content) {
      var eventName    = content.eventName,
          properties   = content.properties,
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
        parentMessageController.post(eventName, values);
      });
    });

    // Remove an existing Listener for events in the model
    parentMessageController.addListener('removeListenerForDispatchEvent', function(content) {
      model.on(content, null);
    });

    // on message 'get' propertyName: return a 'propertyValue' message
    parentMessageController.addListener('get', function(content) {
      sendPropertyValue(content);
    });

    // on message 'observe' propertyName: send 'propertyValue' once, and then every time
    // the property changes.
    parentMessageController.addListener('observe', function(content) {
      model.addPropertiesListener(content, function() {
        sendPropertyValue(content);
      });
      // Don't forget to send the initial value of the property too:
      sendPropertyValue(content);
    });

    // on message 'set' propertyName: set the relevant property
    parentMessageController.addListener('set', function(content) {
      model.set(content.name, content.value);
    });

    parentMessageController.addListener('tick', function(content) {
      model.tick(Number(content));
    });

    parentMessageController.addListener('play', function() {
      model.start();
    });

    parentMessageController.addListener('stop', function() {
      model.stop();
    });

    parentMessageController.initialize();

    controller.on('modelLoaded.parentMessageAPI', function() {
      parentMessageController.post('modelLoaded');
    });

    return {
      // REF FIXME: use scripting API object and avoid binding the model at all (as scripting
      // API is always guaranteed to have a current, valid model object).
      bindModel: function (newModel) {
        model = newModel;
      }
    };
  };
});
