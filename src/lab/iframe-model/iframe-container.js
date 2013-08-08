/*global $, define: false */
define(function() {
  return function(model, modelUrl) {
    var $el = $("<div id='model-container' class='container'>" +
               "<iframe id='iframe-model' " +
                 "style='width:100%;height:100%' src='" + model.get('url') + "'>" +
               "</iframe>" +
             "</div>");

    return  {
      $el: $el,
      getHeightForWidth: function(width) {
        var aspectRatio = model.get('width')/model.get('height');
        return width/aspectRatio;
      },
      resize: function() {},
      bindModel: function(newModel, newModelUrl) {
        $el.find('#iframe-model').attr('src', newModel.get('url'));
      },
      setup: function() {},
      update: function() {}
    };
  };
});