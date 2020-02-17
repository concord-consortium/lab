const fs = require("fs");
const assert = require("assert");
import Model from "../../../src/lab/models/energy2d/modeler";
import arrayTypes from "../../../src/lab/common/array-types";

describe("Energy2D modeler deserialization and serialization", function () {
  const path = "./test/fixtures/e2d-conversion";

  beforeAll(() => // Overwrite default float arrays type. It's required, as when Float32Array is used,
    // there are some numerical errors involved, which cause that serialize-deserialize
    // tests fail.
    arrayTypes.floatType = "Float64Array");

  const compareVertices = function (org, ser) {
    org = org.split(", ");
    ser = ser.split(", ");
    return __range__(0, org.length, false).map((i) =>
      assert.equal(Number(ser[i]), Number(org[i])));
  };


  it("an instantiated E2D model should match original serialization", function () {
    const inputFiles = fs.readdirSync(path);

    for (let inputFile of inputFiles) {
      const originalModelJSON = fs.readFileSync(`${path}/${inputFile}`).toString();
      const originalModel = JSON.parse(originalModelJSON);

      const model = new Model(originalModel);
      var serializedModel = model.serialize();

      // Test polygons' vertices string separately, due to different possible
      // rounding of numbers (e.g. 5 vs 5.0).
      if ((originalModel.structure != null) && (originalModel.structure.part != null)) {
        originalModel.structure.part.forEach(function (p, i) {
          if (p.shapeType === "polygon") {
            compareVertices(p.vertices, serializedModel.structure.part[i].vertices);
            delete p.vertices;
            return delete serializedModel.structure.part[i].vertices;
          }
        });
      }

      // Basic test of the rest of the models.
      assert.deepEqual(serializedModel, originalModel,
        `\n===> the serialized object:\n${JSON.stringify(serializedModel, null, 2)} \
\n===> the original object used to create the E2D model:\n${JSON.stringify(originalModel, null, 2)} \
\n\nThe serialized object does not match the original object used to create the E2D model: ${path}/${inputFile}`
      );
    }

  });
});

function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}
