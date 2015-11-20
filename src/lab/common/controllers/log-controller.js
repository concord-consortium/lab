/*global define*/
/*jslint boss: true*/

define(function (require) {
  var iframePhone = require('iframe-phone');
  var dgExporter = require('import-export/dg-exporter');

  // Keep iframe phone and laraLoggerReady global. We need to reuse a single iframe phone.
  // Parent logger doesn't care whether interactive or model has been reloaded, it just expects messages.
  // Also, it sends 'lara-logging-present' message just once.
  var _phone = null;
  var laraLoggerReady = false;
  function getLARAPhone() {
    if (!_phone) {
      _phone = new iframePhone.IframePhoneRpcEndpoint(function (message, callback) {
        if (message && message.message === 'lara-logging-present') {
          laraLoggerReady = true;
        }
        callback();
      }, 'lara-logging', window.parent);
    }
    return _phone;
  }

  // Handles logging of events to LARA or CODAP.
  function LogController(args) {
    var config = args.config;
    this.enabled = config.enabled;
    // Use either provided list of properties bound to components (widgets) or list specified explicitly in config.
    this._properties = config.properties === 'boundToComponents' ? args.boundProperties : config.properties;
    this._interactivesController = args.interactivesController;
    this._model = null;
    
    // Two possible parents that listen to our logs - LARA or CODAP.
    this._laraPhone = getLARAPhone();
    dgExporter.init();
    
    this._interactivesController.on('modelLoaded.logController', this._modelLoadedHandler.bind(this));
    this._interactivesController.on('interactiveWillReload.logController', this._interactiveWillReloadHandler.bind(this));

    this._setupComponents(args.componentByID, config.components);
    this._enableLoggingIn(args.additionalComponents);
  }

  LogController.prototype.logAction = function (action, data) {
    // Iframe phones might not be initialized yet. In theory we can miss some interaction, but in practice
    // it's not possible that user interacts with components before communication between Lab and parent
    // is initialized. Also, even if it was possible, we couldn't do much about it.
    if (!this.enabled) return;

    var logString = action;
    // Weird format, CODAP legacy. But it works.
    // LARA doesn't accept logs if they don't include ":" character. Make sure it's always present.
    // Once this https://github.com/concord-consortium/lara/pull/137 is merged, it's no longer important.
    logString += ': ' + JSON.stringify(data || {});

    this._logToLARA(logString);
    this._logToCODAP(logString);
  };

  LogController.prototype._logToLARA = function (logString) {
    if (!laraLoggerReady) return; // LARA logger unavailable
    this._laraPhone.call({
      action: 'logAction',
      args: {
        formatStr: logString
      }
    });
  };

  LogController.prototype._logToCODAP = function (logString) {
    dgExporter.logAction(logString);
  };

  LogController.prototype._setupComponents = function (componentByID, enabledComponents) {
    if (enabledComponents === 'none' || enabledComponents === []) return;
    if (enabledComponents === 'all') {
      enabledComponents = Object.keys(componentByID);
    }
    var componentsList = [];
    enabledComponents.forEach(function (compID) {
      componentsList.push(componentByID[compID]);
    });
    this._enableLoggingIn(componentsList);
  };

  LogController.prototype._enableLoggingIn = function (componentsList) {
    var logFunction = this.logAction.bind(this);
    componentsList.forEach(function (comp) {
      // Enable logging and provide function that component can use to log its own events.
      if (comp && comp.enableLogging) {
        comp.enableLogging(logFunction);
      }
    });
  };

  LogController.prototype._interactiveWillReloadHandler = function () {
    // We can log ReloadedInteractive before it actually happens, it's just simpler.
    this.logAction('ReloadedInteractive', this._getProperties());
  };

  LogController.prototype._modelLoadedHandler = function (cause) {
    this._model = this._interactivesController.getModel();

    this._model.on('play.logController', function () {
      this.logAction('StartedModel', this._getProperties());
    }.bind(this));

    this._model.on('stop.logController', function () {
      this.logAction('StoppedModel', this._getProperties());
    }.bind(this));

    this._model.on('willReset.logController', function() {
      // We can log ReloadedModel before it actually happens, it's just simpler.
      // Note that when user cancels reload (e.g. inside CODAP), this even is not emitted.
      this.logAction('ReloadedModel', this._getProperties());
    }.bind(this));
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

    this._properties.forEach(function (prop) {
      propData[getLabelForProperty(prop)] = model.get(prop)
    });
    return propData;
  };

  return LogController;
});
