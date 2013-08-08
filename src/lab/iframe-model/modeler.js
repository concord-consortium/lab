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
        model.iframePhone.post({type: 'play'});
        return model;
      },

      restart: function() {
        // restart iframe'd model I'm not sure if this should mean 'reset' or not
        model.iframePhone.post({type: 'reset'});
        return model;
      },

      stop: function() {
        // stop the iframe'd model
        // TODO #1 we might want to set _isStopped to true here.
        // in the playback-support for other models it checks for 'stopRequest'
        // which is set as soon as stop is called.
        // TODO #2 we are not notifying about the stop event until we hear from
        // the model that it is stopped. We should check if that is best approach.
        // It is possible that some data events will be sent out even after stop
        // is called so it might be best to leave this as is. That seems like it could
        // happen in a regular model since playback support notifies about stop as soon
        // as it is called, but there is still a timer process that needs to complete.
        model.iframePhone.post({type: 'stop'});
        return model;
      },

      _isStopped: true,

      isStopped: function () {
        return model._isStopped;
      },

      set iframePhone(phone){
        model._iframePhone = phone;
        phone.addDispatchListener('play.iframe-model', function(){
          model._isStopped = false;
          // notify that we are playing
          dispatchSupport.play();
        });
        phone.addDispatchListener('stop.iframe-model', function(){
          model._isStopped = true;
          // notify that we are stopped
          dispatchSupport.stop();
        });
      },

      get iframePhone(){
        return model._iframePhone;
      }
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
