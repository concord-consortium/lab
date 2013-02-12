/*global define model $ */

define(function (require) {
  // Dependencies.
  var labConfig               = require('lab.config'),
      arrays                  = require('arrays'),
      alert                   = require('common/alert'),
      metadata                = require('common/controllers/interactive-metadata'),
      validator               = require('common/validator'),
      BarGraphController      = require('common/controllers/bar-graph-controller'),
      GraphController         = require('common/controllers/graph-controller'),
      ExportController        = require('common/controllers/export-controller'),
      ScriptingAPI            = require('common/controllers/scripting-api'),
      ButtonController        = require('common/controllers/button-controller'),
      CheckboxController      = require('common/controllers/checkbox-controller'),
      RadioController         = require('common/controllers/radio-controller'),
      SliderController        = require('common/controllers/slider-controller'),
      PulldownController      = require('common/controllers/pulldown-controller'),
      NumericOutputController = require('common/controllers/numeric-output-controller'),
      ParentMessageAPI        = require('common/controllers/parent-message-api'),
      ThermometerController   = require('common/controllers/thermometer-controller'),

      SemanticLayout          = require('common/layout/semantic-layout'),
      templates               = require('common/layout/templates'),

      MD2DModelController     = require('md2d/controllers/controller'),
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
      // # serialize()           - function returning a JSON object, which represents current state
      //                           of the component. When component doesn't change its state,
      //                           it should just return a copy (!) of the initial component definition.
      // # getViewContainer()    - function returning a jQuery object containing
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
        // Key   - component ID.
        // Value - array of component instances.
        componentByID = {},

        // Simple list of instantiated components.
        componentList = [],

        // List of custom parameters which are used by the interactive.
        customParametersByName = [],

        // API for scripts defined in the interactive JSON file.
        scriptingAPI,

        // additional model-specific scripting api
        modelScriptingAPI,

        // Handles exporting data to DataGames, if 'exports' are specified.
        exportController,

        // Doesn't currently have any public methods, but probably will.
        parentMessageAPI,

        semanticLayout;


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
      @optionalParam modelObject
    */
    function loadModel(modelId, modelConfig) {
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
      interactiveViewOptions.fitToParent = !layoutStyle;

      onLoadScripts = [];
      if (modelDefinition.onLoad) {
        onLoadScripts.push( scriptingAPI.makeFunctionInScriptContext( getStringFromArray(modelDefinition.onLoad) ) );
      }

      if (modelDefinition.modelOptions) {
        // Make a deep copy of modelDefinition.modelOptions.
        interactiveModelOptions = $.extend(true, {}, modelDefinition.modelOptions);
      }

      if (modelConfig) {
        finishWithLoadedModel(modelDefinition.url, modelConfig);
      } else {
        $.get(labConfig.actualRoot + modelDefinition.url).done(function(modelConfig) {

          // Deal with the servers that return the json as text/plain
          modelConfig = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;

          finishWithLoadedModel(modelDefinition.url, modelConfig);
        });
      }

      function finishWithLoadedModel(modelUrl, modelConfig) {
        if (modelController) {
          modelController.reload(modelUrl, modelConfig, interactiveViewOptions, interactiveModelOptions);
        } else {
          createModelController(modelConfig.type, modelUrl, modelConfig);
          modelLoaded(modelConfig);
          // also be sure to get notified when the underlying model changes
          modelController.on('modelReset', modelLoaded);
          controller.modelController = modelController;
        }
      }

      function createModelController(type, modelUrl, modelConfig) {
        // set default model type to "md2d"
        var modelType = type || "md2d";
        switch(modelType) {
          case "md2d":
          modelController = new MD2DModelController('#model-container', modelUrl, modelConfig, interactiveViewOptions, interactiveModelOptions);
          break;
        }
        // Extending universal Interactive scriptingAPI with model-specific scripting API
        if (modelController.ScriptingAPI) {
          scriptingAPI.extend(modelController.ScriptingAPI);
          scriptingAPI.exposeScriptingAPI();
        }
      }
    }

    function createComponent(component) {
          // Get type and ID of the requested component from JSON definition.
      var type = component.type,
          id = component.id,
          comp;

      // Use an appropriate constructor function and create a new instance of the given type.
      // Note that we use constant set of parameters for every type:
      // 1. component definition (exact object from interactive JSON),
      // 2. scripting API object,
      // 3. public API of the InteractiveController.
      comp = new ComponentConstructor[type](component, scriptingAPI, controller);

      // Save the new instance.
      componentByID[id] = comp;
      componentList.push(comp);

      // Register component callback if it is available.
      if (comp.modelLoadedCallback) {
        componentCallbacks.push(comp.modelLoadedCallback);
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

    /**
      Call this after the model loads, to process any queued resize and update events
      that depend on the model's properties, then draw the screen.
    */
    function modelLoaded() {
      var i, listener, template, layout;

      setupCustomParameters(controller.currentModel.parameters, interactive.parameters);
      setupCustomOutputs("basic", controller.currentModel.outputs, interactive.outputs);
      // Setup filtered outputs after basic outputs and parameters, as filtered output require its input
      // to exist during its definition.
      setupCustomOutputs("filtered", controller.currentModel.filteredOutputs, interactive.filteredOutputs);

      for(i = 0; i < componentCallbacks.length; i++) {
        componentCallbacks[i]();
      }

      if (interactive.template) {
        if (typeof interactive.template === "string") {
          template = templates[interactive.template];
        } else {
          template = interactive.template;
        }
      }
      if (!template) {
        template = templates.simple;
      }
      // the authored definition of which components go in which container
      layout = interactive.layout;

      semanticLayout = new SemanticLayout($interactiveContainer, template, layout, componentByID, modelController);
      semanticLayout.layoutInteractive();
      $(window).unbind('resize');
      $(window).on('resize', function() {
        semanticLayout.layoutInteractive();
      });

      // setup messaging with embedding parent window
      parentMessageAPI = new ParentMessageAPI(model, modelController.modelContainer, controller);

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
      Validates interactive definition.

      Displays meaningful info in case of any errors. Also an exception is being thrown.

      @param interactive
        hash representing the interactive specification
    */
    function validateInteractive(interactive) {
      var i, len, models, parameters, outputs, filteredOutputs, components, errMsg;

      // Validate top level interactive properties.
      try {
        interactive = validator.validateCompleteness(metadata.interactive, interactive);
      } catch (e) {
        errMsg = "Incorrect interactive definition:\n" + e.message;
        alert(errMsg);
        throw new Error(errMsg);
      }

      // Set up the list of possible models.
      models = interactive.models;
      try {
        for (i = 0, len = models.length; i < len; i++) {
          models[i] = validator.validateCompleteness(metadata.model, models[i]);
          modelsHash[models[i].id] = models[i];
        }
      } catch (e) {
        errMsg = "Incorrect model definition:\n" + e.message;
        alert(errMsg);
        throw new Error(errMsg);
      }

      parameters = interactive.parameters;
      try {
        for (i = 0, len = parameters.length; i < len; i++) {
          parameters[i] = validator.validateCompleteness(metadata.parameter, parameters[i]);
        }
      } catch (e) {
        errMsg = "Incorrect parameter definition:\n" + e.message;
        alert(errMsg);
        throw new Error(errMsg);
      }

      outputs = interactive.outputs;
      try {
        for (i = 0, len = outputs.length; i < len; i++) {
          outputs[i] = validator.validateCompleteness(metadata.output, outputs[i]);
        }
      } catch (e) {
        errMsg = "Incorrect output definition:\n" + e.message;
        alert(errMsg);
        throw new Error(errMsg);
      }

      filteredOutputs = interactive.filteredOutputs;
      try {
        for (i = 0, len = filteredOutputs.length; i < len; i++) {
          filteredOutputs[i] = validator.validateCompleteness(metadata.filteredOutput, filteredOutputs[i]);
        }
      } catch (e) {
        errMsg = "Incorrect filtered output definition:\n" + e.message;
        alert(errMsg);
        throw new Error(errMsg);
      }

      components = interactive.components;
      try {
        for (i = 0, len = components.length; i < len; i++) {
          components[i] = validator.validateCompleteness(metadata[components[i].type], components[i]);
        }
      } catch (e) {
        errMsg = "Incorrect " + components[i].type + " component definition:\n" + e.message;
        alert(errMsg);
        throw new Error(errMsg);
      }

      // Validate exporter, if any...
      if (interactive.exports) {
        try {
          interactive.exports = validator.validateCompleteness(metadata.exports, interactive.exports);
        } catch (e) {
          errMsg = "Incorrect exports definition:\n" + e.message;
          alert(errMsg);
          throw new Error(errMsg);
        }
      }

      return interactive;
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
      var componentJsons,
          $exportButton,
          i, len;

      componentCallbacks = [];

      // Validate interactive.
      interactive = validateInteractive(newInteractive);

      if (viewSelector) {
        $interactiveContainer = $(viewSelector);
      }

      // Set up the list of possible models.
      models = interactive.models;
      for (i = 0, len = models.length; i < len; i++) {
        modelsHash[models[i].id] = models[i];
      }

      // Load first model.
      loadModel(models[0].id);

      // Prepare interactive components.
      componentJsons = interactive.components || [];

      // Create container for model.
      $interactiveContainer.append('<div id="model-container" class="container">');

      // Clear component instances.
      componentList = [];
      componentByID = {};

      for (i = 0, len = componentJsons.length; i < len; i++) {
        createComponent(componentJsons[i]);
      }

      // Setup exporter, if any...
      if (interactive.exports) {
        exportController = new ExportController(interactive.exports);
        componentCallbacks.push(exportController.modelLoadedCallback);

        if (ExportController.isExportAvailable()) {
          $exportButton = $("<button>")
                            .attr('id', 'export-data')
                            .addClass('component')
                            .html("Analyze Data")
                            .on('click', function() { exportController.exportData(); })
                            .appendTo($('#bottom'));
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

      var initialValues = {},
          customParameters,
          i, parameter;

      // append modelParameters second so they're processed later (and override entries of the
      // same name in interactiveParameters)
      customParameters = (interactiveParameters || []).concat(modelParameters || []);

      for (i = 0; i < customParameters.length; i++) {
        parameter = customParameters[i];
        model.defineParameter(parameter.name, {
          label: parameter.label,
          units: parameter.units
        }, scriptingAPI.makeFunctionInScriptContext('value', getStringFromArray(parameter.onChange)));

        if (parameter.initialValue !== undefined) {
          initialValues[parameter.name] = parameter.initialValue;
        }
        // Save reference to the definition which is finally used.
        // Note that if parameter is defined both in interactive top-level scope
        // and models section, one from model sections will be defined in this hash.
        // It's necessary to update correctly values of parameters during serialization.
        customParametersByName[parameter.name] = parameter;
      }

      model.set(initialValues);
    }

    //
    // Public API.
    //
    controller = {
      getDGExportController: function () {
        return exportController;
      },
      getModelController: function () {
        return modelController;
      },
      pushOnLoadScript: function (callback) {
        onLoadScripts.push(callback);
      },
      /**
        Serializes interactive, returns object ready to be stringified.
        e.g. JSON.stringify(interactiveController.serialize());
      */
      serialize: function () {
        var result, i, len, param, val;

        // This is the tricky part.
        // Basically, parameters can be defined in two places - in model definition object or just as a top-level
        // property of the interactive definition. 'customParameters' list contains references to all parameters
        // currently used by the interactive, no matter where they were specified. So, it's enough to process
        // and update only these parameters. Because of that, later we can easily serialize interactive definition
        // with updated values and avoid deciding whether this parameter is defined in 'models' section
        // or top-level 'parameters' section. It will be updated anyway.
        if (model !== undefined && model.get !== undefined) {
          for (param in customParametersByName) {
            if (customParametersByName.hasOwnProperty(param)) {
              param = customParametersByName[param];
              val = model.get(param.name);
              if (val !== undefined) {
                param.initialValue = val;
              }
            }
          }
        }

        // Copy basic properties from the initial definition, as they are immutable.
        result = {
          title: interactive.title,
          publicationStatus: interactive.publicationStatus,
          subtitle: interactive.subtitle,
          about: arrays.isArray(interactive.about) ? $.extend(true, [], interactive.about) : interactive.about,
          // Node that models section can also contain custom parameters definition. However, their initial values
          // should be already updated (take a look at the beginning of this function), so we can just serialize whole array.
          models: $.extend(true, [], interactive.models),
          // All used parameters are already updated, they contain currently used values.
          parameters: $.extend(true, [], interactive.parameters),
          // Outputs are directly bound to the model, we can copy their initial definitions.
          outputs: $.extend(true, [], interactive.outputs),
          filteredOutputs: $.extend(true, [], interactive.filteredOutputs)
        };

        // Serialize components.
        result.components = [];
        for (i = 0, len = componentList.length; i < len; i++) {
          if (componentList[i].serialize) {
            result.components.push(componentList[i].serialize());
          }
        }

        // Copy layout from the initial definition, as it is immutable.
        result.layout = $.extend(true, {}, interactive.layout);

        return result;
      },
      // Make these private variables and functions available
      loadInteractive: loadInteractive,
      validateInteractive: validateInteractive,
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
