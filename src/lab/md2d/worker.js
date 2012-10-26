/*global define self */

// Main entry point for the MD2D worker script, aka the module 'md2d/worker'.

// The build config specifies that a `require('md2d/worker')` call be placed at the end of the MD2D
// worker script. The require is also specified to be synchronous, so that the anonymous function
// below (the `function(require) { ... }` stuff) executes immediately when the script is evaluated.

define(function (require) {

  var md2d   = require('md2d/models/engine/md2d'),
      engine = md2d.createEngine(),
      integrateStartTime,
      workerStartTime;

  self.addEventListener('message', function messageListener(message) {
    var stateData,
        timeIntegrating,
        timeWorking;

    workerStartTime = Date.now();
    engine.setCompleteStateFromMessageData(message.data.stateData);

    integrateStartTime = Date.now();
    engine.integrate(message.data.duration, message.data.dt);
    timeIntegrating = Date.now() - integrateStartTime;

    stateData = engine.getCompleteState();
    timeWorking = Date.now() - workerStartTime;

    self.postMessage({
      stateData: stateData,
      timeIntegrating: timeIntegrating,
      timeWorking: timeWorking
    });
  });

});
