import aminoacidsHelper from 'models/md2d/models/aminoacids-helper';
import alert from 'common/alert';

var
  STATES = [
    "undefined",
    "intro-cells",
    "intro-zoom1",
    "intro-zoom2",
    "intro-zoom3",
    "intro-polymerase",
    "dna",
    "transcription",
    "transcription-end",
    "after-transcription",
    "before-translation",
    "translation",
    "translation-end"
  ],
  STATE_INDEX = {},

  NUCLEO_LAST_ID = 0,

  PROMOTER_SEQ = "TGACCTCTCCGCGCCATCTATAAACCGAAGCGCTAGCTACA",
  TERMINATOR_SEQ = "ACCACAGGCCGCCAGTTCCGCTGGCGGCATTTT",
  PROMOTER_COMP_SEQ = complementarySequence(PROMOTER_SEQ),
  TERMINATOR_COMP_SEQ = complementarySequence(TERMINATOR_SEQ),
  JUNK_SEQ,
  JUNK_COMP_SEQ,

  DEF_EVENT = "change";

function complementarySequence(DNA) {
  // A-T (A-U)
  // G-C
  // T-A (U-A)
  // C-G

  // Use lower case during conversion to
  // avoid situation when you change A->T,
  // and later T->A again.
  return DNA
    .replace(/A/g, "t")
    .replace(/G/g, "c")
    .replace(/T/g, "a")
    .replace(/C/g, "g")
    .toUpperCase();
}
// Generates junk DNA sequence.
function junkSequence(len) {
  var letters = ["A", "G", "T", "C"],
    lettersLen = letters.length,
    seq = "",
    i;
  for (i = 0; i < len; i++) {
    seq += letters[Math.floor(Math.random() * lettersLen)];
  }
  return seq;
}

function getNucleoID() {
  return NUCLEO_LAST_ID++;
}

(function() {
  var i, len;
  for (i = 0, len = STATES.length; i < len; i++) {
    STATE_INDEX[STATES[i]] = i;
  }
  JUNK_SEQ = junkSequence(50);
  JUNK_COMP_SEQ = complementarySequence(JUNK_SEQ);
}());

export default function GeneticProperties(model) {
  var api,
    // Do not change this variable manually. It's changed in set() private
    // function. It decides what type of event should be dispatched when
    // DNA or DNAState is updated.
    eventMode = DEF_EVENT,
    // List of transitions, which are currently ongoing (index 0)
    // or scheduled (index > 0).
    ongoingTransitions = [],
    // DNA complementary sequence.
    DNAComp = "",
    // Complete mRNA based on current DNA. Useful for codon() method,
    // which needs to know the whole sequence in advance.
    mRNA = "",
    // Stop codons.
    stopCodonsHash,
    // Index of the first stop codon.
    lastTranslationStep,

    dispatch = d3.dispatch("change", "transition"),

    calculatemRNA = function() {
      var newCode = mRNACode(0),
        mRNA = "";
      while (newCode) {
        mRNA += newCode;
        newCode = mRNACode(mRNA.length);
      }
      return mRNA;
    },

    calculateStopCodonsHash = function() {
      var codon, i, len;

      stopCodonsHash = {};
      lastTranslationStep = null;
      for (i = 0, len = mRNA.length; i < len; i += 3) {
        codon = mRNA.substr(i, 3);
        if (aminoacidsHelper.codonToAbbr(codon) === "STOP") {
          if (lastTranslationStep === null) {
            lastTranslationStep = i / 3;
          }
          // Note that codonToAbbr returns "STOP" also when codon length is
          // smaller than 3. In this case, we want to mark only codons which
          // are a "real" STOP codons, so check their length.
          if (codon.length === 3) {
            stopCodonsHash[i] = stopCodonsHash[i + 1] = stopCodonsHash[i + 2] = true;
          }
        }
      }
      if (lastTranslationStep === null) {
        // No stop codon found.
        lastTranslationStep = Math.floor(mRNA.length / 3);
      }
    },

    mRNACode = function(index) {
      if (index >= DNAComp.length) {
        // No more DNA to transcribe, return null.
        return null;
      }
      switch (DNAComp[index]) {
        case "A":
          return "U";
        case "G":
          return "C";
        case "T":
          return "A";
        case "C":
          return "G";
      }
    },

    generateMRNAViewModel = function(array, sequence) {
      var i, len, nucleo;
      // Set size of the existing array to the size of new DNA sequence.
      array.length = sequence.length;
      for (i = 0, len = sequence.length; i < len; i++) {
        nucleo = array[i] || {}; // reuse existing objects.
        nucleo.idx = i;
        // Note that only nucleotides whose type doesn't match sequence
        // will receive new ID. It lets you to update this array manually,
        // so the ID as prevented in case of need (e.g. single insertion
        // or deletion during mutation).
        if (nucleo.type !== sequence[i]) {
          nucleo.type = sequence[i];
          nucleo.id = getNucleoID();
          // This block will be also executed when we insert objects for
          // the first time so update the array[i] reference.
          array[i] = nucleo;
        }
      }
      return array;
    },

    generateDNAViewModel = function(array, DNA, comp) {
      var sequence = !comp ? JUNK_SEQ + PROMOTER_SEQ + DNA + TERMINATOR_SEQ + JUNK_SEQ :
        JUNK_COMP_SEQ + PROMOTER_COMP_SEQ + DNA + TERMINATOR_COMP_SEQ + JUNK_COMP_SEQ,
        junkBound = JUNK_SEQ.length,
        promoterBound = junkBound + PROMOTER_SEQ.length,
        codingBound = promoterBound + DNA.length,
        terminatorBound = codingBound + TERMINATOR_SEQ.length,
        i, len, nucleo;

      // Set size of the existing array to the size of new DNA sequence.
      array.length = sequence.length;
      for (i = 0, len = sequence.length; i < len; i++) {
        nucleo = array[i] || {}; // reuse existing objects.
        nucleo.idx = i;
        if (i < junkBound) nucleo.region = "j";
        else if (i < promoterBound) nucleo.region = "p";
        else if (i < codingBound) nucleo.region = "c";
        else if (i < terminatorBound) nucleo.region = "t";
        else nucleo.region = "j";
        // Note that only nucleotides whose type doesn't match sequence
        // will receive new ID. It lets you to update this array manually,
        // so the ID as prevented in case of need (e.g. single insertion
        // or deletion during mutation).
        if (nucleo.type !== sequence[i]) {
          nucleo.type = sequence[i];
          nucleo.id = getNucleoID();
          // This block will be also executed when we insert objects for
          // the first time so update the array[i] reference.
          array[i] = nucleo;
        }
      }
      return array;
    },

    updateGeneticProperties = function() {
      var DNA = model.get("DNA");

      generateDNAViewModel(api.viewModel.DNA, DNA, false);

      DNAComp = complementarySequence(DNA);
      generateDNAViewModel(api.viewModel.DNAComp, DNAComp, true);

      mRNA = calculatemRNA();
      calculateStopCodonsHash();
      // mRNA view array is also based on the current state.
      if (api.stateBefore("transcription:0")) {
        generateMRNAViewModel(api.viewModel.mRNA, "");
      } else if (api.state().name === "transcription") {
        generateMRNAViewModel(api.viewModel.mRNA, mRNA.substr(0, api.state().step));
      } else if (api.stateAfter("transcription")) {
        // So, the first state which triggers it is "transcription-end".
        generateMRNAViewModel(api.viewModel.mRNA, mRNA);
      }

      if (eventMode !== "transition") {
        // While jumping between states, ensure that user can see a valid
        // number of amino acids.
        if (api.stateBefore("translation:1")) {
          removeAminoAcids();
        } else if (api.stateEqual("translation-end")) {
          generateFinalProtein();
        }
      }
    },

    removeAminoAcids = function() {
      var aaCount;

      aaCount = model.getNumberOfAtoms();
      if (aaCount > 0) {
        model.startBatch();
        while (aaCount > 0) {
          model.removeAtom(aaCount - 1);
          aaCount--;
        }
        model.endBatch();
      }
      model.stop();
    },

    generateFinalProtein = function() {
      var aaSequenece = [],
        i = 0,
        abbr = aminoacidsHelper.codonToAbbr(api.codon(0));

      while (abbr !== "STOP") {
        aaSequenece.push(abbr);
        abbr = aminoacidsHelper.codonToAbbr(api.codon(++i));
      }
      api.generateProtein(aaSequenece, undefined, 2.3, 0.3);
      api.centerProtein();
      model.start();
    },

    nextState = function(state) {
      var name = state.name,
        next, abbr;

      if (name === "transcription") {
        if (state.step < model.get("DNA").length - 1) {
          return "transcription:" + (state.step + 1);
        } else {
          return "transcription-end";
        }
      } else if (name === "translation") {
        abbr = aminoacidsHelper.codonToAbbr(api.codon(state.step));
        if (abbr !== "STOP") {
          return "translation:" + (state.step + 1);
        } else {
          return "translation-end";
        }
      } else {
        // "Typical" state.
        next = STATES[STATE_INDEX[state.name] + 1];
        if (next === "transcription" || next === "translation") {
          next += ":0";
        }
        return next;
      }
    },

    prevState = function(state) {
      var name = state.name,
        step = state.step;

      if (name === "transcription" && step > 0) {
        return "transcription:" + (step - 1);
      } else if (name === "transcription-end") {
        return "transcription:" + (model.get("DNA").length - 1);
      } else if (name === "translation-end" || (name === "translation" && step > 0)) {
        // Note that we always return state translation:0,
        // as jumping between translation steps is not allowed.
        return "translation:0";
      } else {
        return STATES[STATE_INDEX[name] - 1];
      }
    },

    // DNA states comparator.
    stateComp = function(stateA, stateB) {
      if (stateA === stateB) {
        return 0;
      }
      stateA = api.parseState(stateA);
      stateB = api.parseState(stateB);
      if (stateA.name === stateB.name) {
        if (isNaN(stateA.step) || isNaN(stateB.step)) {
          // Note that when you compare e.g. "translate"
          // and "translate:5" these steps are considered to be equal.
          return 0;
        }
        return stateA.step < stateB.step ? -1 : 1;
      }
      return STATE_INDEX[stateA.name] < STATE_INDEX[stateB.name] ? -1 : 1;
    },

    transitionToState = function(name) {
      if (typeof name === "undefined") return;
      if (ongoingTransitions.length > 0) {
        // Some transition are in progress, so only enqueue a new state.
        ongoingTransitions.push(name);
      } else {
        // Mark transition as ongoing (by adding it to the list)
        // and do transition.
        ongoingTransitions.push(name);
        doStateTransition(name);
      }
    },

    doStateTransition = function(name) {
      set("DNAState", name, "transition");
    },

    doDNATransition = function(newDNA) {
      set("DNA", newDNA, "transition");
    },

    dispatchChange = function(suppressViewportUpdate) {
      // Cancel transitions when we are going to dispatch "change" event.
      ongoingTransitions.length = 0;
      model.cancelTransitions();

      dispatch.change(suppressViewportUpdate);
    },

    // Use this function if you want to change DNA or DNAState
    // and dispatch event different than "change" (which causes immediate
    // rendering). Options are:
    // - "change",
    // - "transition",
    // - "suppress".
    set = function(name, value, eventType) {
      eventMode = eventType || DEF_EVENT;
      model.properties[name] = value;
      eventMode = DEF_EVENT;
    },

    stateUpdated = function() {
      var state = model.get("DNAState");

      if (eventMode === "suppress") {
        return;
      }

      updateGeneticProperties();

      if (eventMode === "transition") {
        dispatch.transition(state);
      } else {

        if (api.stateAfter("translation:0") && api.stateBefore("translation-end")) {
          // It means that state was set to 'translation:x', where x > 0.
          // Use the last safe state ('translation:0') instead.
          alert("'" + state + "' cannot be set explicitly. " +
            "'translation:0' should be set and then animation to '" +
            state + "' should be triggered.");
          set("DNAState", "translation:0");
          return;
        }

        dispatchChange();
      }
    },

    DNAUpdated = function() {
      if (eventMode === "suppress") {
        return;
      }

      if (api.stateAfter("translation:0") && api.stateBefore("translation-end")) {
        // Reset translation if DNA is changed. This will remove all
        // existing amino acids and notify renderer (via stateUpdated
        // callback).
        set("DNAState", "translation:0");
        return;
      }

      updateGeneticProperties();

      if (eventMode === "transition") {
        dispatch.transition("dna-updated", true);
      } else {
        dispatchChange(true);
      }
    };

  // Public API.
  api = {
    /**
     * Number of nucleotides before coding region (so, in junk and promoter regions).
     * @type {number}
     */
    PRECODING_LEN: JUNK_SEQ.length + PROMOTER_SEQ.length,

    /**
     * Hash of arrays containing nucleotides objects. Each array can be
     * consumed by the view. References to arrays are guaranteed to be
     * untouched during whole life cycle of the GeneticEngine instance.
     * Only arrays' lengths and content can be changed.
     *
     * Each nucleotide is defined by:
     * type   - letter ("A", "T", "U", "G" or "C"),
     * idx    - its position,
     * id     - unique id,
     * coding - true if nucleotide is a part of coding region (not junk, terminator or promoter).
     */
    viewModel: {
      mRNA: [],
      DNA: [],
      DNAComp: []
    },

    /**
     * Registers listener for given event type. Supported events
     * are: "change" and "transition".
     * @param  {string} type
     * @param  {function} listener
     */
    on: function(type, listener) {
      dispatch.on(type, listener);
    },

    /**
     * Performs substitution mutation on DNA coding region.
     * @param  {number} idx            position in DNA.
     * @param  {string} newType        "A", "T", "G" or "C".
     * @param  {boolean} DNAComplement if true, mutation is performed
     *                                 on DNA complementary strand.
     */
    mutate: function(idx, newType, DNAComplement) {
      var DNA = model.get("DNA"),
        pos = idx - api.PRECODING_LEN;

      if (pos < 0 || pos >= DNA.length) {
        throw new Error("Mutation can be performed only on DNA coding region.");
      }

      DNA = DNA.substr(0, pos) +
        (DNAComplement ? complementarySequence(newType) : newType) +
        DNA.substr(pos + 1);
      // Update DNA. This will also call updateGeneticProperties(), so
      // other, related properties will be also updated.
      set("DNA", DNA);
    },

    /**
     * Performs insertion mutation on DNA coding region.
     * @param  {number} idx            position in DNA.
     * @param  {string} type           "A", "T", "G" or "C".
     * @param  {boolean} DNAComplement if true, mutation is performed
     *                                 on DNA complementary strand.
     */
    insert: function(idx, type, DNAComplement) {
      var newDNANucleo = {
          type: DNAComplement ? complementarySequence(type) : type,
          id: getNucleoID(),
          region: "c"
        },
        newDNACompNucleo = {
          type: DNAComplement ? type : complementarySequence(type),
          id: getNucleoID(),
          region: "c"
        },
        newMRNANucleo = {
          type: DNAComplement ? complementarySequence(type) : type,
          id: getNucleoID(),
          region: "c"
        },
        DNA = model.get("DNA"),
        state = api.state(),
        pos = idx - api.PRECODING_LEN;

      if (pos < 0 || pos >= DNA.length) {
        throw new Error("Mutation can be performed only on DNA coding region.");
      }

      // Update view model arrays. It isn't necessary, but as we update them
      // correctly, nucleotides will preserve their IDs and view will know
      // exactly what part of DNA have been changed.
      api.viewModel.DNA.splice(idx, 0, newDNANucleo);
      api.viewModel.DNAComp.splice(idx, 0, newDNACompNucleo);
      api.viewModel.mRNA.splice(pos, 0, newMRNANucleo);

      // Update DNA. This will also call updateGeneticProperties(), so
      // other, related properties will be also updated.
      DNA = DNA.substr(0, pos) + newDNANucleo.type + DNA.substr(pos);

      // Special case for transcription process (and state):
      // If we keep the same DNAState and we insert something
      // before state.step position, it would cause that the last
      // transcribed nucleotide would be removed. Avoid that, as this can be
      // confusing for users.
      if (state.name === "transcription" && pos < state.step) {
        // Note that we can't use nextState(state), as in that case, as
        // state can be changed to transcription-end too fast (as DNA isn't
        // updated yet).
        set("DNAState", state.name + ":" + (state.step + 1), "suppress");
      }
      doDNATransition(DNA);
    },

    /**
     * Performs deletion mutation on DNA coding region.
     * @param  {number} idx position in DNA.
     */
    delete: function(idx) {
      var DNA = model.get("DNA"),
        state = api.state(),
        pos = idx - api.PRECODING_LEN;

      if (pos < 0 || pos >= DNA.length) {
        throw new Error("Mutation can be performed only on DNA coding region.");
      }

      // Update view model arrays. It isn't necessary, but as we update them
      // correctly, nucleotides will preserve their IDs and view will know
      // exactly what part of DNA have been changed.
      api.viewModel.DNA.splice(idx, 1);
      api.viewModel.DNAComp.splice(idx, 1);
      api.viewModel.mRNA.splice(pos, 1);

      // Update DNA. This will also call updateGeneticProperties(), so
      // other, related properties will be also updated.
      DNA = DNA.substr(0, pos) + DNA.substr(pos + 1);

      // Special case for transcription process (and state):
      // If we keep the same DNAState and we delete something
      // before state.step position, it would cause that new transcribed
      // mRNA nucleotide will be added. Avoid that, as this can be
      // confusing for users.
      if (state.name === "transcription" && pos < state.step) {
        set("DNAState", prevState(state), "suppress");
      }
      doDNATransition(DNA);
    },

    /**
     * Triggers transition to the next DNA state.
     *
     * If any transition was ongoing, it's canceled.
     */
    transitionToNextState: function() {
      api.stopTransition();
      if (ongoingTransitions.length === 0) {
        transitionToState(nextState(api.lastState()));
      }
    },

    /**
     * Stops current animation.
     * @return {boolean} true when some transitions are canceled, false otherwise.
     */
    stopTransition: function() {
      if (ongoingTransitions.length > 1) {
        // Cleanup queue of waiting transitions. ongoingTransitions[0] is
        // the current transition, don't remove it.
        ongoingTransitions.length = 1;
      }
    },

    jumpToNextState: function() {
      if (api.stateBefore("translation:0")) {
        set("DNAState", nextState(api.state()));
      } else if (api.stateBefore("translation-end")) {
        set("DNAState", "translation-end");
      }
    },

    jumpToPrevState: function() {
      if (api.stateAfter("intro-cells")) {
        set("DNAState", prevState(api.state()));
      }
    },

    /**
     * Triggers transition to the given DNA state.
     * e.g. transitionTo("transcription-end")
     *
     * @param  {string} stateName name of the state.
     */
    transitionTo: function(stateName) {
      while (api.lastStateBefore(stateName)) {
        transitionToState(nextState(api.lastState()));
      }
    },

    /**
     * Triggers only one step of DNA transcription.
     * This method also accepts optional parameter - expected nucleotide.
     * When it's available, transcription step will be performed only
     * when passed nucleotide code matches nucleotide, which should
     * be actually joined to mRNA in this transcription step. When
     * expected nucleotide code is wrong, this method does nothing.
     *
     * e.g.
     * transcribeStep("A") will perform transcription step only
     * if "A" nucleotide should be added to mRNA in this step.
     *
     * @param  {string} expectedNucleotide code of the expected nucleotide ("U", "C", "A" or "G").
     */
    transcribeStep: function(expectedNucleotide) {
      var state, newCode;

      state = api.state();
      if (state.name === "dna" && typeof expectedNucleotide === "undefined") {
        api.transitionToNextState();
      } else if (state.name === "transcription") {
        newCode = mRNACode(state.step);
        if (expectedNucleotide && expectedNucleotide.toUpperCase() !== newCode) {
          // Expected nucleotide is wrong, so simply do nothing.
          return;
        }
        api.transitionToNextState();
      }
    },

    // Helper methods used mainly by the genetic renderer.

    /**
     * Returns parsed *current* DNA state.
     * e.g.
     * {
     *   name: "translation",
     *   step: 5
     * }
     *
     * @return {Object} current state object (see above).
     */
    state: function() {
      return api.parseState(model.get("DNAState"));
    },

    stateBefore: function(name) {
      return stateComp(model.get("DNAState"), name) === -1;
    },

    stateEqual: function(name) {
      return stateComp(model.get("DNAState"), name) === 0;
    },

    stateAfter: function(name) {
      return stateComp(model.get("DNAState"), name) === 1;
    },

    /**
     * Returns parsed *last* enqueued state.
     * When there is no state enqueued or in progress,
     * it returns simply current state.
     *
     * e.g.
     * {
     *   name: "translation",
     *   step: 5
     * }
     *
     * @return {Object} last enqueued state object (see above).
     */
    lastState: function() {
      var queueLen = ongoingTransitions.length;
      if (queueLen > 0) {
        return api.parseState(ongoingTransitions[queueLen - 1]);
      }
      return api.state();
    },

    lastStateBefore: function(name) {
      var queueLen = ongoingTransitions.length,
        lastStateName = queueLen ? ongoingTransitions[queueLen - 1] : model.get("DNAState");
      return stateComp(lastStateName, name) === -1 ? true : false;
    },

    lastStateAfter: function(name) {
      var queueLen = ongoingTransitions.length,
        lastStateName = queueLen ? ongoingTransitions[queueLen - 1] : model.get("DNAState");
      return stateComp(lastStateName, name) === 1 ? true : false;
    },

    parseState: function(state) {
      // State can contain ":" and info about step.
      // e.g. translation:0, translation:1 etc.
      state = state.split(":");
      return {
        name: state[0],
        step: Number(state[1]) // can be NaN when step is undefined.
      };
    },

    codon: function(index) {
      return mRNA.substr(3 * index, 3);
    },

    codonComplement: function(index) {
      return api.codon(index)
        .replace(/A/g, "u")
        .replace(/G/g, "c")
        .replace(/U/g, "a")
        .replace(/C/g, "g")
        .toUpperCase();
    },

    translationStepStarted: function(codonIdx, x, y, xEnd, yEnd, duration) {
      var abbr = aminoacidsHelper.codonToAbbr(api.codon(codonIdx)),
        elID = aminoacidsHelper.abbrToElement(abbr);

      // Add some entropy to y position to avoid perfectly straight line of
      // amino acids what can affect folding process.
      yEnd += Math.random() * 0.02 - 0.01;
      model.addAtom({
        x: x,
        y: y,
        element: elID,
        visible: true,
        pinned: true
      }, {
        suppressCheck: true
      });
      // Transition new amino acid to its final position.
      model.atomTransition().id(codonIdx).duration(duration).prop("x", xEnd);
      model.atomTransition().id(codonIdx).duration(duration).prop("y", yEnd);
      // Ensure that the simulation is started.
      model.start();
    },

    shiftAminoAcids: function(count, xShift, duration) {
      if (count < 1) return;
      var i, x, y;
      // Shift amino acids to the right.
      for (i = 0; i < count; i++) {
        x = model.getAtomProperties(i).x + xShift;
        y = model.getAtomProperties(i).y;
        model.atomTransition().id(i).duration(duration).prop("x", x);
        // This is required to keep Y coordinate constant during this
        // transition, some forces applied by the MD2D engine can
        // change trajectory of the particle.
        model.atomTransition().id(i).duration(duration).prop("y", y);
      }
    },

    centerProtein: function(duration) {
      model.batch(function() {
        var cm = api.proteinCenterOfMass(),
          xDiff = model.properties.viewPortX +
          model.properties.viewPortWidth / 2 - cm.x,
          yDiff = model.properties.viewPortY +
          model.properties.viewPortHeight / 2 - cm.y,
          minX = model.properties.minX + 0.1,
          maxX = model.properties.maxX - 0.1,
          minY = model.properties.minY + 0.1,
          maxY = model.properties.maxY - 0.1,
          len = model.getNumberOfAtoms(),
          i, x, y;

        for (i = 0; i < len; i++) {
          x = model.getAtomProperties(i).x;
          y = model.getAtomProperties(i).y;
          if (x + xDiff > maxX) xDiff = maxX - x;
          if (x + xDiff < minX) xDiff = minX - x;
          if (y + yDiff > maxY) yDiff = maxY - y;
          if (y + yDiff < minY) yDiff = minY - y;
        }
        for (i = 0; i < len; i++) {
          x = model.getAtomProperties(i).x + xDiff;
          y = model.getAtomProperties(i).y + yDiff;
          if (duration) {
            model.atomTransition().id(i).duration(duration).prop("x", x);
            model.atomTransition().id(i).duration(duration).prop("y", y);
          } else {
            model.setAtomProperties(i, {
              x: x,
              y: y
            });
          }
        }
      });
      model.tickInPlace();
    },

    connectAminoAcid: function(codonIdx) {
      if (codonIdx < 1) return;
      var r1 = model.getAtomProperties(codonIdx - 1).radius,
        r2 = model.getAtomProperties(codonIdx).radius,
        // Length of bond is based on the radii of AAs.
        bondLen = (r1 + r2) * 1.25;
      // 10000 is a typical strength for bonds between AAs.
      model.addRadialBond({
        atom1: codonIdx,
        atom2: codonIdx - 1,
        length: bondLen,
        strength: 10000
      });
      model.setAtomProperties(codonIdx - 1, {
        pinned: false
      });
    },

    translationCompleted: function() {
      var atomsCount = model.getNumberOfAtoms();
      if (atomsCount > 0) {
        // Unpin the last atom. Note that sometimes translation
        // can end without any atom.
        model.setAtomProperties(atomsCount - 1, {
          pinned: false
        });
      }
    },

    transitionEnded: function() {
      // Transition has just ended so remove it
      // from transitions list.
      ongoingTransitions.shift();
      if (ongoingTransitions.length > 0) {
        doStateTransition(ongoingTransitions[0]);
      }
    },

    stopCodonsHash: function() {
      return stopCodonsHash;
    },

    lastTranslationStep: function() {
      return lastTranslationStep;
    },

    /**
     * Returns center of mass coridantes of the whole protein.
     * When there are no amino acids, returns null.
     *
     * @return {Object|null} protein's center of mass, e.g. {x: 1, y: 2}
     *                       or null when there are no amino acids.
     */
    proteinCenterOfMass: function() {
      var totalMass = 0,
        xcm = 0,
        ycm = 0,
        len = model.getNumberOfAtoms(),
        atom, i;

      if (len === 0) {
        return null;
      }

      // Note that there is a strong asumption that there are *only* amino
      // acids in the model.
      for (i = 0, len = model.getNumberOfAtoms(); i < len; i++) {
        atom = model.getAtomProperties(i);
        xcm += atom.x * atom.mass;
        ycm += atom.y * atom.mass;
        totalMass += atom.mass;
      }
      xcm /= totalMass;
      ycm /= totalMass;
      return {
        x: xcm,
        y: ycm
      };
    },

    /**
     * Generates a new protein (and removes all existing atoms before).
     *
     * @param  {array} aaSequence      defines expected sequence of amino acids. Pass undefined and provide
     *                                 'expectedLength' if you want to generate a random protein.
     * @param  {Number} expectedLength controls the maximum (and expected) number of amino
     *                                 acids of the resulting protein. Provide this parameter only when 'aaSequence'
     *                                 is undefined. When expected length is too big (due to limited area of the model),
     *                                 the protein will be truncated and its real length returned.
     * @return {Number}                number of created amino acids (<= expectedLength).
     */
    generateProtein: function(aaSequence, expectedLength, paddingTop, paddingBottom) {
      // Process arguments.
      expectedLength = aaSequence ? aaSequence.length : expectedLength;
      paddingTop = paddingTop || 0;
      paddingBottom = paddingBottom || 0;

      var minX = model.properties.minX,
        minY = model.properties.minY + paddingBottom,
        maxX = model.properties.maxX,
        maxY = model.properties.maxY - paddingTop,
        createdAA = 0;

      // First, make sure that model is empty.
      removeAminoAcids();

      model.batch(function() {
        // Options for .addAtom modeler's method.
        var opt = {
            suppressCheck: true
          },
          width = maxX - minX,
          height = maxY - minY,
          aaCount = aminoacidsHelper.lastElementID - aminoacidsHelper.firstElementID + 1,
          xPos, yPos, xStep, yStep, el, props, radius, prevRadius, bondLen, i,

          // This function controls how X coordinate is updated,
          // using current Y coordinate as input.
          turnHeight = 0.6,
          xStepFunc = function(y) {
            if (y > height - turnHeight || y < turnHeight) {
              // Close to the boundary increase X step.
              return 0.1;
            }
            return 0.02 - Math.random() * 0.04;
          },

          // This function controls how Y coordinate is updated,
          // using current Y coordinate and previous result as input.
          changeHeight = 0.3,
          yStepFunc = function(y, prev) {
            if (prev === 0) {
              // When previously 0 was returned,
              // now it's time to switch direction of Y step.
              if (y > 0.5 * maxY) {
                return -0.1;
              }
              return 0.1;
            }
            if (yPos > maxY - changeHeight || yPos < changeHeight) {
              // Close to the boundary return 0 to make smoother turn.
              return 0;
            }
            // In a typical situation, just return previous value.
            return prev;
          },

          getRandomAA = function() {
            return Math.floor(aaCount * Math.random()) + aminoacidsHelper.firstElementID;
          };

        // Add the first amino acid. Start from the lower-left corner of
        // model area.
        xPos = minX + 0.1;
        yPos = minY + 0.1;
        xStep = 0;
        yStep = 0;
        el = aaSequence ? aminoacidsHelper.abbrToElement(aaSequence[0]) : getRandomAA();
        radius = model.getElementProperties(el).radius;
        props = {
          x: xPos,
          y: yPos,
          element: el,
          visible: true
        };

        model.addAtom(props, opt);
        createdAA += 1;

        // Add remaining amino acids.
        for (i = 1; i < expectedLength; i++) {
          xPos = props.x;
          yPos = props.y;

          // Update step.
          xStep = xStepFunc(yPos);
          yStep = yStepFunc(yPos, yStep);

          // Update coordinates of new AA.
          xPos += xStep * 1.7;
          yPos += yStep * 1.7;

          if (xPos > width - 0.1) {
            // No space left for new AA.
            return;
          }

          el = aaSequence ? aminoacidsHelper.abbrToElement(aaSequence[i]) : getRandomAA();
          props = {
            x: xPos,
            y: yPos,
            element: el,
            visible: true
          };
          model.addAtom(props, opt);
          createdAA += 1;

          // Length of bond is based on the radii of AAs.
          prevRadius = radius;
          radius = model.getElementProperties(el).radius;
          bondLen = (radius + prevRadius) * 1.25;
          // 10000 is a typical strength for bonds between AAs.
          model.addRadialBond({
            atom1: i,
            atom2: i - 1,
            length: bondLen,
            strength: 10000
          });
        }
      });
      // We have to use a new batch so atoms array will be updated and we
      // can use getAtomProperties for recently added atoms.
      model.batch(function() {
        // Center protein (X coords only) in the viewport. Make sure
        // that we don't exceed model boundaries.
        var proteinsMaxX = model.getAtomProperties(createdAA - 1).x,
          proteinsCenter = (proteinsMaxX - minX) / 2,
          viewPortCenter = model.properties.viewPortX + model.properties.viewPortWidth / 2,
          spaceOnRight = maxX - proteinsMaxX,
          shift = Math.max(0, Math.min(viewPortCenter - proteinsCenter, spaceOnRight)),
          i;

        // Shift all AAs.
        for (i = 0; i < expectedLength; i++) {
          model.setAtomProperties(i, {
            x: model.getAtomProperties(i).x + shift
          });
        }
      });

      // Minize energy so the protein will look better.
      model.minimizeEnergy();

      // Return number of created AA.
      return createdAA;
    }
  };

  model.addPropertiesListener(["DNA"], DNAUpdated);
  model.addPropertiesListener(["DNAState"], stateUpdated);
  updateGeneticProperties();
  return api;
}
