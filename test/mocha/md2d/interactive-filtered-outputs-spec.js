/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();
const simpleModel = helpers.getModel('simple-model.json');

helpers.withIsolatedRequireJSAndViewsMocked(function(requirejs) {
  const interactivesController = requirejs('common/controllers/interactives-controller');

  const output1 =
    {
      "name":  "filteredOutput",
      "label": "customLabel",
      "unitType": "length",
      "property": "time",
      "type": "RunningAverage",
      "period": "2500"
    };

  const output2 =
    {
      "name":  "filteredOutput",
      "property": "viscosity",
      "type": "RunningAverage",
      "period": "1500"
    };

  return describe("Lab interactives: filtered output properties", () => describe("interactives controller", function() {
    let controller = null;
    let interactive = null;
    let model = null;

    const setupControllerAndModel = function() {
      helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
      return model = controller.modelController.model;
    };

    beforeEach(() => interactive =
      {
        "title": "Test Interactive",
        "models": [
          {
            "type": "md2d",
            "id": "model1",
            "url": "model1",
          },
          {
            "type": "md2d",
            "id": "model2",
            "url": "model2",
          }
        ]
      });

    it("lets you define a filtered output property at the toplevel of the interactive definition", function() {
      interactive.filteredOutputs = [output1];
      setupControllerAndModel();
      return model.get('filteredOutput').should.equal(0);
    }); // time = 0

    it("respects the 'unitType' key of the property definition", function() {
      interactive.filteredOutputs = [output1];
      setupControllerAndModel();
      return model.getPropertyDescription('filteredOutput').getHash().should.have.property('unitType', 'length');
    });

    it("respects the 'label' key of the property definition", function() {
      interactive.filteredOutputs = [output1];
      setupControllerAndModel();
      return model.getPropertyDescription('filteredOutput').getHash().should.have.property('label', 'customLabel');
    });

    it("respects the 'property' key of the property definition", function() {
      interactive.filteredOutputs = [output1];
      setupControllerAndModel();
      return model.getPropertyDescription('filteredOutput').getHash().should.have.property('property', 'time');
    });

    it("respects the 'type' key of the property definition", function() {
      interactive.filteredOutputs = [output1];
      setupControllerAndModel();
      return model.getPropertyDescription('filteredOutput').getHash().should.have.property('type', 'RunningAverage');
    });

    it("respects the 'period' key of the property definition", function() {
      interactive.filteredOutputs = [output1];
      setupControllerAndModel();
      return model.getPropertyDescription('filteredOutput').getHash().should.have.property('period', '2500');
    });

    it("lets you define a filtered output property in the models section of the interactive definition", function() {
      interactive.models[0].filteredOutputs = [output1];
      setupControllerAndModel();
      return model.get('filteredOutput').should.equal(0);
    }); // time = 0

    return describe("overriding of filtered output property defined in interactive", function() {
      beforeEach(() => interactive.filteredOutputs = [output1]);

      describe("when there is just one model", function() {
        beforeEach(function() {
          interactive.models.length = 1;
          interactive.models[0].filteredOutputs = [output2];
          return setupControllerAndModel();
        });

        return it("uses the property defined in the models section", () => model.get('filteredOutput').should.equal(1));
      }); // viscosity = 1

      return describe("when there are two models in the model section", function() {
        describe("and the default model has no model-specific filtered output property", function() {
          beforeEach(function() {
            interactive.models[1].filteredOutputs = [output2];
            return setupControllerAndModel();
          });

          it("uses the property defined at the toplevel", () => model.get('filteredOutput').should.equal(0)); // time = 0

          return describe("and loadModel is used to load a model with a model-specific filtered output property", function() {
            beforeEach(function() {
              helpers.withModel(simpleModel, () => controller.loadModel('model2'));
              return model = controller.modelController.model;
            });

            return it("uses the property defined in the model section", () => model.get('filteredOutput').should.equal(1));
          });
        }); // viscosity = 1

        return describe("and the default model has a model-specific filtered output property", function() {
          beforeEach(function() {
            interactive.models[0].filteredOutputs = [output2];
            return setupControllerAndModel();
          });

          it("uses the property defined in the model section", () => model.get('filteredOutput').should.equal(1)); // viscosity = 1

          return describe("and loadModel is used to load a model without a model-specific filtered output property", function() {
            beforeEach(function() {
              helpers.withModel(simpleModel, () => controller.loadModel('model2'));
              return model = controller.modelController.model;
            });

            return it("uses the property defined at the toplevel", () => model.get('filteredOutput').should.equal(0));
          });
        });
      });
    });
  }));
});
