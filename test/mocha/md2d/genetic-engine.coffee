helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

GeneticEngine = requirejs 'models/md2d/models/engine/genetic-engine'
Model         = requirejs 'models/md2d/models/modeler'

describe "GeneticEngine", ->
  describe "[basic tests of the class]", ->
    describe "GeneticEngine constructor", ->
      it "should exist", ->
        should.exist GeneticEngine

      it "should act as a constructor", ->
        geneticEngine = new GeneticEngine(new Model {})
        should.exist geneticEngine

    describe "GeneticEngine instance", ->
      model = null
      geneticEngine = null
      mock =
        changeListener: ->
        transitionListener: ->
          # Call transitionEdned after each transition! It's required, as
          # geneticEngine will enqueue new transitions as long as some
          # transition is thought to be in progress.
          geneticEngine.transitionEnded()

      before ->
        # Note that we have to set DNA to any value to ensure that model
        # dimensions will be set correctly. We should refactor xmin, ymin,
        # xmax, ymax + width and height options and don't  treat them as
        # immutable (only viewport width and height should be immutable).
        model = new Model {DNA: "ATCG"}
        geneticEngine = model.geneticEngine()

      beforeEach ->
        sinon.spy mock, "changeListener"
        sinon.spy mock, "transitionListener"
        geneticEngine.on "change", mock.changeListener
        geneticEngine.on "transition", mock.transitionListener

      afterEach ->
        mock.changeListener.restore()
        mock.transitionListener.restore()

      checkDNAArray = (array, sequence) ->
        offset = geneticEngine.PRECODING_LEN
        for i in [0...sequence.length]
          array[i + offset].idx.should.eql i + offset
          array[i + offset].type.should.eql sequence[i]

      checkMRNAArray = (array, sequence) ->
        for i in [0...sequence.length]
          array[i].idx.should.eql i
          array[i].type.should.eql sequence[i]

      it "should automatically change lower case DNA string to upper case", ->
          model.set "DNA", "atgc"
          model.get("DNA").should.eql "ATGC"
          model.set "DNA", "aTGc"
          model.get("DNA").should.eql "ATGC"
          model.set "DNA", "AtgC"
          model.get("DNA").should.eql "ATGC"
          model.set "DNA", "aTgC"
          model.get("DNA").should.eql "ATGC"

      it "should reset DNAState to translation:0 if DNA is changed during translation:x steps", ->
          model.set "DNA", "ATCG"
          model.set "DNAState", "translation:0"
          geneticEngine.transitionToNextState()
          model.get("DNAState").should.eql "translation:1"

          model.set "DNA", "ATC"
          model.get("DNAState").should.eql "translation:0"

      it "should calculate view arrays and dispatch appropriate event after setting DNA", ->
        mock.changeListener.callCount.should.eql 0
        model.set "DNAState", "dna"
        model.set "DNA", "ATGC"
        checkDNAArray geneticEngine.viewModel.DNA, "ATGC"
        checkDNAArray geneticEngine.viewModel.DNAComp, "TACG"
        checkDNAArray geneticEngine.viewModel.mRNA, ""
        mock.changeListener.callCount.should.eql 2
        mock.transitionListener.callCount.should.eql 0

      it "should calculate mRNA when state is set to 'transcription-end' or 'translation'", ->
        model.set "DNAState", "transcription-end"
        checkMRNAArray geneticEngine.viewModel.mRNA, "AUGC"
        mock.changeListener.callCount.should.eql 1
        mock.transitionListener.callCount.should.eql 0

      it "should perform single step of DNA to mRNA transcription", ->
        model.set "DNAState", "dna"
        checkMRNAArray geneticEngine.viewModel.mRNA, ""
        geneticEngine.transcribeStep()
        checkMRNAArray geneticEngine.viewModel.mRNA, ""   # DNA separated, mRNA prepared for transcription
        geneticEngine.transcribeStep()
        checkMRNAArray geneticEngine.viewModel.mRNA, "A"
        geneticEngine.transcribeStep("A") # Wrong, "U" is expected!
        checkMRNAArray geneticEngine.viewModel.mRNA, "A"  # Nothing happens, mRNA is still the same.
        geneticEngine.transcribeStep("U") # This time expected nucleotide is correct,
        checkMRNAArray geneticEngine.viewModel.mRNA, "AU" # so it's added to mRNA.

      it "should transcribe mRNA from DNA and dispatch appropriate events", ->
        model.set "DNAState", "dna"
        model.set {DNA: "ATGC"}
        geneticEngine.transitionTo("transcription-end")
        mock.transitionListener.callCount.should.eql 5 # separation + 4 x transcription

        checkMRNAArray geneticEngine.viewModel.mRNA, "AUGC"

      it "shouldn't allow setting DNAState to translation:x, where x > 0", ->
        model.set "DNAState", "translation:15"
        # Expect fallback state: translation:0.
        model.get("DNAState").should.eql "translation:0"

      it "should allow jumping to the next state", ->
        model.set "DNA", "ATGC" # so transcription and translation will be short
        model.set "DNAState", "intro-cells"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "intro-zoom1"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "intro-zoom2"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "intro-zoom3"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "intro-polymerase"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "dna"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "transcription:0"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "transcription:1"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "transcription:2"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "transcription:3"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "transcription-end"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "after-transcription"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "before-translation"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "translation:0"
        geneticEngine.jumpToNextState()
        model.get("DNAState").should.eql "translation-end"

      it "should allow jumping to the previous state", ->
        model.get("DNAState").should.eql "translation-end"

        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "translation:0"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "before-translation"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "after-transcription"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "transcription-end"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "transcription:3"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "transcription:2"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "transcription:1"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "transcription:0"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "dna"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "intro-polymerase"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "intro-zoom3"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "intro-zoom2"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "intro-zoom1"
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "intro-cells"
        # make sure that this won't break anything:
        geneticEngine.jumpToPrevState();
        model.get("DNAState").should.eql "intro-cells"

      it "should let user perform substitution mutation", ->
        offset = geneticEngine.PRECODING_LEN

        model.set "DNAState", "transcription:0"
        model.set "DNA", "ATGC"

        geneticEngine.mutate 0 + offset, "C"
        model.get("DNA").should.eql "CTGC"
        geneticEngine.mutate 1 + offset, "G"
        geneticEngine.mutate 2 + offset, "T"
        geneticEngine.mutate 3 + offset, "A"
        model.get("DNA").should.eql "CGTA"
        # Mutation performed on DNA complement strand.
        geneticEngine.mutate 0 + offset, "A", true
        model.get("DNA").should.eql "TGTA"
        # State should remain the same.
        model.get("DNAState").should.eql "transcription:0"

      it "should let user perform insertion mutation", ->
        offset = geneticEngine.PRECODING_LEN

        model.set "DNA", "ATGC"

        geneticEngine.insert 0 + offset, "A"
        model.get("DNA").should.eql "AATGC"
        geneticEngine.insert 4 + offset, "C"
        model.get("DNA").should.eql "AATGCC"
        # Mutation performed on DNA complement strand.
        geneticEngine.insert 0 + offset, "T", true
        model.get("DNA").should.eql "AAATGCC"
        # State should remain the same.
        model.get("DNAState").should.eql "transcription:0"

      it "should let user perform insertion mutation in the middle of transcription", ->
        offset = geneticEngine.PRECODING_LEN

        model.set "DNA", "ATGC"
        model.set "DNAState", "transcription:3" # ATG are transcribed

        # Insert between transcribed nucleotides.
        geneticEngine.insert 0 + offset, "A"
        model.get("DNA").should.eql "AATGC"
        # Step should be increased to make sure that now 4 nucleotides are transcribed.
        model.get("DNAState").should.eql "transcription:4"
        geneticEngine.insert 3 + offset, "G"
        model.get("DNA").should.eql "AATGGC"
        model.get("DNAState").should.eql "transcription:5"

        # Insert after transcribed nucleotides.
        geneticEngine.insert 5 + offset, "C"
        model.get("DNA").should.eql "AATGGCC"
        # State without changes.
        model.get("DNAState").should.eql "transcription:5"

      it "should let user perform deletion mutation", ->
        offset = geneticEngine.PRECODING_LEN

        model.set "DNAState", "transcription:0"
        model.set "DNA", "ATGC"

        geneticEngine.delete 0 + offset
        model.get("DNA").should.eql "TGC"
        geneticEngine.delete 2 + offset
        model.get("DNA").should.eql "TG"
        geneticEngine.delete 1 + offset
        model.get("DNA").should.eql "T"
        geneticEngine.delete 0 + offset
        model.get("DNA").should.eql ""
        # State should remain the same.
        model.get("DNAState").should.eql "transcription:0"

      it "should let user perform deletion mutation in the middle of transcription", ->
        offset = geneticEngine.PRECODING_LEN

        model.set "DNA", "ATGC"
        model.set "DNAState", "transcription:3" # ATG are transcribed

        # Insert delete one of the transcribed nucleotides.
        geneticEngine.delete 0 + offset
        model.get("DNA").should.eql "TGC"
        # Step should be decreased to make sure that now only 2 nucleotides are transcribed.
        model.get("DNAState").should.eql "transcription:2"
        geneticEngine.delete 1 + offset
        model.get("DNA").should.eql "TC"
        model.get("DNAState").should.eql "transcription:1"

        # Delete nucleotide which is not transcribed at the moment.
        geneticEngine.delete 1 + offset
        model.get("DNA").should.eql "T"
        # State without changes.
        model.get("DNAState").should.eql "transcription:1"

      it "shouldn't let the user perform any mutation outside the DNA coding region", ->
        model.set "DNA", "ATGC"
        DNALen = model.get("DNA").length
        offset = geneticEngine.PRECODING_LEN
        (-> geneticEngine.mutate offset - 1, "A").should.throw()
        (-> geneticEngine.mutate DNALen + 1, "A").should.throw()
        (-> geneticEngine.insert offset - 1, "T").should.throw()
        (-> geneticEngine.insert DNALen + 1, "T").should.throw()
        (-> geneticEngine.delete offset - 1).should.throw()
        (-> geneticEngine.delete DNALen + 1).should.throw()
        model.get("DNA").should.eql "ATGC"

      it "should provide state() helper methods", ->
        model.set "DNAState", "transcription-end"
        state = geneticEngine.state()
        state.name.should.eql "transcription-end"
        isNaN(state.step).should.be.true

        model.set "DNAState", "transcription:15"
        state = geneticEngine.state()
        state.name.should.eql "transcription"
        state.step.should.eql 15

      it "should provide stateBefore() and stateAfter() helper methods", ->
        model.set "DNAState", "intro-cells"
        geneticEngine.stateBefore("dna").should.be.true
        geneticEngine.stateAfter("dna").should.be.false

        model.set "DNAState", "transcription"
        geneticEngine.stateBefore("dna").should.be.false
        geneticEngine.stateAfter("dna").should.be.true
        geneticEngine.stateBefore("translation").should.be.true
        geneticEngine.stateAfter("translation").should.be.false
        geneticEngine.stateBefore("translation:15").should.be.true
        geneticEngine.stateAfter("translation:15").should.be.false

        model.set "DNAState", "transcription:15"
        geneticEngine.stateBefore("transcription:14").should.be.false
        geneticEngine.stateAfter("transcription:14").should.be.true
        geneticEngine.stateBefore("transcription:15").should.be.false
        geneticEngine.stateAfter("transcription:15").should.be.false
        geneticEngine.stateBefore("transcription:16").should.be.true
        geneticEngine.stateAfter("transcription:16").should.be.false
