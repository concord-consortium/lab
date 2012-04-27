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
    if (step_counter >= model.stepCounter()) { modelStop(); }
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

  function onresize() {
    layout.setupScreen();
    therm.resize();
  };

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
  // Reset the model after everything else ...
  //
  // ------------------------------------------------------------

  modelReset();

  // ------------------------------------------------------------
  // Setup therm, epsilon_slider & sigma_slider components ... after fluid layout
  // ------------------------------------------------------------

  var therm = new Thermometer('#thermometer', model.temperature(), 0, 25);

  model.addPropertiesListener(["temperature"], function(){
    therm.add_value(model.get("temperature"));
  });

  var epsilon_slider = new SliderComponent('#attraction_slider',
    function (v) {
      model.set({epsilon: v} );
    }, lj_epsilon_max, lj_epsilon_min, INITIAL_EPSILON);

  model.addPropertiesListener(["epsilon"], function(){
    epsilon_slider.set_scaled_value(model.get("epsilon"))
  });

  // ------------------------------------------------------------
  // Setup heat and cool buttons
  // ------------------------------------------------------------

  layout.heatCoolButtons("#heat_button", "#cool_button", 0, 25, model, function (t) { therm.add_value(t) });

  // ------------------------------------------------------------
  //
  // Start if autostart is true
  //
  // ------------------------------------------------------------

  if (autostart) {
    modelGo();
  }
};
