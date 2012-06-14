var model = require('./md2d').model,
    nodes,
    integrator, state;

// obvious API fix: there should be no need to interrupt the 'var' statement to run createNodes()
model.createNodes();

nodes = model.nodes;

integrator = model.getIntegrator();
state      = integrator.getOutputState();

exports.run = function() {
  var n = 500,
      i, begin;

  // warm up
  for (i = 0; i < n; i++) {
    integrator.integrate();
  }

  begin = Date.now();

  for (i = 0; i < n; i++) {
    integrator.integrate();
  }
  console.log( (Date.now() - begin) / n);
};
