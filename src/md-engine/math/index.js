exports.normal              = require('./distributions').normal;
exports.getWindowedAverager = require('./utils').getWindowedAverager;
exports.minimize            = require('./minimizer').minimize;

if (window) window.minimize = exports.minimize;
