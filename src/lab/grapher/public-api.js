/*global define: false, window: false */

define(function (require) {
  'use strict';
  var
    config  = require('../lab.config'),
    BarGraphModel = require('grapher/bar-graph/bar-graph-model'),
    BarGraphView  = require('grapher/bar-graph/bar-graph-view'),
    Graph = require('lab-grapher');

  // Finally, export API to global namespace.
  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  // Export this API under 'grapher' name.
  window.Lab.grapher = window.Lab.grapher || {};
  window.Lab.grapher.BarGraphModel = BarGraphModel;
  window.Lab.grapher.BarGraphView = BarGraphView;
  window.Lab.grapher.Graph = Graph;
  // Export config modules.
  window.Lab.config = config;

  // Also return public API as module.
  return window.Lab.grapher;
});
