helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

describe "MD2D filters", ->
  requirejs [
    'cs!md2d/models/basic-filter'
    'cs!md2d/models/running-average-filter'
  ], (BasicFilter, RunningAverageFilter) ->

    # Basic function which will be filtered.
    i = null
    func = ->
      i++

    beforeEach ->
      i = 0

    describe "BasicFilter", ->
      basicFilter = null

      beforeEach ->
        basicFilter = new BasicFilter {}, func

      it "should return just value of the function", ->
        basicFilter.calculate().should.equal 0
        basicFilter.calculate().should.equal 1
        basicFilter.calculate().should.equal 2
        # etc.


    describe "RunningAverageFilter", ->
      runningAvg = null

      beforeEach ->
        runningAvg = new RunningAverageFilter samples: 3, func


      it "should return running average of the function", ->
        runningAvg.calculate().should.equal 0
        runningAvg.calculate().should.equal 0.5
        runningAvg.calculate().should.equal 1.0
        runningAvg.calculate().should.equal 2.0
        runningAvg.calculate().should.equal 3.0
        runningAvg.calculate().should.equal 4.0
        # etc.