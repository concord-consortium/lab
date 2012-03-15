var model = require('./2d-molecules').model,
    nodes,
    radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge,
    integrator, state,
    printCM;

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

printCM = function(cm) {
  console.log(cm[0] + ', ' + cm[1]);
};

exports.run = function() {
  printCM(state.CM);

  while (true) {
    integrator.integrate();
    printCM(state.CM);
  }
};
