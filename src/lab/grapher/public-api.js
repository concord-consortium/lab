/*globals define: false, window: false */

define(function (require) {
  'use strict';
  var
    graph                   = require('grapher/core/graph'),
    realTimeGraph           = require('grapher/core/real-time-graph'),
    axis                    = require('grapher/core/axis'),
    colors                  = require('grapher/core/colors'),
    data                    = require('grapher/core/data'),
    indexedData             = require('grapher/core/indexed-data'),
    registerKeyboardHandler = require('grapher/core/register-keyboard-handler'),
    // Object to be returned.
    publicAPI;

  publicAPI = {
    version: "0.0.1",
    // ==========================================================================
    // Add functions and modules which should belong to this API:
    // - graph constructor,
    graph: graph,
    // - realTimeGraph constructor,
    realTimeGraph: realTimeGraph,
    // - axis module,
    axis: axis,
    // - colors function,
    colors: colors,
    // - data function,
    data: data,
    // - indexedData function,
    indexedData: indexedData,
    // - registerKeyboardHandler function,
    registerKeyboardHandler: registerKeyboardHandler
    // ==========================================================================
  };

  // Finally, export API to global namespace.
  // Export this API under 'grapher' name.
  window.grapher = publicAPI;

  // Also return publicAPI as module.
  return publicAPI;
});
