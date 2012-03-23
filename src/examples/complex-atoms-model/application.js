/*globals modeler, ModelPlayer, layout, graphx, molecules_lennard_jones, modelController */

// simplemolecules.js
//

// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var autostart = true,
    mol_number = 50,
    sample_time = 0.01,
    temperature = 5,
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
    model = modeler.model(),
    step_counter,
    atoms,
    nodes;

// ------------------------------------------------------------
// Setup model_player
// ------------------------------------------------------------

var model_player = new ModelPlayer(model);

// ------------------------------------------------------------
//
// Main callback from model process
//
// Pass this function to be called by the model on every model step
//
// ------------------------------------------------------------

var model_listener = function(e) {
  var ke = model.ke(),
      pe = model.pe(),
      step_counter = model.stepCounter();

  layout.speed_update();

  layout.update_molecule_positions();

  if (model.isNewStep()) {
    te_data.push( ke );
    if (model_stopped) {
      ke_graph.add_point( ke );
      ke_graph.update_canvas();
    } else {
      ke_graph.add_canvas_point( ke );
    }
  } else {
    ke_graph.update();
  }
  if (step_counter > 0.95 * ke_graph.xmax && ke_graph.xmax < maximum_model_steps) {
    ke_graph.change_xaxis(ke_graph.xmax * 2);
  }
  if (step_counter >= maximum_model_steps) { modelStop(); }
  layout.displayStats();
  if (layout.datatable_visible) { layout.render_datatable(); }
};

// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

var mc_graph = {
      title:               "Simple Molecules",
      xlabel:              "X position (nm)",
      ylabel:              "Y position (nm)",
      playback_controller:  true,
      model_time_label:     true,
      grid_lines:           true,
      xunits:               true,
      yunits:               true,
      atom_mubers:          false,
      xmin:                 0,
      xmax:                 20,
      ymin:                 0,
      ymax:                 20
    };

    mc_graph.xdomain = mc_graph.xmax - mc_graph.xmin;
    mc_graph.ydomain = mc_graph.ymax - mc_graph.ymin;

// ------------------------------------------------------------
//
// Average Kinetic Energy Graph
//
// ------------------------------------------------------------

var te_data = [];

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
  dataset:   te_data,
  container: kechart
};

var ke_graph;

layout.finishSetupKEChart = function() {
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

var speed_graph      = {
  title    : "Distribution of Speeds",
  xlabel   : null,
  ylabel   : "Count",
  xmax     : 2,
  xmin     : 0,
  ymax     : 15,
  ymin     : 0,
  quantile : 0.01
};

// ------------------------------------------------------------
//
// Lennard-Jones Chart
//
// ------------------------------------------------------------

var lj_graph = {
  title   : "Lennard-Jones potential",
  xlabel  : "Radius",
  ylabel  : "Potential Energy"
};

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

  lennard_jones_potential = [];

  for(var r = sigma * 0.5; r < lj_data.xmax * 3;  r += 0.05) {
    y = molecules_lennard_jones.potential(r);
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

if (model_controls) {
  var model_controls_inputs = model_controls.getElementsByTagName("input");
}

// ------------------------------------------------------------
//
//   Molecular Model Setup
//
// ------------------------------------------------------------

function generate_atoms() {
  model.nodes({ num: mol_number,
          xdomain: mc_graph.xdomain,
          ydomain: mc_graph.ydomain,
          temperature: temperature,
          mol_rmin_radius_factor: 0.38
        })
      .initialize({
          temperature: temperature,
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
  model.relax();
  te_data = [model.ke()];
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
  2: 0.02 * 50 * 2,
  5: 0.05 * 50 * 5,
  10: 0.01 * 50 * 10,
  20: 0.01 * 50 * 20,
  50: 120,
  100: 0.05 * 50 * 100,
  200: 0.1 * 50 * 200,
  500: 0.2 * 50 * 500
};

var mol_number_to_speed_yaxis_map = {
  2: 2,
  5: 2,
  10: 5,
  20: 5,
  50: 10,
  100: 15,
  200: 20,
  500: 40
};

function updateMolNumberViewDependencies() {
  ke_graph.change_yaxis(mol_number_to_ke_yxais_map[mol_number]);
  layout.lj_redraw();
  speed_graph.ymax = mol_number_to_speed_yaxis_map[mol_number];
  layout.speed_update();
  layout.speed_redraw();
}

select_molecule_number.onchange = selectMoleculeNumberChange;

select_molecule_number.value = mol_number;

// ------------------------------------------------------------
//
// Model Controller
//
// ------------------------------------------------------------

if (model_controls) {
  model_controls.onchange = modelController;
}

function modelStop() {
  model_stopped = true;
  model.stop();
  ke_graph.hide_canvas();
  // ke_graph.new_data(ke_data);
  if (model_controls) {
    model_controls_inputs[0].checked = true;
  }
}

function modelStep() {
  model_stopped = true;
  model.stop();
  if (model.stepCounter() < maximum_model_steps) {
    model.stepForward();
    ke_graph.hide_canvas();
    if (model_controls) {
      model_controls_inputs[0].checked = true;
    }
  } else {
    if (model_controls) {
      model_controls_inputs[0].checked = false;
    }
  }
}

function modelGo() {
  model_stopped = false;
  model.on("tick", model_listener);
  if (model.stepCounter() < maximum_model_steps) {
    ke_graph.show_canvas();
    model.resume();
    if (model_controls) {
      model_controls_inputs[0].checked = true;
    }
  } else {
    if (model_controls) {
      model_controls_inputs[0].checked = false;
    }
  }
}

function modelStepBack() {
  modelStop();
  model.stepBack();
  ke_graph.new_data(te_data);
}

function modelStepForward() {
  model_stopped = true;
  if (model.stepCounter() < maximum_model_steps) {
    model.stepForward();
  } else {
    if (model_controls) {
      model_controls_inputs[0].checked = true;
    }
  }
}

function modelReset() {
  mol_number = +select_molecule_number.value;
  update_coefficients(molecules_lennard_jones.coefficients());
  modelSetup();
  model.temperature(temperature);
  layout.temperature_control_checkbox.onchange();
  layout.selection = "full-static-screen";
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
    layout.hide_datatable();
  }
  te_data = [model.ke()];
  ke_graph.new_data(te_data);
  ke_graph.hide_canvas();
  if (model_controls) {
    model_controls_inputs[0].checked = true;
  }
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
        if (model_stopped) {
          modelGo();
        } else {
          modelStop();
        }
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
if (autostart) {
  modelGo();
}
