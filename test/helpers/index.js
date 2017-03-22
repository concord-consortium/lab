/*global sinon $ window*/
var fs = require('fs');

/**
  Sets up a simulated browser environment using jsdom, layout.html, jQuery, and d3.
*/
exports.setupBrowserEnvironment = function() {
  require('../env');
  global.alert = function() {};
};

/**
  Performs "continuation" (presumably some kind of operation that causes interactives controller
  to load a model) with a stubbed XHR, then unstubs XHR and calls the XHR completion callback with
  the passed-in model.
*/
exports.withModel = function(model, continuation) {
  var doneCallback, stub;

  stub = sinon.stub($, 'get').returns({
      done: function(callback) {
        doneCallback = callback;
        return { fail: function(){ } };
      }
  });

  continuation();
  stub.restore();
  doneCallback(model);
};

/**
  Returns JSON model specification for a model file located in test/fixtures/models and named
  either *.json or *.mml
*/
exports.getModel = function(filename) {
  if (endsWith(filename, '.json')) {
    return JSON.parse(getModelJSONFromFile(filename));
  } else if (endsWith(filename, '.mml')) {
    return getModelJSONFromMMLFile(filename);
  } else {
    throw new Error("getModel helper: was asked to load \"" + filename + "\" but need a filename ending in .json or .mml");
  }
};

/**
  Returns a freshly imported 'requirejs' and configures it using the labConfig defined in test/

  Use this in any test which modifies the requirejs config (for example to mock dependencies
  by defining a substitute module and mapping it to the real module name by manipulating requirejs'
  'map' config)
*/
exports.getRequireJS = function() {
  // Forces reloading of the cached requirejs module
  delete require.cache[require.resolve('requirejs')];

  var windowBackup,
      config,
      requirejs,
      markdown;

  // Workaround for new RequireJS version.
  // When window / document is defined, RequireJS will assume
  // that it's executed in the browser environment.
  // So, if we setup document earlier (jsdom), hide
  // it for a while to fool RequireJS.
  if (typeof window !== 'undefined') {
    windowBackup = window;
    window = undefined;
    document = undefined;
  }

  config    = require('../requirejs-config');
  requirejs = require('requirejs');
  requirejs.config(config.labConfig);

  if (typeof windowBackup !== 'undefined') {
    window = windowBackup;
    document = window.document;
  }

  // Markdown library in node.js environment provides a different namespace
  // than in the browser (one level higher). So, in node.js go one level
  // deeper to ensure that we use the same API in both environments and
  // automated tests work fine.
  markdown = require('markdown');
  requirejs.define('markdown', [], function() { return markdown.markdown; });

  return requirejs;
};

/**
  Passes a freshly created 'requirejs' to 'continuation' which may modify its requirejs config
  freely. Subsequently sets the global 'requirejs' to a fresh instance of requirejs unaffected
  by the changed config. (Note that it appears that you cannot reuse the original requirejs import.)
*/
exports.withIsolatedRequireJS = function(continuation) {
  continuation(exports.getRequireJS());
  // It turns out that, having deleted the old requirejs module from Node's require cache, we can't
  // keep using the reference to it which we still have (tests break when I try to do so). However,
  // a freshly created 'requirejs' global works fine.
  global.requirejs = exports.getRequireJS();
};

/**
  Passes a freshly created 'requirejs' to 'continuation' which may modify its requirejs config
  freely. This functions also mocks a lot of view-related dependencies. Some of them are
  problematic because JSDOM doesn't support SVG 1.1 spec (graphs, MD2D Renderer).

  Subsequently sets the global 'requirejs' to a fresh instance of requirejs unaffected
  by the changed config. (Note that it appears that you cannot reuse the original requirejs import.)
*/
exports.withIsolatedRequireJSAndViewsMocked = function(continuation) {
  var requirejs = exports.getRequireJS(),
      BarGraphView = function() {
        return {
          initialize: function() {},
          render: function() {},
          updateBar: function() {},
          getParentHeight: function() {},
          getParentWidth: function() {},
          modelChanged: function() {},
          $el: $("<div></div>")
        };
      },
      NumericOutputView = function() {
        return {
          render: function() { return $("<div></div>"); },
          resize: function() {},
          update: function() {},
          updateLabel: function() {},
          updateUnits: function() {}
        };
      },
      Graph = function() {
        return {
          new_data: function() {},
          addPoints: function() {},
          addPointListener: function() {},
          updateOrRescale: function() {},
          showMarker: function() {},
          reset: function() {},
          resetPoints: function() {},
          resize: function() {},
          repaint: function() {},
          xLabel: function() {},
          yLabel: function() {},
          xDomain: function() {
            return [0, 10];
          },
          yDomain: function() {
            return [0, 10];
          }
        };
      },
      SVGContainer = function () {
        return {
          setup: function() {},
          repaint: function() {},
          bindModel: function() {},
          getHeightForWidth: function(width) { return width; },
          resize: function() {},
          $el: $('<div id="model-container"></div>')
        };
      },
      Renderer = function() {
        return {
          update: function() {},
          repaint: function() {},
          bindModel: function() {},
          model2px: function() {},
          model2pxInv: function() {}
        };
      },
      FastClick = {
        attach: function() {}
      },
      // Mock playback as it uses canvas unsupported by JSDOM.
      PlaybackController = function() {
        return {
          getViewContainer: function() {
            return $("<div>");
          }
        };
      },
      languageSelect = function() {};

  // Mock dependencies.
  requirejs.define('lab-grapher', [], function() { Graph.i18n = {}; return Graph; });
  requirejs.define('grapher/bar-graph/bar-graph-view', [], function() { return BarGraphView; });
  requirejs.define('common/views/numeric-output-view', [], function() { return NumericOutputView; });
  requirejs.define('models/md2d/views/renderer', [], function() { return Renderer; });
  requirejs.define('common/views/svg-container', [], function() { return SVGContainer; });
  requirejs.define('fastclick', [], function() { return FastClick; });
  requirejs.define('common/controllers/playback-controller', [], function() { return PlaybackController; });
  requirejs.define('common/controllers/language-select', [], function() { return languageSelect; });
  // Speedup semantic layout calculations. We need elements in DOM, but don't care about their
  // positions and real layout.
  requirejs('common/layout/semantic-layout-config').iterationsLimit = 0;
  // Execute 'continuation' with prepared requirejs instance.
  continuation(requirejs);
  // It turns out that, having deleted the old requirejs module from Node's require cache, we can't
  // keep using the reference to it which we still have (tests break when I try to do so). However,
  // a freshly created 'requirejs' global works fine.
  global.requirejs = exports.getRequireJS();
};

// helpers helpers
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getModelJSONFromMMLFile(mmlFileName) {
  require('coffee-script/register');

  var parseMML    = require('../../src/helpers/md2d/mml-parser').parseMML,
      mmlPath     = 'test/fixtures/models/' + mmlFileName,
      mmlContents = fs.readFileSync(mmlPath).toString(),
      results     = parseMML(mmlContents);

  return results.json;
}

function getModelJSONFromFile(modelFileName) {
  var modelPath = 'test/fixtures/models/' + modelFileName;

  return fs.readFileSync(modelPath).toString();
}
