assert  = require 'assert'
helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
# simple-model is useful because it has properties that are guaranteed to change every tick
simpleModel = helpers.getModel 'simple-model.json'

helpers.withIsolatedRequireJS (requirejs) ->
  # mock the Graph, which depends on Canvas and SVG internals that don't work in jsdom
  mock =
    Graph: ->
      addPoints:       sinon.spy()
      resetPoints:     sinon.spy()
      updateOrRescale: sinon.spy()
      reset:           sinon.spy()
      repaint:         sinon.spy()

  requirejs.define 'lab-grapher', [], ->
    # Just a function that calls through to mock.Graph, while allowing mock.Graph to
    # be replaced with a stub or spy at any time.
    (-> mock.Graph(arguments...))

  TableController = requirejs 'common/controllers/table-controller'
  Model           = requirejs 'models/md2d/models/modeler'

  class MockInteractivesController
    constructor: () ->
      @modelResetCallbacks = []
      @modelLoadedCallbacks = []

    on: (event, callback) ->
      if event is 'modelReset' then @modelResetCallbacks.push(callback)
      if event is 'modelLoaded' then @modelLoadedCallbacks.push(callback)

    loadModel: ->
      @model = loadModel()
      @modelLoadedCallbacks.forEach (cb) -> cb('initialLoad')

    getModel: ->
      @model

    getScriptingAPI: ->
      @scriptingAPI

    getNextTabIndex: ->

    reloadModel: (opts) ->
      @model.willReset()
      @model = loadModel()
      @modelLoadedCallbacks.forEach (cb) -> cb('reload')

    resetModel: (opts) ->
      opts ||= { cause: 'reset' }
      @model.willReset()
      @model.reset()
      @modelResetCallbacks.forEach (cb) -> cb(opts.cause)

  loadModel = ->
    model = new Model simpleModel

  getComponentSpec = ->
    "id": "half-life-time-table",
    "type": "table",
    "title": null,
    "clearDataOnReset": true,
    "streamDataFromModel": false,
    "addNewRows": true,
    "visibleRows": 4,
    "indexColumn": false,
    "propertyColumns":[
      "numHalfLives"
      "numElementsParent"
      "numElementsChild"
      {
        "name": "Total Isotopes"
        "format": "r"
      }
      {
        "name": "Parents"
        "units": "%"
        "format": ".2r"
      }
      {
        "name": "Daughters"
        "units": "%"
        "format": ".2r"
      }
    ]
    "width": "100%",
    "height": "12em",
    "tooltip": ""


  # actual tests
  describe "TableController", ->
    tableController = null
    interactivesController = null
    model = null

    beforeEach ->
      interactivesController = new MockInteractivesController()
      interactivesController.loadModel()
      model = interactivesController.model

    it "should exist", ->
      should.exist TableController

    it "should act as a constructor that accepts the component spec as its argument", ->
      controller = new TableController getComponentSpec(), interactivesController
      should.exist controller

    describe "A TableController instance", ->
      controller = null

      beforeEach ->
        controller = new TableController getComponentSpec(), interactivesController

      it "should have a getViewContainer method", ->
        controller.should.have.property 'getViewContainer'

      describe "getViewContainer", ->
        it "should return a jQuery selection when getViewContainer is called", ->
          $container = controller.getViewContainer()
          $container.should.be.instanceof $().constructor

        describe "the returned view container", ->
          $container = null
          beforeEach ->
            $container = controller.getViewContainer()

          it "should contain a single element", ->
            $container.should.have.length 1

          describe "the element", ->
            it "should have the id specified in the component spec", ->
              $container.attr('id').should.equal getComponentSpec().id

            it "should have class .interactive-table", ->
              $container.hasClass('interactive-table').should.be.true

      describe "getView", ->
        view = null
        beforeEach ->
          view = controller.getView()

        it "should return a TableView", ->
          should.exist view


      it "should have a modelLoadedCallback method", ->
        controller.should.have.property 'modelLoadedCallback'

      describe "modelLoadedCallback", ->
        view = null
        beforeEach ->
          view = controller.getView()
          sinon.spy view, 'updateTable'
        afterEach ->
          view.updateTable.restore()

        describe "when streaming data from the model", ->
          # todo

        it "should call the views updateTable method with correct columns", ->
          controller.modelLoadedCallback()
          view.updateTable.callCount.should.equal 1
          assert view.updateTable.calledWithMatch(sinon.match.has('columns'))
