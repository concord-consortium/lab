/*global define: false */

define(function (require) {
  var SVGContainer = require('common/views/svg-container'),
      Renderer     = require('models/md2d/views/renderer');

  return function (model, modelUrl, i18n) {
    return new SVGContainer(model, modelUrl, Renderer, {i18n: i18n});
  };

});
