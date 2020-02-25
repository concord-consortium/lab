// Setup libraries that used to be required directly in the script tag.
import d3 from "d3";
import "jquery-ui-dist/jquery-ui";
import "jquery-ui-touch-punch";
import "jquery-contextmenu";
import "selectboxit/src/javascripts/jquery.selectBoxIt";

import version from 'lab.version';
import config from 'lab.config';
import InteractivesController from 'common/controllers/interactives-controller';
import benchmark from 'common/benchmark/benchmark';
import codapInterface from 'import-export/codap-interface';
import netlogoImporter from 'import-export/netlogo-importer';

window.d3 = d3;
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
