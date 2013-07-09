/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

define(function (require, exports, module) {
  'use strict';

  exports.hypot = function (x, y) {
    var t;
    x = Math.abs(x);
    y = Math.abs(y);
    t = Math.min(x, y);
    x = Math.max(x, y);
    if (x === 0) return 0;
    t = t / x;
    return x * Math.sqrt(1 + t * t);
  };
});