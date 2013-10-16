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

  requirejs.define 'grapher/core/graph', [], ->
    # Just a function that calls through to mock.Graph, while allowing mock.Graph to
    # be replaced with a stub or spy at any time.
    (-> mock.Graph(arguments...))

  GraphController = requirejs 'common/controllers/graph-controller'
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
    id: 'graphContainerId'
    type: 'graph'
    properties: ['potentialEnergy', 'kineticEnergy']

  # actual tests
  describe "GraphController", ->
    graphController = null
    interactivesController = null
    model = null

    beforeEach ->
      interactivesController = new MockInteractivesController()
      interactivesController.loadModel()
      model = interactivesController.model

    it "should exist", ->
      should.exist GraphController

    it "should act as a constructor that accepts the component spec as its argument", ->
      controller = new GraphController getComponentSpec(), interactivesController
      should.exist controller

    describe "A GraphController instance", ->
      controller = null

      beforeEach ->
        controller = new GraphController getComponentSpec(), interactivesController

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

            it "should have class .graph", ->
              $container.hasClass('graph').should.be.true

      it "should have a getView method", ->
        controller.should.have.property 'getView'

      it "should have a modelLoadedCallback method", ->
        controller.should.have.property 'modelLoadedCallback'

      describe "modelLoadedCallback", ->
        beforeEach ->
          sinon.spy mock, 'Graph'
        afterEach ->
          mock.Graph.restore()

        it "should call the Graph constructor", ->
          controller.modelLoadedCallback()
          mock.Graph.callCount.should.equal 1

        it "should pass the DIV DOM element to the Graph constructor", ->
          controller.modelLoadedCallback()
          mock.Graph.getCall(0).args[0].tagName.should.eql "DIV"
          mock.Graph.getCall(0).args[0].id.should.eql getComponentSpec().id

        it "should create a Graph instance which is returned by #getView", ->
          should.not.exist controller.getView()
          controller.modelLoadedCallback()
          controller.getView().should.equal mock.Graph.returnValues[0]

        it "should call grapher.reset when called a second time", ->
          controller.modelLoadedCallback()
          grapher = mock.Graph.returnValues[0]
          controller.modelLoadedCallback()
          grapher.reset.callCount.should.equal 1

      describe "interaction with model", ->
        grapher = null
        beforeEach ->
          sinon.spy mock, 'Graph'
          controller.modelLoadedCallback()
          grapher = mock.Graph.returnValues[0]
        afterEach ->
          mock.Graph.restore()

        describe "when the grapher is initialized", ->
          it "should call grapher.resetPoints", ->
            grapher.resetPoints.callCount.should.equal 1

          it "should pass an array of length 2 to resetPoints", ->
            newData = grapher.resetPoints.getCall(0).args[0]
            newData.should.have.length 2

          describe "the array passed to resetPoints", ->
            it "should contain 2 arrays, each with the initial value of one of component.properties", ->
              newData = grapher.resetPoints.getCall(0).args[0]
              newData.should.eql [ [ [0, model.get('potentialEnergy')] ], [[0, model.get('kineticEnergy')] ] ]

        describe "after 1 model tick", ->
          beforeEach ->
            grapher.addPoints.reset()
            grapher.resetPoints.reset()
            model.tick()

          it "should not call grapher.resetPoints", ->
            grapher.resetPoints.callCount.should.equal 0

          it "should call grapher.addPoints", ->
            grapher.addPoints.callCount.should.equal 1

          describe "the argument to addPoints", ->
            it "should be an array with the new value of each of component.properties", ->
              dataPoint = grapher.addPoints.getCall(0).args[0]
              pePoint = [model.get('displayTime'), model.get('potentialEnergy')]
              kePoint = [model.get('displayTime'), model.get('kineticEnergy')]
              dataPoint.should.eql [ pePoint , kePoint  ]

        describe "after 2 model ticks", ->
          beforeEach ->
            model.tick()
            model.tick()

          describe "followed by a stepBack", ->
            beforeEach ->
              grapher.updateOrRescale.reset()
              grapher.addPoints.reset()
              model.stepBack()

            it "should call grapher.updateOrRescale(1)", ->
              grapher.updateOrRescale.callCount.should.equal 1
              grapher.updateOrRescale.getCall(0).args.should.eql [1]

            it "should not call grapher.resetPoints", ->
              grapher.addPoints.callCount.should.equal 0

            describe "followed by a stepForward", ->
              beforeEach ->
                grapher.updateOrRescale.reset()
                grapher.addPoints.reset()
                model.stepForward()

              it "should call grapher.updateOrRescale(2)", ->
                grapher.updateOrRescale.callCount.should.equal 1
                grapher.updateOrRescale.getCall(0).args.should.eql [2]

              it "should not call grapher.resetPoints", ->
                grapher.addPoints.callCount.should.equal 0

          describe "followed by seek(1)", ->
            beforeEach ->
              grapher.updateOrRescale.reset()
              grapher.addPoints.reset()
              model.seek 1

            it "should call grapher.updateOrRescale(1)", ->
              grapher.updateOrRescale.callCount.should.equal 1
              grapher.updateOrRescale.getCall(0).args.should.eql [1]

            it "should not call grapher.resetPoints", ->
              grapher.addPoints.callCount.should.equal 0

          describe "followed by a model reset", ->
            beforeEach ->
              grapher.reset.reset()
              grapher.addPoints.reset()
              model.reset()

            it "should call grapher.reset", ->
              grapher.reset.callCount.should.equal 1

            it "should pass options to grapher.reset", ->
              grapher.reset.getCall(0).args.should.have.length 2
              options = grapher.reset.getCall(0).args[1]
              options.should.be.an.Object

            it "should pass 1 array of length 2 to resetPoints", ->
              newData = grapher.resetPoints.getCall(0).args[0]
              newData.should.have.length 2

            describe "the array passed to resetPoints", ->
              it "should contain 2 arrays, each with the initial value of one of component.properties", ->
                newData = grapher.resetPoints.getCall(0).args[0]
                newData.should.eql [ [ [0, model.get('potentialEnergy')] ], [ [0, model.get('kineticEnergy')] ] ]

        describe "an invalidating property change, after 2 model ticks and a stepBack", ->
          expectedData = null
          beforeEach ->
            model.reset()
            expectedData = [[],[]]
            pePoint0 = [model.get('displayTime'), model.get('potentialEnergy')]
            kePoint0 = [model.get('displayTime'), model.get('kineticEnergy')]
            expectedData[0].push pePoint0
            expectedData[1].push kePoint0

            model.tick()
            pePoint1 = [model.get('displayTime'), model.get('potentialEnergy')]
            kePoint1 = [model.get('displayTime'), model.get('kineticEnergy')]
            expectedData[0].push pePoint1
            expectedData[1].push kePoint1

            model.tick()
            model.stepBack()

            grapher.addPoints.reset()
            grapher.resetPoints.reset()
            grapher.reset.reset()

            # This should invalidate the third data point (corresponding to stepCounter == 2)
            model.set gravitationalField: 1

          it "should not call grapher.addPoints", ->
            grapher.addPoints.callCount.should.equal 0

          it "should call grapher.resetPoints", ->
            grapher.resetPoints.callCount.should.equal 1

          describe "the array passed to resetPoints", ->
            newData = null
            beforeEach ->
              newData = grapher.resetPoints.getCall(0).args[0]

            it "should contain 2 arrays", ->
              newData.should.have.length 2

            describe "the first element of each array", ->
              it "should be the original values of each of the properties", ->
                newData[0][0].should.eql expectedData[0][0]
                newData[1][0].should.eql expectedData[1][0]

            describe "the second element of each array", ->
              it "should be the post-first-tick values of each of the properties", ->
                newData[0][1].should.eql expectedData[0][1]
                newData[1][1].should.eql expectedData[1][1]

            describe "the third element of each array", ->
              it "should not exist", ->
                newData[0].should.have.length 2
                newData[1].should.have.length 2


    describe "handling of graph configuration options in component spec", ->
      grapherOptionsForComponentSpec = (componentSpec) ->
        controller = new GraphController componentSpec, interactivesController
        sinon.spy mock, 'Graph'
        controller.modelLoadedCallback()
        options = mock.Graph.getCall(0).args[1]
        mock.Graph.restore()
        options

      shouldSendComponentSpecPropertyToGrapherOption = (cProp, gOption) ->
        componentSpec = getComponentSpec()
        componentSpec[cProp] = 'test value'
        grapherOptionsForComponentSpec(componentSpec).should.have.property gOption, 'test value'

      it "should have a default value for 'title'", ->
        grapherOptionsForComponentSpec(getComponentSpec()).should.have.property 'title'

      it "should respect the component spec property 'title'", ->
        shouldSendComponentSpecPropertyToGrapherOption 'title', 'title'

      it "should have a default value for 'xlabel'", ->
        grapherOptionsForComponentSpec(getComponentSpec()).should.have.property 'xlabel'

      it "should respect the component spec property 'xlabel'", ->
        shouldSendComponentSpecPropertyToGrapherOption 'xlabel', 'xlabel'

      it "should have a default value for 'xmin'", ->
        grapherOptionsForComponentSpec(getComponentSpec()).should.have.property 'xmin'

      it "should respect the component spec property 'xmin'", ->
        shouldSendComponentSpecPropertyToGrapherOption 'xmin', 'xmin'

      it "should have a default value for 'xmax'", ->
        grapherOptionsForComponentSpec(getComponentSpec()).should.have.property 'xmax'

      it "should respect the component spec property 'xmax'", ->
        shouldSendComponentSpecPropertyToGrapherOption 'xmax', 'xmax'

      it "should have a default value for 'ylabel'", ->
        grapherOptionsForComponentSpec(getComponentSpec()).should.have.property 'ylabel'

      it "should respect the component spec property 'ylabel'", ->
        shouldSendComponentSpecPropertyToGrapherOption 'ylabel', 'ylabel'

      it "should have a default value for 'ymin'", ->
        grapherOptionsForComponentSpec(getComponentSpec()).should.have.property 'ymin'

      it "should respect the component spec property 'ymin'", ->
        shouldSendComponentSpecPropertyToGrapherOption 'ymin', 'ymin'

      it "should have a default value for 'ymax'", ->
        grapherOptionsForComponentSpec(getComponentSpec()).should.have.property 'ymax'

      it "should respect the component spec property 'ymax'", ->
        shouldSendComponentSpecPropertyToGrapherOption 'ymax', 'ymax'
