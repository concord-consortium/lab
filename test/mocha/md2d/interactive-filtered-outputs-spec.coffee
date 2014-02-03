helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
simpleModel = helpers.getModel 'simple-model.json'

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->
  interactivesController = requirejs 'common/controllers/interactives-controller'

  output1 =
    {
      "name":  "filteredOutput",
      "label": "customLabel",
      "unitType": "length",
      "property": "time",
      "type": "RunningAverage",
      "period": "2500"
    }

  output2 =
    {
      "name":  "filteredOutput",
      "property": "viscosity",
      "type": "RunningAverage",
      "period": "1500"
    }

  describe "Lab interactives: filtered output properties", ->
    describe "interactives controller", ->
      controller = null
      interactive = null
      model = null

      setupControllerAndModel = ->
        helpers.withModel simpleModel, ->
          controller = interactivesController interactive, 'body'
        model = controller.modelController.model

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

      it "lets you define a filtered output property at the toplevel of the interactive definition", ->
        interactive.filteredOutputs = [output1]
        setupControllerAndModel()
        model.get('filteredOutput').should.equal 0 # time = 0

      it "respects the 'unitType' key of the property definition", ->
        interactive.filteredOutputs = [output1]
        setupControllerAndModel()
        model.getPropertyDescription('filteredOutput').getHash().should.have.property 'unitType', 'length'

      it "respects the 'label' key of the property definition", ->
        interactive.filteredOutputs = [output1]
        setupControllerAndModel()
        model.getPropertyDescription('filteredOutput').getHash().should.have.property 'label', 'customLabel'

      it "respects the 'property' key of the property definition", ->
        interactive.filteredOutputs = [output1]
        setupControllerAndModel()
        model.getPropertyDescription('filteredOutput').getHash().should.have.property 'property', 'time'

      it "respects the 'type' key of the property definition", ->
        interactive.filteredOutputs = [output1]
        setupControllerAndModel()
        model.getPropertyDescription('filteredOutput').getHash().should.have.property 'type', 'RunningAverage'

      it "respects the 'period' key of the property definition", ->
        interactive.filteredOutputs = [output1]
        setupControllerAndModel()
        model.getPropertyDescription('filteredOutput').getHash().should.have.property 'period', '2500'

      it "lets you define a filtered output property in the models section of the interactive definition", ->
        interactive.models[0].filteredOutputs = [output1]
        setupControllerAndModel()
        model.get('filteredOutput').should.equal 0 # time = 0

      describe "overriding of filtered output property defined in interactive", ->
        beforeEach ->
          interactive.filteredOutputs = [output1]

        describe "when there is just one model", ->
          beforeEach ->
            interactive.models.length = 1
            interactive.models[0].filteredOutputs = [output2]
            setupControllerAndModel()

          it "uses the property defined in the models section", ->
            model.get('filteredOutput').should.equal 1 # viscosity = 1

        describe "when there are two models in the model section", ->
          describe "and the default model has no model-specific filtered output property", ->
            beforeEach ->
              interactive.models[1].filteredOutputs = [output2]
              setupControllerAndModel()

            it "uses the property defined at the toplevel", ->
              model.get('filteredOutput').should.equal 0 # time = 0

            describe "and loadModel is used to load a model with a model-specific filtered output property", ->
              beforeEach ->
                helpers.withModel simpleModel, ->
                  controller.loadModel 'model2'
                model = controller.modelController.model

              it "uses the property defined in the model section", ->
                model.get('filteredOutput').should.equal 1 # viscosity = 1

          describe "and the default model has a model-specific filtered output property", ->
            beforeEach ->
              interactive.models[0].filteredOutputs = [output2]
              setupControllerAndModel()

            it "uses the property defined in the model section", ->
              model.get('filteredOutput').should.equal 1 # viscosity = 1

            describe "and loadModel is used to load a model without a model-specific filtered output property", ->
              beforeEach ->
                helpers.withModel simpleModel, ->
                  controller.loadModel 'model2'
                model = controller.modelController.model

              it "uses the property defined at the toplevel", ->
                model.get('filteredOutput').should.equal 0
