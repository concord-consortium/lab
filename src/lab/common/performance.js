/*global define, performance, $ */

define(function () {
  var nowFunc;

  if (typeof performance !== 'undefined' && typeof performance.now !== 'undefined') {
    nowFunc = $.proxy(performance.now, performance);
  } else {
    nowFunc = $.proxy(Date.now, Date);
  }

  return {
    /**
     * window.performance.now or Date.now when performance.now is not available.
     * @type {Function}
     */
    now: nowFunc
  };

});
