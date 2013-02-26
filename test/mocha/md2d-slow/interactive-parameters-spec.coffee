helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
simpleModel = helpers.getModel 'simple-model.json'

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->

  parameter1 =
    {
      "name":  "customParameter",
      "units": "customUnit",
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
    requirejs ['common/controllers/interactives-controller'], (interactivesController) ->

      describe "interactives controller", ->
        controller = null
        interactive = null
        beforeEach ->
          interactive =
            {
              "title": "Test Interactive",
              "models": [
                {
                  "id": "model1",
                  "url": "model1",
                },
                {
                  "id": "model2",
                  "url": "model2",
                }
              ]
            }


        it "lets you define a custom parameter at the toplevel of the interactive definition", ->
          interactive.parameters = [parameter1]
          helpers.withModel simpleModel, ->
            controller = interactivesController interactive, 'body'
          model.set customParameter: 1
          model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

        it "respects the 'units' key of the parameter definition", ->
          interactive.parameters = [parameter1]
          helpers.withModel simpleModel, ->
            controller = interactivesController interactive, 'body'
          model.getPropertyDescription('customParameter').should.have.property 'units', 'customUnit'

        it "respects the 'label' key of the parameter definition", ->
          interactive.parameters = [parameter1]
          helpers.withModel simpleModel, ->
            controller = interactivesController interactive, 'body'
          model.getPropertyDescription('customParameter').should.have.property 'label', 'customLabel'

        it "lets you define a custom parameter in the models section of the interactive definition", ->
          interactive.models[0].parameters = [parameter1]
          helpers.withModel simpleModel, ->
            controller = interactivesController interactive, 'body'
          model.set customParameter: 1
          model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

        describe "when the parameter specifies an initial value", ->
          beforeEach ->
            interactive.parameters = [
              {
                "name":  "parameterWithInitialValue",
                "onChange": "set({ parameterValue: value });",
                "initialValue": 1.2
              }
            ]
            helpers.withModel simpleModel, ->
              controller = interactivesController interactive, 'body'

          it "sets the parameter itself to that value", ->
            model.get('parameterWithInitialValue').should.equal 1.2

          it "applies the parameter's onChange setter to the initial value", ->
            model.get('parameterValue').should.equal 1.2

        describe "overriding of custom parameter defined in interactive", ->
          beforeEach ->
            interactive.parameters = [parameter1]

          describe "when there is just one model", ->
            beforeEach ->
              interactive.models.length = 1
              interactive.models[0].parameters = [parameter2]
              helpers.withModel simpleModel, ->
                controller = interactivesController interactive, 'body'

            it "uses the parameter setter defined in the models section", ->
              model.set customParameter: 1
              model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

            it "uses the initial value defined in the model section", ->
              model.get('parameterUsedAndValue').should.equal 'parameter2: initial value 2'

          describe "when there are two models in the model section", ->
            describe "and the default model has no model-specific custom parameter", ->
              beforeEach ->
                interactive.models[1].parameters = [parameter2]
                helpers.withModel simpleModel, ->
                  controller = interactivesController interactive, 'body'

              it "uses the parameter setter defined at the toplevel", ->
                model.set customParameter: 1
                model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

              it "uses the initial value defined at the toplevel", ->
                model.get('parameterUsedAndValue').should.equal 'parameter1: initial value 1'

              it "never calls the overridden parameter's setter with an initial value", ->
                should.not.exist model.get('parameter2SetterCalled')
                model.get('parameter1SetterCalled').should.be.true

              describe "and loadModel is used to load a model with a model-specific custom parameter", ->
                beforeEach ->
                  helpers.withModel simpleModel, ->
                    controller.loadModel 'model2'

                it "uses the parameter defined in the model section", ->
                  model.set customParameter: 1
                  model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

                it "uses the initial value defined in the model section", ->
                  model.get('parameterUsedAndValue').should.equal 'parameter2: initial value 2'

            describe "and the default model has a model-specific custom parameter", ->
              beforeEach ->
                interactive.models[0].parameters = [parameter2]
                helpers.withModel simpleModel, ->
                  controller = interactivesController interactive, 'body'

              it "uses the property defined in the model section", ->
                model.set customParameter: 1
                model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

              it "uses the initial value defined in the model section", ->
                model.get('parameterUsedAndValue').should.equal 'parameter2: initial value 2'

              it "never calls the overridden parameter's setter with an initial value", ->
                should.not.exist model.get('parameter1SetterCalled')
                model.get('parameter2SetterCalled').should.be.true

              describe "and loadModel is used to load a model without a model-specific custom parameter", ->
                beforeEach ->
                  helpers.withModel simpleModel, ->
                    controller.loadModel 'model2'

                it "uses the parameter defined at the toplevel", ->
                  model.set customParameter: 1
                  model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

                it "uses the initial value defined in the toplevel", ->
                  model.get('parameterUsedAndValue').should.equal 'parameter1: initial value 1'
