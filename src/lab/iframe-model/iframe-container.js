/*global $, define: false */
define(function(require) {
  var IFramePhone = require('iframe-phone/iframe-phone');

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
      setup: function() {
        // give the model an iframe-phone so it can talk to the model inside the iframe
        _model.iframePhone = new IFramePhone($('#iframe-model')[0]);
      },
      update: function() {}
    };
  };
});