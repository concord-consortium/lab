/*global define*/
/*jslint boss: true*/

define(function (require) {
  var iframePhone = require('iframe-phone');
  var dgExporter = require('import-export/dg-exporter');

  // Handles logging of events to LARA or CODAP.
  function LogController(args) {
    var config = args.config;
    this.enabled = config.enabled;
    // Use either provided list of properties bound to components (widgets) or list specified explicitly in config.
    this._properties = config.properties === 'boundToComponents' ? args.boundProperties : config.properties;
    this._interactivesController = args.interactivesController;
    this._model = null;
    
    // Two possible parents that listen to our logs - LARA or CODAP.
    this._phone = iframePhone.getIFrameEndpoint();
    // IFrameEndpoint is a singleton and probably has been already initialized by ParentMessageAPI,
    // but do it again just in case (so we don't depend on ParentMessageAPI).
    this._phone.initialize();
    dgExporter.init();
    
    this._interactivesController.on('modelLoaded.logController', this._modelLoadedHandler.bind(this));
    this._interactivesController.on('interactiveWillReload.logController', this._interactiveWillReloadHandler.bind(this));

    this._setupComponents(args.componentByID, config.components);
    this._enableLoggingIn(args.additionalComponents);
  }

  LogController.prototype.logAction = function (action, data) {
    if (!this.enabled) return;

    if (dgExporter.isEmbeddedInCODAP()) {
      this._logToCODAP(action, data);
    } else {
      this._genericLog(action, data);
    }
  };

  LogController.prototype._genericLog = function (action, data) {
    this._phone.post('log', {action: action, data: data});
  };

  LogController.prototype._logToCODAP = function (action, data) {
    var logString = action;
    if (data) {
      logString += ': ' + JSON.stringify(data);
    }
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

    this._model.on('log.logController', function (action, data) {
      // Models can log custom events too using dispatch. Just pass them to the parent.
      this.logAction(action, data);
    }.bind(this));

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
