helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
simpleModel = helpers.getModel 'simple-model.json'

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->
  interactivesController = requirejs 'common/controllers/interactives-controller'
  layoutConfig           = requirejs 'common/layout/semantic-layout-config'
  labConfig              = requirejs 'lab.config'

  describe "Lab interactives: serialization", ->
    before ->
      # This test requires that all view elements are attached to DOM (JSDOM). So, we cannot mock
      # layout and the test tends to be pretty slow. To optimize it, limit number of layout algorithm
      # iterations to 0, because we completely do not care about layout quality.
      layoutConfig.iterationsLimit = 0
      # Also disable logging in Lab project so as not to obfuscate Mocha reporter.
      labConfig.logging = false


    describe "serialization after changes of interactive components should reflect these changes", ->
      controller = null
      interactive = null
      model = null

      setupControllerAndModel = ->
        helpers.withModel simpleModel, ->
          controller = interactivesController interactive, 'body'
        model = controller.modelController.model

      beforeEach ->
        interactive = {
          "title": "Test Interactive",
          "publicationStatus": "draft",
          "subtitle": "Subtitle",
          "about": "Description",
          "models": [
            {
              "type": "md2d",
              "id": "model1",
              "url": "model1",
              "parameters": [
                {
                  "name": "parameter1",
                  "initialValue": '1',
                  "onChange": []
                }
              ]
            }, {
              "type": "md2d",
              "id": "model2",
              "url": "model2",
              "parameters": [
                {
                  "name": "parameter2",
                  "initialValue": '2',
                  "onChange": []
                }
              ]
            }
          ],
          "parameters": [
            {
              "name": "parameter2",
              "initialValue": '3',
              "onChange": []
            }
          ],
          "components": [
            {
              "type": "checkbox",
              "id": "checkbox1",
              "onClick": ";",
              "initialValue": false
            }, {
              "type": "slider",
              "id": "slider1",
              "min": 0,
              "max": 10,
              "steps": 10,
              "action": ";",
              "initialValue": 5
            }, {
              "type": "pulldown",
              "id": "pulldown1",
              "options": [
                {
                  "text": "option1",
                  "selected": true
                }, {
                  "text": "option2"
                }
              ]
            }, {
              "type": "radio",
              "id": "radio1",
              "options": [
                {
                  "text": "option1",
                  "selected": true
                }, {
                  "text": "option2"
                }
              ]
            }
          ]
        }

      it "custom parameters should be updated correctly", ->
        setupControllerAndModel()
        validatedInteractive = controller.validateInteractive(interactive)

        # Change value of parameter defined only in models section.
        model.set parameter1: 10
        validatedInteractive.models[0].parameters[0].initialValue = 10

        # Change value of paramter defiend both in models and top-level parameter sections.
        # As model 0 is loaded (by default), top-level definition should be used and updated.
        model.set parameter2: 20
        validatedInteractive.parameters[0].initialValue = 20

        serializedInteractive = controller.serialize()
        serializedInteractive.should.eql validatedInteractive

        # Now change the model to second one.
        setupControllerAndModel()

        helpers.withModel simpleModel, ->
          controller.loadModel "model2"
        model = controller.modelController.model

        validatedInteractive = controller.validateInteractive(interactive)

        # Change value of paramter defiend both in models and top-level parameter sections.
        # As the second model is loaded, this time definition in model section should be updated.
        model.set parameter2: 20
        validatedInteractive.models[1].parameters[0].initialValue = 20

        serializedInteractive = controller.serialize()
        serializedInteractive.should.eql validatedInteractive

      it "checkbox should be updated correctly", ->
        setupControllerAndModel()
        validatedInteractive = controller.validateInteractive(interactive)

        # Change value of the slider.
        $("#checkbox1").prop "checked", true
        validatedInteractive.components[0].initialValue = true

        serializedInteractive = controller.serialize()
        serializedInteractive.should.eql validatedInteractive

      it "slider should be updated correctly", ->
        setupControllerAndModel()
        validatedInteractive = controller.validateInteractive(interactive)

        # Change value of the slider.
        $("#slider1").slider "value", 8
        validatedInteractive.components[1].initialValue = 8

        serializedInteractive = controller.serialize()
        serializedInteractive.should.eql validatedInteractive

      it "pulldown should be updated correctly", ->
        setupControllerAndModel()
        validatedInteractive = controller.validateInteractive(interactive)

        # Change value of the pulldown.
        $("#pulldown1 select").val "option2"
        # Manually trigger change event, as ".val" doesn't do it.
        $("#pulldown1 select").trigger "change"
        delete validatedInteractive.components[2].options[0].selected
        validatedInteractive.components[2].options[1].selected = true

        serializedInteractive = controller.serialize()
        serializedInteractive.should.eql validatedInteractive

      it "radio should be updated correctly", ->
        setupControllerAndModel()
        validatedInteractive = controller.validateInteractive(interactive)

        # Change value of the radio buttons set.
        $radios = $("input:radio[name=radio1]")
        $radios.removeAttr "checked"
        $radios.eq(1).attr "checked", true
        # Manually trigger change event.
        $radios.eq(1).trigger "change"
        delete validatedInteractive.components[3].options[0].selected
        validatedInteractive.components[3].options[1].selected = true

        serializedInteractive = controller.serialize()
        serializedInteractive.should.eql validatedInteractive
