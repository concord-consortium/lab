import config from 'lab.config';
import BarGraphModel from 'grapher/bar-graph/bar-graph-model';
import BarGraphView from 'grapher/bar-graph/bar-graph-view';
import Graph from 'lab-grapher';

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
