/*global define: false */
// ------------------------------------------------------------
//
//   Semantic Layout Configuration
//
// ------------------------------------------------------------

define(function () {
  return {
    /**
      Maximum number of iterations of the layout algorithm during single layoutInteractive() call.
    */
    iterationsLimit: 35,
    /**
      Minimum width of the model.
    */
    minModelWidth: 150,
    /**
      Minimum font size (in ems).
    */
    minFontSize: 0.65,
    /**
      Canoncical font size (in ems).
    */
    canonicalFontSize: 0.9,
    /**
      Canonical dimensions of the interactive, they decide about font size.
      (canoncicalFontSize * fontScale) em is used for the interactive which fits this container:
      600 * 98% because 2% is reserved for left and right padding (see: src/sass/_semantic-layout.sass).
    */
    canonicalInteractiveWidth: 600 * 0.98,
    /**
      420 - 1% * 600 because 1% is reserved bottom padding (see: src/sass/_semantic-layout.sass).
      Note that we can't just use 420 * 0.99, because in CSS padding defined in percentages
      *always* refers to the container width (not height event if it's bottom or top padding).
    */
    canonicalInteractiveHeight: 420 - 0.01 * 600,
    /**
      Colors used to mark layout containers in the authoring mode.
    */
    containerColors: [
      "rgba(0,0,255,0.1)", "rgba(255,0,0,0.1)", "rgba(0,255,0,0.1)", "rgba(255,255,0,0.1)",
      "rgba(0,255,255,0.1)", "rgba(255,255,128,0.1)", "rgba(128,255,0,0.1)", "rgba(255,128,0,0.1)"
    ]
  };
});