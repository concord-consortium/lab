/*global d3, define */

define(function (require) {

  var ValidationError  = require('common/validator').ValidationError,
      aminoacidsHelper = require('cs!md2d/models/aminoacids-helper'),
      alert            = require('common/alert'),

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

      PROMOTER_SEQ   = "TTGACACCCCCCCCCCCCCCCCCCTATAATCCCCCCCATG",
      TERMINATOR_SEQ = "ACCACAGGCCGCCAGTTCCGCTGGCGGCATTTT";

  (function () {
    var i, len;
    for (i = 0, len = STATES.length; i < len; i++) {
      STATE_INDEX[STATES[i]] = i;
    }
  }());

  return function GeneticProperties(model) {
    var api,
        // Never change value of this variable outside
        // the transitionToState() function!
        stateTransition = false,
        // List of transitions, which are currently ongoing (index 0)
        // or scheduled (index > 0).
        ongoingTransitions = [],
        // Complete mRNA used internally by this engine. Note that model's
        // property "mRNA" is updated incrementally during transcription.
        mRNA = "",

        dispatch = d3.dispatch("change", "transition"),

        complementarySequence = function (DNA) {
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
        },

        calculatemRNA = function () {
          var newCode;

          mRNA = "";
          newCode = mRNACode(mRNA.length);
          while(newCode) {
            mRNA += newCode;
            newCode = mRNACode(mRNA.length);
          }
        },

        mRNACode = function (index) {
          var DNAComplement = model.get("DNAComplement");
          if (index >= DNAComplement.length) {
            // No more DNA to transcribe, return null.
            return null;
          }
          switch (DNAComplement[index]) {
            case "A": return "U";
            case "G": return "C";
            case "T": return "A";
            case "C": return "G";
          }
        },

        validateDNA = function (DNA) {
          // Allow user to use both lower and upper case.
          DNA = DNA.toUpperCase();

          if (DNA.search(/[^AGTC]/) !== -1) {
            // Character other than A, G, T or C is found.
            throw new ValidationError("DNA", "DNA code on sense strand can be defined using only A, G, T or C characters.");
          }
        },

        updateGeneticProperties = function () {
          var DNA = model.get("DNA");
          validateDNA(DNA);
          model.set("DNAComplement", complementarySequence(DNA));
          calculatemRNA();

          // Update model's mRNA property.
          if (api.stateBefore("transcription:0")) {
            model.set("mRNA", "");
          } else if (api.state().name === "transcription") {
            model.set("mRNA", mRNA.substr(0, api.state().step));
          } else if (api.stateAfter("transcription")) {
            // So, the first state which triggers it is "transcription-end".
            model.set("mRNA", mRNA);
          }
        },

        removeAminoAcids = function () {
          var opt = {suppressEvent: true},
              aaCount;

          aaCount = model.get_num_atoms();
          if (aaCount > 0) {
            model.startBatch();
            while(aaCount > 1) {
              model.removeAtom(aaCount - 1, opt);
              aaCount--;
            }
            // Remove the last one atom and make sure that events are dispatched!
            // TODO: Should events be automatically suppressed during batch
            // execution and then merged and dispatched during .endBatch() call?
            model.removeAtom(0);
            model.endBatch();
          }
        },

        nextState = function (state) {
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

        stateEq = function (name) {
          return model.get("geneticEngineState") === name;
        },

        stateComp = function (stateA, stateB) {
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

        transitionToState = function (name) {
          if (ongoingTransitions.length > 0) {
            // Some transition are in progress, so only enqueue a new state.
            ongoingTransitions.push(name);
          } else {
            // Mark transition as ongoing (by adding it to the list)
            // and do transition.
            ongoingTransitions.push(name);
            doTransition(name);
          }
        },

        doTransition = function (name) {
          stateTransition = true;
          model.set("geneticEngineState", name);
          stateTransition = false;
        },

        stateUpdated = function () {
          var state;

          updateGeneticProperties();

          if (stateTransition) {
            dispatch.transition();
          } else {
            ongoingTransitions = [];
            removeAminoAcids();
            if (api.stateBefore("translation:1")) {
              dispatch.change();
            } else {
              state = model.get("geneticEngineState");
              // It means that state was set to 'translation:x', where x > 0.
              // Use the last safe state ('translation:0') instead.
              alert("'" + state + "' cannot be set explicitly. " +
                "'translation:0' should be set and then animation to '" +
                state + "' should be triggered.");
              model.set("geneticEngineState", "translation:0");
            }
          }
        },

        DNAUpdated = function () {
          // Reset to the initial state. All genetic properties will be
          // recalculated and the "change" event will be dispatched.
          model.set("geneticEngineState", "dna");
        };

    // Public API.
    api = {
      // Convenient method for validation. It doesn't throw an exception,
      // instead a special object with validation status is returned. It can
      // be especially useful for UI classes to avoid try-catch sequences with
      // "set". The returned status object always has a "valid" property,
      // which contains result of the validation. When validation fails, also
      // "error" message is provided.
      // e.g. {
      //   valid: false,
      //   error: "DNA code on sense strand can be defined using only A, G, T or C characters."
      // }
      validate: function (DNA) {
        var status = {
          valid: true
        };
        try {
          validateDNA(DNA);
        } catch (e) {
          status.valid = false;
          status.error = e.message;
        }
        return status;
      },

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      /**
       * Triggers transition to the next genetic engine state.
       */
      transitionToNextState: function () {
        transitionToState(nextState(api.lastState()));
      },

      jumpToNextState: function () {
        if (api.stateBefore("translation:0")) {
          model.set("geneticEngineState", nextState(api.state()));
        }
      },

      /**
       * Triggers transition to the given genetic engine state.
       * e.g. transitionTo("transcription-end")
       *
       * @param  {string} stateName name of the state.
       */
      transitionTo: function (stateName) {
        while (api.lastStateBefore(stateName)) {
          api.transitionToNextState();
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
      transcribeStep: function (expectedNucleotide) {
        var state, newCode;

        if (stateEq("dna")) {
          api.transitionToNextState();
          return;
        }
        state = api.lastState();
        if (state.name === "transcription") {
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
       * Returns parsed *current* state.
       * e.g.
       * {
       *   name: "translation",
       *   step: 5
       * }
       *
       * @return {Object} current state object (see above).
       */
      state: function () {
        return api.parseState(model.get("geneticEngineState"));
      },

      stateBefore: function (name) {
        return stateComp(model.get("geneticEngineState"), name) === -1 ? true : false;
      },

      stateAfter: function (name) {
        return stateComp(model.get("geneticEngineState"), name) === 1 ? true : false;
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
      lastState: function () {
        var queueLen = ongoingTransitions.length;
        if (queueLen > 0) {
          return api.parseState(ongoingTransitions[queueLen - 1]);
        }
        return api.state();
      },

      lastStateBefore: function (name) {
        var queueLen = ongoingTransitions.length,
            lastStateName = queueLen ? ongoingTransitions[queueLen - 1] : model.get("geneticEngineState");
        return stateComp(lastStateName, name) === -1 ? true : false;
      },

      lastStateAfter: function (name) {
        var queueLen = ongoingTransitions.length,
            lastStateName = queueLen ? ongoingTransitions[queueLen - 1] : model.get("geneticEngineState");
        return stateComp(lastStateName, name) === 1 ? true : false;
      },

      parseState: function (state) {
        // State can contain ":" and info about step.
        // e.g. translation:0, translation:1 etc.
        state = state.split(":");
        return {
          name: state[0],
          step: Number(state[1]) // can be NaN when step is undefined.
        };
      },

      codon: function (index) {
        return mRNA.substr(3 * index, 3);
      },

      codonComplement: function (index) {
        return api.codon(index)
            .replace(/A/g, "u")
            .replace(/G/g, "c")
            .replace(/U/g, "a")
            .replace(/C/g, "g")
            .toUpperCase();
      },

      translationStepStarted: function (codonIdx, x, y, xEnd, yEnd, duration) {
        var abbr = aminoacidsHelper.codonToAbbr(api.codon(codonIdx)),
            elID = aminoacidsHelper.abbrToElement(abbr);

        // Add some entropy to y position to avoid perfectly straight line of
        // amino acids what can affect folding process.
        yEnd += Math.random() * 0.02 - 0.01;
        model.addAtom({x: x, y: y, element: elID, visible: true, pinned: true}, {suppressCheck: true});
        // Transition new amino acid to its final position.
        model.atomTransition().id(codonIdx).duration(duration).prop("x", xEnd);
        model.atomTransition().id(codonIdx).duration(duration).prop("y", yEnd);
        // Ensure that the simulation is started.
        model.start();
      },

      shiftAminoAcids: function (count, xShift, duration) {
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

      connectAminoAcid: function (codonIdx) {
        if (codonIdx < 1) return;
        var r1 = model.getAtomProperties(codonIdx - 1).radius,
            r2 = model.getAtomProperties(codonIdx).radius,
            // Length of bond is based on the radii of AAs.
            bondLen = (r1 + r2) * 1.25;
        // 10000 is a typical strength for bonds between AAs.
        model.addRadialBond({atom1: codonIdx, atom2: codonIdx - 1, length: bondLen, strength: 10000});
        model.setAtomProperties(codonIdx - 1, {pinned: false});
      },

      translationCompleted: function () {
        var atomsCount = model.get_num_atoms();
        if (atomsCount > 0) {
          // Unpin the last atom. Note that sometimes translation
          // can end without any atom.
          model.setAtomProperties(atomsCount - 1, {pinned: false});
        }
      },

      transitionEnded: function () {
        // Transition has just ended so remove it
        // from transitions list.
        ongoingTransitions.shift();
        if (ongoingTransitions.length > 0) {
          doTransition(ongoingTransitions[0]);
        }
      },

      /**
       * Returns center of mass coridantes of the whole protein.
       * When there are no amino acids, returns null.
       *
       * @return {Object|null} protein's center of mass, e.g. {x: 1, y: 2}
       *                       or null when there are no amino acids.
       */
      proteinCenterOfMass: function () {
        var totalMass = 0,
            xcm = 0,
            ycm = 0,
            len = model.get_num_atoms(),
            atom, i;

        if (len === 0) {
          return null;
        }

        // Note that there is a strong asumption that there are *only* amino
        // acids in the model.
        for (i = 0, len = model.get_num_atoms(); i < len; i++) {
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
       * Generates junk DNA sequence of a given length.
       * e.g.
       * {
       *   "sequence": "AGT",
       *   "compSequence": "TCA"
       * }
       *
       * @param  {number} len junk DNA sequence length.
       * @return {Object}     sequence and complementary sequence.
       */
      junkSequence: function (len) {
        var letters = ["A", "G", "T", "C"],
            lettersLen = letters.length,
            seq = "",
            i;

        for (i = 0; i < len; i++) {
          seq += letters[Math.floor(Math.random() * lettersLen)];
        }
        return {
          sequence: seq,
          compSequence: complementarySequence(seq)
        };
      },

      promoterSequence: PROMOTER_SEQ,
      promoterCompSequence: complementarySequence(PROMOTER_SEQ),

      terminatorSequence: TERMINATOR_SEQ,
      terminatorCompSequence: complementarySequence(TERMINATOR_SEQ)

      /*
      Depreciated.
      Translates mRNA into amino acids chain.
      translate: function() {
        var result = [],
            mRNA, abbr, i, len;

        // Make sure that complete mRNA is available.
        if (!mRNAComplete()) {
          api.transcribe();
        }
        mRNA = model.get("mRNA");

        for (i = 0, len = mRNA.length; i + 3 <= len; i += 3) {
          abbr = aminoacidsHelper.codonToAbbr(mRNA.substr(i, 3));
          if (abbr === "STOP" || abbr === undefined) {
            return result;
          }
          result.push(abbr);
        }

        return result;
      }

      Depreciated.
      translateStepByStep: function() {
        var aaSequence, aaAbbr;

        aaSequence = api.translate();
        if (data.translationStep === undefined) {
          data.translationStep = 0;
        } else {
          data.translationStep += 1;
        }
        aaAbbr = aaSequence[data.translationStep];
        if (aaAbbr === undefined) {
          data.translationStep = "end";
        }

        return aaAbbr;
      }
      */
    };

    model.addPropertiesListener(["DNA"], DNAUpdated);
    model.addPropertiesListener(["geneticEngineState"], stateUpdated);
    updateGeneticProperties();

    return api;
  };

});
