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
    y = t;
    return x * Math.sqrt(1 + (y / x) * (y / x));
  };
});