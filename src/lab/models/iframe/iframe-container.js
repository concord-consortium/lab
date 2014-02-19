/*global $, define: false */
define(function(require) {
  var iframePhone = require('iframe-phone');

  return function IFrameContainer(model) {
    var _model = model,
        $el = $("<div id='model-container' class='container'></div>");

    function addIFrame(model) {
        $el.find('#iframe-model').remove();
        $el.append(
          "<iframe id='iframe-model' " +
                 "style='width:100%;height:100%' src='" + model.get('url') + "'>" +
          "</iframe>");
        // TODO try cleaning up any old iframephone for the old model
        model.iframePhone = new iframePhone.ParentEndpoint($el.find('#iframe-model')[0]);
    }

    addIFrame(model);

    return  {
      $el: $el,
      getHeightForWidth: function(width) {
        return width / _model.get('aspectRatio');
      },
      resize: function() {},

      // This method is called in a few different cases:
      //  - when a interactive is loaded and the same modelController is reused
      //  - when scriptAPI.reset is called
      // Note: it is _not_ called the first time the modelController is created
      // Whether the element is actually in the page's DOM varies depending on how
      // this is called. However, the $el object will be reused in all cases so
      // manipulating this seems to work.
      // currently the safest thing is to remove and add a new iframe each time
      // this causes the iframe to reload even if the url is the same.
      // This can make the reset be slow, so in the reset case it would be better to optimize
      // this to send some reset event to the iframe instead.
      bindModel: function(newModel) {
        $el.find('#iframe-model').remove();
        addIFrame(newModel);
        _model = newModel;
      },

      // this is called after the element has been added to the DOM
      // the element is not re-added to the DOM during a scriptAPI.reset()
      setup: function() {},
      update: function() {},
      repaint: function() {}
    };
  };
});
