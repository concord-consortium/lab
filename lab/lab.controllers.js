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
var INITIAL_EPSILON = -0.1;

controllers.simpleModelController = function(layout_style, molecule_view) {

  layout.selection = layout_style;

  // ------------------------------------------------------------
  //
  // Main callback from model process
  //
  // Pass this function to be called by the model on every model step
  //
  // ------------------------------------------------------------

  var model_listener = function(e) {
    molecule_view.update_molecule_positions();
    therm.add_value(model.temperature());
    if (step_counter >= model.stepCounter()) { modelStop(); }
  }

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
            xdomain: 10, ydomain: 10,
            temperature: temperature, rmin: 4.4
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
    model.setEpsilon(INITIAL_EPSILON);
    model.relax();
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
    model.stop();
  }

  function modelStep() {
    model.stop();
    if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
      model.stepForward();
    }
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

  function modelReset() {
    modelSetup();
    model.temperature(temperature);
    updateMolNumberViewDependencies();
    modelStop();
    model.on("tick", model_listener);
    molecule_view.update_molecule_radius();
    molecule_view.setup_particles();
    layout.setupScreen(layout.selection);
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

  // ------------------------------------------------------------
  // Setup heat and cool buttons
  // ------------------------------------------------------------

  layout.heatCoolButtons("#heat_button", "#cool_button", 0, 25)

  // ------------------------------------------------------------
  // Setup therm, epsilon_slider & sigma_slider components ... after fluid layout
  // ------------------------------------------------------------

  var therm = new Thermometer('#thermometer');
  therm.max = 25;

  var epsilon_slider  = new  SliderComponent('#attraction_slider', 
    function (v) {
      model.setEpsilon(v);
    }, lj_epsilon_max, lj_epsilon_min, INITIAL_EPSILON);

  therm.add_value(model.temperature());

  if (autostart) {
    modelGo();
  }
}

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
}})();
