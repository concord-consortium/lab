/*global define: false */

define(function(require) {

  // NOTE: much of this is copy and pasted from the lab-modeler-mixin
  //  the current reason is because this model doesn't need the playback-support
  var DispatchSupport         = require('common/dispatch-support'),
      PropertySupport         = require('common/property-support'),
      defineBuiltinProperties = require('common/define-builtin-properties'),
      console                 = require('common/console');
      metadata                = require('iframe-model/metadata');

  return function Model(initialProperties) {
    var dispatchSupport = new DispatchSupport(),
        propertySupport = new PropertySupport({
          types: ["output", "parameter", "mainProperty", "viewOption"]
        }),
        model;

    model = {
      start: function() {
        console.log("Start called");
        // start the iframe'd model
        model.iframePhone.post({type: 'play'});
        return model;
      },

      restart: function() {
        // restart iframe'd model I'm not sure if this also means 'reset' or not
        return model;
      },

      stop: function() {
        console.log("Stop called");
        // stop the iframe'd model
        return model;
      },

      isStopped: function () {
        return true;
        // ask iframe if it is stopped or started
        // this will be problematic because of asynchron nature of iframe communcation
        // so this model object will need to track isStopped itself and the iframe will
        // need to notify us when it is stopped.
      },

      iframePhone: null
    };

    dispatchSupport.mixInto(model);
    propertySupport.mixInto(model);

    if (metadata) {
      defineBuiltinProperties({
        propertySupport: propertySupport,
        metadata: metadata,
        initialProperties: initialProperties
      });
    }

    // The default model controller asumes 'tick' is a defined event
    // the playback controller assumes 'play' and 'stop' are defined even if the viewOptions
    // disable these buttons
    // the outer iframe in the interactives browser expects a 'reset', 'stepForward', 'stepBack' event type
    dispatchSupport.addEventTypes('tick', 'play', 'stop', 'reset', 'stepForward', 'stepBack');

    return model;
  };
});
