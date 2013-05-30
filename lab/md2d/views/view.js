/*global $ define: false */
// ------------------------------------------------------------
//
//   MD2D View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var ModelView             = require("common/views/model-view"),
      Renderer              = require("md2d/views/renderer");

  return function (modelUrl, model) {
    return new ModelView(modelUrl, model, Renderer);
  };

});
