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

var model_player = new ModelPlayer(model);

var molecule_container = layout.moleculeContainer("#molecule-container",
    {
      title:               "Simple Molecules",
      xlabel:              "X position (nm)",
      ylabel:              "Y position (nm)",
      playback_controller:  true,
      play_only_controller: false,
      model_time_label:     true,
      grid_lines:           true,
      xunits:               true,
      yunits:               true,
      atom_mubers:          false,
      xmin:                 0,
      xmax:                 10,
      ymin:                 0,
      ymax:                 10
    }
);

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

var modelController = controllers.complexModelController("full-static-screen");


