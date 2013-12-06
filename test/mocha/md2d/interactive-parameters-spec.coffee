helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
simpleModel = helpers.getModel 'simple-model.json'

# These will be set as side effects of assignments to parameter1 and parameter2
baseParameters = [
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
]

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->
  interactivesController = requirejs 'common/controllers/interactives-controller'

  parameter1 =
    {
      "name":  "customParameter",
      "unitType": "length",
      "label": "customLabel",
      "onChange": ["set({ parameterUsedAndValue: 'parameter1: ' + value });",
                   "set({ parameter1SetterCalled: true });"],
      "initialValue": 'initial value 1'
    }

  parameter2 =
    {
      "name":  "customParameter",
      "onChange": ["set({ parameterUsedAndValue: 'parameter2: ' + value });",
                   "set({ parameter2SetterCalled: true });"],
      "initialValue": 'initial value 2'
    }

  describe "Lab interactives: custom model parameters", ->
    describe "interactives controller", ->
      controller = null
      interactive = null
      model = null

      beforeEach ->
        interactive =
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
          }


      it "lets you define a custom parameter at the toplevel of the interactive definition", ->
        interactive.parameters = baseParameters.slice().concat(parameter1)
        helpers.withModel simpleModel, ->
          controller = interactivesController interactive, 'body'
        model = controller.getModel()
        model.set customParameter: 1
        model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

      it "respects the 'unitType' key of the parameter definition", ->
        interactive.parameters = baseParameters.slice().concat(parameter1)
        helpers.withModel simpleModel, ->
          controller = interactivesController interactive, 'body'
        model = controller.getModel()
        model.getPropertyDescription('customParameter').getHash().should.have.property 'unitType', 'length'

      it "respects the 'label' key of the parameter definition", ->
        interactive.parameters = baseParameters.slice().concat(parameter1)
        helpers.withModel simpleModel, ->
          controller = interactivesController interactive, 'body'
        model = controller.getModel()
        model.getPropertyDescription('customParameter').getHash().should.have.property 'label', 'customLabel'

      it "lets you define a custom parameter in the models section of the interactive definition", ->
        interactive.models[0].parameters = baseParameters.slice().concat(parameter1)
        helpers.withModel simpleModel, ->
          controller = interactivesController interactive, 'body'
        model = controller.getModel()
        model.set customParameter: 1
        model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

      describe "when the parameter specifies an initial value", ->
        beforeEach ->
          interactive.parameters = baseParameters.concat([
            {
              "name":  "parameterWithInitialValue",
              "onChange": "set({ parameterValue: value });",
              "initialValue": 1.2
            }
          ])
          helpers.withModel simpleModel, ->
            controller = interactivesController interactive, 'body'
          model = controller.getModel()

        it "sets the parameter itself to that value", ->
          model.get('parameterWithInitialValue').should.equal 1.2

        it "applies the parameter's onChange setter to the initial value", ->
          model.get('parameterValue').should.equal 1.2

      describe "overriding of custom parameter defined in interactive", ->
        beforeEach ->
          interactive.parameters = baseParameters.slice().concat(parameter1)

        describe "when there is just one model", ->
          beforeEach ->
            interactive.models.length = 1
            interactive.models[0].parameters = baseParameters.slice().concat(parameter2)
            helpers.withModel simpleModel, ->
              controller = interactivesController interactive, 'body'
            model = controller.getModel()

          it "uses the parameter setter defined in the models section", ->
            model.set customParameter: 1
            model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

          it "uses the initial value defined in the model section", ->
            model.get('parameterUsedAndValue').should.equal 'parameter2: initial value 2'

        describe "when there are two models in the model section", ->
          describe "and the default model has no model-specific custom parameter", ->
            beforeEach ->
              interactive.models[1].parameters = baseParameters.slice().concat(parameter2)
              helpers.withModel simpleModel, ->
                controller = interactivesController interactive, 'body'
              model = controller.getModel()

            it "uses the parameter setter defined at the toplevel", ->
              model.set customParameter: 1
              model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

            it "uses the initial value defined at the toplevel", ->
              model.get('parameterUsedAndValue').should.equal 'parameter1: initial value 1'

            it "never calls the overridden parameter's setter with an initial value", ->
              model.get('parameter2SetterCalled').should.equal ''
              model.get('parameter1SetterCalled').should.be.true

            describe "and loadModel is used to load a model with a model-specific custom parameter", ->
              beforeEach ->
                helpers.withModel simpleModel, ->
                  controller.loadModel 'model2'
                model = controller.getModel()

              it "uses the parameter defined in the model section", ->
                model.set customParameter: 1
                model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

              it "uses the initial value defined in the model section", ->
                model.get('parameterUsedAndValue').should.equal 'parameter2: initial value 2'

          describe "and the default model has a model-specific custom parameter", ->
            beforeEach ->
              interactive.models[0].parameters = baseParameters.slice().concat(parameter2)
              helpers.withModel simpleModel, ->
                controller = interactivesController interactive, 'body'
              model = controller.getModel()

            it "uses the property defined in the model section", ->
              model.set customParameter: 1
              model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

            it "uses the initial value defined in the model section", ->
              model.get('parameterUsedAndValue').should.equal 'parameter2: initial value 2'

            it "never calls the overridden parameter's setter with an initial value", ->
              model.get('parameter1SetterCalled').should.equal ''
              model.get('parameter2SetterCalled').should.be.true

            describe "and loadModel is used to load a model without a model-specific custom parameter", ->
              beforeEach ->
                helpers.withModel simpleModel, ->
                  controller.loadModel 'model2'
                model = controller.getModel()

              it "uses the parameter defined at the toplevel", ->
                model.set customParameter: 1
                model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

              it "uses the initial value defined in the toplevel", ->
                model.get('parameterUsedAndValue').should.equal 'parameter1: initial value 1'
