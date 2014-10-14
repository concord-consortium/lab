helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

exportsSpec =
  {
    "perRun": ["perRunParam", "perRunOutput"]
    "perTick": ["perTickOutput", "perTickParam"]
  }

helpers.withIsolatedRequireJS (requirejs) ->

  canExportData = false

  dgExporter =
    exportData: sinon.spy()
    openTable:  sinon.spy()
    logAction: sinon.spy()
    canExportData: -> canExportData
    init: ->

  requirejs.define 'import-export/dg-exporter', [], -> dgExporter

  Model            = requirejs 'models/md2d/models/modeler'
  ExportController = requirejs 'common/controllers/export-controller'

  class MockInteractivesController
    constructor: () ->
      @modelResetCallbacks = []
      @modelLoadedCallbacks = []

    on: (event, callback) ->
      if event.indexOf('modelReset') == 0 then @modelResetCallbacks.push(callback)
      if event.indexOf('modelLoaded') == 0 then @modelLoadedCallbacks.push(callback)

    loadModel: ->
      @model = loadModel()
      @modelLoadedCallbacks.forEach (cb) -> cb('initialLoad')

    getModel: ->
      @model

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
    model = new Model {}

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
      timeStep: 1000
      timeStepsPerTick: 1
      perRunParam: 10
      perTickParam: 20

    model


  describe "Export controller events", ->
    it "should emit canExportData if dgExporter connects to CODAP after initialization", ->
      canExportDataHandler = sinon.spy()

      # the value to be returned by dgExporter.canExportData():
      canExportData = false
      interactivesController = new MockInteractivesController()
      exportController = new ExportController(exportsSpec, interactivesController)
      exportController.on 'canExportData', canExportDataHandler

      # now, test it
      canExportData = true
      dgExporter.codapDidConnect()

      canExportDataHandler.called.should.equal true


  describe "Export controller", ->
    exportController = null
    interactivesController = null
    model = null

    beforeEach ->
      dgExporter.exportData.reset()
      dgExporter.openTable.reset()
      interactivesController = new MockInteractivesController()
      exportController = new ExportController(exportsSpec, interactivesController)

      interactivesController.loadModel()
      model = interactivesController.model


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
            call.args[0].should.eql ["Row", "per-run parameter (units 3)", "per-run output (units 1)"]

        describe "the second argument", ->
          it "should be a list of per-run parameters and outputs' values", ->
            call.args[1].should.eql [null, 10, 1]

        describe "the third argument", ->
          it "should be a list containing \"Time (ps)\", followed by per-tick parameters and outputs, including labels and units", ->
            call.args[2].should.eql ["Time (ps)", "per-tick output (units 2)", "per-tick parameter (units 4)"]

        describe "the fourth argument", ->
          it "should be a list of lists containing the model time, plus the per-tick values", ->
            call.args[3].should.eql [[0, 2, 20]]

        describe "after exportData is called a second time", ->
          beforeEach ->
            exportController.exportData()
            call = dgExporter.exportData.getCall 1

          describe "the run number", ->
            it "should be null", ->
              call.args[0][0].should.eql "Row"
              should.equal(call.args[1][0], null)

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

      objectAttachedTo = (call) ->
        JSON.parse call.args[0].match(/Per-run Settings and Data: (.*)$/)[1]

      beforeEach ->
        dgExporter.logAction.reset()

      describe "after the model is started", ->
        beforeEach ->
          model.start()

        it "should log \"User started the model\"", ->
          dgExporter.logAction.callCount.should.eql 1
          call = dgExporter.logAction.getCall 0
          call.args[0].should.match /^User started the model./

        it "should pass the per-run parameters", ->
          call = dgExporter.logAction.getCall 0
          objectAttachedTo(call).should.eql {
            fields: ["per-run parameter (units 3)", "per-run output (units 1)"]
            values: [10, 1]
          }


      describe "after a model reload", ->
        beforeEach ->
          model.properties.perRunParam = "updated before reload"
          interactivesController.reloadModel()

        it "should log \"User reloaded the model\"", ->
          dgExporter.logAction.callCount.should.eql 1
          call = dgExporter.logAction.getCall 0
          call.args[0].should.match /^User reloaded the model./

        it "should pass the per-run parameters as they were before reload", ->
          call = dgExporter.logAction.getCall 0
          objectAttachedTo(call).should.eql {
            fields: ["per-run parameter (units 3)", "per-run output (units 1)"]
            values: ["updated before reload", 1]
          }


      describe "after a model reset", ->
        beforeEach ->
          model.properties.perRunParam = "updated before reset"
          interactivesController.resetModel()

        it "should log \"User reset the model\"", ->
          dgExporter.logAction.callCount.should.eql 1
          call = dgExporter.logAction.getCall 0
          call.args[0].should.match /^User reset the model./

        it "should pass the per-run parameters as they were before reset", ->
          call = dgExporter.logAction.getCall 0
          objectAttachedTo(call).should.eql {
            fields: ["per-run parameter (units 3)", "per-run output (units 1)"]
            values: ["updated before reset", 1]
          }


      describe "after a model reset with cause 'new-run'", ->
        beforeEach ->
          interactivesController.resetModel({ cause: 'new-run' })

        it "should log \"User set up a new run\"", ->
          dgExporter.logAction.callCount.should.eql 1
          call = dgExporter.logAction.getCall 0
          call.args[0].should.match /^User set up a new run./


      describe "after exportData is called", ->
        beforeEach ->
          exportController.exportData()

        it "should log \"User exported the model\"", ->
          dgExporter.logAction.callCount.should.eql 1
          call = dgExporter.logAction.getCall 0
          call.args[0].should.match /^User exported the model./

        it "should pass the per-run parameters", ->
          call = dgExporter.logAction.getCall 0
          objectAttachedTo(call).should.eql {
            fields: ["per-run parameter (units 3)", "per-run output (units 1)"]
            values: [10, 1],
            changedParameters: []
          }

      describe "after the model is run and a parameter is changed, and exportData is called again", ->
        calls = null
        getLogCallsMatching = (pattern) ->
          changedParametersLogs = (call for call in calls when call.args[0].match(pattern))

        beforeEach ->
          model.start()
          model.stop()
          model.properties.perRunParam = 11
          exportController.exportData()
          calls = (dgExporter.logAction.getCall(i) for i in [0...dgExporter.logAction.callCount])

        describe "the \"User exported the model\" log event", ->

          it "should list the changed parameters", ->
            call = getLogCallsMatching(/^User exported the model./)[0]
            objectAttachedTo(call).changedParameters
              .should.eql [
                field: "per-run parameter (units 3)",
                valueAtStart: 10,
                valueExported: 11
              ]

        it "should log \"User changed parameters between start and export\"", ->
          getLogCallsMatching(/^User changed parameters between start and export/)
            .should.have.lengthOf 1

        describe "the \"User changed parameters between start and export\" log event", ->

          it "should list the changed parameters", ->
            call = getLogCallsMatching(/^User changed parameters between start and export/)[0]
            objectAttachedTo(call).changedParameters
              .should.eql [
                field: "per-run parameter (units 3)",
                valueAtStart: 10,
                valueExported: 11
              ]
