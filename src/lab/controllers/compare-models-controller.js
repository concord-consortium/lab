/*globals

  define
  DEVELOPMENT
  $
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
define(function (require) {
  // Dependencies.
  var Model             = require('models/md2d/modeler'),
      AppletContainer   = require('views/applet-container'),
      MoleculeContainer = require('views/molecule-container'),
      ModelPlayer       = require('cs!components/model_player'),
      Thermometer       = require('cs!components/thermometer'),
      SliderComponent   = require('cs!components/slider'),
      layout            = require('layout/layout');

  return function compareModelsController(molecule_view_id, appletContainerID, modelSelectID, modelConfig, playerConfig) {

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
        radialBonds         = modelConfig.radialBonds,
        obstacles           = modelConfig.obstacles,

        nodes,

        molecule_container,
        modelListener,
        step_counter,
        therm,
        epsilon_slider,
        jsonFullPath, cmlFullPath,
        appletString,
        appletContainer,
        appletOptions = {},
        applet, cmlPath,
        start, stop, reset,
        modelSelect, pathList, hash;

    function controller() {

      // ------------------------------------------------------------
      //
      // Main callback from model process
      //
      // Pass this function to be called by the model on every model step
      //
      // ------------------------------------------------------------

      function modelListener(e) {
        molecule_container.update_drawable_positions();
      }

      // ------------------------------------------------------------
      //
      // Create model and pass in properties
      //
      // ------------------------------------------------------------

      function createModel() {
        model = Model({
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
        molecule_container = MoleculeContainer(molecule_view_id,
          {
            control_buttons:      "",
            modelTimeLabel:       true,
            grid_lines:           true,
            xunits:               true,
            yunits:               true,
            xmax:                 width,
            ymax:                 height,
            get_atoms:            function() { return model.get_atoms(); },
            get_num_atoms:        function() { return model.get_num_atoms(); },
            get_obstacles:        function() { return model.get_obstacles(); },
            get_radial_bonds:     function() { return model.get_radial_bonds(); }
          }
        );

        molecule_container.updateMoleculeRadius();
        molecule_container.setup_drawables();

        // ------------------------------------------------------------
        //
        // Setup Java MW applet
        //
        // ------------------------------------------------------------

        cmlPath = currentCMLPath();
        if (cmlPath) {
          appletOptions = {
            params: [["script", "page:0:import " + "/imports/legacy-mw-content/" + cmlPath]]
          };
        } else {
          appletOptions = {};
        }
        appletContainer = AppletContainer(appletContainerID, appletOptions);

        // ------------------------------------------------------------
        //
        // Setup list of views used by layout system
        //
        // ------------------------------------------------------------

        layout.addView('moleculeContainers', molecule_container);
        layout.addView('appletContainers', appletContainer);

        layout.setupScreen();

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
        nodes = model.get_atoms();

        model.resetTime();

        modelStop();
        model.on("tick", modelListener);
        step_counter = model.stepCounter();
      }

      // ------------------------------------------------------------
      //
      //   Model List Setup
      //
      // ------------------------------------------------------------

      function currentJsonPath() {
        hash = document.location.hash;
        if (hash.length > 0) {
          return hash.substr(1, hash.length);
        } else {
          return false;
        }
      }

      function currentCMLPath() {
        var path = currentJsonPath();
        if (path) {
          return pathList[path.replace("/imports/legacy-mw-content/", "")].cmlPath;
        } else {
          return false;
        }
      }

      modelSelect = document.getElementById(modelSelectID);

      function updateModelSelect() {
        var path = currentJsonPath();
        if (path) {
          modelSelect.value = path.replace("/imports/legacy-mw-content/", "");
        } else {
          modelSelect.value = "two-atoms-two-elements/two-atoms-two-elements$0.json";
        }
      }

      function createPathList() {
        var i, j, item, sectionList, sectionPath;
        pathList = {};
        for(i = 0; i < modelList.length; i++) {
          sectionList = modelList[i];
          sectionPath = sectionList.section;
          for(j = 0; j < sectionList.content.length; j++) {
            item = sectionList.content[j];
            pathList[item.json] = {
              "name": item.name,
              "jsonPath": item.json,
              "cmlPath":  item.cml
            };
          }
        }
      }

      function processModelList() {
        createPathList();
        d3.select(modelSelect).selectAll("optgroup")
            .data(modelList)
          .enter().append("optgroup")
            .attr("label", function(d) { return d.section; })
            .selectAll("option")
                .data(function(d) { return d.content; })
              .enter().append("option")
                .text(function(d) { return d.name; })
                .attr("value", function(d) { return d.json; })
                .attr("data-cml-path", function(d) { return d.cml; });
        updateModelSelect();
      }


      // ------------------------------------------------------------
      //
      //   Java MW Applet Setup
      //
      // ------------------------------------------------------------

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

      function modelSelectHandler() {
        var selection = $(modelSelect).find("option:selected"),
            initialPath = "/imports/legacy-mw-content/",
            jsonPath = selection.attr("value");

        jsonFullPath = initialPath + jsonPath;
        document.location.hash = "#" + jsonFullPath;
      }

      modelSelect.onchange = modelSelectHandler;

      function setupMWApplet() {
        if (currentCMLPath()) {
          appletOptions = { params: [["script", "page:0:import " + currentCMLPath()]] };
          appletContainer = AppletContainer(appletContainerID, appletOptions);
          runMWScript("page:0:set frank false");
          layout.setView('appletContainers', [appletContainer]);
          layout.setupScreen();
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
        processModelList();
        createModel();
        setupModel();
        setupViews();
        updateModelSelect();
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
      controller.runMWScript = runMWScript;
    }

    controller();
    return controller;
  };
});
