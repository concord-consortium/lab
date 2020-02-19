import version from 'lab.version';
import mmlConverter from 'mml-converter/mml-converter';

// Create or get 'Lab' global object (namespace).
window.Lab = window.Lab || {};
window.Lab.version = version;
window.Lab.mmlConverter = mmlConverter;
