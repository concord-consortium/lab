var model  = require('./md2d').model,
    format = require('d3').format,
    nodes,
    radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge,
    integrator, state,
    printCM;

// obvious API fix: there should be no need to interrupt the 'var' statement to run createNodes()
model.createNodes();

nodes    = model.nodes;

integrator = model.getIntegrator();
state      = integrator.getOutputState();

printCM = function() {
  console.log(format('.2f')(state.time) + ', ' + format('.3f')(state.CM[0]) + ', ' + format('.3f')(state.CM[1]));
};

exports.run = function() {
  var n = (process.argv.length > 2) ? parseInt(process.argv[2], 10) : Infinity;

  if (isNaN(n)) {
    console.log("couldn't understand \"%s\"", process.argv[2]);
    return;
  }

  printCM();

  while (n--) {
    integrator.integrate();
    printCM();
  }
};
