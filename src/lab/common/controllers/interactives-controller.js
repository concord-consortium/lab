/*global define model $ ACTUAL_ROOT */

define(function (require) {
  // Dependencies.
  var BarGraphController      = require('common/controllers/bar-graph-controller'),
      GraphController         = require('common/controllers/graph-controller'),
      DgExportController      = require('common/controllers/dg-export-controller'),
      ScriptingAPI            = require('common/controllers/scripting-api'),
      ButtonController        = require('common/controllers/button-controller'),
      CheckboxController      = require('common/controllers/checkbox-controller'),
      RadioController         = require('common/controllers/radio-controller'),
      SliderController        = require('common/controllers/slider-controller'),
      PulldownController      = require('common/controllers/pulldown-controller'),
      NumericOutputController = require('common/controllers/numeric-output-controller'),
      ParentMessageAPI        = require('common/controllers/parent-message-api'),
      ThermometerController   = require('common/controllers/thermometer-controller'),

      layout                  = require('common/layout/layout'),
      setupInteractiveLayout  = require('common/layout/interactive-layout'),

      MD2DModelController     = require('md2d/controllers/model-controller'),
      MD2DScriptingAPI        = require('md2d/controllers/scripting-api'),

      // Set of available components.
      // - Key defines 'type', which is used in the interactive JSON.
      // - Value is a constructor function of the given component.
      // Each constructor should assume that it will be called with
      // following arguments:
      // 1. component definition (unmodified object from the interactive JSON),
      // 2. scripting API object,
      // 3. public API of the InteractiveController.
      // Of course, some of them can be passed unnecessarily, but
      // the InteractiveController follows this convention.
      //
      // The instantiated component should provide following interface:
      // # getViewContainer()    - function returning jQuery object containing
      //                           DOM elements of the component.
      // # modelLoadedCallback() - optional function taking no arguments, a callback
      //                           which should be called when the model is loaded.
      ComponentConstructor = {
        'button':        ButtonController,
        'checkbox':      CheckboxController,
        'pulldown':      PulldownController,
        'radio':         RadioController,
        'thermometer':   ThermometerController,
        'barGraph':      BarGraphController,
        'graph':         GraphController,
        'slider':        SliderController,
        'numericOutput': NumericOutputController
      };

  return function interactivesController(interactive, viewSelector, modelLoadedCallbacks, layoutStyle) {

    modelLoadedCallbacks = modelLoadedCallbacks || [];

    var controller = {},
        modelController,
        $interactiveContainer,
        models = [],
        modelsHash = {},
        propertiesListeners = [],
        componentCallbacks = [],
        onLoadScripts = [],

        // Hash of instantiated components.
        // Key   - component type.
        // Value - array of component instances.
        componentInstances = {},

        // API for scripts defined in the interactive JSON file.
        scriptingAPI,

        // additional model-specific scripting api
        modelScriptingAPI,

        // Handles exporting data to DataGames, if 'exports' are specified.
        dgExportController,

        // Doesn't currently have any public methods, but probably will.
        parentMessageAPI,

        setupScreenCalledTwice = false;


    function getModel(modelId) {
      if (modelsHash[modelId]) {
        return modelsHash[modelId];
      }
      throw new Error("No model found with id "+modelId);
    }

    /**
      Load the model from the model definitions hash.
      'modelLoaded' is called after the model loads.

      @param: modelId.
    */
    function loadModel(modelId) {
      var modelDefinition = getModel(modelId),
          interactiveViewOptions,
          interactiveModelOptions;

      controller.currentModel = modelDefinition;

      if (modelDefinition.viewOptions) {
        // Make a deep copy of modelDefinition.viewOptions, so we can freely mutate interactiveViewOptions
        // without the results being serialized or displayed in the interactives editor.
        interactiveViewOptions = $.extend(true, {}, modelDefinition.viewOptions);
      } else {
        interactiveViewOptions = { controlButtons: 'play' };
      }
      interactiveViewOptions.fit_to_parent = !layoutStyle;
      interactiveViewOptions.interactiveUrl = modelDefinition.url;

      onLoadScripts = [];
      if (modelDefinition.onLoad) {
        onLoadScripts.push( scriptingAPI.makeFunctionInScriptContext( getStringFromArray(modelDefinition.onLoad) ) );
      }

      if (modelDefinition.modelOptions) {
        // Make a deep copy of modelDefinition.modelOptions.
        interactiveModelOptions = $.extend(true, {}, modelDefinition.modelOptions);
      }

      $.get(ACTUAL_ROOT + modelDefinition.url).done(function(modelConfig) {

        // Deal with the servers that return the json as text/plain
        modelConfig = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;

        // set default model type to "md2d"
        modelConfig.type = modelConfig.type || "md2d";

        if (modelController) {
          modelController.reload(modelConfig, interactiveViewOptions, interactiveModelOptions);
        } else {
          switch(modelConfig.type) {
            case "md2d":
            modelController = new MD2DModelController('#model-container', modelConfig, interactiveViewOptions, interactiveModelOptions);
            // Extending universal Interactive scriptingAPI with model-specific scripting API
            scriptingAPI.extend(MD2DScriptingAPI);
            scriptingAPI.exposeScriptingAPI();
            break;
            case "a-different-model-type":
            break;
          }

          modelLoaded();
          // also be sure to get notified when the underlying model changes
          modelController.on('modelReset', modelLoaded);
          controller.modelController = modelController;
        }
      });
    }

    function createComponent(component) {
          // Get type of the requested component from JSON definition.
      var type = component.type,
          // Use an appropriate constructor function and create a new instance of the given type.
          // Note that we use constant set of parameters for every type:
          // 1. component definition (exact object from interactive JSON),
          // 2. scripting API object,
          // 3. public API of the InteractiveController.
          comp = new ComponentConstructor[type](component, scriptingAPI, controller);

      // Save the new instance.
      if (componentInstances[type] === undefined) {
        // Create array for instances.
        componentInstances[type] = [];
      }
      componentInstances[type].push(comp);

      // And return it.
      return comp;
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
      parentMessageAPI = new ParentMessageAPI(model, modelController.moleculeContainer);

      layout.addView('moleculeContainers', modelController.moleculeContainer);

      // Note that in the code below we assume that there is only ONE instance of each component.
      // This is not very generic, but the only supported scenario by the current layout system.
      if (componentInstances.thermometer)
        layout.addView('thermometers', componentInstances.thermometer[0].getView());
      if (componentInstances.graph)
        // TODO: energyGraphs should be changed to lineGraphs?
        layout.addView('energyGraphs', componentInstances.graph[0].getView());
      if (componentInstances.barGraph)
        layout.addView('barGraphs', componentInstances.barGraph[0]);

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
        $top.append('<div class="interactive-top" id="model-container"/>');
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
      if (interactive.models !== null && interactive.models.length > 0) {
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
        if (component.modelLoadedCallback) {
          componentCallbacks.push(component.modelLoadedCallback);
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
                    $row.append(components[componentId].getViewContainer());
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
            $('#interactive-container #'+componentId).append(components[componentId].getViewContainer());
          } else {
            $row.append(components[componentId].getViewContainer());
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
    scriptingAPI = new ScriptingAPI(controller, modelScriptingAPI);
    // Expose API to global namespace (prototyping / testing using the browser console).
    scriptingAPI.exposeScriptingAPI();

    // Run this when controller is created.
    loadInteractive(interactive, viewSelector);

    return controller;
  };
});
