require("../../env");

var requirejs = require("requirejs"),
    config    = require("../../requirejs-config"),
    fs = require("fs"),
    vows = require("vows"),
    assert = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'md2d/models/modeler',
  'common/array-types'
], function (Model, arrayTypes) {

  var suite = vows.describe("md2d/models/modeler");

  suite.addBatch({
    "Deserialize and serialize": {
      topic: './test/fixtures/mml-conversions/',

      "an instantiated md2d model matches original serialization": function(testDir) {
        // Serialization tests should be disabled for now, as work is in progress.

        var modelJsonFiles = fs.readdirSync(testDir + "expected-json/"),
            modelJsonFile, originalModelJson, modelName, originalModel, model, serializedModel,
            i, ii;
        for (i=0, ii=modelJsonFiles.length; i<ii; i++) {
          modelJsonFile = modelJsonFiles[i];
          console.log(testDir + "expected-json/" + modelJsonFile);
          originalModelJson = fs.readFileSync(testDir + "expected-json/" + modelJsonFile).toString();
          modelName = /\/?([^\/]*)\.json/.exec(modelJsonFile)[1];

          originalModel = JSON.parse(originalModelJson);
          // Overwrite default float format. It's required, as when Float32Array is used,
          // there are some numerical errors involved, which cause that serialize-deserialize
          // tests fail.
          arrayTypes.float = "Float64Array";
          model = new Model(originalModel);
          serializedModel = model.serialize();
          // Delete pairwiseLJProperties array, compare these arrays separately.
          // TODO: implement a special test for these arrays!
          delete originalModel.pairwiseLJProperties;
          delete serializedModel.pairwiseLJProperties;
          assert.deepEqual(originalModel, serializedModel,
              "\n===> the serialized object "+modelName+"\n" +JSON.stringify(serializedModel, null, 2) +"\n\n===> the original object used to create the MD2D model: \n" + JSON.stringify(originalModel, null, 2) + "\n" +
              "\n===> The serialized object does not match the original object used to create the MD2D model: " + modelName +
              "\n     " + testDir + "expected-json/" + modelJsonFile + "\n\n");
        }
      }
    }

  });

  suite.export(module);

});