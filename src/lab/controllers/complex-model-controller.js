/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout

  model: true
  model_player: true
  atoms: true
  nodes: true
*/
/*jslint onevar: true*/
controllers.complexModelController =
    function(molecule_view_id,
             energy_graph_view_id,
             lj_potential_chart_id,
             speed_distribution_chart_id,
             modelConfig,
             playerConfig) {

  var layoutStyle         = playerConfig.layoutStyle,
      autostart           = playerConfig.autostart,
      maximum_model_steps = playerConfig.maximum_model_steps,
      lj_epsilon_max      = playerConfig.lj_epsilon_max,
      lj_epsilon_min      = playerConfig.lj_epsilon_min,
      lj_sigma_max        = 2.0,
      lj_sigma_min        = 0.1,

      mol_number          = modelConfig.mol_number,
      epsilon             = modelConfig.epsilon,
      sigma               = 0.34,
      temperature         = modelConfig.temperature,

      molecule_container,
      model_listener,
      step_counter,
      ljCalculator,
      kechart, energyGraph, energyGraph_options,
      te_data,
      model_controls_inputs,
      select_molecule_number,
      mol_number_to_ke_yxais_map,
      mol_number_to_speed_yaxis_map,
      potentialChart,
      speedDistributionChart,
      viewLists;

  function controller() {
    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    function modelListener(e) {
      var ke = model.ke(),
          pe = model.pe();

      speedDistributionChart.update();

       molecule_container.update_molecule_positions();

      if (model.isNewStep()) {
        te_data.push( ke );
        if (model.is_stopped()) {
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
    }

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    model = modeler.model({
        model_listener: modelListener,
        temperature: temperature,
        lennard_jones_forces: true,
        coulomb_forces: false,
        temperature_control: true,
        epsilon: epsilon,
        mol_number: mol_number
      });

    // ------------------------------------------------------------
    //
    // Create player and container view for model
    //
    // ------------------------------------------------------------

    layout.selection = layoutStyle;

    model_player = new ModelPlayer(model, autostart);
    molecule_container = layout.moleculeContainer(molecule_view_id,
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

    te_data = [];

    kechart = document.getElementById(ke_chart_view_id);

    // FIXME this graph has "magic" knowledge of the sampling period used by the modeler
    ke_graph_options = {
      title:     "Kinetic Energy of the System",
      xlabel:    "Model Time (ps)",
      xmin:      0,
      xmax:      2500,
      sample:    0.25,
      ylabel:    null,
      ymin:      0.0,
      ymax:      200,
      dataset:   te_data,
      container: kechart
    };

    layout.finishSetupKEChart = function(width, height) {
      kechart.style.width = width + "px";
      kechart.style.height = height +"px";
      if (undefined !== ke_graph) {
        ke_graph.setup_graph();
      } else {
        ke_graph = graphx.graph(ke_graph_options);
      }
    };
    model.on('play', energyGraph.show_canvas);
    model.on('stop', energyGraph.hide_canvas);

    // ------------------------------------------------------------
    //
    // Speed Distribution Histogram
    //
    // ------------------------------------------------------------

    speedDistributionChart = layout.speedDistributionChart(speed_distribution_chart_id, {
      title    : "Distribution of Speeds",
      xlabel   : null,
      ylabel   : "Count",
      xmax     : 2,
      xmin     : 0,
      ymax     : 15,
      ymin     : 0,
      quantile : 0.01
    });

    // ------------------------------------------------------------
    //
    // Lennard-Jones Chart
    //
    // ------------------------------------------------------------


    //   Lennard-Jones Coefficients Setup
    lj_coefficients = molecules_lennard_jones.coefficients();

    lj_data = {
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
          y, r;

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

      for(r = sigma * 0.5; r < lj_data.xmax * 3;  r += 0.05) {
        y = molecules_lennard_jones.potential(r);
        if (y < 100) {
          lennard_jones_potential.push([r, y]);
        }
      }
    }

    update_coefficients(lj_coefficients);

    potentialChart = layout.potentialChart(lj_potential_chart_id, lj_data, {
        title   : "Lennard-Jones potential",
        xlabel  : "Radius",
        ylabel  : "Potential Energy",
        epsilon_max:     lj_epsilon_max,
        epsilon_min:     lj_epsilon_min,
        initial_epsilon: initial_epsilon,
        epsilon_callback: update_epsilon
      });

    // ------------------------------------------------------------
    //
    // Setup list of views used by layout sustem
    //
    // ------------------------------------------------------------

    viewLists = {
      moleculeContainers:      [molecule_container],
      potentialCharts:         [potentialChart],
      speedDistributionCharts: [speedDistributionChart],
      energyCharts:            []
    };

    // ------------------------------------------------------------
    //
    // Get a few DOM elements
    //
    // ------------------------------------------------------------

    var model_controls = document.getElementById("model-controls");

    if (model_controls) {
      model_controls_inputs = model_controls.getElementsByTagName("input");
    }

    // ------------------------------------------------------------
    //
    //   Molecular Model Setup
    //
    // ------------------------------------------------------------

    function setup() {
      atoms = model.get_atoms();
      nodes = model.get_nodes();

      model.relax();
      model.resetTime();
      te_data = [model.ke()];

      molecule_container.updateMoleculeRadius();
      molecule_container.setup_particles();
      layout.setupScreen(viewLists);
      step_counter = model.stepCounter();

      modelStop();
      model.on("tick", modelListener);
    }

    // ------------------------------------------------------------
    //
    // Molecule Number Selector
    //
    // ------------------------------------------------------------

    select_molecule_number = document.getElementById("select-molecule-number");

    function selectMoleculeNumberChange() {
      mol_number = +select_molecule_number.value;
      modelReset();
      updateMolNumberViewDependencies();
    }

    mol_number_to_ke_yxais_map = {
      2: 0.02 * 50 * 2,
      5: 0.05 * 50 * 5,
      10: 0.01 * 50 * 10,
      20: 0.01 * 50 * 20,
      50: 120,
      100: 0.05 * 50 * 100,
      200: 0.1 * 50 * 200,
      500: 0.2 * 50 * 500
    };

    mol_number_to_speed_yaxis_map = {
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
      model.stop();
      ke_graph.hide_canvas();
      // ke_graph.new_data(ke_data);
      if (model_controls) {
        model_controls_inputs[0].checked = true;
      }
    }

    function modelStep() {
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
      model.on("tick", modelListener);
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
      molecule_container.update_molecule_radius();
      molecule_container.setup_particles();
      layout.setupScreen(viewLists);
      updateMolNumberViewDependencies();
      modelStop();
      model.on("tick", modelListener);
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

    function onresize() {
      layout.setupScreen(viewLists);
    }

    document.onwebkitfullscreenchange = onresize;
    window.onresize = onresize;

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
            if (model.is_stopped()) {
              molecule_container.playback_component.action('play');
            } else {
              molecule_container.playback_component.action('stop');
            }
            evt.preventDefault();
          break;
          case 13:                // return
            molecule_container.playback_component.action('play');
            evt.preventDefault();
          break;
          case 37:                // left-arrow
            if (!model.is_stopped()) {
              molecule_container.playback_component.action('stop');
            }
            modelStepBack();
            evt.preventDefault();
          break;
          case 39:                // right-arrow
            if (!model.is_stopped()) {
              molecule_container.playback_component.action('stop');
            }
            modelStepForward();
            evt.preventDefault();
          break;
        }
      }
    }

    document.onkeydown = handleKeyboardForModel;

    // ------------------------------------------------------------
    //
    // Reset the model after everything else ...
    //
    // ------------------------------------------------------------

    setup();

    // ------------------------------------------------------------
    // Setup therm, epsilon_slider & sigma_slider components ... after fluid layout
    // ------------------------------------------------------------

    // therm = new Thermometer('#thermometer', model.temperature(), 0, 25);
    //
    // model.addPropertiesListener(["temperature"], function(){
    //   therm.add_value(model.get("temperature"));
    // });
    //
    // epsilon_slider = new SliderComponent('#attraction_slider',
    //   function (v) {
    //     model.set({epsilon: v} );
    //   }, lj_epsilon_max, lj_epsilon_min, initial_epsilon);
    //
    // model.addPropertiesListener(["epsilon"], function(){
    //   epsilon_slider.set_scaled_value(model.get("epsilon"));
    // });

    // ------------------------------------------------------------
    // Setup heat and cool buttons
    // ------------------------------------------------------------

    layout.heatCoolButtons("#heat_button", "#cool_button", 0, 25, model, function (t) { therm.add_value(t); });

    // ------------------------------------------------------------
    //
    // Start if autostart is true after everything else ...
    //
    // ------------------------------------------------------------

    if (autostart) {
      modelGo();
    }

    controller.modelListener = modelListener;
    controller.modelGo = modelGo;
    controller.modelStop = modelStop;
    controller.modelReset = modelReset;
  }

  controller();
  return controller;
};