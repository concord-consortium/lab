/*jslint node:true */

var model = require('./2d-molecules').model,
    nodes,
    radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge,
    integrator, state;

// obvious API fix: there should be no need to interrupt the 'var' statement to run createNodes()
model.createNodes();

nodes    = model.nodes;
radius   = model.radius;
px       = model.px;
py       = model.py;
x        = model.x;
y        = model.y;
vx       = model.vx;
vy       = model.vy;
speed    = model.speed;
ax       = model.ax;
ay       = model.ay;
halfmass = model.halfmass;
charge   = model.charge;

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
