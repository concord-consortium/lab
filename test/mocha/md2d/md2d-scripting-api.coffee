helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->
  InteractivesController = requirejs 'common/controllers/interactives-controller'

  controller = null
  script = null

  interactive =
    "title": "Test Interactive"
    "models": [
      "id": "model1"
      "url": "model1"
    ]

  before ->
    # Create interactive controller.
    # Probably most tests will load their custom models,
    # so load just empty model.
    helpers.withModel {}, ->
      controller = new InteractivesController interactive, 'body'
    script = window.script
    should.exist script

  # Loads a given model. Use this function instead of creating a new
  # interactive controller each time whan a new model should be loaded.
  loadModel = (modelDefinition) ->
    # Use provided model.
    helpers.withModel modelDefinition, ->
      controller.loadModel "model1"
    # Scripting API is exported to the global namespace when model is loaded.
    script = window.script


  describe "MD2D Scripting API test", ->

    describe "atomsWithinTriangle", ->
      before ->
        loadModel({width: 10, height: 10})

      it "should return atoms within triangular area", ->
        should.exist script.atomsWithinTriangle
        script.addAtom x: 5, y: 5
        # Various test cases:
        script.atomsWithinTriangle(0, 0, 5, 10, 10, 0).should.eql [0]
        script.atomsWithinTriangle(0, 0, 4.99, 10, 4.99, 0).should.eql []
        script.atomsWithinTriangle(0, 0, 5.01, 10, 5.01, 0).should.eql [0]
        script.atomsWithinTriangle(4.99, 0, 4.99, 10, 10, 0).should.eql [0]
        script.atomsWithinTriangle(5.01, 0, 5.01, 10, 10, 0).should.eql []
        script.atomsWithinTriangle(0, 5.01, 10, 5.01, 5, 0).should.eql [0]
        script.atomsWithinTriangle(0, 4.99, 10, 4.99, 5, 0).should.eql []
        script.atomsWithinTriangle(0, 5.01, 10, 5.01, 5, 10).should.eql []
        script.atomsWithinTriangle(0, 4.99, 10, 4.99, 5, 10).should.eql [0]
