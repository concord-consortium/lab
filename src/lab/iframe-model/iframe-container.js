/*global $, define: false */
define(function() {
  return function(model, modelUrl) {
    return  {
      $el: $("<div id='model-container' class='container'><iframe src='" + model.get('url') + "'></iframe></div>"),
      getHeightForWidth: function(width) { return width; },
      resize: function() {},
      bindModel: function() {},
      setup: function() {},
      update: function() {}
    };
  };
});