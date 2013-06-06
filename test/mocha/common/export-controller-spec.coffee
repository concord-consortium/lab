helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

exportsSpec =
  {
    "perRun": ["perRunParam", "perRunOutput"]
    "perTick": ["perTickOutput", "perTickParam"]
  }

helpers.withIsolatedRequireJS (requirejs) ->

  dgExporter =
    exportData: sinon.spy()
    openTable:  sinon.spy()
    logAction: sinon.spy()

  requirejs.define 'import-export/dg-exporter', [], -> dgExporter

  Model            = requirejs 'md2d/models/modeler'
  ExportController = requirejs 'common/controllers/export-controller'

  describe "Export controller", ->
    exportController = null
    beforeEach ->
      # TODO pass model as first parameter to ExportController ... not yet
      # b/c we're focused on writing tests for existing implementation.
      global.model = new Model {}

      # for convenience, make the model advance 1 *ps* per tick
      model.set
        timeStep: 1000
        timeStepsPerTick: 1

      model.defineOutput 'perRunOutput', {
        label: "per-run output"
        unitAbbreviation: "units 1"
      }, -> 1 + model.get 'time'

      model.defineOutput 'perTickOutput', {
        label: "per-tick output"
        unitAbbreviation: "units 2"
      }, -> 2 + model.get 'time'

      model.defineParameter 'perRunParam', {
        label: "per-run parameter",
        unitAbbreviation: "units 3"
      }, -> null

      model.defineParameter 'perTickParam', {
        label: "per-tick parameter",
        unitAbbreviation: "units 4"
      }, -> null

      model.set
        perRunParam: 10
        perTickParam: 20

      dgExporter.exportData.reset()
      dgExporter.openTable.reset()
      exportController = new ExportController exportsSpec
      exportController.modelLoadedCallback()


    describe "when exportData is called", ->
      call = null
      beforeEach ->
        exportController.exportData()

      it "should call dgExporter.exportData()", ->
        dgExporter.exportData.callCount.should.equal 1

      it "should call dgExporter.openTable()", ->
        dgExporter.openTable.callCount.should.equal 1

      describe "arguments to dgExporter.exportData()", ->
        call = null
        beforeEach ->
          call = dgExporter.exportData.getCall 0

        describe "the first argument", ->
          it "should be a list of the per-run parameters followed by the per-run outputs, including labels and units", ->
            call.args[0].should.eql ["per-run parameter (units 3)", "per-run output (units 1)"]

        describe "the second argument", ->
          it "should be a list of per-run parameters and outputs' values", ->
            call.args[1].should.eql [10, 1]

        describe "the third argument", ->
          it "should be a list containing \"Time (ps)\", followed by per-tick parameters and outputs, including labels and units", ->
            call.args[2].should.eql ["Time (ps)", "per-tick output (units 2)", "per-tick parameter (units 4)"]

        describe "the fourth argument", ->
          it "should be a list of lists containing the model time, plus the per-tick values", ->
            call.args[3].should.eql [[0, 2, 20]]


    describe "regardless of the ordering in the 'perRun' section of the 'exports' spec", ->
      call = null
      beforeEach ->
        exportsSpecReversed =
          {
            "perRun": ["perRunOutput", "perRunParam"]
            "perTick": ["perTickParam", "perTickOutput"]
          }
        exportController = new ExportController exportsSpecReversed
        exportController.modelLoadedCallback()
        exportController.exportData()

        call = dgExporter.exportData.getCall 0

      it "should export per-run parameters before per-run outputs", ->
        call.args[0].should.eql ["per-run parameter (units 3)", "per-run output (units 1)"]

      it "should continue to export per-tick parameters and outputs in the order listed in the 'perTick' section", ->
        call.args[2].should.eql ["Time (ps)", "per-tick parameter (units 4)", "per-tick output (units 2)"]
        call.args[3].should.eql [[0, 20, 2]]

    describe "effect of stepping model forward/back/etc", ->

      exportedTimePoints = ->
        exportController.exportData()
        call = dgExporter.exportData.getCall 0
        args = call.args[3]
        args.map (dataPoint) -> dataPoint[0]

      describe "a model tick", ->
        it "should result in a data point being added to the timeseries data", ->
          model.tick()
          points = exportedTimePoints()
          points.should.eql [0, 1]

      describe "a model reset", ->
        it "should reset the timeseries data to one data point", ->
          model.tick()
          model.reset()
          exportedTimePoints().should.eql [0]

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

    describe "event logging", ->
      beforeEach ->
        dgExporter.logAction.reset()

      describe "after the model is started", ->
        beforeEach ->
          model.start()

        it "should log \"User started model\"", ->
          dgExporter.logAction.callCount.should.eql 1
          call = dgExporter.logAction.getCall 0
          call.args[0].should.match /^User started model./

        it "should pass the per-run parameters", ->
          call = dgExporter.logAction.getCall 0
          json = call.args[0].match(/Per-run Settings and Data: (.*)$/)[1]
          hash = JSON.parse(json)
          hash.should.eql {
            action: "started",
            type: "model",
            fields: ["per-run parameter (units 3)", "per-run output (units 1)"]
            values: [10, 1]
          }


      describe "after a model reset", ->
        beforeEach ->
          model.reset()

        it "should log \"User reset model\"", ->
          dgExporter.logAction.callCount.should.eql 1
          call = dgExporter.logAction.getCall 0
          call.args[0].should.match /^User reset model./

        it "should pass the per-run parameters", ->
          call = dgExporter.logAction.getCall 0
          json = call.args[0].match(/Per-run Settings and Data: (.*)$/)[1]
          hash = JSON.parse(json)
          hash.should.eql {
            action: "reset",
            type: "model",
            fields: ["per-run parameter (units 3)", "per-run output (units 1)"]
            values: [10, 1]
          }

      describe "after exportData is called", ->
        beforeEach ->
          exportController.exportData()

        it "should log \"User exported model\"", ->
          dgExporter.logAction.callCount.should.eql 1
          call = dgExporter.logAction.getCall 0
          call.args[0].should.match /^User exported model./

        it "should pass the per-run parameters", ->
          call = dgExporter.logAction.getCall 0
          json = call.args[0].match(/Per-run Settings and Data: (.*)$/)[1]
          hash = JSON.parse(json)
          hash.should.eql {
            action: "exported",
            type: "model",
            fields: ["per-run parameter (units 3)", "per-run output (units 1)"]
            values: [10, 1]
          }
