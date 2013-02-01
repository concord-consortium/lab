helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

exportsSpec =
  {
    "outputs": ["dummyOutput1", "dummyOutput2"]
    "parameters": ["dummyParameter1", "dummyParameter2"]
  }

helpers.withIsolatedRequireJS (requirejs) ->

  dgExporter =
    exportData: sinon.spy()

  requirejs.define 'common/dg-exporter', [], -> dgExporter

  requirejs ['md2d/models/modeler', 'common/controllers/dg-export-controller'], (Model, DgExportController) ->

    describe "DataGames export controller", ->
      dgExportController = null
      beforeEach ->
        # TODO pass model as first parameter to DgExportController ... not yet
        # b/c we're focused on writing tests for existing implementation.
        global.model = new Model {}

        # for convenience, make the model advance 1 *ps* per tick
        model.set
          timeStep: 1000
          viewRefreshInterval: 1

        model.defineOutput 'dummyOutput1', {
          label: "dummy output 1"
          units: "units 1"
        }, -> 1 + model.get 'time'

        model.defineOutput 'dummyOutput2', {
          label: "dummy output 2"
          units: "units 2"
        }, -> 2 + model.get 'time'

        model.defineParameter 'dummyParameter1', {
          label: "dummy parameter 1",
          units: "units 3"
        }, -> null

        model.defineParameter 'dummyParameter2', {
          label: "dummy parameter 2",
          units: "units 4"
        }, -> null

        model.set
          dummyParameter1: 10
          dummyParameter2: 20

        dgExporter.exportData.reset()
        dgExportController = new DgExportController exportsSpec
        dgExportController.modelLoadedCallback()


      describe "when exportData is called", ->
        call = null
        beforeEach ->
          dgExportController.exportData()
          call = dgExporter.exportData.getCall 0

        it "should call dgExporter.exportData()", ->
          dgExporter.exportData.callCount.should.equal 1

        describe "the first argument", ->
          it "should be a list of the exported parameters' names and units", ->
            call.args[0].should.eql ["dummy parameter 1 (units 3)", "dummy parameter 2 (units 4)"]

        describe "the second argument", ->
          it "should be a list of exported parameters' values", ->
            call.args[1].should.eql [10, 20]

        describe "the third argument", ->
          it "should be a list containing \"Time (ps)\", followed by the exported outputs' names and units", ->
            call.args[2].should.eql ["Time (ps)", "dummy output 1 (units 1)", "dummy output 2 (units 2)"]

        describe "the fourth argument", ->
          it "should be a list of lists containing the model time, plus the output's values", ->
            call.args[3].should.eql [[0, 1, 2]]

      describe "effect of stepping model forward/back/etc", ->

        exportedTimePoints = ->
          dgExportController.exportData()
          call = dgExporter.exportData.getCall 0
          args = call.args[3]
          args.map (dataPoint) -> dataPoint[0]

        describe "a model tick", ->
          it "should result in a data point being added to the timeseries data", ->
            model.tick()
            points = exportedTimePoints()
            points.should.eql [0, 1]

        describe "a model reset", ->
          it "should reset the timeseries data to one data point"
            # model.reset() doesn't appear to work quite right at the moment
            # model.tick()
            # model.reset()
            # exportedTimePoints().should.eql [0]

        describe "a step back", ->
          it "should not remove data points from the timeseries data", ->
            model.tick()
            model.stepBack()
            points = exportedTimePoints()
            points.should.eql [0, 1]

        describe "a step back followed by an invalidating change", ->
          it "should remove a data point from the timeseries data", ->
            model.tick()
            model.stepBack()
            model.set gravitationalField: 0
            points = exportedTimePoints()
            points.should.eql [0]
