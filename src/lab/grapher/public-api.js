/*global define: false, window: false */

define(function (require) {
  'use strict';
  var
    graph                   = require('grapher/core/graph'),
    realTimeGraph           = require('grapher/core/real-time-graph'),
    // Object to be returned.
    publicAPI;

  publicAPI = {
    version: "0.0.1",
    // ==========================================================================
    // Add functions and modules which should belong to this API:
    // - graph constructor,
    graph: graph,
    // - realTimeGraph constructor,
    realTimeGraph: realTimeGraph
    // ==========================================================================
  };

  // Finally, export API to global namespace.
  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  // Export this API under 'grapher' name.
  window.Lab.grapher = publicAPI;

  // Also return publicAPI as module.
  return publicAPI;
});
