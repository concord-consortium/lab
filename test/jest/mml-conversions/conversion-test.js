import parseMML from "mml-converter/mml-converter";
const fs = require("fs");
const assert = require("assert");

describe("MML to JSON Conversion", () => {
  const testDir = "./test/fixtures/mml-conversions/";
  it("converted mml files match expected output", () => {
    const mmlFiles = fs.readdirSync(testDir + "input-mml/");
    for (let i = 0, ii = mmlFiles.length; i < ii; i++) {
      const mmlFile = mmlFiles[i];
      if (mmlFile[0] === ".") continue; // skip hidden files, e.g. .DS_Store
      const mml = fs.readFileSync(testDir + "input-mml/" + mmlFile).toString();
      const modelName = /\/?([^\/]*)\.mml/.exec(mmlFile)[1];

      const conversion = parseMML(mml);

      assert(conversion.errors === undefined, "The file " + modelName + " failed to convert: " + conversion.errors);
      const convertedModel = conversion.json;
      assert(convertedModel, "JavaScript error in conversion");

      const expectedModelJson = fs.readFileSync(testDir + "expected-json/" + modelName + ".json").toString();
      const expectedModel = JSON.parse(expectedModelJson);
      assert.deepEqual(convertedModel, expectedModel,
        "\n===> the expected conversion " + modelName + "\n" + JSON.stringify(expectedModel, null, 2) + "\n\n===> does not match actual conversion: \n" + JSON.stringify(convertedModel, null, 2) + "\n" +
        "\n===> the expected conversion does not match actual conversion for: " + modelName + "\n\n");
    }
  });
});
