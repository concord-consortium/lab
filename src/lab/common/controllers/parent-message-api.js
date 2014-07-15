/*global define:false*/

define(function(require) {
  var benchmark   = require('common/benchmark/benchmark');
  var urlHelper   = require('common/url-helper');
  var iframePhone = require('iframe-phone');

  // Defines the default postMessage API used to communicate with parent window (i.e., an embedder)
  return function(controller) {
    var model;
    // iframeEndpoint is a singleton (iframe can't have multiple parents).
    var iframeEndpoint = iframePhone.getIFrameEndpoint();

    iframeEndpoint.removeAllListeners();

    function sendPropertyValue(propertyName) {
      iframeEndpoint.post('propertyValue', {
        name: propertyName,
        value: model.get(propertyName)
      });
    }

    function sendDataset(datasetName) {
      iframeEndpoint.post('dataset', {
        name: datasetName,
        value: controller.getDataSet(datasetName).serialize()
      });
    }

    // on message 'setFocus' call view.setFocus
    iframeEndpoint.addListener('setFocus', function() {
      var view = controller.modelController.modelContainer;
      if (view && view.setFocus) {
        view.setFocus();
      }
    });

    // on message 'getLearnerUrl' return urlHelper.getVersionedUrl()
    iframeEndpoint.addListener('getLearnerUrl', function() {
      iframeEndpoint.post('setLearnerUrl', urlHelper.getVersionedUrl());
    });

    // on message 'loadInteractive' call controller.loadInteractive
    iframeEndpoint.addListener('loadInteractive', function(content) {
      if (controller && controller.loadInteractive) {
        controller.loadInteractive(content);
      }
    });

    // on message 'loadModel' call controller.loadModel
    iframeEndpoint.addListener('loadModel', function(content) {
      if (controller && controller.loadModel) {
        controller.loadModel(content.modelId, content.modelObject);
      }
    });

    // on message 'getModelState' call and return controller.modelController.state()
    iframeEndpoint.addListener('getModelState', function() {
      if (controller && controller.modelController) {
        iframeEndpoint.post('modelState', controller.modelController.state());
      }
    });

    // on message 'getInteractiveState' call and return controller.serialize() result
    iframeEndpoint.addListener('getInteractiveState', function() {
      if (controller && controller.modelController) {
        iframeEndpoint.post('interactiveState', controller.serialize());
      }
    });

    // on message 'runBenchmarks' call controller.runBenchmarks
    iframeEndpoint.addListener('runBenchmarks', function() {
      var modelController, benchmarks;
      if (controller && controller.modelController) {
        modelController = controller.modelController;
        benchmarks = controller.benchmarks.concat(modelController.benchmarks);
        benchmark.bench(benchmarks, function(results) {
          console.log(results);
          iframeEndpoint.post('returnBenchmarks', {
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
    iframeEndpoint.addListener('listenForDispatchEvent', function(content) {
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
        iframeEndpoint.post(eventName, values);
      });
    });

    // Remove an existing Listener for events in the model
    iframeEndpoint.addListener('removeListenerForDispatchEvent', function(content) {
      model.on(content, null);
    });

    // on message 'getDataset' datasetName: return a 'dataset' message
    iframeEndpoint.addListener('getDataset', function(content) {
      sendDataset(content);
    });

    // on message 'get' propertyName: return a 'propertyValue' message
    iframeEndpoint.addListener('get', function(content) {
      sendPropertyValue(content);
    });

    // on message 'observe' propertyName: send 'propertyValue' once, and then every time
    // the property changes.
    iframeEndpoint.addListener('observe', function(content) {
      model.addPropertiesListener(content, function() {
        sendPropertyValue(content);
      });
      // Don't forget to send the initial value of the property too:
      sendPropertyValue(content);
    });

    // on message 'set' propertyName: set the relevant property
    iframeEndpoint.addListener('set', function(content) {
      model.set(content.name, content.value);
    });

    iframeEndpoint.addListener('tick', function(content) {
      model.tick(Number(content));
    });

    iframeEndpoint.addListener('play', function() {
      model.start();
    });

    iframeEndpoint.addListener('stop', function() {
      model.stop();
    });

    iframeEndpoint.initialize();

    controller.on('modelLoaded.parentMessageAPI', function() {
      iframeEndpoint.post('modelLoaded');
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
