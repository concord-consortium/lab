import InteractivesController from "../../../src/lab/common/controllers/interactives-controller";

const helpers = require("../../helpers");
const simpleModel = helpers.getModel("simple-model.json");

const output1 =
  {
    "name": "customOutput",
    "label": "customLabel",
    "unitType": "length",
    "value": "return 'output1';"
  };

const output2 =
  {
    "name": "customOutput",
    "value": "return 'output2';"
  };

describe("Lab interactives: custom output properties", () => {
  describe("interactives controller", function () {
    let controller = null;
    let interactive = null;
    let model = null;

    const setupControllerAndModel = function () {
      helpers.withModel(simpleModel, () => controller = new InteractivesController(interactive, "body"));
      model = controller.modelController.model;
    };

    beforeEach(() => interactive =
      {
        "title": "Test Interactive",
        "models": [
          {
            "type": "md2d",
            "id": "model1",
            "url": "model1"
          },
          {
            "type": "md2d",
            "id": "model2",
            "url": "model2"
          }
        ]
      });

    it("lets you define a custom output property at the toplevel of the interactive definition", function () {
      interactive.outputs = [output1];
      setupControllerAndModel();
      model.get("customOutput").should.equal("output1");
    });

    it("respects the 'unitType' key of the property definition", function () {
      interactive.outputs = [output1];
      setupControllerAndModel();
      model.getPropertyDescription("customOutput").getHash().should.have.property("unitType", "length");
    });

    it("respects the 'label' key of the property definition", function () {
      interactive.outputs = [output1];
      setupControllerAndModel();
      model.getPropertyDescription("customOutput").getHash().should.have.property("label", "customLabel");
    });

    it("lets you define a custom output property in the models section of the interactive definition", function () {
      interactive.models[0].outputs = [output1];
      setupControllerAndModel();
      model.get("customOutput").should.equal("output1");
    });

    describe("overriding of custom output property defined in interactive", function () {
      beforeEach(() => interactive.outputs = [output1]);

      describe("when there is just one model", function () {
        beforeEach(function () {
          interactive.models.length = 1;
          interactive.models[0].outputs = [output2];
          setupControllerAndModel();
        });

        it("uses the property defined in the models section", () => {
          model.get("customOutput").should.equal("output2");
        });
      });

      describe("when there are two models in the model section", function () {
        describe("and the default model has no model-specific custom output property", function () {
          beforeEach(function () {
            interactive.models[1].outputs = [output2];
            setupControllerAndModel();
          });

          it("uses the property defined at the toplevel", () => {
            model.get("customOutput").should.equal("output1");
          });

          describe("and loadModel is used to load a model with a model-specific custom output property", function () {
            beforeEach(function () {
              helpers.withModel(simpleModel, () => controller.loadModel("model2"));
              model = controller.modelController.model;
            });

            it("uses the property defined in the model section", () => {
              model.get("customOutput").should.equal("output2");
            });
          });
        });

        describe("and the default model has a model-specific custom output property", function () {
          beforeEach(function () {
            interactive.models[0].outputs = [output2];
            setupControllerAndModel();
          });

          it("uses the property defined in the model section", () => {
            model.get("customOutput").should.equal("output2");
          });

          describe("and loadModel is used to load a model without a model-specific custom output property", function () {
            beforeEach(function () {
              helpers.withModel(simpleModel, () => controller.loadModel("model2"));
              model = controller.modelController.model;
            });

            it("uses the property defined at the toplevel", () => {
              model.get("customOutput").should.equal("output1");
            });
          });
        });
      });
    });
  });
});
