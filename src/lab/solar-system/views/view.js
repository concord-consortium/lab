/*global $ define: false */
// ------------------------------------------------------------
//
//   SolarSystem View Container
//
// ------------------------------------------------------------
define(function (require) {
  // Dependencies.
  var console               = require('common/console'),
      ModelView             = require("common/views/model-view"),
      Renderer              = require("solar-system/views/renderer");

  return function (modelUrl, model) {
    return new ModelView(modelUrl, model, Renderer);
  }

});
