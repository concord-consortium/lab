// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------


var autostart = true,
    mol_number = 50,
    sample_time = 0.01,
    temperature = 3,
    maximum_model_steps = 5000,
    atoms, model,
    lj_sigma_min = 1,
    lj_sigma_max = 10,
    lj_epsilon_max = -0.00001,
    lj_epsilon_min = -5.0,
    lennard_jones_potential = [],
    lj_alpha, lj_beta,
    mol_rmin_radius_factor = 0.38,
    frame_number = 0,
    model_stopped = true,
    model = modeler.model(),
    nodes;

// ------------------------------------------------------------
// Setup model_player
// ------------------------------------------------------------
var model_player = new ModelPlayer(model);


// ------------------------------------------------------------
// Setup heat and cool buttons
// ------------------------------------------------------------
var heat_button = new ButtonComponent("#heat_button", 'circlesmall-plus');
var cool_button = new ButtonComponent("#cool_button", 'circlesmall-minus');

heat_button.add_action(function() {
  var t = model.temperature();
  if (t < 10) {
    $('#heat_button').removeClass('inactive');
    $('#cool_button').removeClass('inactive');
    t = Math.floor((t * 2))/2 + 0.5;
    model.temperature(t);
  } else {
    $('#heat_button').addClass('inactive');
  }
});

cool_button.add_action(function() {
  var t = model.temperature();
  if (t > 0) {
    $('#heat_button').removeClass('inactive');
    $('#cool_button').removeClass('inactive');
    t = Math.floor((t * 2))/2 - 0.5;
    model.temperature(t);
  } else {
    $('#cool_button').addClass('inactive');
  }
});

// ------------------------------------------------------------
// Setup therm, epsilon_slider & sigma_slider components.
// ------------------------------------------------------------
var therm        = new Thermometer('#thermometer');

var epsilon_slider  = new  SliderComponent('#attraction_slider');
epsilon_slider.max = lj_epsilon_min;
epsilon_slider.min = lj_epsilon_max;
epsilon_slider.value_changed_function = function (v) {
  model.set_lj_coefficients(v,model.getSigma());
}
epsilon_slider.update_label();

var temperature_slider = new  SliderComponent('#temperature_slider');
temperature_slider.max = 7;
temperature_slider.min = 0;
temperature_slider.value = 0.5;
temperature_slider.value_changed_function = function (v) {
  model.temperature(v);
}
temperature_slider.update_label();

// ------------------------------------------------------------
//
// Main callback from model process
//
// Pass this function to be called by the model on every model step
//
// ------------------------------------------------------------

var model_listener = function(e) {
  layout.update_molecule_positions();
  therm.add_value(model.ave_ke());
  if (step_counter >= model.stepCounter()) { modelStop(); }
}

// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

var mc_graph = {
  // title:               "Simple Molecules",
  // xlabel:              "X position (nm)",
  // ylabel:              "Y position (nm)",
  playback_controller:  false,
  play_only_controller: true,
  model_time_label:     false,
  grid_lines:           false,
  xunits:               false,
  yunits:               false,
  atom_mubers:          false,
  xmin:                 0, 
  xmax:                 100, 
  ymin:                 0, 
  ymax:                 100
};

mc_graph.xdomain = mc_graph.xmax - mc_graph.xmin,
mc_graph.ydomain = mc_graph.ymax - mc_graph.ymin;

// ------------------------------------------------------------
//
//   Lennard-Jones Coefficients Setup
//
// ------------------------------------------------------------

var lj_coefficients = molecules_lennard_jones.coefficients();

var lj_data = {
  coefficients: lj_coefficients,
  variables: [
    {
      coefficient:"epsilon", 
      x: lj_coefficients.rmin, 
      y: lj_coefficients.epsilon
    }, 
    {
      coefficient:"sigma", 
      x: lj_coefficients.sigma, 
      y: 0
    }
  ]
};

function update_epsilon(e) {
  update_coefficients(molecules_lennard_jones.epsilon(e));
}

function update_sigma(s) {
  update_coefficients(molecules_lennard_jones.sigma(s));
}

function update_coefficients(coefficients) {
  var sigma   = coefficients.sigma,
      epsilon = coefficients.epsilon,
      rmin    = coefficients.rmin,
      y;

  model.set_lj_coefficients(epsilon, sigma);

  lj_data.coefficients.sigma   = sigma;
  lj_data.coefficients.epsilon = epsilon;
  lj_data.coefficients.rmin    = rmin;

  lj_data.xmax    = sigma * 3;
  lj_data.xmin    = Math.floor(sigma/2);
  lj_data.ymax    = Math.ceil(epsilon*-1) + 0.0;
  lj_data.ymin    = Math.ceil(epsilon*1) - 2.0;

  // update the positions of the adjustable circles on the graph
  lj_data.variables[1].x = sigma;

  // change the x value for epsilon to match the new rmin value
  lj_data.variables[0].x = rmin;

  lennard_jones_potential = []

  for(var r = sigma * 0.5; r < lj_data.xmax * 3;  r += 0.05) {
    y = molecules_lennard_jones.potential(r)
    if (y < 100) {
      lennard_jones_potential.push([r, y]);
    }
  }
}

// ------------------------------------------------------------
//
//   Molecular Model Setup
//
// ------------------------------------------------------------

function generate_atoms() {
  model.nodes({ num: mol_number, 
          xdomain: 100, ydomain: 100, 
          temperature: temperature, rmin: 4.4, 
          mol_rmin_radius_factor: 0.38
        })
      .initialize({
          temperature: temperature,
          lennard_jones_forces: layout.lennard_jones_forces_checkbox.checked, 
          coulomb_forces: layout.coulomb_forces_checkbox.checked, 
          model_listener: model_listener
        });
  atoms = model.get_atoms();
  nodes = model.get_nodes();
}

function modelSetup() {
  generate_atoms();
  model.set_coulomb_forces(layout.coulomb_forces_checkbox.checked);
  model.set_lennard_jones_forces(layout.lennard_jones_forces_checkbox.checked);
  model.set_temperature_control(true);
}

var mol_number_to_lj_sigma_map = {
  2: 7.0,
  5: 6.0,
  10: 5.5,
  20: 5.0,
  50: 4.5,
  100: 4.0,
  200: 3.5,
  500: 3.0
}

function updateMolNumberViewDependencies() {
  update_sigma(mol_number_to_lj_sigma_map[mol_number]);
  therm.max = 2.1;
}

// ------------------------------------------------------------
//
// Model Controller
//
// ------------------------------------------------------------

function modelController() {
  for(i = 0; i < this.elements.length; i++) {
      if (this.elements[i].checked) { run_mode = this.elements[i].value; }
  }
  switch(run_mode) {
    case "stop":
      modelStop();
      break;
    case "step":
      modelStep();
      break;
    case "go":
      modelGo();
      break;
    case "reset":
      modelReset();
      break;
  }
}

function modelStop() {
  model_stopped = true;
  model.stop();
}

function modelStep() {
  model_stopped = true;
  model.stop();
  if (model.stepCounter() < maximum_model_steps) {
    model.stepForward();
  }
}

function modelGo() {
  model_stopped = false;
  model.on("tick", model_listener);
  if (model.stepCounter() < maximum_model_steps) {
    model.resume();
  }
}

function modelStepBack() {
  modelStop();
  model.stepBack();
}

function modelStepForward() {
  model_stopped = true;
  if (model.stepCounter() < maximum_model_steps) {
    model.stepForward();
  }
}

function modelReset() {
  modelSetup();
  model.temperature(temperature);
  layout.selection = "simple-iframe";
  layout.setupScreen("simple-iframe");
  updateMolNumberViewDependencies();
  modelStop();
  layout.update_molecule_radius();
  layout.setup_particles();
  step_counter = model.stepCounter();
}

// ------------------------------------------------------------
//
//  Wire up screen-resize handlers
//
// ------------------------------------------------------------

document.onwebkitfullscreenchange = layout.setupScreen;
window.onresize = layout.setupScreen;

// ------------------------------------------------------------
//
// Handle keyboard shortcuts for model operation
//
// ------------------------------------------------------------

function handleKeyboardForModel(evt) {
  evt = (evt) ? evt : ((window.event) ? event : null); 
  if (evt) {
    switch (evt.keyCode) {
      case 32:                // spacebar
      model_stopped ? modelGo() : modelStop(); 
      evt.preventDefault();
      break;
      case 13:                // return
      modelGo();
      evt.preventDefault();
      break;
      case 37:                // left-arrow
      modelStepBack();
      evt.preventDefault();
      break;
      case 39:                // right-arrow
      modelStepForward();
      evt.preventDefault();
      break;
    }
  }
}

document.onkeydown = handleKeyboardForModel;

// ------------------------------------------------------------
//
// Start the model after everything else ...
//
// ------------------------------------------------------------

modelReset();
therm.add_value(model.ave_ke());
if (autostart) {
  modelGo();
}
