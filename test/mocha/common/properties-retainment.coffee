helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->
  InteractivesController = requirejs 'common/controllers/interactives-controller'
  layoutConfig           = requirejs 'common/layout/semantic-layout-config'
  labConfig              = requirejs 'lab.config'

  describe "Parameters retainment during .reloadModel() and .resetModel()", ->
    before ->
      # This test requires that all view elements are attached to DOM (JSDOM). So, we cannot mock
      # layout and the test tends to be pretty slow. To optimize it, limit number of layout algorithm
      # iterations to 0, because we completely do not care about layout quality.
      layoutConfig.iterationsLimit = 0
      # Also disable logging in Lab project so as not to obfuscate Mocha reporter.
      labConfig.logging = false

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
              "name":  "parameter1",
              "initialValue": 1
            }
          ]
        }
      ],
      "parameters": [
        {
          "name":  "parameter2",
          "initialValue": 2
        }
      ]
    }

    simpleMD2DModel = {
      "timeStep": 3,
      "targetTemperature": 4
    }

    controller = null
    scriptingAPI = null

    setupInteractive = (propertiesToRetain) ->
      interactive.propertiesToRetain = propertiesToRetain or []
      helpers.withModel simpleMD2DModel, ->
        controller = new InteractivesController interactive, 'body'
      scriptingAPI = controller.scriptingAPI.api

    describe ".resetModel() and .reloadModel()", ->
      it "shouldn't retain any properties by default", ->
        test = (action) ->
          setupInteractive []
          scriptingAPI.set "parameter1", 101
          scriptingAPI.set "parameter2", 102
          scriptingAPI.set "timeStep", 103
          scriptingAPI.set "targetTemperature", 104
          controller[action]()
          scriptingAPI.get("parameter1").should.eql 1
          scriptingAPI.get("parameter2").should.eql 2
          scriptingAPI.get("timeStep").should.eql 3
          scriptingAPI.get("targetTemperature").should.eql 4

        test "reloadModel"
        test "resetModel"

      it "should retain properties specified in 'propertiesToRetain' list (in interactive JSON)", ->
        test = (action) ->
          # The array will be set as interactive JSON .propertiesToRetain property.
          setupInteractive ["parameter1", "timeStep"]
          scriptingAPI.set "parameter1", 101
          scriptingAPI.set "parameter2", 102
          scriptingAPI.set "timeStep", 103
          scriptingAPI.set "targetTemperature", 104
          controller[action]()
          scriptingAPI.get("parameter1").should.eql 101
          scriptingAPI.get("parameter2").should.eql 2
          scriptingAPI.get("timeStep").should.eql 103
          scriptingAPI.get("targetTemperature").should.eql 4

        test "reloadModel"
        test "resetModel"

      it "should retain properties listed in option hash", ->
        test = (action) ->
          setupInteractive []
          scriptingAPI.set "parameter1", 101
          scriptingAPI.set "parameter2", 102
          scriptingAPI.set "timeStep", 103
          scriptingAPI.set "targetTemperature", 104
          controller[action]({
            parametersToRetain: ["parameter1", "timeStep"]
          })
          scriptingAPI.get("parameter1").should.eql 101
          scriptingAPI.get("parameter2").should.eql 2
          scriptingAPI.get("timeStep").should.eql 103
          scriptingAPI.get("targetTemperature").should.eql 4

        test "reloadModel"
        test "resetModel"

      it "should respect values that are defined either in 'propertiesToRetain' list and in options hash", ->
        test = (action) ->
          setupInteractive ["parameter1"]
          scriptingAPI.set "parameter1", 101
          scriptingAPI.set "parameter2", 102
          scriptingAPI.set "timeStep", 103
          scriptingAPI.set "targetTemperature", 104
          controller[action]({
            parametersToRetain: ["timeStep"]
          })
          scriptingAPI.get("parameter1").should.eql 101
          scriptingAPI.get("parameter2").should.eql 2
          scriptingAPI.get("timeStep").should.eql 103
          scriptingAPI.get("targetTemperature").should.eql 4

        test "reloadModel"
        test "resetModel"
