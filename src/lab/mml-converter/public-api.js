/*global define: false */

import $__lab_version from 'lab.version';
import $__mml_converter_mml_converter from 'mml-converter/mml-converter';
var version = $__lab_version,
  mmlConverter = $__mml_converter_mml_converter;

// Create or get 'Lab' global object (namespace).
window.Lab = window.Lab || {};
window.Lab.version = version;
window.Lab.mmlConverter = mmlConverter;
