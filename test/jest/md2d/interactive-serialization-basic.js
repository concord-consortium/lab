const fs = require("fs");
const helpers = require("../../helpers");
import InteractivesController from "../../../src/lab/common/controllers/interactives-controller";
import arrayTypes from "../../../src/lab/common/array-types";

// A tiny helper function.
const endsWith = (str, suffix) => str.indexOf(suffix, str.length - suffix.length) !== -1;

describe("Lab interactives: serialization", function () {
  let controller = null;

  beforeAll(() => // Overwrite default float arrays type. It's required, as when Float32Array is used,
    // there are some numerical errors involved, which cause that serialize-deserialize
    // tests fail.
    arrayTypes.floatType = "Float64Array");

  describe("serialization right after initialization should return object equal to original JSON input", function () {
    const path = "./src/interactives";
    let queue = fs.readdirSync(path);
    // Use only absolute paths.
    queue = queue.map(file => `${path}/${file}`);

    (() => {
      const result = [];
      while (queue.length > 0) {
        var inputFile = queue.pop();

        if (fs.statSync(inputFile).isDirectory()) {
          // Process directory.
          let subdir = fs.readdirSync(inputFile);
          subdir = subdir.map(file => `${inputFile}/${file}`);
          result.push(queue = queue.concat(subdir));

        } else if (endsWith(inputFile, ".json")) {
          result.push(((inputFile => // Process JSON file.
            it(`testing: ${inputFile}`, function () {
              const interactiveJSON = fs.readFileSync(inputFile).toString();
              const interactive = JSON.parse(interactiveJSON);

              if (interactive.models[0].url) {
                let modelObject;
                try {
                  modelObject = helpers.getModel(`../../../public/${interactive.models[0].url}`);
                } catch (error) {
                  // In some cases model can be unavailable (there is one such test interactive)
                  modelObject = {};
                }
                helpers.withModel(modelObject, () => controller = new InteractivesController(interactive, "body"));
              } else {
                // model definition is inside interactive JSON, no need to use helper.withModel
                controller = new InteractivesController(interactive, "body");
              }

              // This direct call to validate is necessary to provide all default values
              // and allow to compare this object with serialized version using simple 'should.eql'.
              const validatedInteractive = controller.validateInteractive(interactive);
              const serializedInteractive = controller.serialize();

              // Helper.
              const deleteProp = function (i, name) {
                delete serializedInteractive.components[i][name];
                return delete validatedInteractive.components[i][name];
              };

              // Sliders initial values need a special way to check their correctness.
              // Due to min, max and step properties, initialValue provided by author / user
              // is very often adjusted to fit stepping of the slider.
              const compareSliders = function (i) {
                const sliderA = validatedInteractive.components[i];
                if (sliderA.initialValue != null) {
                  const sliderB = serializedInteractive.components[i];
                  const stepLen = (sliderA.max - sliderA.min) / sliderA.steps;

                  const min = sliderA.initialValue - stepLen;
                  const max = sliderA.initialValue + stepLen;
                  return sliderB.initialValue.should.be.within(min, max);
                }
              };

              // Handle special cases for sliders and graphs.
              for (let i = 0; i < serializedInteractive.components.length; i++) {
                const comp = serializedInteractive.components[i];
                if (comp.type === "slider") {
                  // Compare initial values of sliders.
                  compareSliders(i);
                  // Now delete these property, as otherwise should.eql call will fail.
                  deleteProp(i, "initialValue");
                }
                if (comp.type === "graph") {
                  // Graph options are now strongly connected with SVG and D3 internals.
                  // This is not supported in JSDOM environment. Because of that, do not
                  // test serialization of some graph properties.
                  // TODO: prepare special test for graphs.
                  deleteProp(i, "xmin");
                  deleteProp(i, "xmax");
                  deleteProp(i, "ymin");
                  deleteProp(i, "ymax");
                }
              }

              // Standard comparison of two objects.
              // Note that initial values of sliders and some properties
              // or graphs are deleted above.
              serializedInteractive.should.eql(validatedInteractive);
            })))(inputFile));
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  });
});
