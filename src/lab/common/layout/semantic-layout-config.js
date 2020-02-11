/*global define: false */
// ------------------------------------------------------------
//
//   Semantic Layout Configuration
//
// ------------------------------------------------------------

export default {
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
    Canonical width of the interactive, it decides about font size.
    (canoncicalFontSize * fontScale) em is used for the interactive which has such width:
  */
  canonicalWidth: 565,

  /**
    Colors used to mark layout containers in the authoring mode.
  */
  containerColors: [
    "rgba(0,0,255,0.1)", "rgba(255,0,0,0.1)", "rgba(0,255,0,0.1)", "rgba(255,255,0,0.1)",
    "rgba(0,255,255,0.1)", "rgba(255,255,128,0.1)", "rgba(128,255,0,0.1)", "rgba(255,128,0,0.1)"
  ]
};