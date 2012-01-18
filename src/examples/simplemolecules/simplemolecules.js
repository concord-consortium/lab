//
// simplemolecules.js
//

// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var mol_number = 50,
    sample_time = 0.01,
    temperature = 3,
    maximum_model_steps = 5000,
    molecules = [], model,
    lj_sigma_min = 1,
    lj_sigma_max = 10,
    lj_epsilon_max = -0.00001,
    lj_epsilon_min = -5.0,
    lennard_jones_potential = [],
    lj_alpha, lj_beta,
    mol_rmin_radius_factor = 0.38,
    frame_number = 0,
    model_stopped = true,
    model = modeler.layout.model();

// ------------------------------------------------------------
//
// Main callback from model process
//
// Pass this function to be called by the model on every model step
//
// ------------------------------------------------------------

var model_listener = function(e) {
  var ke = model.ke(),
      step_counter = model.stepCounter(),
      total_steps = model.steps();
  
  layout.speed_update();
  
  layout.update_molecule_positions();
  
  if (model.isNewStep()) {
    ke_data.push(ke);
    if (model_stopped) {
      ke_graph.add_point(ke);
      ke_graph.update_canvas();
    } else {
      ke_graph.add_canvas_point(ke)
    }
  } else {
    ke_graph.update();
  }
  if (step_counter > 0.95 * ke_graph.xmax && ke_graph.xmax < maximum_model_steps) {
    ke_graph.change_xaxis(ke_graph.xmax * 2);
  }
  if (step_counter >= maximum_model_steps) { modelStop(); }
  layout.displayStats();
  if (layout.datatable_visible) { layout.render_datatable() }
}

// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

var mc_graph = {};
mc_graph.title   = "Simple Molecules";
mc_graph.xlabel  = "X position (nm)";
mc_graph.ylabel  = "Y position (nm)";
mc_graph.xmin    = 0,
mc_graph.xmax    = 100,
mc_graph.ymin    = 0,
mc_graph.ymax    = 100,
mc_graph.xdomain = mc_graph.xmax - mc_graph.xmin,
mc_graph.ydomain = mc_graph.ymax - mc_graph.ymin;
mc_graph.model_time_label = true;

// ------------------------------------------------------------
//
// Average Kinetic Energy Graph
//
// ------------------------------------------------------------

var ke_data = [];

var kechart = document.getElementById("ke-chart");

var ke_graph_options = {
  title:     "Kinetic Energy of the System",
  xlabel:    "Model Time (ns)",
  xmin:      0, 
  xmax:      2500,
  sample:    sample_time,
  ylabel:    null,
  ymin:      0.0,
  ymax:      200,
  dataset:   ke_data,
  container: kechart
};

var ke_graph;

function finishSetupKEChart() {
  if (undefined !== ke_graph) {
    ke_graph.setup_graph();
  } else {
    ke_graph = graphx.graph(ke_graph_options);
  }
}

// ------------------------------------------------------------
//
// Speed Distribution Histogram
//
// ------------------------------------------------------------

var speed_graph      = {};
speed_graph.title    = "Distribution of Speeds";
speed_graph.xlabel   = null;
speed_graph.ylabel   = "Count";
speed_graph.xmax     = 2;
speed_graph.xmin     = 0;
speed_graph.ymax     = 15;
speed_graph.ymin     = 0;
speed_graph.quantile = 0.01;

// ------------------------------------------------------------
//
// Lennard-Jones Chart
//
// ------------------------------------------------------------

var lj_graph = {};
lj_graph.title   = "Lennard-Jones potential";
lj_graph.xlabel  = "Radius";
lj_graph.ylabel  = "Potential Energy";

lj_graph.coefficients = molecules_lennard_jones.coefficients();

lj_graph.variables = [
  { 
    coefficient:"epsilon", 
    x: lj_graph.coefficients.rmin, 
    y: lj_graph.coefficients.epsilon 
  }, 
  { 
    coefficient:"sigma", 
    x: lj_graph.coefficients.sigma, 
    y: 0 
  }
];

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

  lj_graph.coefficients.sigma   = sigma;
  lj_graph.coefficients.epsilon = epsilon;
  lj_graph.coefficients.rmin    = rmin;

  lj_graph.xmax    = sigma * 3;
  lj_graph.xmin    = Math.floor(sigma/2);
  lj_graph.ymax    = Math.ceil(epsilon*-1) + 0.0;
  lj_graph.ymin    = Math.ceil(epsilon*1) - 2.0;

  // update the positions of the adjustable circles on the graph
  lj_graph.variables[1].x = sigma;

  // change the x value for epsilon to match the new rmin value
  lj_graph.variables[0].x = rmin;

  lennard_jones_potential = []
  
  for(var r = sigma * 0.5; r < lj_graph.xmax * 3;  r += 0.05) {
    y = molecules_lennard_jones.potential(r)
    if (y < 100) {
      lennard_jones_potential.push([r, y]);
    }
  }
}

// ------------------------------------------------------------
//
// Get a few DOM elements
//
// ------------------------------------------------------------

var model_controls = document.getElementById("model-controls");
var model_controls_inputs = model_controls.getElementsByTagName("input");

// ------------------------------------------------------------
//
//   Molecular Model Setup
//
// ------------------------------------------------------------

function generate_atoms() {
  model.size([mc_graph.xdomain, mc_graph.ydomain])
      .nodes({ num: mol_number, 
               xdomain: mc_graph.xdomain, 
               ydomain: mc_graph.ydomain, 
               temperature: temperature, 
               rmin: lj_graph.coefficients.rmin, 
               mol_rmin_radius_factor: 0.68
            })
      .initialize({ lennard_jones_forces: layout.lennard_jones_forces_checkbox.checked, 
                    coulomb_forces: layout.coulomb_forces_checkbox.checked, 
                    model_listener: model_listener
            });

  atoms = model.get_atoms();
}

function modelSetup() {
  generate_atoms();
  ke_data = [model.ke()];
}

// ------------------------------------------------------------
//
// Molecule Number Selector
//
// ------------------------------------------------------------

var select_molecule_number = document.getElementById("select-molecule-number");

function selectMoleculeNumberChange() {
  mol_number = +select_molecule_number.value;
  modelReset();
  updateMolNumberViewDependencies();
}

var mol_number_to_ke_yxais_map = {
  2: 0.02,
  5: 0.05,
  10: 0.01,
  20: 0.01,
  50: 0.02,
  100: 0.05,
  200: 0.1,
  500: 0.2
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

var mol_number_to_speed_yaxis_map = {
  2: 2,
  5: 2,
  10: 5,
  20: 5,
  50: 10,
  100: 15,
  200: 20,
  500: 40
}

function updateMolNumberViewDependencies() {
  ke_graph.change_yaxis(mol_number_to_ke_yxais_map[mol_number]);
  update_sigma(mol_number_to_lj_sigma_map[mol_number]);
  layout.lj_redraw();
  speed_graph.ymax = mol_number_to_speed_yaxis_map[mol_number];
  layout.speed_update()
  layout.speed_redraw();
}

select_molecule_number.onchange = selectMoleculeNumberChange;

select_molecule_number.value = mol_number;

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

model_controls.onchange = modelController;

function modelStop() {
  model_stopped = true;
  model.stop();
  ke_graph.hide_canvas();
  // ke_graph.new_data(ke_data);
  model_controls_inputs[0].checked = true;
}

function modelStep() {
  model_stopped = true;
  model.stop();
  if (model.stepCounter() < maximum_model_steps) {
    model.stepForward();
    ke_graph.hide_canvas();
    model_controls_inputs[0].checked = true;
  } else {
    model_controls_inputs[0].checked = true
  }
}

function modelGo() {
  model_stopped = false;
  model.on("tick", model_listener);
  if (model.stepCounter() < maximum_model_steps) {
    ke_graph.show_canvas();
    model.resume();
    model_controls_inputs[2].checked = true;
  } else {
    model_controls_inputs[0].checked = true
  }
}

function modelStepBack() {
  modelStop();
  model.stepBack();
  ke_graph.new_data(ke_data);
}

function modelStepForward() {
  model_stopped = true;
  if (model.stepCounter() < maximum_model_steps) {
    model.stepForward();
  } else {
    model_controls_inputs[0].checked = true
  }
}

function modelReset() {
  mol_number = +select_molecule_number.value;
  modelSetup();
  update_coefficients(molecules_lennard_jones.coefficients());
  model.temperature(temperature);
  layout.temperature_control_checkbox.onchange();
  layout.setupScreen();
  updateMolNumberViewDependencies();
  modelStop();
  layout.update_molecule_radius();
  layout.setup_particles();
  step_counter = model.stepCounter();
  layout.displayStats();
  if (layout.datatable_visible) { 
    layout.render_datatable(true);
  } else {
    layout.hide_datatable()
  }  
  ke_data = [model.ke()];
  ke_graph.new_data(ke_data);
  ke_graph.hide_canvas();
  model_controls_inputs[0].checked = true;
}

// ------------------------------------------------------------
//
// Finish screen layout, initialize and start model
//
// ------------------------------------------------------------

modelReset();

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

modelGo();
