/*global define: false, window: false */

define(function (require) {
  'use strict';

  window.Lab = window.Lab || {};

  var appletClasses = require('sensor-applet/applet-classes'),
      errors        = require('sensor-applet/errors');

  return window.Lab.sensorApplet = {
    version: "1.0.0",
    // ==========================================================================
    // Functions and modules which should belong to this API:

    // Classes used to work with the sensors
    GoIO:                      appletClasses.goio,
    LabQuest:                  appletClasses.labquest,

    // Listing of supported sensors, you need to set the measurementType on a
    // SensorApplet instance before calling append. The keys of the sensorDefinitions
    // map are the supported measurementType values.
    sensorDefinitions:         require('sensor-applet/sensor-definitions'),
    unitsDefinition:           require('sensor-applet/units-definition'),

    // Error Classes. These are returned to appendCallback or thrown by some of
    // the API methods.
    JavaLoadError:             errors.JavaLoadError,
    AppletInitializationError: errors.AppletInitializationError,
    SensorConnectionError:     errors.SensorConnectionError
    // ==========================================================================
  };
});
