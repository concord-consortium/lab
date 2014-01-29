require('coffee-script/register');

var mmlParser = require('../../../src/helpers/md2d/mml-parser'),
    fs = require("fs"),

    vows = require("vows"),
    assert = require("assert"),

    suite = vows.describe('helpers/md2d/mml-parser');

suite.addBatch({
  "MML to JSON Conversion": {
    topic: './test/fixtures/mml-conversions/',

    "converted mml files match expected output": function(testDir) {
      var mmlFiles = fs.readdirSync(testDir + "input-mml/"),
          mml, mmlFile, modelName, conversion, expectedStr, convertedStr,
          i, ii;
      for (i=0, ii=mmlFiles.length; i<ii; i++) {
        mmlFile = mmlFiles[i];
        if (mmlFile[0] === '.') continue; // skip hidden files, e.g. .DS_Store
        mml = fs.readFileSync(testDir + "input-mml/" + mmlFile).toString();
        modelName = /\/?([^\/]*)\.mml/.exec(mmlFile)[1];

        conversion = mmlParser.parseMML(mml);

        assert(conversion.errors == undefined, "The file "+modelName+" failed to convert: "+conversion.errors);

        convertedModel = conversion.json;

        assert(convertedModel, "JavaScript error in conversion");

        expectedModelJson = fs.readFileSync(testDir + "expected-json/" + modelName + ".json").toString();
        expectedModel = JSON.parse(expectedModelJson);
        assert.deepEqual(convertedModel, expectedModel,
            "\n===> the expected conversion "+modelName+"\n" +JSON.stringify(expectedModel, null, 2) +"\n\n===> does not match actual conversion: \n" + JSON.stringify(convertedModel, null, 2)+"\n" +
            "\n===> the expected conversion does not match actual conversion for: " + modelName + "\n\n");
      }
    }
  }

});


suite.export(module);
