helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

GeneticEngine = requirejs 'md2d/models/engine/genetic-engine'
Model         = requirejs 'md2d/models/modeler'

describe "GeneticEngine", ->
  describe "[basic tests of the class]", ->
    # Mock the change hooks.
    hooks =
      changeListener: ->
      transitionListener: ->

    beforeEach ->
      sinon.spy hooks, "changeListener"
      sinon.spy hooks, "transitionListener"

    afterEach ->
      hooks.changeListener.restore()
      hooks.transitionListener.restore()

    describe "GeneticEngine constructor", ->
      it "should exist", ->
        should.exist GeneticEngine

      it "should act as a constructor", ->
        geneticEngine = new GeneticEngine(new Model {})
        should.exist geneticEngine

    describe "GeneticEngine instance", ->
      model = null
      geneticEngine = null

      before ->
        model = new Model {}
        geneticEngine = model.geneticEngine()

      beforeEach ->
        geneticEngine.on "change", hooks.changeListener
        geneticEngine.on "transition", hooks.transitionListener

      it "should calculate DNA complement after setting DNA and dispatch appropriate event", ->
        hooks.changeListener.callCount.should.eql 0
        model.set "DNA", "ATGC"
        model.get("DNAComplement").should.eql "TACG"
        hooks.changeListener.callCount.should.eql 1
        hooks.transitionListener.callCount.should.eql 0

      it "should calculate mRNA when state is set to 'transcription-end' or 'translation'", ->
        model.set "geneticEngineState", "transcription-end"
        model.get("mRNA").should.eql "AUGC"
        hooks.changeListener.callCount.should.eql 1
        hooks.transitionListener.callCount.should.eql 0

      it "should perform single step of DNA to mRNA transcription", ->
        model.set "geneticEngineState", "dna"
        model.get("mRNA").should.eql ""
        geneticEngine.separateDNA()
        model.get("mRNA").should.eql ""   # DNA separated, mRNA prepared for transcription
        geneticEngine.transcribeStep()
        model.get("mRNA").should.eql "A"
        geneticEngine.transcribeStep("A") # Wrong, "U" is expected!
        model.get("mRNA").should.eql "A"  # Nothing happens, mRNA is still the same.
        geneticEngine.transcribeStep("U") # This time expected nucleotide is correct,
        model.get("mRNA").should.eql "AU" # so it's added to mRNA.

      it "should transcribe mRNA from DNA and dispatch appropriate events", ->
        model.set {DNA: "ATGC"}
        geneticEngine.transcribe()
        hooks.transitionListener.callCount.should.eql 5 # separation + 4 x transcription

        model.get("mRNA").should.eql "AUGC"

      it "should provide state() helper methods", ->
        state = geneticEngine.state()
        state.name.should.eql "transcription-end"
        isNaN(state.step).should.be.true

        model.set "geneticEngineState", "translation:15"
        state = geneticEngine.state()
        state.name.should.eql "translation"
        state.step.should.eql 15

      it "should provide stateBefore() and stateAfter() helper methods", ->
        model.set "geneticEngineState", "intro"
        geneticEngine.stateBefore("dna").should.be.true
        geneticEngine.stateAfter("dna").should.be.false

        model.set "geneticEngineState", "transcription"
        geneticEngine.stateBefore("dna").should.be.false
        geneticEngine.stateAfter("dna").should.be.true
        geneticEngine.stateBefore("translation").should.be.true
        geneticEngine.stateAfter("translation").should.be.false
        geneticEngine.stateBefore("translation:15").should.be.true
        geneticEngine.stateAfter("translation:15").should.be.false

        model.set "geneticEngineState", "translation:15"
        geneticEngine.stateBefore("translation:14").should.be.false
        geneticEngine.stateAfter("translation:14").should.be.true
        geneticEngine.stateBefore("translation:15").should.be.false
        geneticEngine.stateAfter("translation:15").should.be.false
        geneticEngine.stateBefore("translation:16").should.be.true
        geneticEngine.stateAfter("translation:16").should.be.false


      it "should translate mRNA to amino acids sequence correctly", ->
        ###
        # This is pretty complex, so test a least some examples.
        model.set "DNA", "ATGCCAGGCGGCGAGAGCTTGCTAATTGGCTTATAG"
        geneticEngine.translate().should.eql ["Met", "Pro", "Gly", "Gly", "Glu", "Ser", "Leu", "Leu", "Ile", "Gly", "Leu"]
        # Note that "TAG" sequence will result in "STOP" codon, so the result should be exactly the same.
        model.set "DNA", "ATGCCAGGCGGCGAGAGCTTGCTAATTGGCTTATAGATGCCAGGCGGCGAGAGCTTGCTAATTGGCTTA"
        geneticEngine.translate().should.eql ["Met", "Pro", "Gly", "Gly", "Glu", "Ser", "Leu", "Leu", "Ile", "Gly", "Leu"]
        ###

      it "should translate mRNA to amino acids sequence step by step", ->
        ###
        geneticEngine.set {DNA: "ATGCCAGGCGGCGAGAGCTTGCTAATTGGCTTATAG"}
        geneticEngine.get().should.not.have.property 'translationStep'
        geneticEngine.translateStepByStep().should.eql "Met"
        geneticEngine.get().translationStep.should.eql 0
        geneticEngine.translateStepByStep().should.eql "Pro"
        geneticEngine.get().translationStep.should.eql 1
        geneticEngine.translateStepByStep().should.eql "Gly"
        geneticEngine.get().translationStep.should.eql 2
        geneticEngine.translateStepByStep().should.eql "Gly"
        geneticEngine.get().translationStep.should.eql 3
        geneticEngine.translateStepByStep().should.eql "Glu"
        geneticEngine.get().translationStep.should.eql 4
        geneticEngine.translateStepByStep().should.eql "Ser"
        geneticEngine.get().translationStep.should.eql 5
        geneticEngine.translateStepByStep().should.eql "Leu"
        geneticEngine.get().translationStep.should.eql 6
        geneticEngine.translateStepByStep().should.eql "Leu"
        geneticEngine.get().translationStep.should.eql 7
        geneticEngine.translateStepByStep().should.eql "Ile"
        geneticEngine.get().translationStep.should.eql 8
        geneticEngine.translateStepByStep().should.eql "Gly"
        geneticEngine.get().translationStep.should.eql 9
        geneticEngine.translateStepByStep().should.eql "Leu"
        geneticEngine.get().translationStep.should.eql 10
        # Final step should return 'undefined' and translationStep should be equal to "end".
        should.strictEqual geneticEngine.translateStepByStep(), undefined
        geneticEngine.get().translationStep.should.eql "end"
        # Setting a new DNA code should reset translation, so translationStep
        # should be undefined.
        geneticEngine.set {DNA: "ATG"}
        geneticEngine.get().should.not.have.property 'translationStep'
        ###
