/*global define: false */

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
define(function(require) {

  var LabModelerMixin = require('common/lab-modeler-mixin');
  var metadata        = require('models/iframe/metadata');

  function IFrameModel(initialProperties) {
    var labModelerMixin = new LabModelerMixin({
      metadata: metadata,
      initialProperties: initialProperties,
      usePlaybackSupport: false
    });

    labModelerMixin.mixInto(this);
    // Use custom .set() instead of one provided by property support module.
    // Custom version is also a bit looser, it lets you define properties dynamically.
    // Setter of newly added property will post message to iframe model.
    this.set = customSet;

    this._phone = null;
    this._stopped = true;
    this._initialProperties = initialProperties;
    this._propertySupport = labModelerMixin.propertySupport;
    this._dispatch = labModelerMixin.dispatchSupport;

    // The default model controller asumes 'tick' is a defined event
    // the playback controller assumes 'play' and 'stop' are defined even if the viewOptions
    // disable these buttons
    // the outer iframe in the interactives browser expects a 'reset', 'stepForward', 'stepBack' event type
    this._dispatch.addEventTypes('tick', 'tickStart', 'tickEnd', 'play', 'stop', 'reset', 'stepForward', 'stepBack');

    // HACK to play with properties
    this.defineParameter('pressure', {
      label: 'Pressure',
    }, undefined);
    // END OF HACK
  }

  function customSet(key, value) {
    var context = this;
    if (typeof key !== 'string') {
      var hash = key;
      Object.keys(hash).forEach(function (key) {
        context.set(key, hash[key]);
      });
      return;
    }

    if (!this.hasProperty(key)) {
      this._propertySupport.defineProperty(key, {
        type: "mainProperty",
        writable: true,
        set: function (value) {
          context._phone.post("set", {name: key, value: value});
        },
        includeInHistoryState: false,
        beforeSetCallback: this._propertySupport.invalidatingChangePreHook,
        afterSetCallback: this._propertySupport.invalidatingChangePostHook
      });
    }

    // This will call setter defined above and post message to iframe.
    this.properties[key] = value;
  }

  // If property is not defined in metadata, it means it's a custom property related
  // to specific iframe model. Use custom set method to define it and send message to iframe.
  // labModelerMixin will automatically define and set only properties that are present in metadata.
  IFrameModel.prototype._defineModelSpecificProperties = function() {
    var initialProperties = this._initialProperties;
    var context = this;
    Object.keys(initialProperties).forEach(function (name) {
      if (!metadata.mainProperties[name] && !metadata.viewOptions[name]) {
        context.set(name, initialProperties[name]);
      }
    });
  };

  /**************** public methods ****************/

  IFrameModel.prototype.start = function () {
    this._phone.post({type: 'play'});
    return this;
  };

  IFrameModel.prototype.stop = function () {
    // stop the iframe'd model
    // TODO #1 we might want to set stopped to true here.
    // in the playback-support for other models isStopped checks for 'stopRequest'
    // which is set as soon as stop is called.
    // TODO #2 we are not notifying about the stop event until we hear from
    // the model that it is stopped. We should check if that is best approach.
    // It is possible that some data events will be sent out even after stop
    // is called so it might be best to leave this as is. Because of javascript single
    // threading it seems unlikely this would be a problem in a regular model.
    this._phone.post({type: 'stop'});
    return this;
  };

  IFrameModel.prototype.restart = function () {
    this.stop();
    this.start();
    return this;
  };

  IFrameModel.prototype.isStopped = function () {
    return this._stopped;
  };

  IFrameModel.prototype.serialize = function () {
    // TODO: obviously it's not a real serialization.
    return this._initialProperties;
  };

  Object.defineProperty(IFrameModel.prototype, "iframePhone", {
    set: function (val) {
      this._phone = val;
      this._addListeners();
      this._defineModelSpecificProperties();
    },
    get: function () {
      return this._phone;
    }
  });

  /**************** private methods ****************/

  IFrameModel.prototype._addListeners = function () {
    var context = this;
    this._phone.addListener('play.iframe-model', function () {
      context._stopped = false;
      // notify that we are playing
      context._dispatch.play();
    });
    this._phone.addListener('stop.iframe-model', function () {
      context._stopped = true;
      // notify that we are stopped
      context._dispatch.stop();
    });

    // HACK to play with properties
    this._phone.addListener('propertyValue', function (content) {
      if (content.name === 'pressureProbeFiltered') {
        context.set('pressure', content.value);
      }
    });
    this._phone.post('observe', 'pressureProbeFiltered');
    // END OF HACK
  };

  return IFrameModel;
});
