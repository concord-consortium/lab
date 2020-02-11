/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const fs      = require('fs');
const assert  = require('assert');
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

const Model      = requirejs('models/md2d/models/modeler');
const arrayTypes = requirejs('common/array-types');

describe("MD2D modeler deserialization and serialization", function() {
  const path = './test/fixtures/mml-conversions/';

  const compareUnorderedArrays = function(array1, array2, isEqual, errorMsg) {
    if ((errorMsg == null)) { errorMsg = "Arrays are different!"; }

    if (array1.length !== array2.length) {
      throw new Error(errorMsg);
    }

    const found = [];
    return (() => {
      const result = [];
      for (let obj1 of array1) {
        let isOK = false;
        for (let idx2 = 0; idx2 < array2.length; idx2++) {
          const obj2 = array2[idx2];
          if (isEqual(obj1, obj2) && !found[idx2]) {
            found[idx2] = true;
            isOK = true;
            break;
          }
        }
        if (!isOK) {
          throw new Error(errorMsg);
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  };

  const ljPropsEql = function(lj1, lj2) {
    // Compare basic LJ properties.
    if ((lj1.epsilon !== lj2.epsilon) || (lj1.sigma !== lj2.sigma)) {
      return false;
    }
    // Compare elements.
    if (((lj1.element1 === lj2.element1) && (lj1.element2 === lj2.element2)) ||
       ((lj1.element1 === lj2.element2) && (lj1.element2 === lj2.element1))) {
      return true;
    } else {
      return false;
    }
  };

  before(function() {
    // Overwrite default float arrays type. It's required, as when Float32Array is used,
    // there are some numerical errors involved, which cause that serialize-deserialize
    // tests fail.
    arrayTypes.floatType = "Float64Array";

    // "Test inside test": compareUnorderedArrays can be error-prone, so test it here.
    compareUnorderedArrays([1, 2], [2, 1], (a, b) => a === b);
    compareUnorderedArrays([1, 2], [1, 2], (a, b) => a === b);
    compareUnorderedArrays([1, 1], [1, 1], (a, b) => a === b);
    ((() => compareUnorderedArrays([1, 2], [2, 2], (a, b) => a === b))).should.throw();
    ((() => compareUnorderedArrays([1, 2], [1, 2, 3], (a, b) => a === b))).should.throw();
    ((() => compareUnorderedArrays([1, 2, 3], [1, 2], (a, b) => a === b))).should.throw();
    // The same applies to ljPropsEql.
    ljPropsEql(
      {element1: 1, element2: 2, sigma: 3, epsilon: 4},
      {element1: 1, element2: 2, sigma: 3, epsilon: 4}
    ).should.be.true;
    ljPropsEql(
      {element1: 2, element2: 1, sigma: 3, epsilon: 4},
      {element1: 1, element2: 2, sigma: 3, epsilon: 4}
    ).should.be.true;
    ljPropsEql(
      {element1: 2, element2: 1, sigma: 3},
      {element1: 1, element2: 2, sigma: 3}
    ).should.be.true;
    ljPropsEql(
      {element1: 2, element2: 1, epsilon: 3},
      {element1: 1, element2: 2, epsilon: 3}
    ).should.be.true;
    ljPropsEql(
      {element1: 1, element2: 1, sigma: 3, epsilon: 8},
      {element1: 1, element2: 2, sigma: 3, epsilon: 4}
    ).should.be.false;
    ljPropsEql(
      {element1: 1, element2: 3, sigma: 3, epsilon: 4},
      {element1: 1, element2: 2, sigma: 3, epsilon: 4}
    ).should.be.false;
    return ljPropsEql(
      {element1: 1, element2: 1, sigma: 3},
      {element1: 2, element2: 3, sigma: 3}
    ).should.be.false;
  });

  return it("an instantiated MD2D model should match original serialization", function() {
    const inputFiles = fs.readdirSync(`${path}expected-json/`);

    for (let inputFile of inputFiles) {
      const originalModelJSON = fs.readFileSync(`${path}expected-json/${inputFile}`).toString();
      const originalModel = JSON.parse(originalModelJSON);

      const model = new Model(originalModel);
      const serializedModel = model.serialize();

      // Special case for pairwiseLJProperties.
      compareUnorderedArrays(originalModel.pairwiseLJProperties, serializedModel.pairwiseLJProperties, ljPropsEql,
        `serialized pairwiseLJProperties doesn't match original pairwiseLJProperties in ${inputFile}`);
      delete originalModel.pairwiseLJProperties;
      delete serializedModel.pairwiseLJProperties;

      // Basic test of the rest of the models.
      assert.deepEqual(serializedModel, originalModel,
        `\n===> the serialized object:\n${JSON.stringify(serializedModel, null, 2)} \
\n===> the original object used to create the MD2D model:\n${JSON.stringify(originalModel, null, 2)} \
\n\nThe serialized object does not match the original object used to create the MD2D model: \
${path}expected-json/${inputFile}`
      );
    }

  });
});
