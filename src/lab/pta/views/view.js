/*global $ define: false */
// ------------------------------------------------------------
//
//   PTA View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var console               = require('common/console'),
      ModelView             = require("common/views/model-view"),
      Renderer              = require("pta/views/renderer");

  return function (modelUrl, model) {
    return new ModelView(modelUrl, model, Renderer);
  }

});
