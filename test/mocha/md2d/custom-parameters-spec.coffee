helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Model = requirejs 'models/md2d/models/modeler'

describe "MD2D custom parameters", ->
  model = null
  setter = null

  beforeEach ->
    model = Model {}
    model.set gravitationalField: 0
    setter = sinon.spy (value) ->
      this.set gravitationalField: 10*value
    model.defineParameter 'testParameter', {
      property1: 'value'
    }, setter

  describe "custom parameters as read/write model properties", ->

    it "should be possible to set the parameter's value using Model#set and retrieve it using Model#get", ->
      model.set testParameter: 1
      model.get('testParameter').should.equal 1

    it "should be possible to retrieve the parameter's property description using Model#getPropertyDescription", ->
      model.getPropertyDescription('testParameter').getHash().should.eql { property1: 'value' }

    describe "when the parameter's value is set using Model#set", ->
      observer = null

      beforeEach ->
        observer = sinon.spy ->
          model.get 'gravitationalField'
        model.addPropertiesListener 'testParameter', observer
        model.set testParameter: 1
        model.get('testParameter').should.equal 1

      it "should be possible to retrieve the parameter's property description using Model#getPropertyDescription", ->
        model.getPropertyDescription('testParameter').getHash().should.eql { property1: 'value' }

      it "should pass the new parameter value to the setter", ->
        setter.args[0].should.eql [1]

      it "should set 'this' inside the setter to be the model object itself", ->
        setter.thisValues[0].should.equal model

      it "should correctly update the other model properties according to the setter definition", ->
        model.get('gravitationalField').should.equal 10

      it "should notify observers of the parameter property", ->
        observer.callCount.should.equal 1

      describe "the observer", ->
        it "should be called strictly after the setter acts", ->
          observer.returnValues[0].should.equal 10

      # ... I don't think there's any reason to care that observers of properties set by the
      # parameter setter get called before the parameter observer gets called.

  describe "interaction of custom parameters with tick history", ->

    describe "starting at step 1", ->
      beforeEach ->
        model.set testParameter: 1
        model.tick()
        model.stepCounter().should.equal 1

      describe "after setting the parameter value and advancing the model two more steps", ->
        beforeEach ->
          model.set testParameter: 2
          model.tick()
          model.tick()
          model.stepCounter().should.equal 3

        describe "and after seeking to step 1", ->
          beforeEach ->
            setter.reset()
            model.seek 1

          it "should update the parameter value to the old value", ->
            model.get('testParameter').should.equal 1

          it "should not call the setter", ->
            setter.callCount.should.equal 0

          describe "and stepping forward", ->
            beforeEach ->
              setter.reset()
              model.stepForward()

            it "should update the parameter value to the new value", ->
              model.get('testParameter').should.equal 2

            it "should not call the setter", ->
              setter.callCount.should.equal 0

            describe "and stepping forward again", ->
              beforeEach ->
                model.stepForward()

              it "should not update the parameter value", ->
                model.get('testParameter').should.equal 2

          describe "and seeking to step 2", ->
            beforeEach ->
              setter.reset()
              model.seek 2

            it "should update the parameter value to the new value", ->
              model.get('testParameter').should.equal 2

            it "should not call the setter", ->
              setter.callCount.should.equal 0

          describe "and seeking to step 3", ->
            beforeEach ->
              setter.reset()
              model.seek 3

            it "should update the parameter value to the new value", ->
              model.get('testParameter').should.equal 2

            it "should not call the setter", ->
              setter.callCount.should.equal 0

        describe "and after stepping back to step 2", ->
          beforeEach ->
            model.stepBack()

          it "should not update the parameter value", ->
            model.get('testParameter').should.equal 2

          describe "and stepping back again to step 1", ->
            beforeEach ->
              setter.reset()
              model.stepBack()

            it "should update the parameter value to the old value", ->
              model.get('testParameter').should.equal 1

            it "should not call the setter", ->
              setter.callCount.should.equal 0

    describe "when there are two custom parameters", ->
      observer1 = null
      observer2 = null
      beforeEach ->
        model.defineParameter 'testParameter2', {}, (value) ->
          this.set viscosity: value

      describe "notification of observers", ->
        beforeEach ->
          model.set { testParameter: 1, testParameter2: 2 }
          model.tick()
          model.set { testParameter: 10, testParameter2: 20 }
          model.tick()
          model.stepCounter().should.equal 2

          observer1 = sinon.spy ->
            model.get 'testParameter2'
          observer2 = sinon.spy ->
            model.get 'testParameter'

          model.addPropertiesListener 'testParameter', observer1
          model.addPropertiesListener 'testParameter2', observer2

        describe "when the parameter values are restored by stepping in the tick history", ->
          beforeEach ->
            model.stepBack()

          it "should notify parameter observers strictly after both parameter values have been restored", ->
            observer1.returnValues[0].should.equal 2
            observer2.returnValues[0].should.equal 1

        describe "when only one parameter value is restored by stepping in the tick history", ->
          beforeEach ->
            model.set testParameter: 100
            model.tick()
            observer1.reset()
            observer2.reset()
            model.stepBack()

          it "should notify the observer of the parameter that actually changed", ->
            observer1.callCount.should.equal 1

          it "should not notify the observer of the parameter that did not change", ->
            observer2.callCount.should.equal 0
