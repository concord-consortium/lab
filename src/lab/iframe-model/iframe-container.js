/*global $, define: false */
define(function() {
  return function(model, modelUrl) {
    var _model = model,
        $el = $("<div id='model-container' class='container'>" +
               "<iframe id='iframe-model' " +
                 "style='width:100%;height:100%' src='" + model.get('url') + "'>" +
               "</iframe>" +
             "</div>");

    return  {
      $el: $el,
      getHeightForWidth: function(width) {
        var aspectRatio = _model.get('width')/_model.get('height');
        return width/aspectRatio;
      },
      resize: function() {},
      bindModel: function(newModel, newModelUrl) {
        $el.find('#iframe-model').attr('src', newModel.get('url'));
        _model = newModel;
      },
      setup: function() {},
      update: function() {}
    };
  };
});