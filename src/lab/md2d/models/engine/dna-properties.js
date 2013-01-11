/*global define */

define(function (require) {

  var validator = require('common/validator'),
      metadata  = require('md2d/models/metadata');


  return function DNAProperties() {
    var api,
        changePreHook,
        changePostHook,
        data,

        calculateComplementarySequence = function () {
          var seq = data.sequence,
              compSeq;

          // A-T (A-U)
          // G-C
          // T-A (U-A)
          // C-G

          // Use lower case during conversion to
          // avoid situation when you change A->T,
          // and later T->A again.
          compSeq = seq
            .replace(/A/g, "t")
            .replace(/G/g, "c")
            .replace(/T/g, "a")
            .replace(/C/g, "g");

          data.complementarySequence = compSeq.toUpperCase();
        };

    // Public API.
    api = {
      registerChangeHooks: function (newChangePreHook, newChangePostHook) {
        changePreHook = newChangePreHook;
        changePostHook = newChangePostHook;
      },

      // Adds DNA properties.
      add: function (props) {
        if (data !== undefined) {
          throw new Error("DNAProperties: Only one DNA sequence is allowed.");
        }

        changePreHook();

        // Note that validator always returns a copy of the input object, so we can use it safely.
        data = validator.validateCompleteness(metadata.dnaProperties, props);
        calculateComplementarySequence();

        changePostHook();
      },

      // Sets (updates) DNA properties.
      set: function (props) {
        var key;

        changePreHook();

        // Validate and update properties.
        props = validator.validate(metadata.dnaProperties, props);
        for (key in props) {
          if (props.hasOwnProperty(key)) {
            data[key] = props[key];
          }
        }
        calculateComplementarySequence();

        changePostHook();
      },

      // Returns DNA properties.
      get: function () {
        return data;
      },

      // Deserializes DNA properties.
      // Similar to add method, but it just replaces existing DNA sequence if it is present.
      deserialize: function (props) {
        changePreHook();

        // Note that validator always returns a copy of the input object, so we can use it safely.
        data = validator.validateCompleteness(metadata.dnaProperties, props);
        calculateComplementarySequence();

        changePostHook();
      }
    };

    return api;
  };

});
