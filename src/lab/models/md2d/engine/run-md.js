var model  = require('./md2d').model,
    sprint = require('./sprint').sprint,
    nodes,
    integrator, state,
    dt = 1/50,
    drift, initialCM, initialTE, printDrift;

// obvious API fix: there should be no need to interrupt the 'var' statement to run createNodes()
model.createNodes();

nodes    = model.nodes;

integrator = model.getIntegrator();
state      = integrator.getOutputState();

initialCM = [state.CM[0], state.CM[1]];

printDrift = function() {
  var dx  = state.CM[0] - initialCM[0],
      dy  = state.CM[1] - initialCM[1],
      dTE = state.KE + state.PE - initialTE;

  process.stdout.write(sprint("%.2f, %.3f, %.3f, %.3f, %.3f, %.3f, %.3f, %.3f, %.3f\n",
    state.time, dx, dy, state.driftCM[0], state.driftCM[1], state.vCM[0], state.vCM[1], dTE));
}

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

  integrator.integrate(dt, dt);
  initialTE = state.KE + state.PE;

  while (n--) {
    integrator.integrate(1, dt);
    printDrift();
  }
};
