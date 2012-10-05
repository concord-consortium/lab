/*globals define: false, window: false */

define(function (require) {
  var layout            = require('layout/layout'),
      interactiveLayout = require('layout/interactive-layout'),
      fullscreen        = require('layout/fullscreen');

  // Follow naming convetion defined by earlier work.
  layout.setupInteractiveLayout = interactiveLayout;

  // Export API to the global namespace.
  window.layout = layout;

  // Return public API as a module.
  return layout;
});
