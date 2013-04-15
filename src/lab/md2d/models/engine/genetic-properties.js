/*global d3, define */

define(function (require) {

  var validator        = require('common/validator'),
      serialize        = require('common/serialize'),
      metadata         = require('md2d/models/metadata'),
      aminoacidsHelper = require('cs!md2d/models/aminoacids-helper'),

      ValidationError = validator.ValidationError;


  return function GeneticProperties() {
    var api,
        changePreHook,
        changePostHook,
        data,
        remainingAAs,

        dispatch = d3.dispatch("change", "separateDNA"),

        calculateComplementarySequence = function () {
          // A-T (A-U)
          // G-C
          // T-A (U-A)
          // C-G

          // Use lower case during conversion to
          // avoid situation when you change A->T,
          // and later T->A again.
          var compSeq = data.DNA
            .replace(/A/g, "t")
            .replace(/G/g, "c")
            .replace(/T/g, "a")
            .replace(/C/g, "g");

          data.DNAComplement = compSeq.toUpperCase();
        },

        customValidate = function (props) {
          if (props.DNA) {
            // Allow user to use both lower and upper case.
            props.DNA = props.DNA.toUpperCase();

            if (props.DNA.search(/[^AGTC]/) !== -1) {
              // Character other than A, G, T or C is found.
              throw new ValidationError("DNA", "DNA code on sense strand can be defined using only A, G, T or C characters.");
            }
          }
          return props;
        },

        create = function (props) {
          changePreHook();

          // Note that validator always returns a copy of the input object, so we can use it safely.
          props = validator.validateCompleteness(metadata.geneticProperties, props);
          props = customValidate(props);

          // Note that validator always returns a copy of the input object, so we can use it safely.
          data = props;
          calculateComplementarySequence();

          changePostHook();
          dispatch.change();
        },

        update = function (props) {
          var key;

          changePreHook();

          // Validate and update properties.
          props = validator.validate(metadata.geneticProperties, props);
          props = customValidate(props);

          for (key in props) {
            if (props.hasOwnProperty(key)) {
              data[key] = props[key];
            }
          }

          if (props.DNA) {
            // New DNA code specified, update related properties.
            // 1. DNA complementary sequence.
            calculateComplementarySequence();
            // 2. mRNA is no longer valid. Do not recalculate it automatically
            //    (transribeDNA method should be used).
            delete data.mRNA;
            // 3. Any translation in progress should be reseted.
            delete data.translationStep;
          }

          changePostHook();
          dispatch.change();
        };

    // Public API.
    api = {
      registerChangeHooks: function (newChangePreHook, newChangePostHook) {
        changePreHook = newChangePreHook;
        changePostHook = newChangePostHook;
      },

      // Sets (updates) genetic properties.
      set: function (props) {
        if (data === undefined) {
          // Use other method of validation, ensure that the data hash is complete.
          create(props);
        } else {
          // Just update existing genetic properties.
          update(props);
        }
      },

      // Returns genetic properties.
      get: function () {
        return data;
      },

      // Deserializes genetic properties.
      deserialize: function (props) {
        create(props);
      },

      // Serializes genetic properties.
      serialize: function () {
        return data ? serialize(metadata.geneticProperties, data) : undefined;
      },

      // Convenient method for validation. It doesn't throw an exception,
      // instead a special object with validation status is returned. It can
      // be especially useful for UI classes to avoid try-catch sequences with
      // "set". The returned status object always has a "valid" property,
      // which contains result of the validation. When validation fails, also
      // "errors" hash is provided which keeps error for property causing
      // problems.
      // e.g. {
      //   valid: false,
      //   errors: {
      //     DNA: "DNA code on sense strand can be defined using only A, G, T or C characters."
      //   }
      // }
      validate: function (props) {
        var status = {
          valid: true
        };
        try {
          // Validation based on metamodel definition.
          props = validator.validate(metadata.geneticProperties, props);
          // Custom validation.
          customValidate(props);
        } catch (e) {
          status.valid = false;
          status.errors = {};
          status.errors[e.prop] = e.message;
        }
        return status;
      },

      on: function(type, listener) {
        dispatch.on(type, listener);
      },

      // Transcribes mRNA from DNA.
      // Result is saved in the mRNA property.
      transcribeDNA: function() {
        dispatch.separateDNA();

        changePreHook();
        // A-U
        // G-C
        // T-A
        // C-G

        // Use lower case during conversion to
        // avoid situation when you change G->C,
        // and later C->G again.
        var mRNA = data.DNAComplement
          .replace(/A/g, "u")
          .replace(/G/g, "c")
          .replace(/T/g, "a")
          .replace(/C/g, "g");

        data.mRNA = mRNA.toUpperCase();

        changePostHook();
      },

      // Translates mRNA into amino acids chain.
      translate: function() {
        var result = [],
            mRNA, abbr, i, len;

        // Make sure that mRNA is available.
        if (data.mRNA === undefined) {
          api.transcribeDNA();
        }
        mRNA = data.mRNA;

        for (i = 0, len = mRNA.length; i + 3 <= len; i += 3) {
          abbr = aminoacidsHelper.codonToAbbr(mRNA.substr(i, 3));
          if (abbr === "STOP" || abbr === undefined) {
            return result;
          }
          result.push(abbr);
        }

        return result;
      },

      translateStepByStep: function() {
        var aaSequence, aaAbbr;

        changePreHook();

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
        changePostHook();
        dispatch.change();

        return aaAbbr;
      }
    };

    return api;
  };

});
