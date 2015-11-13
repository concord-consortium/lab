/*global define*/
/*jslint boss: true*/

define(function (require) {
  var iframePhone = require('iframe-phone');

  // Keep iframe phone and parentLoggerReady global. We need to reuse a single iframe phone.
  // Parent logger doesn't care whether interactive or model has been reloaded, it just expects messages.
  // Also, it sends 'lara-logging-present' message just once.
  var _phone = null;
  var parentLoggerReady = false;
  function getPhone() {
    if (!_phone) {
      _phone = new iframePhone.IframePhoneRpcEndpoint(function (message, callback) {
        if (message && message.message === 'lara-logging-present') {
          parentLoggerReady = true;
        }
        callback();
      }, 'lara-logging', window.parent);
    }
    return _phone;
  }

  function LogController(config, interactivesController, componentByID) {
    this._config = config;
    this._interactivesController = interactivesController;
    this._model = null;
    this._phone = getPhone();

    this._interactivesController.on('modelLoaded.logController', this._modelLoadedHandler.bind(this));
    this._setupComponents(componentByID);
  }

  LogController.prototype.logAction = function (action, data) {
    // Phone might not be initialized yet. In theory we can miss some interaction, but in practice it's
    // not possible that user interacts with Lab before communication between Lab and parent is initialized.
    // Also, even if it was possible, we couldn't do much about it.
    if (!parentLoggerReady) return;

    var logString = action;
    // Weird format, CODAP legacy. But it works.
    if (data) logString += ': ' + JSON.stringify(data);
    this._phone.call({
      action: 'logAction',
      args: {
        formatStr: logString
      }
    });
  };

  LogController.prototype._setupComponents = function (componentByID) {
    var logFunction = this.logAction.bind(this);
    this._config.components.forEach(function (compID) {
      var comp = componentByID[compID];
      // Enable logging and provide function that component can use to log its own events.
      if (comp.enableLogging) {
        comp.enableLogging(logFunction);
      }
    });
  };

  LogController.prototype._modelLoadedHandler = function (cause) {
    this._model = this._interactivesController.getModel();

    this._model.on('play.logController', function () {
      this.logAction('StartedModel', this._getProperties());
    }.bind(this));

    this._model.on('stop.logController', function () {
      this.logAction('StoppedModel', this._getProperties());
    }.bind(this));

    var savedParameters = null;
    this._model.on('willReset.logController', function() {
      savedParameters = this._getProperties();
    }.bind(this));

    if (cause === 'reload') {
      this.logAction('ReloadedModel', savedParameters);
    }
  };


  LogController.prototype._getProperties = function () {
    var model = this._model;
    var propData = {};
    function getLabelForProperty(property) {
      var desc = model.getPropertyDescription(property);
      var label = desc && desc.getLabel();
      var units = desc && desc.getUnitAbbreviation();
      var ret   = "";
      if (label && label.length > 0) {
        ret += label;
      } else {
        ret += property;
      }
      if (units && units.length > 0) {
        ret += " (" + units + ")";
      }
      return ret;
    }

    this._config.properties.forEach(function (prop) {
      propData[getLabelForProperty(prop)] = model.get(prop)
    });
    return propData;
  };

  return LogController;
});
