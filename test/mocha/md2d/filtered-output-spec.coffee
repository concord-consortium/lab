helpers = require '../../helpers'
helpers.setupBrowserEnvironment()
simpleModel = helpers.getModel 'simple-model.json'

RunningAverageFilter = requirejs 'cs!common/filters/running-average-filter'
Model                = requirejs 'models/md2d/models/modeler'

describe "MD2D filters", ->
  describe "RunningAverageFilter", ->
    runningAvg = null

    describe "[basic tests of the class]", ->
      beforeEach ->
        runningAvg = new RunningAverageFilter 2
        runningAvg.setMaxBufferLength 4

      it "should have correct public properties", ->
        runningAvg.periodLength.should.eql 2

      it "should have empty buffer and current step equal to -1", ->
        runningAvg.getCurrentBufferLength().should.equal 0
        runningAvg.getCurrentStep().should.equal -1

      describe "when new points are being added", ->
        it "should update step index and keep correct buffer length", ->
          runningAvg.addSample 0, 0
          runningAvg.getCurrentStep().should.equal 0
          runningAvg.getCurrentBufferLength().should.equal 1

          runningAvg.addSample 1, 1
          runningAvg.getCurrentStep().should.equal 1
          runningAvg.getCurrentBufferLength().should.equal 2

          runningAvg.addSample 2, 2
          runningAvg.getCurrentStep().should.equal 2
          runningAvg.getCurrentBufferLength().should.equal 3

          runningAvg.addSample 3, 3
          runningAvg.getCurrentStep().should.equal 3
          runningAvg.getCurrentBufferLength().should.equal 4

        it "should overwrite last point when new point has the same time", ->
          runningAvg.addSample 0, 0
          # Note that we add point with the same time as last time!
          runningAvg.addSample 0, 1
          runningAvg.getCurrentStep().should.equal 0
          runningAvg.getCurrentBufferLength().should.equal 1

        it "should throw when point with smaller time than previous is added", ->
          runningAvg.addSample 2, 0
          (-> runningAvg.addSample 1, 1).should.throw()

        it "should keep maximum buffer length", ->
          runningAvg.addSample 0, 0
          runningAvg.addSample 1, 1
          runningAvg.addSample 2, 2
          runningAvg.addSample 3, 3

          # Note that buffer is limited to length = 4!
          runningAvg.addSample 4, 4
          runningAvg.getCurrentStep().should.equal 3
          runningAvg.getCurrentBufferLength().should.equal 4

          # Note that buffer is limited to length = 4!
          runningAvg.addSample 4, 4
          runningAvg.getCurrentStep().should.equal 3
          runningAvg.getCurrentBufferLength().should.equal 4

        it "should calculate running average and update step index - simple test case", ->
          runningAvg.addSample 0, 0
          runningAvg.calculate().should.eql 0
          runningAvg.addSample 1, 1
          runningAvg.calculate().should.eql 0.5
          runningAvg.addSample 2, 2
          runningAvg.calculate().should.eql 1
          runningAvg.addSample 3, 3
          runningAvg.calculate().should.eql 2
          runningAvg.addSample 4, 4
          runningAvg.calculate().should.eql 3
          runningAvg.addSample 5, 5
          runningAvg.calculate().should.eql 4
          # etc

        it "should calculate running average - complex test case with linear interpolation", ->
          runningAvg.addSample 0, 0
          runningAvg.calculate().should.eql 0

          runningAvg.addSample 2.5, 2.5
          # Note that interpolation have to be used to get value at t = 0.5.
          # Why t = 0.5? Current time = 2.5 minus periodLength = 2.
          runningAvg.calculate().should.eql 1.5

          runningAvg.addSample 4, 4
          # Again, interpolation have to be used to get value at t = 2.0.
          runningAvg.calculate().should.eql 3


    describe "[tests related to the tick history handling]", ->
      before ->
        runningAvg = new RunningAverageFilter 2
        runningAvg.setMaxBufferLength 10
        runningAvg.addSample 0, 0
        runningAvg.addSample 1, 1
        runningAvg.addSample 2, 2
        runningAvg.addSample 3, 3
        runningAvg.addSample 4, 4
        runningAvg.addSample 5, 5
        runningAvg.addSample 6, 6

      it "should be able to seek a specific position", ->
        runningAvg.getCurrentStep().should.eql 6

        runningAvg.setCurrentStep 5
        runningAvg.getCurrentStep().should.eql 5
        runningAvg.calculate().should.eql 4

        runningAvg.setCurrentStep 2
        runningAvg.getCurrentStep().should.eql 2
        runningAvg.calculate().should.eql 1

        runningAvg.setCurrentStep 3
        runningAvg.getCurrentStep().should.eql 3
        runningAvg.calculate().should.eql 2

      it "should be able to invalidate data ahead of the given index", ->
        runningAvg.getCurrentStep().should.eql 3
        runningAvg.getCurrentBufferLength().should.eql 7
        runningAvg.invalidate 1
        runningAvg.getCurrentBufferLength().should.eql 2
        runningAvg.calculate().should.eql 0.5

        # Adding new samplse after invalidation should work fine
        runningAvg.addSample 2, 2
        runningAvg.addSample 3, 3

      describe "when #setCurrentStep is called with location outside the range", ->
        it "should throw an error", ->
          runningAvg.getCurrentStep().should.eql 3
          runningAvg.getCurrentBufferLength().should.eql 4
          (-> runningAvg.setCurrentStep 4).should.throw()
          (-> runningAvg.setCurrentStep -2).should.throw()


    describe "[tests in the MD2D modeler context]", ->
      model = null

      describe "when filter is attached to output property", ->
        beforeEach ->
          model = new Model simpleModel
          # Filter: 'test', period: 2fs.
          model.defineFilteredOutput "filteredTime", {}, "time", "RunningAverage", 2

        it "should calculate running average correctly", ->
          model.get("time").should.equal 0
          model.get("filteredTime").should.equal 0

          model.tick()
          model.get("time").should.equal 1
          model.get("filteredTime").should.equal 0.5

          model.tick()
          model.get("time").should.equal 2
          model.get("filteredTime").should.equal 1

          model.tick()
          model.get("time").should.equal 3
          model.get("filteredTime").should.equal 2

          model.tick()
          model.get("time").should.equal 4
          model.get("filteredTime").should.equal 3
          # etc.

        it "calculate running average correctly when other properties are updated in the meantime", ->
          # This test is based on the issue found some time ago, see:
          # https://github.com/concord-consortium/lab/pull/32
          # https://groups.google.com/forum/?fromgroups#!topic/lab-models/2dpOB-YTatM

          # Filtered outputs weren't working correctly when
          # invalidatingChangePostHook was called during tick() (e.g. due to
          # change of some other model property). Test similar case to avoid
          # regression.
          model.addPropertiesListener "time", ->
            # Do anything what can invalidate current state,
            # e.g. change model option.
            model.set "viscosity", Math.random() * 2 + 1

          model.get("time").should.equal 0
          model.get("filteredTime").should.equal 0

          model.tick()
          model.get("time").should.equal 1
          model.get("filteredTime").should.equal 0.5

          model.tick()
          model.get("time").should.equal 2
          model.get("filteredTime").should.equal 1

          model.tick()
          model.get("time").should.equal 3
          model.get("filteredTime").should.equal 2

        it "should follow changes of the current model step", ->
          model.tick()
          model.tick()
          model.tick()
          model.get("time").should.equal 3
          model.get("filteredTime").should.equal 2

          model.stepBack()
          model.get("time").should.equal 2
          model.get("filteredTime").should.equal 1

          model.stepBack()
          model.get("time").should.equal 1
          model.get("filteredTime").should.equal 0.5

          model.stepBack()
          model.get("time").should.equal 0
          model.get("filteredTime").should.equal 0

          model.stepForward()
          model.get("time").should.equal 1
          model.get("filteredTime").should.equal 0.5

          model.seek 3
          model.get("time").should.equal 3
          model.get("filteredTime").should.equal 2

      describe "when filter is attached to a parameter", ->
        beforeEach ->
          model = new Model simpleModel
          # Filter: 'test', period: 2fs.
          model.defineFilteredOutput "filteredViscosity", {}, "viscosity", "RunningAverage", 2

        it "should calculate running average correctly", ->
          model.get("viscosity").should.equal 1
          model.get("filteredViscosity").should.equal 1

          model.tick()

          model.get("viscosity").should.equal 1
          model.get("filteredViscosity").should.equal 1

          # Change viscosity!
          model.set viscosity: 4

          model.get("viscosity").should.equal 4
          # Filtered output is based on the historical data,
          # so it doesn't reflect changes immediately!
          model.get("filteredViscosity").should.equal 1

          model.tick()
          model.get("viscosity").should.equal 4
          model.get("filteredViscosity").should.equal 1.75

          model.tick()
          model.get("viscosity").should.equal 4
          model.get("filteredViscosity").should.equal 3.25
          # etc.

        it "should follow changes of the current model step", ->
          model.tick()
          model.stepCounter().should.equal 1
          # Change viscosity at step 1.
          model.set viscosity: 4

          model.tick()
          model.tick()
          model.stepCounter().should.equal 3
          model.get("viscosity").should.equal 4
          model.get("filteredViscosity").should.equal 3.25

          model.stepBack()
          model.stepCounter().should.equal 2
          model.get("viscosity").should.equal 4
          model.get("filteredViscosity").should.equal 1.75

          model.stepBack()
          model.stepCounter().should.equal 1
          model.get("viscosity").should.equal 1
          model.get("filteredViscosity").should.equal 1

          model.stepBack()
          model.stepCounter().should.equal 0
          model.get("viscosity").should.equal 1
          model.get("filteredViscosity").should.equal 1

          model.stepForward()
          model.stepCounter().should.equal 1
          model.get("viscosity").should.equal 1
          model.get("filteredViscosity").should.equal 1

          model.stepForward()
          model.stepCounter().should.equal 2
          model.get("viscosity").should.equal 4
          model.get("filteredViscosity").should.equal 1.75

          model.seek 3
          model.stepCounter().should.equal 3
          model.get("viscosity").should.equal 4
          model.get("filteredViscosity").should.equal 3.25
