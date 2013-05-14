helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

PropertyTransition = requirejs 'common/models/property-transition'
inherit            = requirejs 'common/inherit'

describe "PropertyTransition", ->
  describe "PropertyTransition constructor", ->
    it "should exist", ->
      should.exist PropertyTransition
    it "should fail when one tries to instantiate this class directly", ->
      (-> new PropertyTransition()).should.throw()

  describe "instance of AbstractTransiton subclass", ->
    # Subclass of PropertyTransition used for tests.
    Transition = null
    # Instance of Transition.
    t = null
    # Simple model used for transitions.
    model = [{x: 0}, {x: 1}]

    before ->
      # Create Transition and implement required methods. Note that this is
      # also an instruction how to implement your own Transition subclass!
      # This is a minimal implementation, but most of implementations should
      # be really similar.
      Transition = ->
        PropertyTransition.call this
      inherit Transition, PropertyTransition
      Transition.prototype.getObjectProperties = (id) ->
        model[id]
      Transition.prototype.setObjectProperties = (id, props) ->
        model[id] = props
      # Instantiate.
      t = new Transition()

    processCallShouldHaveNoEffects = ->
      t.process 500
      t.isFinished.should.be.false
      model[0].x.should.eql 0

    it "should be initialized correctly", ->
      t.isFinished.should.be.false
      # Transition is not defined completely.
      processCallShouldHaveNoEffects()

    it "should let the user set id", ->
      t.id 0
      # Transition is not defined completely.
      processCallShouldHaveNoEffects()

    it "should let the user choose property name and its end value", ->
      t.prop "x", 10

    it "should let the user choose duration (in ms)", ->
      t.duration 1000

    it "should let the user choose delay (in ms)", ->
      t.delay 300

    it "should let the user choose easing function", ->
      t.ease "linear"

    it "should update property when it is being processed", ->
      t.process 0
      t.isFinished.should.be.false
      model[0].x.should.eql 0

      t.process 300
      t.isFinished.should.be.false
      # 300ms of delay
      model[0].x.should.eql 0

      t.process 500
      t.isFinished.should.be.false
      # 500ms is 0.5 of 1000ms, and 5 is 0.5 of 10 (end value)
      model[0].x.should.eql 5

      t.process 200
      t.isFinished.should.be.false
      # 500ms + 200ms = 700ms is 0.7 of 1000ms, and 7 is 0.7 of 10 (end value)
      model[0].x.should.eql 7

    it "should finish transition when elapsed time exceeds duration time", ->
      t.process 300
      t.isFinished.should.be.true
      # 700ms + 300ms = 1000ms
      model[0].x.should.eql 10

    it "should ignore any subsequent calls of process method", ->
      t.process 300
      t.isFinished.should.be.true
      model[0].x.should.eql 10
