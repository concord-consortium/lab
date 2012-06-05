/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout

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
      mol_number          = modelConfig.mol_number,
      temperature         = modelConfig.temperature,
      temperature_control = modelConfig.temperature_control,
      coulomb_forces      = modelConfig.coulomb_forces,
      width               = modelConfig.width,
      height              = modelConfig.height,

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
      viewLists,
      select_molecule_number,
      radio_randomize_pos_vel,

      nodes,

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

      moleculeContainer.update_molecule_positions();

      if (model.isNewStep()) {
        currentTick++;
        energy_data[0].push(ke);
        energy_data[1].push(pe);
        energy_data[2].push(te);
        if (model.is_stopped()) {
          energyGraph.add_points([ke, pe, te]);
        } else {
          energyGraph.add_canvas_points([ke, pe, te]);
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

    function resetEnergyData() {
      ke = model.ke();
      pe = model.pe();
      te = ke + pe;
      energy_data = [[ke], [pe], [te]];
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
          ymax:                 height,
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); }
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
        xmax:     2500,
        sample:    0.25,
        ylabel:    null,
        ymin:      -5.0,
        ymax:      5.0,
        dataset:   energy_data
      });

      energyGraph.new_data(energy_data);

      model.on('play', function() {
        var i, len;

        if (energyGraph.number_of_points() && currentTick < energyGraph.number_of_points()) {
          if (currentTick === 0) {
            resetEnergyData();
          } else {
            for (i = 0, len = energy_data.length; i < len; i++) {
              energy_data[i].length = currentTick;
            }
          }
          energyGraph.new_data(energy_data);
        }
        energyGraph.show_canvas();
      });

      model.on('stop', function() {
        energyGraph.hide_canvas();
      });

      model.on('seek', function() {
        resetEnergyData();
        energyGraph.new_data(energy_data);
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
      // Coulomb Forces Checkbox
      //
      // ------------------------------------------------------------

      function updateCoulombCheckbox() {
        $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));
        moleculeContainer.setup_particles();
      }

      model.addPropertiesListener(["coulomb_forces"], updateCoulombCheckbox);
      updateCoulombCheckbox();

      // ------------------------------------------------------------
      //
      // Setup list of views used by layout sustem
      //
      // ------------------------------------------------------------

      viewLists = {
        moleculeContainers:      [moleculeContainer],
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
          moleculeContainer.update_molecule_positions();
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
      nodes = model.get_nodes();

      model.resetTime();
      resetEnergyData();

      moleculeContainer.updateMoleculeRadius();
      moleculeContainer.setup_particles();
      layout.setupScreen(viewLists);
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
      energyGraph.hide_canvas();
      moleculeContainer.playback_component.action('stop');
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
      resetEnergyData();
      energyGraph.new_data(energy_data);
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
              moleculeContainer.playback_component.action('play');
            } else {
              moleculeContainer.playback_component.action('stop');
            }
            evt.preventDefault();
          break;
          case 13:                // return
            moleculeContainer.playback_component.action('play');
            evt.preventDefault();
          break;
          case 37:                // left-arrow
            if (!model.is_stopped()) {
              moleculeContainer.playback_component.action('stop');
            }
            modelStepBack();
            evt.preventDefault();
          break;
          case 39:                // right-arrow
            if (!model.is_stopped()) {
              moleculeContainer.playback_component.action('stop');
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

    try {
      createModel();
      setupViews();
      setupModel();
    } catch(e) {
      alert(e);
      throw new Error(e);
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
  }

  controller();
  return controller;
};