/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const helpers = require('../../helpers');
helpers.setupBrowserEnvironment();
const simpleModel = helpers.getModel('simple-model.json');

// These will be set as side effects of assignments to parameter1 and parameter2
const baseParameters = [
  {
    name: 'parameterValue',
    onChange: ';',
    initialValue: ''
  },
  {
    name: 'parameterUsedAndValue',
    onChange: ';',
    initialValue: ''
  },
  {
    name: 'parameter1SetterCalled',
    onChange: ';',
    initialValue: ''
  },
  {
    name: 'parameter2SetterCalled',
    onChange: ';',
    initialValue: ''
  }
];

helpers.withIsolatedRequireJSAndViewsMocked(function(requirejs) {
  const interactivesController = requirejs('common/controllers/interactives-controller');

  const parameter1 =
    {
      "name":  "customParameter",
      "unitType": "length",
      "label": "customLabel",
      "onChange": ["set({ parameterUsedAndValue: 'parameter1: ' + value });",
                   "set({ parameter1SetterCalled: true });"],
      "initialValue": 'initial value 1'
    };

  const parameter2 =
    {
      "name":  "customParameter",
      "onChange": ["set({ parameterUsedAndValue: 'parameter2: ' + value });",
                   "set({ parameter2SetterCalled: true });"],
      "initialValue": 'initial value 2'
    };

  return describe("Lab interactives: custom model parameters", () => describe("interactives controller", function() {
    let controller = null;
    let interactive = null;
    let model = null;

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


    it("lets you define a custom parameter at the toplevel of the interactive definition", function() {
      interactive.parameters = baseParameters.slice().concat(parameter1);
      helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
      model = controller.getModel();
      model.set({customParameter: 1});
      return model.get('parameterUsedAndValue').should.equal('parameter1: 1');
    });

    it("respects the 'unitType' key of the parameter definition", function() {
      interactive.parameters = baseParameters.slice().concat(parameter1);
      helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
      model = controller.getModel();
      return model.getPropertyDescription('customParameter').getHash().should.have.property('unitType', 'length');
    });

    it("respects the 'label' key of the parameter definition", function() {
      interactive.parameters = baseParameters.slice().concat(parameter1);
      helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
      model = controller.getModel();
      return model.getPropertyDescription('customParameter').getHash().should.have.property('label', 'customLabel');
    });

    it("lets you define a custom parameter in the models section of the interactive definition", function() {
      interactive.models[0].parameters = baseParameters.slice().concat(parameter1);
      helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
      model = controller.getModel();
      model.set({customParameter: 1});
      return model.get('parameterUsedAndValue').should.equal('parameter1: 1');
    });

    describe("when the parameter specifies an initial value", function() {
      beforeEach(function() {
        interactive.parameters = baseParameters.concat([
          {
            "name":  "parameterWithInitialValue",
            "onChange": "set({ parameterValue: value });",
            "initialValue": 1.2
          }
        ]);
        helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
        return model = controller.getModel();
      });

      it("sets the parameter itself to that value", () => model.get('parameterWithInitialValue').should.equal(1.2));

      return it("applies the parameter's onChange setter to the initial value", () => model.get('parameterValue').should.equal(1.2));
    });

    return describe("overriding of custom parameter defined in interactive", function() {
      beforeEach(() => interactive.parameters = baseParameters.slice().concat(parameter1));

      describe("when there is just one model", function() {
        beforeEach(function() {
          interactive.models.length = 1;
          interactive.models[0].parameters = baseParameters.slice().concat(parameter2);
          helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
          return model = controller.getModel();
        });

        it("uses the parameter setter defined in the models section", function() {
          model.set({customParameter: 1});
          return model.get('parameterUsedAndValue').should.equal('parameter2: 1');
        });

        return it("uses the initial value defined in the model section", () => model.get('parameterUsedAndValue').should.equal('parameter2: initial value 2'));
      });

      return describe("when there are two models in the model section", function() {
        describe("and the default model has no model-specific custom parameter", function() {
          beforeEach(function() {
            interactive.models[1].parameters = baseParameters.slice().concat(parameter2);
            helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
            return model = controller.getModel();
          });

          it("uses the parameter setter defined at the toplevel", function() {
            model.set({customParameter: 1});
            return model.get('parameterUsedAndValue').should.equal('parameter1: 1');
          });

          it("uses the initial value defined at the toplevel", () => model.get('parameterUsedAndValue').should.equal('parameter1: initial value 1'));

          it("never calls the overridden parameter's setter with an initial value", function() {
            model.get('parameter2SetterCalled').should.equal('');
            return model.get('parameter1SetterCalled').should.be.true;
          });

          return describe("and loadModel is used to load a model with a model-specific custom parameter", function() {
            beforeEach(function() {
              helpers.withModel(simpleModel, () => controller.loadModel('model2'));
              return model = controller.getModel();
            });

            it("uses the parameter defined in the model section", function() {
              model.set({customParameter: 1});
              return model.get('parameterUsedAndValue').should.equal('parameter2: 1');
            });

            return it("uses the initial value defined in the model section", () => model.get('parameterUsedAndValue').should.equal('parameter2: initial value 2'));
          });
        });

        return describe("and the default model has a model-specific custom parameter", function() {
          beforeEach(function() {
            interactive.models[0].parameters = baseParameters.slice().concat(parameter2);
            helpers.withModel(simpleModel, () => controller = interactivesController(interactive, 'body'));
            return model = controller.getModel();
          });

          it("uses the property defined in the model section", function() {
            model.set({customParameter: 1});
            return model.get('parameterUsedAndValue').should.equal('parameter2: 1');
          });

          it("uses the initial value defined in the model section", () => model.get('parameterUsedAndValue').should.equal('parameter2: initial value 2'));

          it("never calls the overridden parameter's setter with an initial value", function() {
            model.get('parameter1SetterCalled').should.equal('');
            return model.get('parameter2SetterCalled').should.be.true;
          });

          return describe("and loadModel is used to load a model without a model-specific custom parameter", function() {
            beforeEach(function() {
              helpers.withModel(simpleModel, () => controller.loadModel('model2'));
              return model = controller.getModel();
            });

            it("uses the parameter defined at the toplevel", function() {
              model.set({customParameter: 1});
              return model.get('parameterUsedAndValue').should.equal('parameter1: 1');
            });

            return it("uses the initial value defined in the toplevel", () => model.get('parameterUsedAndValue').should.equal('parameter1: initial value 1'));
          });
        });
      });
    });
  }));
});
