/*jslint indent: 2 */
//
// lab/models/energy2d/engine/utils/math.js
//

exports.hypot = function (x, y) {
  'use strict';
  var t;
  x = Math.abs(x);
  y = Math.abs(y);
  t = Math.min(x, y);
  x = Math.max(x, y);
  y = t;
  return x * Math.sqrt(1 + (y / x) * (y / x));
};