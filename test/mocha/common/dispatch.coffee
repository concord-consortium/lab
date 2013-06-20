helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

Dispatch = requirejs 'common/dispatch-support'

describe "Dispatch", ->
  describe "Dispatch constructor", ->
    it "should exist", ->
      should.exist Dispatch

  describe "instance of Dispatch", ->
    # Instance of Dispatch.
    d = null
    # Event listeners.
    l =
      l1: ->
      l2: ->
      l3: ->
      l4: ->

    before ->
      d = new Dispatch "e1", "e2"

    beforeEach ->
      sinon.spy l, "l1"
      sinon.spy l, "l2"
      d.on "e1", l.l1
      d.on "e2", l.l2

    afterEach ->
      l.l1.restore()
      l.l2.restore()

    it "should work as d3.dispatch unless batch mode is turned on", ->
      l.l1.callCount.should.eql 0
      l.l2.callCount.should.eql 0
      d.e1()
      l.l1.callCount.should.eql 1
      l.l2.callCount.should.eql 0
      d.e2()
      l.l1.callCount.should.eql 1
      l.l2.callCount.should.eql 1
      d.e1()
      d.e2()
      l.l1.callCount.should.eql 2
      l.l2.callCount.should.eql 2

      d.e1("test")
      l.l1.callCount.should.eql 3
      l.l1.getCall(2).args[0].should.eql "test"

      d.e2(1, 2, "test", 3)
      l.l2.callCount.should.eql 3
      l.l2.getCall(2).args.should.eql [1, 2, "test", 3]

    it "should support 'batch mode'", ->
      d.startBatch()
      d.e1()
      d.e1()
      d.e1()
      # We are in batch!
      l.l1.callCount.should.eql 0
      d.endBatch()
      # Only one event should be dispatched.
      l.l1.callCount.should.eql 1

      d.startBatch()
      d.e1()
      d.e1()
      d.e2()
      d.e2()
      # We are in batch!
      l.l1.callCount.should.eql 1
      l.l2.callCount.should.eql 0
      d.endBatch()
      # Only one event of each type should be dispatched.
      l.l1.callCount.should.eql 2
      l.l2.callCount.should.eql 1

    it "should support let user to manually flush all batched event even while in batch mode", ->
      d.startBatch()
      d.e1()
      d.e1()
      d.e1()
      l.l1.callCount.should.eql 0
      d.flush()
      l.l1.callCount.should.eql 1
      d.endBatch()
      l.l1.callCount.should.eql 1

      d.startBatch()
      d.e2()
      d.e2()
      l.l2.callCount.should.eql 0
      d.flush()
      l.l2.callCount.should.eql 1
      d.e2()
      l.l2.callCount.should.eql 1
      d.flush()
      l.l2.callCount.should.eql 2
      d.endBatch()
      l.l2.callCount.should.eql 2

      d.startBatch()
      d.e2()
      d.e2()
      l.l2.callCount.should.eql 2
      d.flush()
      l.l2.callCount.should.eql 3
      d.e2()
      l.l2.callCount.should.eql 3
      d.flush()
      l.l2.callCount.should.eql 4
      d.e2()
      d.endBatch()
      l.l2.callCount.should.eql 5

    it "should let user register new events after initialization", ->
      (-> d.e3()).should.throw()
      (-> d.e4()).should.throw()

      d.addEventTypes "e3", "e4"
      sinon.spy l, "l3"
      sinon.spy l, "l4"
      d.on "e3", l.l3
      d.on "e4", l.l4

      d.e3()
      l.l3.callCount.should.eql 1
      d.e4()
      l.l4.callCount.should.eql 1

      # Note that old listeners were unregistered!
      d.e1()
      d.e2()
      l.l1.callCount.should.eql 0
      l.l2.callCount.should.eql 0

      # We have to register them again!
      d.on "e1", l.l1
      d.on "e2", l.l2
      d.e1()
      d.e2()
      l.l1.callCount.should.eql 1
      l.l2.callCount.should.eql 1

    it "should provide mixInto method injecting .on() method to target", ->
      target = {}
      d.mixInto target

      d.addEventTypes "e3"
      target.on "e3"

      d.e3()
      l.l3.callCount.should.eql 1

    it "should let remove the listener", ->
      d.on "e1", null

      d.e1()
      d.e2()
      l.l1.callCount.should.eql 0
      l.l2.callCount.should.eql 1
