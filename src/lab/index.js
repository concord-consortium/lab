/*global define: false */

import $__lab_version from 'lab.version';
import $__lab_config from 'lab.config';
import $__common_controllers_interactives_controller from 'common/controllers/interactives-controller';
import $__common_benchmark_benchmark from 'common/benchmark/benchmark';
import $__grapher_public_api from 'grapher/public-api';
import $__import_export_public_api from 'import-export/public-api';
var version = $__lab_version,
  config = $__lab_config,
  InteractivesController = $__common_controllers_interactives_controller,
  benchmark = $__common_benchmark_benchmark;

// Require public-api modules.
$__grapher_public_api;
$__import_export_public_api;

// Create or get 'Lab' global object (namespace).
window.Lab = window.Lab || {};
window.Lab.version = version;
window.Lab.config = config;
window.Lab.InteractivesController = InteractivesController;
window.Lab.benchmark = benchmark;
