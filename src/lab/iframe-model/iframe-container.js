/*global $, define: false */
define(function() {
  return function(model, modelUrl) {
    return  {
      $el: $("<div id='model-container' class='container'>" +
             "<iframe style='width:100%;height:100%' src='" + model.get('url') + "'></iframe>" +
             "</div>"),
      getHeightForWidth: function(width) {
        var aspectRatio = model.get('width')/model.get('height');
        return width/aspectRatio;
      },
      resize: function() {},
      bindModel: function() {},
      setup: function() {},
      update: function() {}
    };
  };
});