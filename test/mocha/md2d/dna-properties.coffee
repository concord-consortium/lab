helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

describe "DNAProperties", ->
  requirejs [
    'md2d/models/engine/dna-properties',
    'md2d/models/modeler'
    ], (DNAProperties, Model) ->

    describe "[basic tests of the class]", ->
      # Mock the change hooks.
      changeHooks =
        pre: ->
        post: ->
        changeListener: ->

      beforeEach ->
        sinon.spy changeHooks, "pre"
        sinon.spy changeHooks, "post"
        sinon.spy changeHooks, "changeListener"

      afterEach ->
        changeHooks.pre.restore()
        changeHooks.post.restore()
        changeHooks.changeListener.restore()

      describe "DNAProperties constructor", ->
        it "should exist", ->
          should.exist DNAProperties

        it "should act as a constructor", ->
          dnaProperties = new DNAProperties
          should.exist dnaProperties

      describe "DNAProperties instance", ->
        dnaProperties = null

        before ->
          dnaProperties = new DNAProperties

        it "should have a registerChangeHooks, add, set, get, on methods", ->
          dnaProperties.should.have.property "registerChangeHooks"
          dnaProperties.should.have.property "set"
          dnaProperties.should.have.property "get"
          dnaProperties.should.have.property "on"

        it "should return undefined when DNA properties are not specified", ->
          should.not.exist dnaProperties.get()

        describe "without registered change hooks", ->
          it "should throw when the add method is called", ->
            (-> dnaProperties.set {sequence: "ATGC"}).should.throw()

        describe "with registered change hooks", ->

          beforeEach ->
            dnaProperties.registerChangeHooks changeHooks.pre, changeHooks.post
            dnaProperties.on "change", changeHooks.changeListener

          it "should allow to set DNA properties and call appropriate hooks", ->
            dnaProperties.set {sequence: "ATGC", x: 1, y: 2, height: 3}
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            changeHooks.changeListener.callCount.should.eql 1

          it "should allow to get existing DNA properties", ->
            dnaProperties.get().should.eql {sequence: "ATGC", complementarySequence: "TACG", x: 1, y: 2, height: 3}

          it "should allow to modify existing DNA properties and call appropriate hooks", ->
            dnaProperties.set {sequence: "TTGA", x: 0, y: 1}
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            changeHooks.changeListener.callCount.should.eql 1

            dnaProperties.get().should.eql {sequence: "TTGA", complementarySequence: "AACT", x: 0, y: 1, height: 3}

          it "should allow to deserialize DNA properties (replacing existing properties)", ->
            data = {sequence: "CGTA", x: 5, y: 6, height: 7}

            dnaProperties.deserialize data
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            changeHooks.changeListener.callCount.should.eql 1

            dnaProperties.get().should.eql {sequence: "CGTA", complementarySequence: "GCAT", x: 5, y: 6, height: 7}

          it "should provide Clone-Restore interface"
            # TODO

    describe "[tests in the MD2D modeler context]", ->

      describe "DNAProperties instance", ->
        it "should be initialized by the modeler", ->
          # Use {} as an empty model definition. Default values will be used.
          model = new Model {}
          should.exist model.getDNAProperties()

        it "should be filled with initial properties if they are defined in model JSON", ->
          model = new Model
            dnaProperties: {sequence: "ATGC", x: 1, y: 2, height: 3}

          dnaProperties = model.getDNAProperties()
          dnaProperties.get().should.eql {sequence: "ATGC", complementarySequence: "TACG", x: 1, y: 2, height: 3}
