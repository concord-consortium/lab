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
  var Model             = require('md2d/models/modeler'),
      AppletContainer   = require('md2d/views/applet-container'),
      MoleculeContainer = require('md2d/views/molecule-container'),
      ModelPlayer       = require('cs!common/components/model_player'),
      Thermometer       = require('cs!common/components/thermometer'),
      SliderComponent   = require('cs!common/components/slider'),
      layout            = require('common/layout/layout');

  return function compareModelsController(moleculeViewId, appletContainerID, modelSelectID, modelConfig, playerConfig) {

    var layoutStyle         = playerConfig.layoutStyle,
        autostart           = playerConfig.autostart,
        maximum_model_steps = playerConfig.maximum_model_steps,
        lj_epsilon_max      = playerConfig.lj_epsilon_max,
        lj_epsilon_min      = playerConfig.lj_epsilon_min,

        elements            = modelConfig.elements,
        atoms               = modelConfig.atoms,
        mol_number          = modelConfig.mol_number,
        lennardJonesForces  = modelConfig.lennardJonesForces,
        coulombForces       = modelConfig.coulombForces,
        temperatureControl = modelConfig.temperatureControl,
        targetTemperature   = modelConfig.targetTemperature,
        width               = modelConfig.width,
        height              = modelConfig.height,
        keShading           = modelConfig.keShading,
        chargeShading       = modelConfig.chargeShading,
        showVDWLines        = modelConfig.showVDWLines,
        showClock           = modelConfig.showClock,
        viewRefreshInterval = modelConfig.viewRefreshInterval,
        timeStep            = modelConfig.timeStep,
        radialBonds         = modelConfig.radialBonds,
        angularBonds        = modelConfig.angularBonds,
        restraints          = modelConfig.restraints,
        obstacles           = modelConfig.obstacles,
        viscosity           = modelConfig.viscosity,
        gravitationalField  = modelConfig.gravitationalField,
        images              = modelConfig.images,
        textBoxes           = modelConfig.textBoxes,

        nodes,

        moleculeContainer,
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
        moleculeContainer.update_drawable_positions();
      }

      // ------------------------------------------------------------
      //
      // Initialize (or update) local variables based on playerConfig and modelConfig objects
      //
      // ------------------------------------------------------------

      function initializeLocalVariables() {
        controlButtons      = playerConfig.controlButtons;
        modelTimeLabel      = playerConfig.modelTimeLabel;
        enableAtomTooltips  = playerConfig.enableAtomTooltips || false;
        fit_to_parent       = playerConfig.fit_to_parent;
        interactiveUrl      = playerConfig.interactiveUrl;

        elements            = modelConfig.elements;
        atoms               = modelConfig.atoms;
        mol_number          = modelConfig.mol_number;
        lennardJonesForces  = modelConfig.lennardJonesForces;
        coulombForces       = modelConfig.coulombForces;
        temperatureControl  = modelConfig.temperatureControl;
        targetTemperature   = modelConfig.targetTemperature;
        width               = modelConfig.width;
        height              = modelConfig.height;
        keShading           = modelConfig.keShading;
        chargeShading       = modelConfig.chargeShading;
        showVDWLines        = modelConfig.showVDWLines;
        VDWLinesCutoff      = modelConfig.VDWLinesCutoff;
        showClock           = modelConfig.showClock;
        viewRefreshInterval = modelConfig.viewRefreshInterval;
        timeStep            = modelConfig.timeStep;
        radialBonds         = modelConfig.radialBonds;
        angularBonds        = modelConfig.angularBonds;
        restraints          = modelConfig.restraints;
        obstacles           = modelConfig.obstacles;
        viscosity           = modelConfig.viscosity;
        gravitationalField  = modelConfig.gravitationalField;
        images              = modelConfig.images;
        textBoxes           = modelConfig.textBoxes;
      }

      // ------------------------------------------------------------
      //
      // Create model and pass in properties
      //
      // ------------------------------------------------------------

      function createModel() {
        initializeLocalVariables();
        model = Model({
          elements            : elements,
          targetTemperature   : targetTemperature,
          lennardJonesForces  : lennardJonesForces,
          coulombForces       : coulombForces,
          temperatureControl  : temperatureControl,
          width               : width,
          height              : height,
          keShading           : keShading,
          chargeShading       : chargeShading,
          showVDWLines        : showVDWLines,
          VDWLinesCutoff      : VDWLinesCutoff,
          showClock           : showClock,
          viewRefreshInterval : viewRefreshInterval,
          timeStep            : timeStep,
          viscosity           : viscosity,
          gravitationalField  : gravitationalField,
          images              : images,
          atoms               : atoms,
          mol_number          : mol_number,
          relax               : !!mol_number,
          radialBonds         : radialBonds,
          angularBonds        : angularBonds,
          restraints          : restraints,
          createVdwPairs      : showVDWLines,
          obstacles           : obstacles
        });
      }

      /**
        Returns a customized interface to the model for use by the view
      */
      function getModelInterface() {
        return {
          model:                   model,
          fit_to_parent:           fit_to_parent,
          xmax:                    width,
          ymax:                    height,
          keShading:               keShading,
          chargeShading:           chargeShading,
          enableAtomTooltips:      enableAtomTooltips,
          images:                  images,
          interactiveUrl:          interactiveUrl,
          textBoxes:               textBoxes,
          get_results:             function() { return model.get_results(); },
          get_radial_bond_results: function() { return model.get_radial_bond_results(); },
          get_radial_bonds:        function() { return model.get_radial_bonds(); },
          get_obstacles:           function() { return model.get_obstacles(); },
          get_vdw_pairs:           function() { return model.get_vdw_pairs(); },
          set_atom_properties:     function() { return model.setAtomProperties.apply(model, arguments);  },
          is_stopped:              function() { return model.is_stopped(); },

          controlButtons:      controlButtons,
          modelTimeLabel:      modelTimeLabel
        };
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

        moleculeContainer = MoleculeContainer(moleculeViewId, getModelInterface());

        moleculeContainer.updateMoleculeRadius();
        moleculeContainer.setup_drawables();

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

        layout.addView('moleculeContainers', moleculeContainer);
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
