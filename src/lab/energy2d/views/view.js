/* global define, $ */

define(function() {
  return function() {
    return  {
      $el: $("<div id='model-container' class='container'/>"),
      getHeightForWidth: function() { return 0; },
      resize: function() {},
      reset: function() {},
      update: function() {}
    };
  };
});