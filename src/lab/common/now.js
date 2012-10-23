// Returns a function that reports the time in milliseconds (useful for relative timing only)
// Uses high-resolution (microsecond) timer (performance.now) if available, otherwise falls
// back to (less-reliable and lower-resolution) Date.now()

// Note as of 10/2012, performance.now is not available in web workers, hence the reference
// to 'window'. See http://lists.w3.org/Archives/Public/public-web-perf/2012Oct/0024.html

define(function (require) {
  return (function() {
    if (window.performance && window.performance.now) {
      return function() { return performance.now(); };
    } else if (window.performance && window.performance.webkitNow) {
      return function() { return performance.webkitNow(); };
    } else {
      return function() { return Date.now(); };
    }
  }());
});