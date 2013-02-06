/*global define: false, window: false */

define(function (require) {
  'use strict';
  var
    version = require('../lab.version'),
    config  = require('../lab.config'),
    graph         = require('grapher/core/graph'),
    realTimeGraph = require('grapher/core/real-time-graph'),
    BarGraphModel = require('grapher/bar-graph/bar-graph-model'),
    BarGraphView  = require('grapher/bar-graph/bar-graph-view'),
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
    // - bar graph model,
    BarGraphModel: BarGraphModel,
    // - bar graph view.
    BarGraphView: BarGraphView
    // ==========================================================================
  };

  // Finally, export API to global namespace.
  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  // Export config modules.
  window.Lab.config = config;

  // Export this API under 'grapher' name.
  window.Lab.grapher = publicAPI;

  // Also return publicAPI as module.
  return publicAPI;
});
