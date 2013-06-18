helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

PropertySupport  = requirejs 'common/property-support'
OutputSupport = requirejs 'common/output-support'

describe "Lab outputs mixin", ->
  model = null
  describe "an output property defined using Model#defineOutput", ->
    before ->
      model = {}

      propertySupport = new PropertySupport
        types: ["output"]
      outputSupport = new OutputSupport propertySupport

      propertySupport.mixInto model
      outputSupport.mixInto model

      model.defineOutput 'testProperty', {
        property1: 'value'
      }, -> 10

    it "can be accessed using Model#get", ->
      model.get('testProperty').should.equal 10

    it "cannot be overwritten using Model#set", ->
      (-> model.set testProperty: 0).should.throw()
      model.get('testProperty').should.equal 10

    it "can have its description retrieved by Model#getPropertyDescription", ->
      model.getPropertyDescription('testProperty').getHash().should.eql { property1: 'value' }

    it "can be observed", ->
      observer = sinon.spy()
      model.addPropertiesListener 'testProperty', observer
      observer.called.should.not.be.true
      model.updateAllOutputProperties()
      observer.called.should.be.true

describe "property caching", ->
  model = null
  forceRecomputation = -> model.set gravitationalField: 1
  calculator = null

  beforeEach ->
    model = {}

    propertySupport = new PropertySupport
      types: ["output"]
    outputSupport = new OutputSupport propertySupport

    propertySupport.mixInto model
    outputSupport.mixInto model

    # Define property which invalidates computed properties.
    propertySupport.defineProperty "gravitationalField",
      beforeSetCallback: propertySupport.invalidatingChangePreHook,
      afterSetCallback: propertySupport.invalidatingChangePostHook

    calculator = sinon.spy()
    model.defineOutput 'testProperty', {}, calculator

  describe "the first time a property is looked up", ->
    beforeEach ->
      calculator.callCount.should.equal 0
      model.get 'testProperty'

    it "should be recomputed", ->
      calculator.callCount.should.equal 1

    describe "the second time the property is looked up", ->
      beforeEach ->
        calculator.reset()
        model.get 'testProperty'

      it "should not be recomputed", ->
        calculator.callCount.should.equal 0

    describe "after all outputs are told to be updated", ->
      beforeEach ->
        model.updateAllOutputProperties()

      describe "and the property is looked up", ->
        beforeEach ->
          calculator.reset()
          model.get 'testProperty'

        it "should be recomputed", ->
          calculator.callCount.should.equal 1

    describe "after a change forces recomputation of output properties", ->
      beforeEach ->
        forceRecomputation()

      describe "and the output property is looked up", ->
        beforeEach ->
          calculator.reset()
          model.get 'testProperty'

        it "should be recomputed", ->
          calculator.callCount.should.equal 1

  describe "in the presence of property observers", ->
    describe "a cached property that has no observers", ->
      nonObservedCalculator = null
      beforeEach ->
        nonObservedCalculator = sinon.stub().returns 1
        model.defineOutput 'nonObservedProperty', {}, nonObservedCalculator
        model.get('nonObservedProperty').should.equal 1
        nonObservedCalculator.reset()

      describe "and that is not depended on by an observed property", ->
        describe "when a change forces recomputation of output properties", ->
          beforeEach ->
            forceRecomputation()

          it "should not be recomputed", ->
            nonObservedCalculator.callCount.should.equal 0

      describe "but that is depended on by an observed property", ->
        beforeEach ->
          model.defineOutput 'observedProperty', {}, -> model.get('nonObservedProperty') + 1
          model.addPropertiesListener 'observedProperty', ->

        describe "when a change forces recomputation of output properties", ->
          beforeEach ->
            forceRecomputation()

          it "should be recomputed", ->
            nonObservedCalculator.callCount.should.equal 1

          describe "when accessed again", ->
            beforeEach ->
              nonObservedCalculator.reset()
              model.get('nonObservedProperty').should.equal 1

            it "should not be recomputed", ->
              nonObservedCalculator.callCount.should.equal 0

        describe "and that is additionally depended on by a second observed property", ->
          beforeEach ->
            model.defineOutput 'observedProperty2', {}, -> model.get('nonObservedProperty') + 2
            model.addPropertiesListener 'observedProperty2', ->
            nonObservedCalculator.reset()

          describe "when a change forces recomputation of output properties", ->
            beforeEach ->
              forceRecomputation()

            it "should be recomputed only once", ->
              nonObservedCalculator.callCount.should.equal 1

    describe "a cached property that has observers", ->
      observedCalculator = null
      beforeEach ->
        observedCalculator = sinon.stub().returns 2
        model.defineOutput 'observedProperty', {}, observedCalculator
        model.addPropertiesListener 'observedProperty', ->
        model.get('observedProperty').should.equal 2
        observedCalculator.reset()

      describe "when a change forces recomputation of output properties", ->
        beforeEach ->
          forceRecomputation()

        it "is recomputed", ->
          observedCalculator.callCount.should.equal 1

        describe "when accessed again", ->
          beforeEach ->
            observedCalculator.reset()
            model.get('observedProperty').should.equal 2

          it "should not be recomputed", ->
            observedCalculator.callCount.should.equal 0


describe "property observing", ->
  model = peObserver = timeObserver = null
  time = 0
  potentialEnergy = 1

  beforeEach ->
    model = {}

    propertySupport = new PropertySupport
      types: ["output"]
    outputSupport = new OutputSupport propertySupport

    propertySupport.mixInto model
    outputSupport.mixInto model

    # Define property which invalidates computed properties.
    propertySupport.defineProperty 'gravitationalField',
      beforeSetCallback: propertySupport.invalidatingChangePreHook,
      afterSetCallback: propertySupport.invalidatingChangePostHook

    model.set "gravitationalField", 1

    model.defineOutput 'potentialEnergy', {
      property1: 'value'
    }, -> potentialEnergy * model.get 'gravitationalField'

    model.defineOutput 'time', {
      property1: 'value'
    }, -> time

    peObserver = sinon.spy()
    model.addPropertiesListener 'potentialEnergy', peObserver
    timeObserver = sinon.spy()
    model.addPropertiesListener 'time', timeObserver

  describe "mass notification of properties after a Model#updateAllOutputProperties call", ->
    initialPE = null

    beforeEach ->
      initialPE = model.get 'potentialEnergy'
      model.updateAllOutputProperties()

    describe "an observer of a property that did not change in value", ->
      it "should still be called", ->
        model.get('potentialEnergy').should.equal initialPE
        peObserver.callCount.should.equal 1

  describe "selective notification of properties after an invalidating change", ->
    describe "when a model property is changed (invalidating output properties)", ->
      initialPE = initialTime = null

      beforeEach ->
        initialPE = model.get 'potentialEnergy'
        initialTime = model.get 'time'
        model.set gravitationalField: 2

      describe "an observer of a property that changed in value", ->
        it "should be called", ->
          model.get('potentialEnergy').should.not.equal initialPE
          peObserver.callCount.should.equal 1

      describe "an observer of a property that did not change in value", ->
        it "should not be called", ->
          model.get('time').should.equal initialTime
          timeObserver.callCount.should.equal 0
