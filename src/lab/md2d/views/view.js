/*global $ define: false */
// ------------------------------------------------------------
//
//   MD2D View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var console               = require('common/console'),
      ModelView             = require("common/views/model-view"),
      Renderer              = require("md2d/views/renderer");

  return function (e, modelUrl, model) {
    return new ModelView(e, modelUrl, model, Renderer);
  }

});
