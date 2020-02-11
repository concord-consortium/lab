/*global define: false, window: false */

import $_____lab_config from 'lab.config';
import $__grapher_bar_graph_bar_graph_model from 'grapher/bar-graph/bar-graph-model';
import $__grapher_bar_graph_bar_graph_view from 'grapher/bar-graph/bar-graph-view';
import $__lab_grapher from 'lab-grapher';

var
  config = $_____lab_config,
  BarGraphModel = $__grapher_bar_graph_bar_graph_model,
  BarGraphView = $__grapher_bar_graph_bar_graph_view,
  Graph = $__lab_grapher;

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
export default window.Lab.grapher;
