

controllers.simpleModelController = function(layout_style) {

  layout.selection = layout_style;

  // ------------------------------------------------------------
  //
  // Main callback from model process
  //
  // Pass this function to be called by the model on every model step
  //
  // ------------------------------------------------------------

  var model_listener = function(e) {
    molecule_container.update_molecule_positions();
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
    model_stopped = true;
    model.stop();
  }

  function modelStep() {
    model_stopped = true;
    model.stop();
    if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
      model.stepForward();
    }
  }

  function modelGo() {
    model_stopped = false;
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
    model_stopped = true;
    if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
      model.stepForward();
    }
  }

  function modelReset() {
    modelSetup();
    model.temperature(temperature);
    updateMolNumberViewDependencies();
    modelStop();
    molecule_container.update_molecule_radius();
    molecule_container.setup_particles();
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
    }, lj_epsilon_max, lj_epsilon_min, model.getEpsilon());

  therm.add_value(model.temperature());

  if (autostart) {
    modelGo();
  }
}

