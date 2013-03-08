helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

GeneticProperties = requirejs 'md2d/models/engine/genetic-properties'
Model             = requirejs 'md2d/models/modeler'

describe "GeneticProperties", ->
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
          geneticProperties.set {DNA: "ATGC", x: 1, y: 2, height: 3, width: 3}
          changeHooks.pre.callCount.should.eql 1
          changeHooks.post.callCount.should.eql 1
          changeHooks.changeListener.callCount.should.eql 1

        it "should allow to get existing genetic properties", ->
          geneticProperties.get().should.eql {DNA: "ATGC", DNAComplement: "TACG", x: 1, y: 2, height: 3, width: 3}

        it "should transcribe mRNA from DNA and call appropriate hooks", ->
          geneticProperties.transcribeDNA()
          changeHooks.pre.callCount.should.eql 1
          changeHooks.post.callCount.should.eql 1
          changeHooks.changeListener.callCount.should.eql 1

          geneticProperties.get().should.eql {DNA: "ATGC", DNAComplement: "TACG", mRNA: "AUGC", x: 1, y: 2, height: 3, width: 3}

        it "should translate mRNA to amino acids sequence correctly", ->
          # This is pretty complex, so test a least some examples.
          geneticProperties.set {DNA: "ATGCCAGGCGGCGAGAGCTTGCTAATTGGCTTATAG"}
          geneticProperties.translate().should.eql ["Met", "Pro", "Gly", "Gly", "Glu", "Ser", "Leu", "Leu", "Ile", "Gly", "Leu"]
          # Note that "TAG" sequence will result in "STOP" codon, so the result should be exactly the same.
          geneticProperties.set {DNA: "ATGCCAGGCGGCGAGAGCTTGCTAATTGGCTTATAGATGCCAGGCGGCGAGAGCTTGCTAATTGGCTTA"}
          geneticProperties.translate().should.eql ["Met", "Pro", "Gly", "Gly", "Glu", "Ser", "Leu", "Leu", "Ile", "Gly", "Leu"]

        it "should translate mRNA to amino acids sequence step by step", ->
          geneticProperties.set {DNA: "ATGCCAGGCGGCGAGAGCTTGCTAATTGGCTTATAG"}
          geneticProperties.get().should.not.have.property 'translationStep'
          geneticProperties.translateStepByStep().should.eql "Met"
          geneticProperties.get().translationStep.should.eql 0
          geneticProperties.translateStepByStep().should.eql "Pro"
          geneticProperties.get().translationStep.should.eql 1
          geneticProperties.translateStepByStep().should.eql "Gly"
          geneticProperties.get().translationStep.should.eql 2
          geneticProperties.translateStepByStep().should.eql "Gly"
          geneticProperties.get().translationStep.should.eql 3
          geneticProperties.translateStepByStep().should.eql "Glu"
          geneticProperties.get().translationStep.should.eql 4
          geneticProperties.translateStepByStep().should.eql "Ser"
          geneticProperties.get().translationStep.should.eql 5
          geneticProperties.translateStepByStep().should.eql "Leu"
          geneticProperties.get().translationStep.should.eql 6
          geneticProperties.translateStepByStep().should.eql "Leu"
          geneticProperties.get().translationStep.should.eql 7
          geneticProperties.translateStepByStep().should.eql "Ile"
          geneticProperties.get().translationStep.should.eql 8
          geneticProperties.translateStepByStep().should.eql "Gly"
          geneticProperties.get().translationStep.should.eql 9
          geneticProperties.translateStepByStep().should.eql "Leu"
          geneticProperties.get().translationStep.should.eql 10
          # Final step should return 'undefined' and translationStep should be equal to "end".
          should.strictEqual geneticProperties.translateStepByStep(), undefined
          geneticProperties.get().translationStep.should.eql "end"
          # Setting a new DNA code should reset translation, so translationStep
          # should be undefined.
          geneticProperties.set {DNA: "ATG"}
          geneticProperties.get().should.not.have.property 'translationStep'

        it "should allow to modify existing genetic properties and call appropriate hooks", ->
          geneticProperties.set {DNA: "ATGCT", x: 0, y: 1}
          changeHooks.pre.callCount.should.eql 1
          changeHooks.post.callCount.should.eql 1
          changeHooks.changeListener.callCount.should.eql 1

          # Note that as DNA was changed, DNAComplement was recalculated and mRNA was deleted.
          geneticProperties.get().should.eql {DNA: "ATGCT", DNAComplement: "TACGA", x: 0, y: 1, height: 3, width: 3}

        it "should allow to deserialize genetic properties (replacing existing properties)", ->
          data = {DNA: "CGTA", x: 5, y: 6, height: 7, width: 8}

          geneticProperties.deserialize data
          changeHooks.pre.callCount.should.eql 1
          changeHooks.post.callCount.should.eql 1
          changeHooks.changeListener.callCount.should.eql 1

          geneticProperties.get().should.eql {DNA: "CGTA", DNAComplement: "GCAT", x: 5, y: 6, height: 7, width: 8}

        it "should allow to serialize genetic properties", ->
          # Note that we do not want DNAComplement in serialized form, it's redundant.
          geneticProperties.serialize().should.eql {DNA: "CGTA", x: 5, y: 6, height: 7, width: 8}
          geneticProperties.transcribeDNA()
          geneticProperties.serialize().should.eql {DNA: "CGTA", mRNA: "CGUA", x: 5, y: 6, height: 7, width: 8}
          geneticProperties.translateStepByStep()
          geneticProperties.serialize().should.eql {DNA: "CGTA", mRNA: "CGUA", translationStep: 0, x: 5, y: 6, height: 7, width: 8}

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
          geneticProperties: {DNA: "ATGC", x: 1, y: 2, height: 3, width: 4}

        geneticProperties = model.getGeneticProperties()
        geneticProperties.get().should.eql {DNA: "ATGC", DNAComplement: "TACG", x: 1, y: 2, height: 3, width: 4}
