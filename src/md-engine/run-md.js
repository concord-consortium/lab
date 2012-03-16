var model  = require('./md2d').model,
    format = require('d3').format,
    nodes,
    integrator, state,
    dt = 0.05,
    drift, initialCM, printDrift;

// obvious API fix: there should be no need to interrupt the 'var' statement to run createNodes()
model.createNodes();

nodes    = model.nodes;

integrator = model.getIntegrator();
state      = integrator.getOutputState();

initialCM = [state.CM[0], state.CM[1]];

printDrift = function() {
  var dx = state.CM[0] - initialCM[0],
      dy = state.CM[1] - initialCM[1];

  console.log(format('.2f')(state.time) + ', ' + format('.3f')(dx) + ', ' + format('.3f')(dy));
};

exports.run = function() {
  var n = 200;

  // could use commander or optimist to do opt parsing
  if (process.argv.length > 2) dt = parseFloat(process.argv[2], 10);
  if (process.argv.length > 3) n = parseInt(process.argv[3], 10);

  if (isNaN(dt)) {
    console.log("couldn't understand \"%s\"", process.argv[2]);
    return;
  }

  if (isNaN(n)) {
    console.log("couldn't understand \"%s\"", process.argv[3]);
    return;
  }

  while (n--) {
    integrator.integrate(1, dt);
    printDrift();
  }
};
