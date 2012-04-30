/*globals modeler, ModelPlayer, layout, graphx, molecules_lennard_jones, modelController */

controllers.complexModelController = function(layout_style, molecule_view) {

  layout.selection = layout_style;

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
          step_counter = model.stepCounter();

      layout.speed_update();

       molecule_view.update_molecule_positions();

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
              xdomain: 10, ydomain: 10,
              temperature: temperature
            })
          .initialize({
              temperature: temperature,
              coulomb_forces: layout.coulomb_forces_checkbox.checked,
              model_listener: modelListener
            });
      atoms = model.get_atoms();
      nodes = model.get_nodes();
    }

    function modelSetup() {
      generate_atoms();
      model.set_coulomb_forces(layout.coulomb_forces_checkbox.checked);
      model.set_lennard_jones_forces(layout.lennard_jones_forces_checkbox.checked);
      model.relax();
      model.resetTime();
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
      molecule_view.update_molecule_radius();
      molecule_view.setup_particles();
      layout.setupScreen(layout.selection);
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
            if (model.is_stopped()) {
              molecule_view.playback_component.action('play')
            } else {
              molecule_view.playback_component.action('stop')
            };
            evt.preventDefault();
          break;
          case 13:                // return
            molecule_view.playback_component.action('play')
            evt.preventDefault();
          break;
          case 37:                // left-arrow
            if (!model.is_stopped()) {
              molecule_view.playback_component.action('stop')
            };
            modelStepBack();
            evt.preventDefault();
          break;
          case 39:                // right-arrow
            if (!model.is_stopped()) {
              molecule_view.playback_component.action('stop')
            };
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

    controller.modelListener = modelListener;
    controller.modelGo = modelGo;
    controller.modelStop = modelStop;
    controller.modelReset = modelReset;
  }

  controller();
  return controller;
}