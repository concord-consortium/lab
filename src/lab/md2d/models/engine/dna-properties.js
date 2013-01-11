/*global d3, define */

define(function (require) {

  var validator = require('common/validator'),
      metadata  = require('md2d/models/metadata');


  return function DNAProperties() {
    var api,
        changePreHook,
        changePostHook,
        data,

        dispatch = d3.dispatch("change"),

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
        },

        create = function (props) {
          changePreHook();

          // Note that validator always returns a copy of the input object, so we can use it safely.
          data = validator.validateCompleteness(metadata.dnaProperties, props);
          calculateComplementarySequence();

          changePostHook();
          dispatch.change();
        },

        update = function (props) {
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
          dispatch.change();
        };

    // Public API.
    api = {
      registerChangeHooks: function (newChangePreHook, newChangePostHook) {
        changePreHook = newChangePreHook;
        changePostHook = newChangePostHook;
      },

      // Sets (updates) DNA properties.
      set: function (props) {
        if (data === undefined) {
          // Use other method of validation, ensure that the data hash is complete.
          create(props);
        } else {
          // Just update existing DNA properties.
          update(props);
        }
      },

      // Returns DNA properties.
      get: function () {
        return data;
      },

      // Deserializes DNA properties.
      deserialize: function (props) {
        create(props);
      },

      on: function(type, listener) {
        dispatch.on(type, listener);
      }
    };

    return api;
  };

});
