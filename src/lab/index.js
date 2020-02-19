// import it for side effects, d3 will get added to window namespace
import d3 from "d3";
import version from 'lab.version';
import config from 'lab.config';
import InteractivesController from 'common/controllers/interactives-controller';
import benchmark from 'common/benchmark/benchmark';
import codapInterface from 'import-export/codap-interface';
import netlogoImporter from 'import-export/netlogo-importer';

// Create or get 'Lab' global object (namespace).
window.Lab = window.Lab || {};
window.Lab.version = version;
window.Lab.config = config;
window.Lab.InteractivesController = InteractivesController;
window.Lab.benchmark = benchmark;
window.Lab.importExport = {
  codapInterface,
  netlogoImporter
};

// This will automatically extend Lab public API with Grapher API.
import 'grapher/index';
