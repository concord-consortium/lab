var fs = require('fs');
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

// helpers helpers
function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getModelJSONFromMMLFile(mmlFileName) {
  var parseMML    = require('../../src/helpers/md2d/md2d-node-api').parseMML,
      mmlPath     = 'test/fixtures/models/' + mmlFileName,
      mmlContents = fs.readFileSync(mmlPath).toString(),
      results     = parseMML(mmlContents);

  return results.json;
}

function getModelJSONFromFile(modelFileName) {
  var modelPath = 'test/fixtures/models/' + modelFileName;

  return fs.readFileSync(modelPath).toString();
}
