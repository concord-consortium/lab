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
controllers.compareModelsController = function(molecule_view_id, appletContainerID, modelConfig, playerConfig) {

  var layoutStyle         = playerConfig.layoutStyle,
      autostart           = playerConfig.autostart,
      maximum_model_steps = playerConfig.maximum_model_steps,
      lj_epsilon_max      = playerConfig.lj_epsilon_max,
      lj_epsilon_min      = playerConfig.lj_epsilon_min,

      elements            = modelConfig.elements,
      atoms_properties    = modelConfig.atoms,
      mol_number          = modelConfig.mol_number,
      temperature_control = modelConfig.temperature_control,
      temperature         = modelConfig.temperature,
      coulomb_forces      = modelConfig.coulomb_forces,
      width               = modelConfig.width,
      height              = modelConfig.height,

      molecule_container,
      modelListener,
      step_counter,
      therm,
      epsilon_slider,
      viewLists,
      appletString,
      appletContainer,
      appletOptions = {},
      applet, cmlPath,
      start, stop, reset,
      modelSelect,
      optsLoaded = $.Deferred();

  function controller() {

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    function modelListener(e) {
      molecule_container.update_molecule_positions();
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
      molecule_container = layout.moleculeContainer(molecule_view_id,
        {
          playback_controller:  false,
          play_only_controller: false,
          model_time_label:     true,
          grid_lines:           true,
          xunits:               true,
          yunits:               true,
          xmax:                 width,
          ymax:                 height
        }
      );

      // ------------------------------------------------------------
      //
      // Setup Java MW applet
      //
      // ------------------------------------------------------------

      cmlPath = extractCmlPath(document.location.hash);
      if (cmlPath) {
        appletOptions = {
          params: [["script", "page:0:import " + cmlPath]]
        };
      } else {
        appletOptions = {};
      }
      appletContainer = layout.appletContainer(appletContainerID, appletOptions);

      // ------------------------------------------------------------
      //
      // Setup list of views used by layout system
      //
      // ------------------------------------------------------------

      viewLists = {
        moleculeContainers:      [molecule_container],
        appletContainers:        [appletContainer]
      };
    }

    // ------------------------------------------------------------
    //
    // Model Controller
    //
    // ------------------------------------------------------------

    function modelStop() {
      model.stop();
    }

    function modelGo() {
      model.on("tick", modelListener);
      model.resume();
    }

    function modelStepBack() {
      model.stop();
      model.stepBack();
    }

    function modelStepForward() {
      model.stop();
      model.stepForward();
    }

    function modelReset() {
      model.stop();
      createModel();
      setupModel();
      modelListener();
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

      modelStop();
      model.on("tick", modelListener);
      molecule_container.updateMoleculeRadius();
      molecule_container.setup_particles();
      layout.setupScreen(viewLists);
      step_counter = model.stepCounter();
    }

    // ------------------------------------------------------------
    //
    //   Java MW Applet Setup
    //
    // ------------------------------------------------------------

    function extractCmlPath(jsonPath) {
      var regex = /#*(.*?)(\$.*|\.json$)/,
          str;
      str = regex.exec(jsonPath)[1];
      if (str) {
        return str.replace("/converted", "") + ".cml";
      } else {
        return false;
      }
    }

    function extractModelselectValue(jsonPath) {
      var regex = /#*\/imports\/legacy-mw-content\/converted\/(.*?)\.json$/,
          str;
      str = regex.exec(jsonPath)[1];
      if (str) {
        return str;
      } else {
        return false;
      }
    }

    function runMWScript(script) {
      return appletContainer.applet.runMwScript(script);
    }

    start = document.getElementById("start");
    start.onclick = function() {
      runMWScript("mw2d:1:run");
      modelGo();
    };

    stop = document.getElementById("stop");
    stop.onclick = function() {
      runMWScript("mw2d:1:stop");
      modelStop();
    };

    reset = document.getElementById("reset");
    reset.onclick = function() {
      runMWScript("mw2d:1:reset");
      modelReset();
    };

    modelSelect = document.getElementById("model-select");

    function modelSelectHandler() {
      var jsonPath = "/imports/legacy-mw-content/converted/" + modelSelect.value + ".json",
          cmlPath = extractCmlPath(jsonPath);
      appletOptions.params = [["script", "page:0:import " + cmlPath]];
      appletContainer = layout.appletContainer(appletContainerID, appletOptions);
      document.location.hash = "#" + jsonPath;
      modelSelect.value = extractModelselectValue(document.location.hash);
      $.get(jsonPath).done(function(results) {
        opts = results;
        optsLoaded.resolve();
      }).fail(function() {
        $('#flash').html('<p class="error-message">Could not load config ' + document.location.hash + '</p>');
        optsLoaded.resolve();
      });
    }

    $.when(optsLoaded).done(function(results) {
      $.extend(modelConfig, opts);
      modelReset();
    });

    modelSelect.onchange = modelSelectHandler;

    function setupMWApplet() {
      modelSelect.value = extractModelselectValue(document.location.hash);
      runMWScript("page:0:set %frank false");
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
    setupMWApplet();

    // ------------------------------------------------------------
    // Setup therm, epsilon_slider & sigma_slider components ... after fluid layout
    // ------------------------------------------------------------
    // 
    // therm = new Thermometer('#thermometer', model.temperature(), 200, 4000);
    // 
    // function updateTherm(){
    //   therm.add_value(model.get("temperature"));
    // }
    // 
    // model.addPropertiesListener(["temperature"], updateTherm);
    // updateTherm();

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
    // Setup heat and cool buttons
    // ------------------------------------------------------------

    // layout.heatCoolButtons("#heat_button", "#cool_button", 0, 3800, model, function (t) { therm.add_value(t); });

    // ------------------------------------------------------------
    // Add listener for coulomb_forces checkbox
    // ------------------------------------------------------------

    // $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));

    // function updateCoulombCheckbox() {
    //   $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));
    //   molecule_container.setup_particles();
    // }
    // 
    // model.addPropertiesListener(["coulomb_forces"], updateCoulombCheckbox);
    // updateCoulombCheckbox();

    // ------------------------------------------------------------
    //
    // Start if autostart is true
    //
    // ------------------------------------------------------------

    // if (autostart) {
    //   modelGo();
    // }
  }
  controller();
  return controller;
};
