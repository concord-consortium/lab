(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

// ------------------------------------------------------------
//
//   Controllers
//
// ------------------------------------------------------------

controllers = { version: "0.0.1" };
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
controllers.simpleModelController = function(molecule_view_id, modelConfig, playerConfig) {

  var layoutStyle         = playerConfig.layoutStyle,
      autostart           = playerConfig.autostart,
      maximum_model_steps = playerConfig.maximum_model_steps,
      lj_epsilon_max      = playerConfig.lj_epsilon_max,
      lj_epsilon_min      = playerConfig.lj_epsilon_min,

      atoms_properties    = modelConfig.atoms,
      mol_number          = modelConfig.mol_number,
      epsilon             = modelConfig.epsilon,
      sigma               = modelConfig.sigma,
      temperature         = modelConfig.temperature,
      coulomb_forces      = modelConfig.coulomb_forces,
      width               = modelConfig.width,
      height              = modelConfig.height,

      molecule_container,
      model_listener,
      step_counter,
      therm,
      epsilon_slider,
      viewLists;

  // ------------------------------------------------------------
  //
  // Main callback from model process
  //
  // Pass this function to be called by the model on every model step
  //
  // ------------------------------------------------------------

  model_listener = function(e) {
    molecule_container.update_molecule_positions();
    if (step_counter >= model.stepCounter()) { modelStop(); }
  };

  // ------------------------------------------------------------
  //
  // Create model and pass in properties
  //
  // ------------------------------------------------------------

  model = modeler.model({
      model_listener: model_listener,
      temperature: temperature,
      lennard_jones_forces: true,
      coulomb_forces: coulomb_forces,
      temperature_control: true,
      epsilon: epsilon,
      width: width,
      height: height
    });


  if (atoms_properties) {
    model.createNewAtoms(atoms_properties);
  } else if (mol_number) {
    model.createNewAtoms(mol_number);
    model.relax();
  } else {
    throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
  }

  // ------------------------------------------------------------
  //
  // Create player and container view for model
  //
  // ------------------------------------------------------------

  layout.selection = layoutStyle;

  model_player = new ModelPlayer(model, autostart);
  molecule_container = layout.moleculeContainer(molecule_view_id,
    {
      xmax:                 width,
      ymax:                 height
    }
  );

  // ------------------------------------------------------------
  //
  // Setup list of views used by layout system
  //
  // ------------------------------------------------------------

  viewLists = {
    moleculeContainers:      [molecule_container]
  };

  // ------------------------------------------------------------
  //
  // Model Controller
  //
  // ------------------------------------------------------------

  function modelStop() {
    model.stop();
  }

  function modelGo() {
    model.on("tick", model_listener);
    if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
      model.resume();
    }
  }

  function modelStepBack() {
    modelStop();
    model.stepBack();
  }

  function modelStepForward() {
    if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
      model.stepForward();
    }
  }

  // ------------------------------------------------------------
  //
  //   Molecular Model Setup
  //

  function setup() {
    atoms = model.get_atoms();
    nodes = model.get_nodes();

    model.resetTime();

    modelStop();
    model.on("tick", model_listener);
    molecule_container.updateMoleculeRadius();
    molecule_container.setup_particles();
    layout.setupScreen(viewLists);
    step_counter = model.stepCounter();
  }

  // ------------------------------------------------------------
  //
  //  Wire up screen-resize handlers
  //
  // ------------------------------------------------------------

  function onresize() {
    layout.setupScreen();
    therm.resize();
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

  therm = new Thermometer('#thermometer', model.temperature(), 0, 25);

  function updateTherm(){
    therm.add_value(model.get("temperature"));
  }

  model.addPropertiesListener(["temperature"], updateTherm);
  updateTherm();

  epsilon_slider = new SliderComponent('#attraction_slider',
    function (v) {
      model.set({epsilon: v} );
    }, lj_epsilon_max, lj_epsilon_min, epsilon);

  function updateEpsilon(){
    epsilon_slider.set_scaled_value(model.get("epsilon"));
  }

  model.addPropertiesListener(["epsilon"], updateEpsilon);
  updateEpsilon();

  // ------------------------------------------------------------
  // Setup heat and cool buttons
  // ------------------------------------------------------------

  layout.heatCoolButtons("#heat_button", "#cool_button", 0, 25, model, function (t) { therm.add_value(t); });

  // ------------------------------------------------------------
  // Add listener for coulomb_forces checkbox
  // ------------------------------------------------------------

  // $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));

  function updateCoulombCheckbox() {
    $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));
    molecule_container.setup_particles();
  }

  model.addPropertiesListener(["coulomb_forces"], updateCoulombCheckbox);
  updateCoulombCheckbox();

  // ------------------------------------------------------------
  //
  // Start if autostart is true
  //
  // ------------------------------------------------------------

  if (autostart) {
    modelGo();
  }
};
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

      atoms_properties    = modelConfig.atoms,
      mol_number          = modelConfig.mol_number,
      epsilon             = modelConfig.epsilon,
      sigma               = modelConfig.sigma,
      temperature         = modelConfig.temperature,
      temperature_control = modelConfig.temperature_control,
      coulomb_forces      = modelConfig.coulomb_forces,
      width               = modelConfig.width,
      height              = modelConfig.height,

      molecule_container,
      model_listener,
      step_counter,
      ljCalculator,
      kechart, energyGraph, energyGraph_options,
      te_data,
      model_controls,
      model_controls_inputs,
      select_molecule_number,
      mol_number_to_ke_yxais_map,
      mol_number_to_speed_yaxis_map,
      potentialChart,
      speedDistributionChart,
      viewLists,
      select_molecule_number,
      radio_randomize_pos_vel,

      currentTick = 0;

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
          pe = model.pe(),
          te = ke + pe;

      speedDistributionChart.update();

      molecule_container.update_molecule_positions();

      if (model.isNewStep()) {
        currentTick++;
        te_data.push(te);
        if (model.is_stopped()) {
          energyGraph.add_point(te);
        } else {
          energyGraph.add_canvas_point(te);
        }
      } else {
        energyGraph.update();
      }
      if (step_counter > 0.95 * energyGraph.xmax && energyGraph.xmax < maximum_model_steps) {
        energyGraph.change_xaxis(energyGraph.xmax * 2);
      }
      if (step_counter >= maximum_model_steps) { modelStop(); }
      layout.displayStats();
      if (layout.datatable_visible) { layout.render_datatable(); }
    }

    function resetTEData() {
      te_data = [model.ke() + model.pe()];
    }

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      model = modeler.model({
          model_listener: modelListener,
          temperature: temperature,
          lennard_jones_forces: true,
          coulomb_forces: coulomb_forces,
          temperature_control: temperature_control,
          epsilon: epsilon,
          sigma: sigma,
          width: width,
          height: height
        });

      if (atoms_properties) {
        model.createNewAtoms(atoms_properties);
      } else if (mol_number) {
        model.createNewAtoms(mol_number);
        model.relax();
      } else {
        throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
      }
    }

    function setupViews() {
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
          xmax:                 width,
          ymin:                 0,
          ymax:                 height
        }
      );

      model.addPropertiesListener(["sigma"], molecule_container.updateMoleculeRadius);

      // ------------------------------------------------------------
      //
      // Average Kinetic Energy Graph
      //
      // ------------------------------------------------------------

      // FIXME this graph has "magic" knowledge of the sampling period used by the modeler

      resetTEData();

      energyGraph = grapher.realTimeGraph(energy_graph_view_id, {
        title:     "Total Energy of the System",
        xlabel:    "Model Time (ps)",
        xmin:      0,
        xmax:     2500,
        sample:    0.25,
        ylabel:    null,
        ymin:      0.0,
        ymax:      200,
        dataset:   te_data
      });

      energyGraph.new_data(te_data);

      model.on('play', function() {
        if (energyGraph.number_of_points() && currentTick < energyGraph.number_of_points()) {
          if (currentTick === 0) {
            resetTEData();
          } else {
            te_data.length = currentTick;
          }
          energyGraph.new_data(te_data);
        }
        energyGraph.show_canvas();
      });

      model.on('stop', function() {
        energyGraph.hide_canvas();
      });

      model.on('seek', function() {
        resetTEData();
        energyGraph.new_data(te_data);
      });

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

      potentialChart = layout.potentialChart(lj_potential_chart_id, model, {
          title   : "Lennard-Jones potential",
          xlabel  : "Radius",
          ylabel  : "Potential Energy",
          epsilon_max:     lj_epsilon_max,
          epsilon_min:     lj_epsilon_min,
          epsilon:         epsilon,
          sigma_max:       lj_sigma_max,
          sigma_min:       lj_sigma_min,
          sigma:           sigma
        });

      model.addPropertiesListener(["epsilon"], potentialChart.ljUpdate);
      model.addPropertiesListener(["sigma"], potentialChart.ljUpdate);

      // ------------------------------------------------------------
      //
      // Coulomb Forces Checkbox
      //
      // ------------------------------------------------------------

      function updateCoulombCheckbox() {
        $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));
        molecule_container.setup_particles();
      }

      model.addPropertiesListener(["coulomb_forces"], updateCoulombCheckbox);
      updateCoulombCheckbox();

      // ------------------------------------------------------------
      //
      // Setup list of views used by layout sustem
      //
      // ------------------------------------------------------------

      viewLists = {
        moleculeContainers:      [molecule_container],
        potentialCharts:         [potentialChart],
        speedDistributionCharts: [speedDistributionChart],
        energyCharts:            [energyGraph]
      };

      // ------------------------------------------------------------
      //
      // Get a few DOM elements
      //
      // ------------------------------------------------------------

      model_controls = document.getElementById("model-controls");

      if (model_controls) {
        model_controls_inputs = model_controls.getElementsByTagName("input");
        model_controls.onchange = modelController;
      }

      // ------------------------------------------------------------
      //
      // Molecule Number Selector
      //
      // ------------------------------------------------------------

      select_molecule_number = document.getElementById("select-molecule-number");
      radio_randomize_pos_vel = document.getElementById("radio-randomize-pos-vel");
      checkbox_thermalize = document.getElementById("checkbox-thermalize");

      function selectMoleculeNumberChange() {
        mol_number = +select_molecule_number.value;
        modelReset();
        if (checkbox_thermalize.checked) {
          model.relax();
          molecule_container.update_molecule_positions();
        }
        radio_randomize_pos_vel.checked = false
        updateMolNumberViewDependencies();
      }

      mol_number_to_ke_yxais_map = {
        2:   0.02 * 50 * 2,
        5:   0.05 * 50 * 5,
        10:  0.01 * 50 * 10,
        20:  0.01 * 50 * 20,
        50:  120,
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
        energyGraph.change_yaxis(mol_number_to_ke_yxais_map[mol_number]);
        potentialChart.redraw();
        // speedDistributionChart.ymax = mol_number_to_speed_yaxis_map[mol_number];
        speedDistributionChart.redraw();
      }

      select_molecule_number.onchange = selectMoleculeNumberChange;
      radio_randomize_pos_vel.onclick = selectMoleculeNumberChange;

      select_molecule_number.value = mol_number;

    }

    // ------------------------------------------------------------
    //
    //   Molecular Model Setup
    //
    // ------------------------------------------------------------

    function setupModel() {
      atoms = model.get_atoms();
      nodes = model.get_nodes();

      model.resetTime();
      resetTEData();

      molecule_container.updateMoleculeRadius();
      molecule_container.setup_particles();
      layout.setupScreen(viewLists);
      step_counter = model.stepCounter();
      select_molecule_number.value = atoms.length;

      modelStop();
      model.on("tick", modelListener);
    }


    // ------------------------------------------------------------
    //
    // Model Controller
    //
    // ------------------------------------------------------------

    function modelStop() {
      model.stop();
      energyGraph.hide_canvas();
      molecule_container.playback_component.action('stop');
      // energyGraph.new_data(te_data);
      if (model_controls) {
        model_controls_inputs[0].checked = true;
      }
    }

    function modelStep() {
      model.stop();
      if (model.stepCounter() < maximum_model_steps) {
        model.stepForward();
        energyGraph.hide_canvas();
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
        energyGraph.show_canvas();
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
      currentTick = model.stepBack();
      energyGraph.showMarker(currentTick);
    }

    function modelStepForward() {
      if (model.stepCounter() < maximum_model_steps) {
        currentTick = model.stepForward();
        energyGraph.showMarker(currentTick);
      } else {
        if (model_controls) {
          model_controls_inputs[0].checked = true;
        }
      }
    }

    function modelReset() {
      mol_number = +select_molecule_number.value;
      model.createNewAtoms(mol_number);
      setupModel();
      step_counter = model.stepCounter();
      layout.displayStats();
      if (layout.datatable_visible) {
        layout.render_datatable(true);
      } else {
        layout.hide_datatable();
      }
      resetTEData();
      energyGraph.new_data(te_data);
      energyGraph.hide_canvas();
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

    createModel();
    setupViews();
    setupModel();

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
    controller.resetTEData = resetTEData;
    controller.energyGraph = energyGraph;
  }

  controller();
  return controller;
};})();
