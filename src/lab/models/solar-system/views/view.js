/*global define: false */

define(function (require) {
  var SVGContainer = require('common/views/svg-container'),
      Renderer     = require('models/solar-system/views/renderer');

  return function (model, modelUrl) {
    return new SVGContainer(model, modelUrl, Renderer);
  };
});
