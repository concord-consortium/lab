/*globals d3, model */

require("../../env");

var requirejs = require("requirejs"),
    config    = require("../../requirejs-config"),
    fs = require("fs"),
    vows = require("vows"),
    assert = require("assert");

// Use Lab RequireJS configuration.
requirejs.config(config.labConfig);

requirejs([
  'md2d/models/modeler'
], function (Model) {

  var suite = vows.describe("md2d/models/modeler");

  suite.addBatch({
    "Deserialize and serialize": {
      topic: './test/vows/mml-conversions/',

      "an instantiated md2d model matches original serialization": function(testDir) {
        var modelJsonFiles = fs.readdirSync(testDir + "expected-json/"),
            modelJsonFile, modelName, conversion, expectedStr, convertedStr,
            i, ii;
        for (i=0, ii=modelJsonFiles.length; i<ii; i++) {
          modelJsonFile = modelJsonFiles[i];
          console.log(testDir + "expected-json/" + modelJsonFile);
          originalModelJson = fs.readFileSync(testDir + "expected-json/" + modelJsonFile).toString();
          modelName = /\/?([^\/]*)\.json/.exec(modelJsonFile)[1];

          originalModel = JSON.parse(originalModelJson);
          model = new Model(originalModelJson);
          serializedModel = model.serialize(true);
          assert.deepEqual(originalModel, serializedModel,
              "\n===> the serialized object "+modelName+"\n" +JSON.stringify(originalModel, null, 2) +"\n\n===> the original object used to create the MD2D model: \n" + JSON.stringify(serializedModel, null, 2) + "\n" +
              "\n===> The serialized object does not match the original object used to create the MD2D model: " + modelName +
              "\n     " + testDir + "expected-json/" + modelJsonFile + "\n\n");
        }
      }
    }

  });

  suite.export(module);

});