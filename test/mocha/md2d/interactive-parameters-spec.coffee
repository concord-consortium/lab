helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
simpleModel = helpers.getModel 'simple-model.json'

parameter1 =
  {
    "name":  "customParameter",
    "onChange": "set({ parameterUsedAndValue: 'parameter1: ' + value });"
  }

parameter2 =
  {
    "name":  "customParameter",
    "onChange": "set({ parameterUsedAndValue: 'parameter2: ' + value });"
  }

describe "Lab interactives: custom model parameters", ->
  requirejs ['md2d/controllers/interactives-controller'], (interactivesController) ->

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

      it "lets you define a custom parameter in the models section of the interactive definition", ->
        interactive.models[0].parameters = [parameter1]
        helpers.withModel simpleModel, ->
          controller = interactivesController interactive, 'body'
        model.set customParameter: 1
        model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

      describe "overriding of custom parameter defined in interactive", ->
        beforeEach ->
          interactive.parameters = [parameter1]

        describe "when there is just one model", ->
          beforeEach ->
            interactive.models.length = 1
            interactive.models[0].parameters = [parameter2]
            helpers.withModel simpleModel, ->
              controller = interactivesController interactive, 'body'

          it "uses the parameter defined in the models section", ->
            model.set customParameter: 1
            model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

        describe "when there are two models in the model section", ->
          describe "and the default model has no model-specific custom parameter", ->
            beforeEach ->
              interactive.models[1].parameters = [parameter2]
              helpers.withModel simpleModel, ->
                controller = interactivesController interactive, 'body'

            it "uses the parameter defined at the toplevel", ->
              model.set customParameter: 1
              model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

            describe "and loadModel is used to load a model with a model-specific custom parameter", ->
              beforeEach ->
                helpers.withModel simpleModel, ->
                  controller.loadModel 'model2'

              it "uses the parameter defined in the model section", ->
                model.set customParameter: 1
                model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

          describe "and the default model has a model-specific custom parameter", ->
            beforeEach ->
              interactive.models[0].parameters = [parameter2]
              helpers.withModel simpleModel, ->
                controller = interactivesController interactive, 'body'

            it "uses the property defined in the model section", ->
              model.set customParameter: 1
              model.get('parameterUsedAndValue').should.equal 'parameter2: 1'

            describe "and loadModel is used to load a model without a model-specific custom parameter", ->
              beforeEach ->
                helpers.withModel simpleModel, ->
                  controller.loadModel 'model2'

              it "uses the parameter defined at the toplevel", ->
                model.set customParameter: 1
                model.get('parameterUsedAndValue').should.equal 'parameter1: 1'

