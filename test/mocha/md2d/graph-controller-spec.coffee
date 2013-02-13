helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
# simple-model is useful because it has properties that are guaranteed to change every tick
simpleModel = helpers.getModel 'simple-model.json'

helpers.withIsolatedRequireJS (requirejs) ->

  # mock the RealTimeGraph, which depends on Canvas and SVG internals that don't work in jsdom
  mock =
    RealTimeGraph: ->
      new_data:        sinon.spy()
      add_points:      sinon.spy()
      updateOrRescale: sinon.spy()
      showMarker:      sinon.spy()
      reset:           sinon.spy()

  requirejs.define 'grapher/core/real-time-graph', [], ->
    # Just a function that calls through to mock.RealTimeGraph, while allowing mock.RealTimeGraph to
    # be replaced with a stub or spy at any time.
    (-> mock.RealTimeGraph(arguments...))


  getComponentSpec = ->
    id: 'graphContainerId'
    type: 'graph'
    properties: ['potentialEnergy', 'kineticEnergy']

  # actual tests
  describe "GraphController", ->
    requirejs ['common/controllers/graph-controller', 'md2d/models/modeler'], (GraphController, Model) ->

      it "should exist", ->
        should.exist GraphController

      it "should act as a constructor that accepts the component spec as its argument", ->
        controller = new GraphController getComponentSpec()
        should.exist controller

      describe "A GraphController instance", ->
        controller = null

        beforeEach ->
          global.model = new Model simpleModel
          controller = new GraphController getComponentSpec()

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

              it "should have class .properties-graph", ->
                $container.hasClass('properties-graph').should.be.true

        it "should have a getView method", ->
          controller.should.have.property 'getView'

        it "should have a modelLoadedCallback method", ->
          controller.should.have.property 'modelLoadedCallback'

        describe "modelLoadedCallback", ->
          beforeEach ->
            sinon.spy mock, 'RealTimeGraph'
          afterEach ->
            mock.RealTimeGraph.restore()

          it "should call the RealTimeGraph constructor", ->
            controller.modelLoadedCallback()
            mock.RealTimeGraph.callCount.should.equal 1

          it "should pass the DIV DOM element to the RealTimeGraph constructor", ->
            controller.modelLoadedCallback()
            mock.RealTimeGraph.getCall(0).args[0].tagName.should.eql "DIV"
            mock.RealTimeGraph.getCall(0).args[0].id.should.eql getComponentSpec().id

          it "should create a RealTimeGraph instance which is returned by #getView", ->
            should.not.exist controller.getView()
            controller.modelLoadedCallback()
            controller.getView().should.equal mock.RealTimeGraph.returnValues[0]

          it "should call grapher.reset when called a second time", ->
            controller.modelLoadedCallback()
            grapher = mock.RealTimeGraph.returnValues[0]
            controller.modelLoadedCallback()
            grapher.reset.callCount.should.equal 1

        describe "interaction with model", ->
          grapher = null
          beforeEach ->
            sinon.spy mock, 'RealTimeGraph'
            controller.modelLoadedCallback()
            grapher = mock.RealTimeGraph.returnValues[0]
          afterEach ->
            mock.RealTimeGraph.restore()

          describe "when the grapher is initialized", ->
            it "should call grapher.new_data", ->
              grapher.new_data.callCount.should.equal 1

            it "should pass an array of length 2 to new_data", ->
              newData = grapher.new_data.getCall(0).args[0]
              newData.should.have.length 2

            describe "the array passed to new_data", ->
              it "should contain 2 arrays, each with the initial value of one of component.properties", ->
                newData = grapher.new_data.getCall(0).args[0]
                newData.should.eql [[model.get('potentialEnergy')], [model.get('kineticEnergy')]]

            it "should pass option.sample = viewRefreshRate * timeStep (/ 1000)", ->
              options = mock.RealTimeGraph.getCall(0).args[1]
              options.should.have.property 'sample', model.get('viewRefreshInterval') * model.get('timeStep') / 1000

          describe "after 1 model tick", ->
            beforeEach ->
              grapher.add_points.reset()
              grapher.new_data.reset()
              model.tick()

            it "should not call grapher.new_data", ->
              grapher.new_data.callCount.should.equal 0

            it "should call grapher.add_points", ->
              grapher.add_points.callCount.should.equal 1

            describe "the argument to add_points", ->
              it "should be an array with the new value of each of component.properties", ->
                dataPoint = grapher.add_points.getCall(0).args[0]
                dataPoint.should.eql [model.get('potentialEnergy'), model.get('kineticEnergy')]

          describe "after 2 model ticks", ->
            beforeEach ->
              model.tick()
              model.tick()

            describe "followed by a stepBack", ->
              beforeEach ->
                grapher.updateOrRescale.reset()
                grapher.showMarker.reset()
                grapher.new_data.reset()
                model.stepBack()

              it "should call grapher.updateOrRescale(1)", ->
                grapher.updateOrRescale.callCount.should.equal 1
                grapher.updateOrRescale.getCall(0).args.should.eql [1]

              it "should call grapher.showMarker(1)", ->
                grapher.showMarker.callCount.should.equal 1
                grapher.showMarker.getCall(0).args.should.eql [1]

              it "should not call grapher.new_data", ->
                grapher.new_data.callCount.should.equal 0

              describe "followed by a stepForward", ->
                beforeEach ->
                  grapher.updateOrRescale.reset()
                  grapher.showMarker.reset()
                  grapher.new_data.reset()
                  model.stepForward()

                it "should call grapher.updateOrRescale(2)", ->
                  grapher.updateOrRescale.callCount.should.equal 1
                  grapher.updateOrRescale.getCall(0).args.should.eql [2]

                it "should call grapher.showMarker(2)", ->
                  grapher.showMarker.callCount.should.equal 1
                  grapher.showMarker.getCall(0).args.should.eql [2]

                it "should not call grapher.new_data", ->
                  grapher.new_data.callCount.should.equal 0

            describe "followed by seek(1)", ->
              beforeEach ->
                grapher.updateOrRescale.reset()
                grapher.showMarker.reset()
                grapher.new_data.reset()
                model.seek 1

              it "should call grapher.updateOrRescale(1)", ->
                grapher.updateOrRescale.callCount.should.equal 1
                grapher.updateOrRescale.getCall(0).args.should.eql [1]

              it "should call grapher.showMarker(1)", ->
                grapher.showMarker.callCount.should.equal 1
                grapher.showMarker.getCall(0).args.should.eql [1]

              it "should not call grapher.new_data", ->
                grapher.new_data.callCount.should.equal 0

            describe "followed by a model reset", ->
              beforeEach ->
                grapher.reset.reset()
                grapher.new_data.reset()
                model.reset()

              it "should call grapher.reset", ->
                grapher.reset.callCount.should.equal 1

              it "should pass options to grapher.reset", ->
                grapher.reset.getCall(0).args.should.have.length 2
                options = grapher.reset.getCall(0).args[1]
                options.should.be.a 'object'

              it "should pass option.sample = viewRefreshRate * timeStep (/ 1000)", ->
                options = grapher.reset.getCall(0).args[1]
                options.should.have.property 'sample', model.get('viewRefreshInterval') * model.get('timeStep') / 1000

              it "should pass 1 array of length 2 to new_data", ->
                newData = grapher.new_data.getCall(0).args[0]
                newData.should.have.length 2

              describe "the array passed to new_data", ->
                it "should contain 2 arrays, each with the initial value of one of component.properties", ->
                  newData = grapher.new_data.getCall(0).args[0]
                  newData.should.eql [[model.get('potentialEnergy')], [model.get('kineticEnergy')]]

          describe "an invalidating property change, after 2 model ticks and a stepBack", ->
            expectedData = null
            beforeEach ->
              expectedData = []
              expectedData.push [model.get('potentialEnergy'), model.get('kineticEnergy')]
              model.tick()
              expectedData.push [model.get('potentialEnergy'), model.get('kineticEnergy')]
              model.tick()
              model.stepBack()
              grapher.add_points.reset()
              grapher.new_data.reset()
              # This should invalidate the third data point (corresponding to stepCounter == 2)
              model.set gravitationalField: 1

            it "should not call grapher.add_points", ->
              grapher.add_points.callCount.should.equal 0

            it "should call grapher.new_data", ->
              grapher.new_data.callCount.should.equal 1

            describe "the array passed to new_data", ->
              newData = null
              beforeEach ->
                newData = grapher.new_data.getCall(0).args[0]

              it "should contain 2 arrays", ->
                newData.should.have.length 2

              describe "the first element of each array", ->
                it "should be the original values of each of the properties", ->
                  newData[0][0].should.equal expectedData[0][0]
                  newData[1][0].should.equal expectedData[0][1]

              describe "the second element of each array", ->
                it "should be the post-first-tick values of each of the properties", ->
                  newData[0][1].should.equal expectedData[1][0]
                  newData[1][1].should.equal expectedData[1][1]

              describe "the third element of each array", ->
                it "should not exist", ->
                  newData[0].should.have.length 2
                  newData[1].should.have.length 2

          describe "handling of sample size changes", ->
            beforeEach ->
              grapher.reset.reset()

            grapherShouldReset = ->
              grapher.reset.callCount.should.equal 1
            sampleShouldBeCorrect = ->
              options = grapher.reset.getCall(0).args[1]
              options.sample.should.equal model.get('viewRefreshInterval') * model.get('timeStep') / 1000

            it "should reset the graph and sample size after viewRefreshInterval is changed", ->
              model.set viewRefreshInterval: 2 * model.get 'viewRefreshInterval'
              grapherShouldReset()
              sampleShouldBeCorrect()

            it "should reset the graph and sample size after timeStep is changed", ->
              model.set timeStep: 2 * model.get 'timeStep'
              grapherShouldReset()
              sampleShouldBeCorrect()

      describe "handling of graph configuration options in component spec", ->
        grapherOptionsForComponentSpec = (componentSpec) ->
          controller = new GraphController componentSpec
          sinon.spy mock, 'RealTimeGraph'
          controller.modelLoadedCallback()
          options = mock.RealTimeGraph.getCall(0).args[1]
          mock.RealTimeGraph.restore()
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
