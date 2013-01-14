helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

describe "GeneticProperties", ->
  requirejs [
    'md2d/models/engine/genetic-properties',
    'md2d/models/modeler'
    ], (GeneticProperties, Model) ->

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

      describe "GeneticProperties constructor", ->
        it "should exist", ->
          should.exist GeneticProperties

        it "should act as a constructor", ->
          geneticProperties = new GeneticProperties
          should.exist geneticProperties

      describe "GeneticProperties instance", ->
        geneticProperties = null

        before ->
          geneticProperties = new GeneticProperties

        it "should have a registerChangeHooks, add, set, get, on, transcribeDNA methods", ->
          geneticProperties.should.have.property "registerChangeHooks"
          geneticProperties.should.have.property "set"
          geneticProperties.should.have.property "get"
          geneticProperties.should.have.property "on"
          geneticProperties.should.have.property "transcribeDNA"

        it "should return undefined when genetic properties are not specified", ->
          should.not.exist geneticProperties.get()

        describe "without registered change hooks", ->
          it "should throw when the add method is called", ->
            (-> geneticProperties.set {DNA: "ATGC"}).should.throw()

        describe "with registered change hooks", ->

          beforeEach ->
            geneticProperties.registerChangeHooks changeHooks.pre, changeHooks.post
            geneticProperties.on "change", changeHooks.changeListener

          it "should allow to set genetic properties and call appropriate hooks", ->
            geneticProperties.set {DNA: "ATGC", x: 1, y: 2, height: 3}
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            changeHooks.changeListener.callCount.should.eql 1

          it "should allow to get existing genetic properties", ->
            geneticProperties.get().should.eql {DNA: "ATGC", DNAComplement: "TACG", x: 1, y: 2, height: 3}


          it "should allow to transcribe mRNA from DNA and call appropriate hooks", ->
            geneticProperties.transcribeDNA()
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            changeHooks.changeListener.callCount.should.eql 1

            geneticProperties.get().should.eql {DNA: "ATGC", DNAComplement: "TACG", mRNA: "AUGC", x: 1, y: 2, height: 3}

          it "should allow to modify existing genetic properties and call appropriate hooks", ->
            geneticProperties.set {DNA: "ATGCT", x: 0, y: 1}
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            changeHooks.changeListener.callCount.should.eql 1

            # Note that as DNA was changed, DNAComplement was recalculated and mRNA was deleted.
            geneticProperties.get().should.eql {DNA: "ATGCT", DNAComplement: "TACGA", x: 0, y: 1, height: 3}

          it "should allow to deserialize genetic properties (replacing existing properties)", ->
            data = {DNA: "CGTA", x: 5, y: 6, height: 7}

            geneticProperties.deserialize data
            changeHooks.pre.callCount.should.eql 1
            changeHooks.post.callCount.should.eql 1
            changeHooks.changeListener.callCount.should.eql 1

            geneticProperties.get().should.eql {DNA: "CGTA", DNAComplement: "GCAT", x: 5, y: 6, height: 7}



          it "should provide Clone-Restore interface"
            # TODO

    describe "[tests in the MD2D modeler context]", ->

      describe "GeneticProperties instance", ->
        it "should be initialized by the modeler", ->
          # Use {} as an empty model definition. Default values will be used.
          model = new Model {}
          should.exist model.getGeneticProperties()

        it "should be filled with initial properties if they are defined in model JSON", ->
          model = new Model
            geneticProperties: {DNA: "ATGC", x: 1, y: 2, height: 3}

          geneticProperties = model.getGeneticProperties()
          geneticProperties.get().should.eql {DNA: "ATGC", DNAComplement: "TACG", x: 1, y: 2, height: 3}
