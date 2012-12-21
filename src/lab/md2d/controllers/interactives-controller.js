/*global define model $ ACTUAL_ROOT */

define(function (require) {
  // Dependencies.
  var ModelController         = require('md2d/controllers/model-controller'),
      BarGraphController      = require('md2d/controllers/bar-graph-controller'),
      GraphController         = require('md2d/controllers/graph-controller'),
      DgExportController      = require('md2d/controllers/dg-export-controller'),
      ScriptingAPI            = require('md2d/controllers/scripting-api'),
      ButtonController        = require('md2d/controllers/button-controller'),
      CheckboxController      = require('md2d/controllers/checkbox-controller'),
      RadioController         = require('md2d/controllers/radio-controller'),
      SliderController        = require('md2d/controllers/slider-controller'),
      PulldownController      = require('md2d/controllers/pulldown-controller'),
      NumericOutputController = require('md2d/controllers/numeric-output-controller'),
      ThermometerController   = require('md2d/controllers/thermometer-controller'),
      RealTimeGraph           = require('grapher/core/real-time-graph'),
      layout                  = require('common/layout/layout'),
      setupInteractiveLayout  = require('common/layout/interactive-layout'),
      ParentMessageAPI        = require('md2d/controllers/parent-message-api');

  return function interactivesController(interactive, viewSelector, modelLoadedCallbacks, layoutStyle) {

    modelLoadedCallbacks = modelLoadedCallbacks || [];

    var controller = {},
        modelController,
        $interactiveContainer,
        models = [],
        modelsHash = {},
        propertiesListeners = [],
        playerConfig,
        componentCallbacks = [],
        onLoadScripts = [],
        thermometer,
        energyGraph,
        energyData = [[],[],[]],
        // A generic line graph of some set of properties
        graph,
        // Bar graph controller.
        barGraphController,
        // Handles exporting data to DataGames, if 'exports' are specified
        dgExportController,

        // doesn't currently have any public methods, but probably will.
        parentMessageAPI,

        // API for scripts defined in the interactive JSON file.
        scriptingAPI,

        setupScreenCalledTwice = false;


    function getModel(modelId) {
      if (modelsHash[modelId]) {
        return modelsHash[modelId];
      }
      throw new Error("No model found with id "+modelId);
    }

    /**
      Load the model from the url specified in the 'model' key. 'modelLoaded' is called
      after the model loads.

      @param: modelUrl
    */
    function loadModel(modelId) {
      var model = getModel(modelId);

      controller.currentModel = model;

      if (model.viewOptions) {
        // make a deep copy of model.viewOptions, so we can freely mutate playerConfig
        // without the results being serialized or displayed in the interactives editor.
        playerConfig = $.extend(true, {}, model.viewOptions);
      } else {
        playerConfig = { controlButtons: 'play' };
      }
      playerConfig.fit_to_parent = !layoutStyle;
      playerConfig.interactiveUrl = model.url;

      onLoadScripts = [];
      if (model.onLoad) {
        onLoadScripts.push( scriptingAPI.makeFunctionInScriptContext( getStringFromArray(model.onLoad) ) );
      }

      $.get(ACTUAL_ROOT + model.url).done(function(modelConfig) {

        // Deal with the servers that return the json as text/plain
        modelConfig = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;

        if (modelController) {
          modelController.reload(modelConfig, playerConfig);
        } else {
          modelController = new ModelController('#molecule-container', modelConfig, playerConfig);
          modelLoaded();
          // also be sure to get notified when the underlying model changes
          modelController.on('modelReset', modelLoaded);
          controller.modelController = modelController;
        }
      });
    }

    function createComponent(component) {
      var compController;
      switch (component.type) {
        case 'button':
          compController = new ButtonController(component, scriptingAPI);
          return {
            elem:     compController.getViewContainer(),
            callback: compController.modelLoadedCallback
          };
        case 'checkbox':
          compController = new CheckboxController(component, scriptingAPI);
          return {
            elem:     compController.getViewContainer(),
            callback: compController.modelLoadedCallback
          };
        case 'pulldown':
          compController = new PulldownController(component, scriptingAPI, controller);
          return {
            elem:     compController.getViewContainer(),
            callback: compController.modelLoadedCallback
          };
        case 'radio':
          compController = new RadioController(component, scriptingAPI, controller);
          return {
            elem:     compController.getViewContainer(),
            callback: compController.modelLoadedCallback
          };
        case 'thermometer':
          thermometer = new ThermometerController(component);
          return {
            elem:     thermometer.getViewContainer(),
            callback: thermometer.modelLoadedCallback
          };
        case 'barGraph':
          barGraphController = new BarGraphController(component);
          return {
            elem:     barGraphController.getViewContainer(),
            callback: barGraphController.modelLoadedCallback
          };
        case 'energyGraph':
          return createEnergyGraph(component);
        case 'graph':
          graph = new GraphController(component);
          return {
            elem:     graph.getViewContainer(),
            callback: graph.modelLoadedCallback
          };
        case 'slider':
          compController = new SliderController(component, scriptingAPI);
          return {
            elem:     compController.getViewContainer(),
            callback: compController.modelLoadedCallback
          };
        case 'numericOutput':
          compController = new NumericOutputController(component, scriptingAPI);
          return {
            elem:     compController.getViewContainer(),
            callback: compController.modelLoadedCallback
          };
      }
    }

    /**
      Generic function that accepts either a string or an array of strings,
      and returns the complete string
    */
    function getStringFromArray(str) {
      if (typeof str === 'string') {
        return str;
      }
      return str.join('\n');
    }

    function createEnergyGraph(component) {
      var elem = $('<div>').attr('id', component.id);
      return  {
        elem: elem,
        callback: function() {

          var thisComponent = component,
              $container = $('#' + thisComponent.id),
              options = {
                title:     "Energy of the System (KE:red, PE:green, TE:blue)",
                xlabel:    "Model Time (ps)",
                xmin:      0,
                xmax:     20,
                sample:    modelSampleSizeInPs(),
                ylabel:    "eV",
                ymin:      -5.0,
                ymax:      5.0
              };

          resetEnergyData();

          model.addPropertiesListener(['viewRefreshInterval'], function() {
            options.sample = modelSampleSizeInPs();
            energyGraph.reset('#' + thisComponent.id, options);
          });

          // Create energyGraph only if it hasn't been drawn before:
          if (!energyGraph) {
            $.extend(options, thisComponent.options || []);
            newEnergyGraph(thisComponent.id, options);
          } else {
            options.sample = modelSampleSizeInPs();
            $.extend(options, thisComponent.options || []);
            energyGraph.reset('#' + thisComponent.id, options, $container[0]);
          }

          if (thisComponent.dimensions) {
            energyGraph.resize(thisComponent.dimensions.width, component.dimensions.height);
          }

          // This method is called whenever a model loads (i.e., a new model object is created.)
          // Always request event notifications from the new model object.

          model.on('tick.energyGraph', updateEnergyGraph);

          model.on('play.energyGraph', function() {
            invalidateFollowingEnergyData();
            energyGraph.show_canvas();
          });

          model.on('invalidation.energyGraph', invalidateFollowingEnergyData);

          model.on('reset.energyGraph', function() {
            options.sample = modelSampleSizeInPs();
            resetEnergyData();
            energyGraph.reset('#' + thisComponent.id, options);
            energyGraph.new_data(energyData);
          });

          model.on('stepForward.energyGraph', function() {
            if (model.isNewStep()) {
              updateEnergyGraph();
            } else {
              energyGraph.updateOrRescale(model.stepCounter());
              energyGraph.showMarker(model.stepCounter());
            }
          });

          model.on('stepBack.energyGraph', function() {
            energyGraph.updateOrRescale(model.stepCounter());
            energyGraph.showMarker(model.stepCounter());
          });

          model.on('seek.energyGraph', function() {
            var modelsteps = model.stepCounter();
            if (modelsteps > 0) {
              resetEnergyData(modelsteps);
            } else {
              resetEnergyData();
            }
            energyGraph.new_data(energyData);
          });

        }
      };
    }

    function modelSampleSizeInPs() {
      return model.get("viewRefreshInterval") * model.get("timeStep")/1000;
    }

    function newEnergyGraph(id, options) {
      options = options || {};
      options.dataset = energyData;
      energyGraph = new RealTimeGraph('#' + id, options);
    }

    function invalidateFollowingEnergyData() {
      if (energyGraph.number_of_points() && model.stepCounter() < energyGraph.number_of_points()) {
        resetEnergyData(model.stepCounter());
        energyGraph.new_data(energyData);
      }
    }

    function updateEnergyGraph() {
      energyGraph.add_points(updateEnergyData());
    }

    // Add another sample of model KE, PE, and TE to the arrays in energyData
    function updateEnergyData() {
      var ke = model.get('kineticEnergy'),
          pe = model.get('potentialEnergy'),
          te = ke + pe;
      energyData[0].push(ke);
      energyData[1].push(pe);
      energyData[2].push(te);
      return [ke, pe, te];
    }

    // Reset the energyData arrays to a specific length by passing in an index value,
    // or empty the energyData arrays an initialize the first sample.
    function resetEnergyData(index) {
      var modelsteps = model.stepCounter(),
          i,
          len;

      if (index) {
        for (i = 0, len = energyData.length; i < len; i++) {
          energyData[i].length = modelsteps;
        }
        return index;
      } else {
        energyData = [[0],[0],[0]];
        return 0;
      }
    }

    /**
      Call this after the model loads, to process any queued resize and update events
      that depend on the model's properties, then draw the screen.
    */
    function modelLoaded() {
      var i, listener;

      setupCustomParameters(controller.currentModel.parameters, interactive.parameters);
      setupCustomOutputs("basic", controller.currentModel.outputs, interactive.outputs);
      // Setup filtered outputs after basic outputs and parameters, as filtered output require its input
      // to exist during its definition.
      setupCustomOutputs("filtered", controller.currentModel.filteredOutputs, interactive.filteredOutputs);

      for(i = 0; i < componentCallbacks.length; i++) {
        componentCallbacks[i]();
      }

      // setup messaging with embedding parent window
      parentMessageAPI = new ParentMessageAPI(model);

      layout.addView('moleculeContainers', modelController.moleculeContainer);
      if (thermometer) layout.addView('thermometers', thermometer.getView());
      if (energyGraph) layout.addView('energyGraphs', energyGraph);
      // TODO: energyGraphs should be changed to lineGraphs?
      if (graph) layout.addView('energyGraphs', graph.getView());
      if (barGraphController) layout.addView('barGraphs', barGraphController);

      $(window).unbind('resize');

      if (layoutStyle) {
        // for compatibility with current implementation "embedded" interactive style
        layout.selection = layoutStyle;
        layout.setupScreen();

        // layout.setupScreen modifies the size of the molecule view's containing element based on
        // its current size. The first two times it is called, it sets the container to two different
        // sizes. After that, further calls do not change the size of the container. (For some reason,
        // when the screen resizes, only one call to setupScreen is required.)
        //
        // The following is therefore a dirty hack to pretend layout.setupScreen behaves more nicely.
        if (!setupScreenCalledTwice) {
          layout.setupScreen();
          setupScreenCalledTwice = true;
        }

        $(window).on('resize', layout.setupScreen);
      } else {
        // preferred path...
        setupInteractiveLayout();
        $(window).on('resize', setupInteractiveLayout);
      }

      for(i = 0; i < propertiesListeners.length; i++) {
        listener = propertiesListeners[i];
        model.addPropertiesListener(listener[0], listener[1]);
      }

      for(i = 0; i < onLoadScripts.length; i++) {
        onLoadScripts[i]();
      }

      for(i = 0; i < modelLoadedCallbacks.length; i++) {
        modelLoadedCallbacks[i]();
      }
    }

    /**
      The main method called when this controller is created.

      Populates the element pointed to by viewSelector with divs to contain the
      molecule container (view) and the various components specified in the interactive
      definition, and

      @param newInteractive
        hash representing the interactive specification
      @param viewSelector
        jQuery selector that finds the element to put the interactive view into
    */
    function loadInteractive(newInteractive, viewSelector) {
      var model,
          componentJsons,
          components = {},
          component,
          divContents,
          $row, items,
          div,
          componentId,
          $top, $right, $rightwide, $bottom,
          i, j, ii;

      componentCallbacks = [];
      interactive = newInteractive;
      $interactiveContainer = $(viewSelector);
      if ($interactiveContainer.children().length === 0) {
        $top = $('<div class="interactive-top" id="top"/>');
        $top.append('<div class="interactive-top" id="molecule-container"/>');
        if (interactive.layout && interactive.layout.right !== undefined) {
          $right = $('<div class="interactive-top" id="right"/>');
          $top.append($right);
        }
        if (interactive.layout && interactive.layout.rightwide) {
          $rightwide = $('<div id="rightwide"/>');
          $top.append($rightwide);
        }
        $interactiveContainer.append($top);
        $interactiveContainer.append('<div class="interactive-bottom" id="bottom"/>');
      } else {
        $bottom = $("#bottom");
        $right = $("#right");
        $rightwide = $("#rightwide");
        $bottom.html('');
        if ($right) {
          $right.empty();
        }
        if ($rightwide) {
          $rightwide.empty();
        }
      }

      // set up the list of possible models
      if (interactive.models != null && interactive.models.length > 0) {
        models = interactive.models;
        for (i=0, ii=models.length; i<ii; i++) {
          model = models[i];
          model.id = model.id || "model"+i;
          modelsHash[model.id] = model;
        }
        loadModel(models[0].id);
      }

      componentJsons = interactive.components || [];

      for (i = 0, ii=componentJsons.length; i<ii; i++) {
        component = createComponent(componentJsons[i]);
        // Register component callback if it is available.
        if (component.callback) {
          componentCallbacks.push(component.callback);
        }
        components[componentJsons[i].id] = component;
      }

      // Setup exporter, if any...
      if (interactive.exports) {
        dgExportController = new DgExportController(interactive.exports);
        // componentCallbacks is just a list of callbacks to make when model loads; it should
        // perhaps be renamed.
        componentCallbacks.push(dgExportController.modelLoadedCallback);
      }

      // look at each div defined in layout, and add any components in that
      // array to that div. Then rm the component from components so we can
      // add the remainder to #bottom at the end
      if (interactive.layout) {
        for (div in interactive.layout) {
          if (interactive.layout.hasOwnProperty(div)) {
            divContents = interactive.layout[div];
            if (typeof divContents === "string") {
              // simply add the author-defined html in its entirety
              $('#'+div).html(divContents);
            } else {
              if (Object.prototype.toString.call(divContents[0]) !== "[object Array]") {
                divContents = [divContents];
              }
              for (i = 0; i < divContents.length; i++) {
                items = divContents[i];
                $row = $('<div class="interactive-' + div + '-row"/>');
                $('#'+div).append($row);
                for (j = 0; j < items.length; j++) {
                  componentId = items[j];
                  if (components[componentId]) {
                    $row.append(components[componentId].elem);
                    delete components[componentId];
                  }
                }
              }
            }
          }
        }
      }

      // add the remaining components -- first try to append them to dom elements that
      // may have been defined by the author, and if that fails, add them to #bottom
      if ($('#bottom.row').length === 0) {
        $row = $('<div class="interactive-' + div + '-row"/>');
        $('#bottom').append($row);
      }
      for (componentId in components) {
        if (components.hasOwnProperty(componentId)) {
          if ($('#interactive-container #'+componentId).length > 0) {
            $('#interactive-container #'+componentId).append(components[componentId].elem);
          } else {
            $row.append(components[componentId].elem);
          }
        }
      }

    }

    /**
      After a model loads, this method sets up the custom output properties specified in the "model"
      section of the interactive and in the interactive.

      Any output property definitions in the model section of the interactive specification override
      properties with the same that are specified in the main body if the interactive specification.

      @outputType - accept two values "basic" and "filtered", as this function can be used for processing
        both types of outputs.
    */
    function setupCustomOutputs(outputType, modelOutputs, interactiveOutputs) {
      if (!modelOutputs && !interactiveOutputs) return;

      var outputs = {},
          prop,
          output;

      function processOutputsArray(outputsArray) {
        if (!outputsArray) return;
        for (var i = 0; i < outputsArray.length; i++) {
          outputs[outputsArray[i].name] = outputsArray[i];
        }
      }

      // per-model output definitions override output definitions from interactives
      processOutputsArray(interactiveOutputs);
      processOutputsArray(modelOutputs);

      for (prop in outputs) {
        if (outputs.hasOwnProperty(prop)) {
          output = outputs[prop];
          // DOM elements (and, by analogy, Next Gen MW interactive components like slides)
          // have "ids". But, in English, properties have "names", but not "ids".
          switch (outputType) {
            case "basic":
              model.defineOutput(output.name, {
                label: output.label,
                units: output.units
              }, scriptingAPI.makeFunctionInScriptContext(getStringFromArray(output.value)));
              break;
            case "filtered":
              model.defineFilteredOutput(output.name, {
                label: output.label,
                units: output.units
              }, output.property, output.type, output.period);
              break;
          }
        }
      }
    }

    /**
      After a model loads, this method is used to set up the custom parameters specified in the
      model section of the interactive, or in the toplevel of the interactive
    */
    function setupCustomParameters(modelParameters, interactiveParameters) {
      if (!modelParameters && !interactiveParameters) return;

      var i,
          parameter,
          // append modelParameters second so they're processed later (and override entries of the
          // same name in interactiveParameters)
          parameters = (interactiveParameters || []).concat(modelParameters || []),
          initialValues = {};

      for (i = 0; i < parameters.length; i++) {
        parameter = parameters[i];
        model.defineParameter(parameter.name, {
          label: parameter.label,
          units: parameter.units
        }, scriptingAPI.makeFunctionInScriptContext('value', getStringFromArray(parameter.onChange)));

        if (parameter.initialValue !== undefined) {
          initialValues[parameter.name] = parameter.initialValue;
        }
      }

      model.set(initialValues);
    }

    //
    // Public API.
    //
    controller = {
      getDGExportController: function () {
        return dgExportController;
      },
      getModelController: function () {
        return modelController;
      },
      pushOnLoadScript: function (callback) {
        onLoadScripts.push(callback);
      },
      // Make these private variables and functions available
      loadInteractive: loadInteractive,
      loadModel: loadModel
    };

    //
    // Initialization.
    //
    // Create scripting API.
    scriptingAPI = new ScriptingAPI(controller);
    // Expose API to global namespace (prototyping / testing using the browser console).
    scriptingAPI.exposeScriptingAPI();

    // Run this when controller is created.
    loadInteractive(interactive, viewSelector);

    return controller;
  };
});
