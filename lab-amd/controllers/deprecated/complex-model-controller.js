/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout
  DEVELOPMENT
  $
  alert
  model: true
  model_player: true
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

      elements            = modelConfig.elements,
      atoms_properties    = modelConfig.atoms,
      radialBonds         = modelConfig.radialBonds,
      mol_number          = modelConfig.mol_number,
      temperature         = modelConfig.temperature,
      temperature_control = modelConfig.temperature_control,
      coulomb_forces      = modelConfig.coulomb_forces,
      width               = modelConfig.width,
      height              = modelConfig.height,
      chargeShading       = modelConfig.chargeShading,
      showVDWLines        = modelConfig.showVDWLines,
      radialBonds         = modelConfig.radialBonds,
      obstacles           = modelConfig.obstacles,
      viscosity           = modelConfig.viscosity,
      gravitationalField  = modelConfig.gravitationalField,

      moleculeContainer,
      model_listener,
      step_counter,
      ljCalculator,
      kechart, energyGraph, energyGraph_options,
      energy_data,
      model_controls,
      model_controls_inputs,
      select_molecule_number,
      mol_number_to_ke_yxais_map,
      mol_number_to_speed_yaxis_map,
      potentialChart,
      speedDistributionChart,
      select_molecule_number,
      radio_randomize_pos_vel,
      nodes;

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

      moleculeContainer.update_drawable_positions();

      if (model.isNewStep()) {
        energy_data[0].push(ke);
        energy_data[1].push(pe);
        energy_data[2].push(te);
        energyGraph.add_points([ke, pe, te]);
      } else {
        energyGraph.update(model.stepCounter());
      }
      if (step_counter >= maximum_model_steps) { modelStop(); }
      layout.displayStats();
      if (layout.datatable_visible) { layout.render_datatable(); }
    }

    function resetEnergyData(index) {
      var modelsteps = model.stepCounter();
      if (index) {
        for (i = 0, len = energy_data.length; i < len; i++) {
          energy_data[i].length = modelsteps
        }
      } else {
        ke = model.ke();
        pe = model.pe();
        te = ke + pe;
        energy_data = [[ke], [pe], [te]];
      }
    }

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      model = modeler.model({
          elements: elements,
          model_listener: modelListener,
          temperature: temperature,
          lennard_jones_forces: true,
          coulomb_forces: coulomb_forces,
          temperature_control: temperature_control,
          width: width,
          height: height,
          chargeShading: chargeShading,
          showVDWLines: showVDWLines,
          viscosity : viscosity,
          gravitationalField : gravitationalField
        });

      if (atoms_properties) {
        model.createNewAtoms(atoms_properties);
        if (radialBonds) model.createRadialBonds(radialBonds);
        if (showVDWLines) model.createVdwPairs(atoms_properties);
        if (obstacles) model.createObstacles(obstacles);
      } else if (mol_number) {
        model.createNewAtoms({
          num: mol_number,
          relax: true
        });
      } else {
        throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
      }
    }

    // ------------------------------------------------------------
    //
    // Create Views
    //
    // ------------------------------------------------------------

    function setupViews() {
      // ------------------------------------------------------------
      //
      // Create player and container view for model
      //
      // ------------------------------------------------------------

      layout.selection = layoutStyle;

      model_player = new ModelPlayer(model, autostart);
      moleculeContainer = layout.moleculeContainer(molecule_view_id,
        {
          title:               "Simple Molecules",
          xlabel:              "X position (nm)",
          ylabel:              "Y position (nm)",
          controlButtons:       "play_reset_step",
          modelTimeLabel:       true,
          grid_lines:           true,
          xunits:               true,
          yunits:               true,
          atom_mubers:          false,
          xmin:                 0,
          xmax:                 width,
          ymin:                 0,
          ymax:                 height,
          chargeShading:        chargeShading,
          showVDWLines:         showVDWLines,
          get_radial_bonds:     function() { return model.get_radial_bonds(); },
          get_vdw_pairs:        function() { return model.get_vdw_pairs(); },
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); },
          get_obstacles:        function() { return model.get_obstacles(); }
        }
      );

      model.addPropertiesListener(["sigma"], moleculeContainer.updateMoleculeRadius);

      // ------------------------------------------------------------
      //
      // Average Kinetic Energy Graph
      //
      // ------------------------------------------------------------

      // FIXME this graph has "magic" knowledge of the sampling period used by the modeler

      resetEnergyData();

      energyGraph = grapher.realTimeGraph(energy_graph_view_id, {
        title:     "Energy of the System (KE:red, PE:green, TE:blue)",
        xlabel:    "Model Time (ps)",
        xmin:      0,
        xmax:     100,
        sample:    0.1,
        ylabel:    "eV",
        ymin:      -5.0,
        ymax:      5.0,
        dataset:   energy_data
      });

      energyGraph.new_data(energy_data);

      model.on('play', function() {
        var i, len;

        if (energyGraph.number_of_points() && model.stepCounter() < energyGraph.number_of_points()) {
          resetEnergyData(model.stepCounter());
          energyGraph.new_data(energy_data);
        }
        energyGraph.show_canvas();
      });

      model.on('stop', function() {
      });

      // Right now this action is acting as an indication of model reset ...
      // This should be refactoring to distinguish the difference between reset
      // and seek to location in model history.
      model.on('seek', function() {
        modelsteps = model.stepCounter();
        if (modelsteps > 0) {
          resetEnergyData(modelsteps);
          energyGraph.new_data(energy_data);
        } else {
          resetEnergyData();
          energyGraph.new_data(energy_data);
        }
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

      // FIXME: The potential chart needs refactoring to handle multiple
      // elements and pairwise potentials
      potentialChart = layout.potentialChart(lj_potential_chart_id, model, {
          title   : "Lennard-Jones potential",
          xlabel  : "Radius",
          ylabel  : "Potential Energy",
          epsilon_max:     lj_epsilon_max,
          epsilon_min:     lj_epsilon_min,
          epsilon:         elements[0].epsilon,
          sigma_max:       lj_sigma_max,
          sigma_min:       lj_sigma_min,
          sigma:           elements[0].sigma
        });

      model.addPropertiesListener(["epsilon"], potentialChart.ljUpdate);
      model.addPropertiesListener(["sigma"], potentialChart.ljUpdate);

      // ------------------------------------------------------------
      //
      // Force Interaction Checkboxs
      //
      // ------------------------------------------------------------

      $("#coulomb-forces-checkbox").click(function() {
        model.set({ coulomb_forces: this.checked });
      })

      model.addPropertiesListener(["coulomb_forces"], function() {
        $("#coulomb-forces-checkbox").prop("checked", model.get("coulomb_forces"))
      });

      $("#lennard-jones-forces-checkbox").click(function() {
        model.set({ lennard_jones_forces: this.checked });
      })

      model.addPropertiesListener(["lennard_jones_forces"], function() {
        $("#lennard-jones-forces-checkbox").prop("checked", model.get("lennard_jones_forces"))
      });

      // ------------------------------------------------------------
      //
      // View Property Checkboxs
      //
      // ------------------------------------------------------------

      $("#show-vdw-lines-checkbox").click(function() {
        model.set({ showVDWLines: this.checked });
      })

      model.addPropertiesListener(["showVDWLines"], function() {
        $("#show-vdw-lines-checkbox").prop("checked", model.get("showVDWLines"))
      });

      $("#show-charge-shading-checkbox").click(function() {
        model.set({ chargeShading: this.checked });
      })

      model.addPropertiesListener(["chargeShading"], function() {
        $("#show-charge-shading-checkbox").prop("checked", model.get("chargeShading"))
        moleculeContainer.setup_drawables();
      });

      // ------------------------------------------------------------
      //
      // Setup list of views used by layout sustem
      //
      // ------------------------------------------------------------

      layout.addView('moleculeContainers', moleculeContainer);
      layout.addView('potentialCharts', potentialChart);
      layout.addView('speedDistributionCharts', speedDistributionChart);
      layout.addView('energyCharts', energyGraph);

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
      nodes = model.get_nodes();

      model.resetTime();
      resetEnergyData();

      moleculeContainer.setup_drawables();
      moleculeContainer.updateMoleculeRadius();
      layout.setupScreen();
      step_counter = model.stepCounter();
      select_molecule_number.value = model.get_num_atoms();

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
      // energyGraph.hide_canvas();
      moleculeContainer.playback_component.action('stop');
      if (model_controls) {
        model_controls_inputs[0].checked = true;
      }
    }

    function modelStep() {
      model.stop();
      if (model.stepCounter() < maximum_model_steps) {
        model.stepForward();
        // energyGraph.hide_canvas();
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
      model.stepBack();
      energyGraph.showMarker(model.stepCounter());
    }

    function modelStepForward() {
      if (model.stepCounter() < maximum_model_steps) {
        model.stepForward();
        // energyGraph.showMarker(model.stepCounter());
      } else {
        if (model_controls) {
          model_controls_inputs[0].checked = true;
        }
      }
    }

    function modelReset() {
      var dontRelaxRandom = !checkbox_thermalize.checked;
      mol_number = +select_molecule_number.value;
      model.createNewAtoms(mol_number, dontRelaxRandom);
      setupModel();
      moleculeContainer.update_drawable_positions();
      step_counter = model.stepCounter();
      layout.displayStats();
      if (layout.datatable_visible) {
        layout.render_datatable(true);
      } else {
        layout.hide_datatable();
      }
      resetEnergyData();
      energyGraph.new_data(energy_data);
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
      layout.setupScreen();
    }

    document.onwebkitfullscreenchange = onresize;
    window.onresize = onresize;

    // ------------------------------------------------------------
    //
    // Reset the model after everything else ...
    //
    // ------------------------------------------------------------

    function finishSetup() {
      createModel();
      setupViews();
      setupModel();
    }

    if (typeof DEVELOPMENT === 'undefined') {
      try {
        finishSetup()
      } catch(e) {
        alert(e);
        throw new Error(e);
      }
    } else {
      finishSetup()
    }

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
    controller.resetEnergyData = resetEnergyData;
    controller.energyGraph = energyGraph;
    controller.moleculeContainer = moleculeContainer;
    controller.energy_data = energy_data;
  }

  controller();
  return controller;
};