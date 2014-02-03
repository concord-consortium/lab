/*global define: false */

define(function(require) {

  // NOTE: much of this is copy and pasted from the lab-modeler-mixin
  //  the current reason is because this model doesn't need the playback-support
  var DispatchSupport         = require('common/dispatch-support'),
      PropertySupport         = require('common/property-support'),
      ParameterSupport        = require('common/parameter-support'),
      defineBuiltinProperties = require('common/define-builtin-properties'),
      console                 = require('common/console'),
      metadata                = require('iframe-model/metadata');

  return function Model(initialProperties) {
    var dispatchSupport = new DispatchSupport(),
        propertySupport = new PropertySupport({
          types: ["output", "parameter", "mainProperty", "viewOption"]
        }),
        parameterSupport = new ParameterSupport({
          propertySupport: propertySupport
        }),
        model,
        phone,
        stopped = true;

    function addListeners() {
      phone.addDispatchListener('play.iframe-model', function(){
        stopped = false;
        // notify that we are playing
        dispatchSupport.play();
      });
      phone.addDispatchListener('stop.iframe-model', function(){
        stopped = true;
        // notify that we are stopped
        dispatchSupport.stop();
      });

      // HACK to play with properties
      phone.addListener('propertyValue', function(content) {
        if(content.name === 'pressureProbeFiltered'){
          model.set('pressure', content.value);
        }
      });
      phone.post('observe', 'pressureProbeFiltered');
      // END OF HACK
    }

    model = {
      start: function() {
        phone.post({type: 'play'});
        return model;
      },

      restart: function() {
        // restart iframe'd model I'm not sure if this should mean 'reset' or not
        phone.post({type: 'reset'});
        return model;
      },

      stop: function() {
        // stop the iframe'd model
        // TODO #1 we might want to set stopped to true here.
        // in the playback-support for other models isStopped checks for 'stopRequest'
        // which is set as soon as stop is called.
        // TODO #2 we are not notifying about the stop event until we hear from
        // the model that it is stopped. We should check if that is best approach.
        // It is possible that some data events will be sent out even after stop
        // is called so it might be best to leave this as is. Because of javascript single
        // threading it seems unlikely this would be a problem in a regular model.
        phone.post({type: 'stop'});
        return model;
      },

      isStopped: function () {
        return stopped;
      },

      set iframePhone(_phone){
        phone = _phone;
        addListeners();
      },

      serialize: function () {
        // TODO: obviously it's not a real serialization.
        return initialProperties;
      },

      get iframePhone(){
        return phone;
      }
    };

    dispatchSupport.mixInto(model);
    propertySupport.mixInto(model);
    parameterSupport.mixInto(model);

    if (metadata) {
      defineBuiltinProperties({
        propertySupport: propertySupport,
        metadata: metadata,
        initialProperties: initialProperties
      });
    }

    // HACK to play with properties
    model.defineParameter('pressure', {
        label: 'Pressure',
      }, undefined);
    // END OF HACK

    // The default model controller asumes 'tick' is a defined event
    // the playback controller assumes 'play' and 'stop' are defined even if the viewOptions
    // disable these buttons
    // the outer iframe in the interactives browser expects a 'reset', 'stepForward', 'stepBack' event type
    dispatchSupport.addEventTypes('tick', 'tickStart', 'play', 'stop', 'reset', 'stepForward', 'stepBack');

    /*
    Options for starting on property support:
    - add a hard-coded outputProperty that reads from a cached value, and start a timer to trigger
      the method that notifies all outputProperty listereners
    - add a hard-coded parameter, that we update based on a property listener

    Possible next steps:
    - make paramaters, outputProperties, or mainProperties be more dynamic so they are 'defined'
      in the iframe-model json definition.
    - create a way for the iframe'd html to send the property definition, which the model then uses
      to add the properties to itself. This will keep the properties in the same place as the model
      and possible enable the model to more easily be used in a different container other than Lab.

    Possible problems:
    - properites will need to be 'cached' in the interactive window, so that getters will work. the
      property system already has support for caching. But it means that all properties are going to
      have to be sent 'over the wire' whenever they are changed inorder for getters to work. If
      the model json or interactive defines which properties are needed then this might not be a problem,
      but if the properties are provided by the iframe'd html, it won't know what is needed so it will
      send all properties.
    */

    return model;
  };
});
