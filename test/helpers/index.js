var fs = require('fs');

/*global sinon */
/**
  Sets up a simulated browser environment using jsdom, layout.html, jQuery, and d3.
*/
exports.setupBrowserEnvironment = function() {
  require('../env');
  global.alert = function() {};
  global.ACTUAL_ROOT = '';
};

};

/**
  Returns JSON model specification for a model file located in test/fixtures/models and named
  either *.json or *.mml
*/
exports.getModel = function(filename) {
  if (endsWith(filename, '.json')) {
    return getModelJSONFromFile(filename);
  } else if (endsWith(filename, '.mml')) {
    return getModelJSONFromMMLFile(filename);
  } else {
    throw new Error("getModel helper: was asked to load \"" + filename + "\" but need a filename ending in .json or .mml");
  }
};

// helpers helpers
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getModelJSONFromMMLFile(mmlFileName) {
  require('coffee-script');

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
