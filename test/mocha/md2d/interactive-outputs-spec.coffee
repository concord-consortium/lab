helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
simpleGasModel = helpers.getModel 'simple-gas$0.mml'

output1 =
  {
    "name":  "customOutput",
    "value": "return 'output1';"
  }

output2 =
  {
    "name":  "customOutput",
    "value": "return 'output2';"
  }

describe "Lab interactives: custom output properties", ->
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

      it "lets you define a custom output property at the toplevel of the interactive definition", ->
        interactive.outputs = [output1]
        helpers.withModel simpleGasModel, ->
          controller = interactivesController interactive, 'body'
        model.get('customOutput').should.equal 'output1'

      it "lets you define a custom output property in the models section of the interactive definition", ->
        interactive.models[0].outputs = [output1]
        helpers.withModel simpleGasModel, ->
          controller = interactivesController interactive, 'body'
        model.get('customOutput').should.equal 'output1'

      describe "overriding of custom output property defined in interactive", ->
        beforeEach ->
          interactive.outputs = [output1]

        describe "when there is just one model", ->
          beforeEach ->
            interactive.models.length = 1
            interactive.models[0].outputs = [output2]
            helpers.withModel simpleGasModel, ->
              controller = interactivesController interactive, 'body'

          it "uses the property defined in the models section", ->
            model.get('customOutput').should.equal 'output2'

        describe "when there are two models in the model section", ->
          describe "and the default model has no model-specific custom output property", ->
            beforeEach ->
              interactive.models[1].outputs = [output2]
              helpers.withModel simpleGasModel, ->
                controller = interactivesController interactive, 'body'

            it "uses the property defined at the toplevel", ->
              model.get('customOutput').should.equal 'output1'

            describe "and loadModel is used to load a model with a model-specific custom output property", ->
              beforeEach ->
                helpers.withModel simpleGasModel, ->
                  controller.loadModel 'model2'

              it "uses the property defined in the model section", ->
                model.get('customOutput').should.equal 'output2'

          describe "and the default model has a model-specific custom output property", ->
            beforeEach ->
              interactive.models[0].outputs = [output2]
              helpers.withModel simpleGasModel, ->
                controller = interactivesController interactive, 'body'

            it "uses the property defined in the model section", ->
              model.get('customOutput').should.equal 'output2'

            describe "and loadModel is used to load a model without a model-specific custom output property", ->
              beforeEach ->
                helpers.withModel simpleGasModel, ->
                  controller.loadModel 'model2'

              it "uses the property defined at the toplevel", ->
                model.get('customOutput').should.equal 'output1'
