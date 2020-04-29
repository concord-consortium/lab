// Setup libraries that used to be required directly in the script tag.
// Note that there are two D3 versions available in this project. webpack.config.js sets an alias pointing to vendor/d3 submodule, as DNA renderer doesn't work
// with D3 newer than v3.3.8. But v3.3.8 won't work with with modern build tools and recent Node versions (e.g. 10 and 12). So we have to use different version
// (v3.5.17) in the testing environment (it's specified in package.json in devDependencies).
import "d3";
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
