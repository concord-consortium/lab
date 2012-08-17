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
controllers.simpleModelController = function(molecule_view_id, modelConfig, playerConfig) {

  var layoutStyle,
      autostart,
      maximum_model_steps,
      lj_epsilon_max,
      lj_epsilon_min,

      elements,
      atoms_properties,
      mol_number,
      temperature_control,
      temperature,
      coulomb_forces,
      width,
      height,
      chargeShading,
      showVDWLines,
      radialBonds,
      obstacles,

      nodes,

      molecule_container,
      model_listener,
      step_counter,
      therm,
      epsilon_slider;

  function controller() {


    function initializeLocalVariables() {
      layoutStyle         = playerConfig.layoutStyle;
      autostart           = playerConfig.autostart;
      maximum_model_steps = playerConfig.maximum_model_steps;
      lj_epsilon_max      = playerConfig.lj_epsilon_max;
      lj_epsilon_min      = playerConfig.lj_epsilon_min;

      elements            = modelConfig.elements;
      atoms_properties    = modelConfig.atoms;
      mol_number          = modelConfig.mol_number;
      temperature_control = modelConfig.temperature_control;
      temperature         = modelConfig.temperature;
      coulomb_forces      = modelConfig.coulomb_forces;
      width               = modelConfig.width;
      height              = modelConfig.height;
      chargeShading       = modelConfig.chargeShading;
      showVDWLines        = modelConfig.showVDWLines;
      radialBonds         = modelConfig.radialBonds;
      obstacles           = modelConfig.obstacles;
    }

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    model_listener = function(e) {
      molecule_container.update_drawable_positions();
      if (step_counter >= model.stepCounter()) { modelStop(); }
    };

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      model = modeler.model({
          elements: elements,
          model_listener: model_listener,
          temperature: temperature,
          lennard_jones_forces: true,
          coulomb_forces: coulomb_forces,
          temperature_control: temperature_control,
          width: width,
          height: height,
          chargeShading: chargeShading,
          showVDWLines: showVDWLines
      });

      if (atoms_properties) {
        model.createNewAtoms(atoms_properties);
      } else if (mol_number) {
        model.createNewAtoms({
          num: mol_number,
          relax: true
        });
      } else {
        throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
      }
      if (radialBonds) model.createRadialBonds(radialBonds);
      if (obstacles) model.createObstacles(obstacles);
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
      molecule_container = layout.moleculeContainer(molecule_view_id,
        {
          xmax:                 width,
          ymax:                 height,
          chargeShading:        chargeShading,
          showVDWLines:         showVDWLines,
          get_radial_bonds:     function() { return model.get_radial_bonds(); },
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); },
          get_obstacles:        function() { return model.get_obstacles(); }
        }
      );

      molecule_container.updateMoleculeRadius();
      molecule_container.setup_drawables();

      // ------------------------------------------------------------
      // Setup therm, epsilon_slider & sigma_slider components ... after fluid layout
      // ------------------------------------------------------------

      therm = new Thermometer('#thermometer', model.temperature(), 200, 4000);

      model.addPropertiesListener(["temperature"], updateTherm);
      therm.resize();
      updateTherm();

      // ------------------------------------------------------------
      // Setup heat and cool buttons
      // ------------------------------------------------------------

      layout.heatCoolButtons("#heat_button", "#cool_button", 0, 3800, model, function (t) { therm.add_value(t); });

      // ------------------------------------------------------------
      // Add listener for coulomb_forces checkbox
      // ------------------------------------------------------------

      // $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));

      model.addPropertiesListener(["coulomb_forces"], updateCoulombCheckbox);
      updateCoulombCheckbox();

      // ------------------------------------------------------------
      //
      // Setup list of views used by layout system
      //
      // ------------------------------------------------------------

      layout.addView('moleculeContainers', molecule_container);
      layout.addView('thermometers', therm);

      layout.setupScreen();

    }

    // ------------------------------------------------------------
    //
    // Model Controller
    //
    // ------------------------------------------------------------

    function updateCoulombCheckbox() {
      $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));
      molecule_container.setup_drawables();
    }

    function updateTherm(){
      therm.add_value(model.get("temperature"));
    }

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

    function setupModel() {
      nodes = model.get_nodes();

      model.resetTime();

      modelStop();
      model.on("tick", model_listener);
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
      updateTherm();
    }

    document.onwebkitfullscreenchange = onresize;
    window.onresize = onresize;

    // ------------------------------------------------------------
    //
    // Reset the model after everything else ...
    //
    // ------------------------------------------------------------

    function finishSetup(firstTime) {
      initializeLocalVariables();
      createModel();
      setupModel();
      if (firstTime) {
        setupViews();
      } else {
        updateLayout();
      }
    }

    if (typeof DEVELOPMENT === 'undefined') {
      try {
        finishSetup(true);
      } catch(e) {
        alert(e);
        throw new Error(e);
      }
    } else {
      finishSetup(true);
    }

    function updateLayout() {
      layout.setupScreen(true);
    }

    function reload(newModelConfig, newPlayerConfig) {
       modelConfig = newModelConfig;
       playerConfig = newPlayerConfig;
       finishSetup(false);
    }

    // epsilon_slider = new SliderComponent('#attraction_slider',
    //   function (v) {
    //     model.set({epsilon: v} );
    //   }, lj_epsilon_max, lj_epsilon_min, epsilon);

    // function updateEpsilon(){
    //   epsilon_slider.set_scaled_value(model.get("epsilon"));
    // }

    // model.addPropertiesListener(["epsilon"], updateEpsilon);
    // updateEpsilon();

    // ------------------------------------------------------------
    //
    // Start if autostart is true
    //
    // ------------------------------------------------------------

    if (autostart) {
      modelGo();
    }
    controller.updateLayout = updateLayout;
    controller.reload = reload;
  }
  controller();
  return controller;
};
