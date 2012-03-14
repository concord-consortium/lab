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
  console.log("Relaxing...");
  integrator.relaxToTemperature();
  console.log("Relaxed. Temperature is ", state.T);

  for (var i = 0; i < 10; i++) {
    console.log("Integrating...");
    integrator.integrate();
    console.log("temperature: ", state.T);
    console.log();
  }
};
