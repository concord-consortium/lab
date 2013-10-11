helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
simpleModel = helpers.getModel 'simple-model.json'

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->
  interactivesController = requirejs 'common/controllers/interactives-controller'

  describe "InterativeController", ->
    controller = null
    interactive = null
    model = null

    beforeEach ->
      interactive =
        {
          "title": "Test Interactive",
          "models": []
        }

    it "initializes with no model defined", ->
      controller = interactivesController interactive, 'body'

