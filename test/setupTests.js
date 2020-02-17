// Make these global and therefore predefined in Mocha tests:
global.sinon = require('sinon');

// The following is required because the require('should') defines a getter-only property called
// 'should' on Object.prototype. Since the global object inherits from Object, it becomes impossible
// therefore to set the global variable 'should'. But we can fight fire with fire, and fix it by
// using Object.defineProperty ourselves.
Object.defineProperty(global, 'should', { value: require('should') });

// Sizzle is required for d3 to work well in a jsdom environment.
global.Sizzle = require('sizzle');
// Set up any vendored libraries that are normally included via script tag in the modules under test:
global.d3 = require("d3");
global.$ = global.jQuery = require("jquery");
// Setup libraries which depend on jQuery.
require("jquery-ui-dist/jquery-ui");
require("../public/lab/vendor/jquery-context-menu/jquery.contextMenu.js");
require("../public/lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js");

// Additional environment features for testing.
require("./env-assert");

// Always mock some libraries that won't work in the test environment.
jest.mock("lab-grapher");
jest.mock("grapher/bar-graph/bar-graph-view");
jest.mock("common/views/numeric-output-view");
jest.mock("models/md2d/views/renderer");
jest.mock("common/views/svg-container");
jest.mock("common/controllers/playback-controller");
jest.mock("common/controllers/language-select");
jest.mock("i18next");
jest.mock("sensor-applet");
jest.mock("sensor-connector-interface");
jest.mock("labquest2-interface");
jest.mock("fastclick");

// Speed up tests a lot by disabling layout calculations.
import layoutConfig from "common/layout/semantic-layout-config";
layoutConfig.iterationsLimit = 0;

// Mock missing JSDOM features.
document.elementFromPoint = () => document;
window.alert = () => {};
