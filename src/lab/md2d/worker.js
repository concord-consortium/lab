/*global define self */

// Main entry point for the MD2D worker script, aka the module 'md2d/worker'.

// The build config specifies that a `require('md2d/worker')` call be placed at the end of the MD2D
// worker script. The require is also specified to be synchronous, so that the anonymous function
// below (the `function(require) { ... }` stuff) executes immediately when the script is evaluated.

define(function (require) {

  var md2d   = require('md2d/models/engine/md2d'),
      engine = md2d.createEngine();

  self.addEventListener('message', function messageListener(message) {
    if ( ! message.data.skipLoadingState ) {
      engine.setCompleteStateFromJSON(message.data);
    }
    engine.integrate(message.data.duration, message.data.dt);
    self.postMessage(engine.getCompleteStateAsJSON());
  });

});
