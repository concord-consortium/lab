/*global d3, define */

define(function (require) {

  var ValidationError  = require('common/validator').ValidationError,
      aminoacidsHelper     = require('cs!md2d/models/aminoacids-helper'),

      state = {
        "undefined": 0,
        "intro": 1,
        "dna": 2,
        "transcription": 3,
        "transcription-end": 4,
        "translation": 5
      };


  return function GeneticProperties(model) {
    var api,
        // Never change value of this variable outside
        // the transitionToState() function!
        stateTransition = false,
        dispatch = d3.dispatch("change", "transition"),

        calculateComplementarySequence = function () {
          // A-T (A-U)
          // G-C
          // T-A (U-A)
          // C-G

          // Use lower case during conversion to
          // avoid situation when you change A->T,
          // and later T->A again.
          var compSeq = model.get("DNA")
            .replace(/A/g, "t")
            .replace(/G/g, "c")
            .replace(/T/g, "a")
            .replace(/C/g, "g");

          model.set("DNAComplement", compSeq.toUpperCase());
        },

        calculatemRNA = function () {
          var mRNA, newCode;

          mRNA = model.get("mRNA") || "";
          newCode = mRNACode(mRNA.length);

          while(newCode) {
            mRNA += newCode;
            newCode = mRNACode(mRNA.length);
          }

          model.set("mRNA", mRNA);
        },

        mRNAComplete = function () {
          var mRNA = model.get("mRNA");
          // mRNA should be defined and its length should be equal to DNA length.
          return mRNA && mRNA.length === model.get("DNA").length;
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
          validateDNA(model.get("DNA"));
          calculateComplementarySequence();

          if (api.stateBefore("transcription")) {
            model.set("mRNA", "");
          }
          if (api.stateAfter("transcription")) {
            // So, the first state which triggers it is "transcription-end".
            calculatemRNA();
          }
        },

        stateEq = function (name) {
          return model.get("geneticEngineState") === name;
        },

        transitionToState = function (name) {
          stateTransition = true;
          model.set("geneticEngineState", name);
          stateTransition = false;
        },

        stateUpdated = function () {
          updateGeneticProperties();

          if (stateTransition) {
            dispatch.transition();
          } else {
            dispatch.change();
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
       * Plays intro, which shows broader context of the DNA transcription and
       * translation.
       */
      playIntro: function () {
        transitionToState("dna");
      },

      /**
       * Triggers separation of the DNA strands.
       */
      separateDNA: function () {
        if (stateEq("dna")) {
          transitionToState("transcription");
        }
      },

      /**
       * Triggers *complete* transcription of the DNA.
       */
      transcribe: function() {
        while (api.stateBefore("transcription-end")) {
          api.transcribeStep();
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
        var mRNA = model.get("mRNA"),
            DNA = model.get("DNA"),
            newCode;

        if (stateEq("dna")) {
          api.separateDNA();
          return;
        }

        newCode = mRNACode(mRNA.length);

        if (expectedNucleotide && expectedNucleotide.toUpperCase() !== newCode) {
          // Expected nucleotide is wrong, so simply do nothing.
          return;
        }

        // Check if new code is different from null.
        if (newCode) {
          mRNA += newCode;
          model.set("mRNA", mRNA);
          if (mRNA.length < DNA.length) {
            // TODO: should be "transcription:" + mRNA.length
            transitionToState("transcription");
          } else {
            transitionToState("transcription-end");
          }
        }
      },

      translateStep: function () {
        var state, abbr;
        if (api.stateBefore("transcription-end")) {
          // Make sure that complete mRNA is available.
          api.transcribe();
        }
        state = api.state();
        if (state.name === "transcription-end") {
          transitionToState("translation:0");
        } else if (state.name === "translation") {
          abbr = aminoacidsHelper.codonToAbbr(api.codon(state.step));
          if (abbr !== "STOP") {
            transitionToState("translation:" + (state.step + 1));
          } else {
            transitionToState("translation-end");
          }
        }
      },

      state: function () {
        return api.parseState(model.get("geneticEngineState"));
      },

      stateBefore: function (name) {
        var current = api.state(),
            cmp     = api.parseState(name);

        if (current.name === cmp.name) {
          return current.step < cmp.step;
        }
        return state[current.name] < state[cmp.name];
      },

      stateAfter: function (name) {
        var current = api.state(),
            cmp     = api.parseState(name);

        if (current.name === cmp.name) {
          return current.step > cmp.step;
        }
        return state[current.name] > state[cmp.name];
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
        return model.get("mRNA").substr(3 * index, 3);
      },

      codonComplement: function (index) {
        return api.codon(index)
            .replace(/A/g, "u")
            .replace(/G/g, "c")
            .replace(/U/g, "a")
            .replace(/C/g, "g")
            .toUpperCase();
      }

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
