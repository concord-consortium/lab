/*global define, performance, $ */

var nowFunc,
  scope,
  enabled = false;

if (typeof performance !== 'undefined' && typeof performance.now !== 'undefined') {
  nowFunc = $.proxy(performance.now, performance);
} else {
  nowFunc = $.proxy(Date.now, Date);
}

export default {
  /**
   * window.performance.now or Date.now when performance.now is not available.
   * @type {Function}
   */
  now: nowFunc,

  collectData: function(v) {
    enabled = v;
    // Reset data each time when data collection is being started.
    if (enabled) scope = {};
  },

  enterScope: function(name) {
    if (enabled) {
      var s = scope[name];
      if (s === undefined) {
        s = scope[name] = {
          lastTime: 0,
          timeSum: 0,
          count: 0
        };
      }
      s.lastTime = nowFunc();
    }
  },

  leaveScope: function(name) {
    if (enabled) {
      var s = scope[name];
      if (s !== undefined) {
        s.timeSum += nowFunc() - s.lastTime;
        s.count += 1;
      }
    }
  },

  getAvgTime: function(name) {
    var s = scope[name];
    if (s !== undefined) {
      return s.timeSum / s.count;
    }
    return 0;
  },

  getAvgFreq: function(name) { // in Hz
    var s = scope[name];
    if (s !== undefined) {
      return s.count * 1000 / s.timeSum;
    }
    return 0;
  }
};
