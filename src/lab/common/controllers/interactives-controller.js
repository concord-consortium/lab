/*global define, model, $, setTimeout, document, window */

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
      TextController          = require('common/controllers/text-controller'),
      ImageController         = require('common/controllers/image-controller'),
      RadioController         = require('common/controllers/radio-controller'),
      SliderController        = require('common/controllers/slider-controller'),
      PulldownController      = require('common/controllers/pulldown-controller'),
      NumericOutputController = require('common/controllers/numeric-output-controller'),
      ParentMessageAPI        = require('common/controllers/parent-message-api'),
      ThermometerController   = require('common/controllers/thermometer-controller'),
      PlaybackController      = require('common/controllers/playback-controller'),
      DivController           = require('common/controllers/div-controller'),

      // Helper function which just provides banner definition.
      setupBanner             = require('common/controllers/setup-banner'),
      AboutDialog             = require('common/controllers/about-dialog'),
      ShareDialog             = require('common/controllers/share-dialog'),
      CreditsDialog           = require('common/controllers/credits-dialog'),
      SemanticLayout          = require('common/layout/semantic-layout'),
      templates               = require('common/layout/templates'),

      ModelControllerFor = {
        'md2d':             require('md2d/controllers/controller'),
        'solar-system':     require('solar-system/controllers/controller'),
        'signal-generator': require('signal-generator/controller'),
        'sensor':           require('sensor/controller'),
        'energy2d':         require('energy2d/controllers/controller')
      },

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
      //                           which is called when the model is loaded.
      // # resize()              - optional function taking no arguments, a callback
      //                           which is called by the layout algorithm when component's container
      //                           dimensions are changed. This lets component to adjust itself to the
      //                           new container dimensions.
      //
      // Note that each components view container (so, jQuery object returned by getViewContainer() has to
      // have class 'component'! It's required and checked in the runtime by the interactive controller.
      // It ensures good practices while implementing new components.
      // Please see: src/sass/lab/_interactive-component.sass to check what this CSS class defines.
      ComponentConstructor = {
        'text':          TextController,
        'image':         ImageController,
        'button':        ButtonController,
        'checkbox':      CheckboxController,
        'pulldown':      PulldownController,
        'radio':         RadioController,
        'thermometer':   ThermometerController,
        'barGraph':      BarGraphController,
        'graph':         GraphController,
        'slider':        SliderController,
        'numericOutput': NumericOutputController,
        'div':           DivController,
        'playback':      PlaybackController
      };

  return function interactivesController(interactive, viewSelector) {

    var controller = {},
        modelController,
        $interactiveContainer,
        models = [],
        modelsHash = {},
        propertiesListeners = [],
        componentCallbacks = [],
        onLoadScripts = [],
        resizeCallbacks = [],
        modelLoadedCallbacks = [],

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

        // Dialogs which can be shown using banner.
        aboutDialog,
        shareDialog,
        creditsDialog,

        semanticLayout,
        getNextTabIndex;


    // simple tabindex support, also exposed via api.getNextTabIndex()
    getNextTabIndex = (function () {
      var tabIndex = -1;
      return function() {
        return tabIndex++;
      };
    });

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
        if (modelDefinition.url) {
          $.get(labConfig.actualRoot + modelDefinition.url).done(function(modelConfig) {
            // Deal with the servers that return the json as text/plain
            modelConfig = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;
            finishWithLoadedModel(modelDefinition.url, modelConfig);
          }).fail(function() {
            modelConfig = {
              "type": "md2d",
              "width": 2.5,
              "height": 1.5,
              "viewOptions": {
                "backgroundColor": "rgba(245,200,200,255)",
                "showClock": false,
                "textBoxes": [
                  {
                    "text": "Model could not be loaded:",
                    "x": 0.0,
                    "y": 1.0,
                    "width": 2.5,
                    "height": 0.25,
                    "fontScale": 1.4,
                    "layer": 1,
                    "frame": "rectangle",
                    "textAlign": "center",
                    "strokeOpacity": 0,
                    "backgroundColor": "rgb(232,231,231)"
                  },
                  {
                    "text": modelDefinition.url,
                    "x": 0.0,
                    "y": 0.8,
                    "width": 2.5,
                    "height": 0.25,
                    "fontScale": 0.9,
                    "layer": 1,
                    "frame": "rectangle",
                    "textAlign": "center",
                    "strokeOpacity": 0,
                    "backgroundColor": "rgb(232,231,231)"
                  }
                ]
              }
            };
            finishWithLoadedModel(modelDefinition.url, modelConfig);
          });
        } else {
          modelConfig = modelDefinition.model;
          finishWithLoadedModel("", modelConfig);
        }
      }

      function finishWithLoadedModel(modelUrl, modelConfig) {
        if (modelController) {
          modelController.reload(modelUrl, modelConfig, interactiveViewOptions, interactiveModelOptions);
        } else {
          createModelController(modelConfig.type, modelUrl, modelConfig);
          // also be sure to get notified when the underlying model changes
          modelController.on('modelReset', modelLoaded);
          controller.modelController = modelController;
          // Setup model and notify observers that model was loaded.
          modelLoaded(modelConfig);
        }
        // and setup model player keyboard handlers (if enabled)
        setupModelPlayerKeyboardHandler();

        // Setup model in layout.
        semanticLayout.setupModel(modelController);
        // Finally, layout interactive.
        semanticLayout.layoutInteractive();
      }

      function createModelController(type, modelUrl, modelConfig) {
        // set default model type to "md2d"
        var modelType = type || "md2d";

        if (ModelControllerFor[modelType] == null) {
          throw new Error("Couldn't understand modelType '" + modelType + "'!");
        }

        modelController = new ModelControllerFor[modelType](modelUrl, modelConfig, interactiveViewOptions, interactiveModelOptions, controller);

        // Extending universal Interactive scriptingAPI with model-specific scripting API
        if (modelController.ScriptingAPI) {
          scriptingAPI.extend(modelController.ScriptingAPI);
          scriptingAPI.exposeScriptingAPI();
        }
      }
    }

    // ------------------------------------------------------------
    //
    // Handle keyboard shortcuts for model operation.
    //
    // ------------------------------------------------------------

    function setupModelPlayerKeyboardHandler() {
      // Deregister previous keydown handlers. Use namespaces so the code
      // will not inadvertently remove event handlers attached by other code.
      $interactiveContainer.off('keydown.interactiveController');
      if (modelController && modelController.enableKeyboardHandlers()) {
        $interactiveContainer.on('keydown.interactiveController', function(event) {
          var keycode = event.keycode || event.which;
          switch(keycode) {
            case 13:                 // return
            event.preventDefault();
            scriptingAPI.api.start();
            break;

            case 32:                 // space
            event.preventDefault();
            if (!scriptingAPI.api.isStopped()) {
              scriptingAPI.api.stop();
            } else {
              scriptingAPI.api.start();
            }
            break;

            case 37:                 // left-arrow
            event.preventDefault();
            if (!scriptingAPI.api.isStopped()) {
              scriptingAPI.api.stop();
            } else {
              scriptingAPI.api.stepBack();
            }
            break;

            case 39:                 // right-arrow
            event.preventDefault();
            if (!scriptingAPI.api.isStopped()) {
              scriptingAPI.api.stop();
            } else {
              scriptingAPI.api.stepForward();
            }
            break;
          }
        });
        // $interactiveContainer.focus();
      }
    }

    function setupLayout() {
      var template, layout, comp, components, fontScale, banner, resizeAfterFullscreen;

      if (typeof interactive.template === "string") {
        template = templates[interactive.template];
      } else {
        template = interactive.template;
      }

      // The authored definition of which components go in which container.
      layout = interactive.layout;
      // Font scale which affect whole interactive container.
      fontScale = interactive.fontScale;

      // Banner hash containing components, layout containers and layout deinition
      // (components location). Keep it in a separate structure, because we do not
      // expect these objects to be serialized!
      banner = setupBanner(scriptingAPI, interactive, creditsDialog, aboutDialog, shareDialog);
      // Register callbacks of banner components.
      components = banner.components;
      for (comp in components) {
        if (components.hasOwnProperty(comp)) {
          comp = components[comp];
          if (comp.modelLoadedCallback) {
            // $.proxy ensures that callback will be always executed
            // in the context of correct object ('this' binding).
            componentCallbacks.push($.proxy(comp.modelLoadedCallback, comp));
          }
        }
      }
      // Note that all of these operations create a new object.
      // So interactive definition specified by the author won't be affected.
      // This is important for serialization correctness.
      template = banner.template.concat(template);
      layout = $.extend({}, layout, banner.layout);
      components = $.extend({}, componentByID, banner.components);

      // Setup layout using both author components and components
      // created automatically in this controller.
      semanticLayout.initialize(template, layout, components, fontScale);

      // We are rendering in embeddable mode if only element on page
      // so resize when window resizes.
      if (onlyElementOnPage()) {
        $(window).unbind('resize');
        $(window).on('resize', function() {
          controller.resize();
        });
      }

      // in all cases, call resize when entering and existing fullscreen
      resizeAfterFullscreen = function() {
        // need to call twice, as safari requires two attempts before it has
        // the correct dimensions.
        controller.resize();
        setTimeout(controller.resize, 50);
      };
      document.addEventListener("fullscreenchange", resizeAfterFullscreen, false);

      document.addEventListener("mozfullscreenchange", resizeAfterFullscreen, false);

      document.addEventListener("webkitfullscreenchange", resizeAfterFullscreen, false);
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

      if (!comp.getViewContainer().hasClass("component")) {
        throw new Error("Invalid Interactive Component implementation. Each component has to have 'component' class.");
      }

      // Save the new instance.
      componentByID[id] = comp;
      componentList.push(comp);

      // Register component callback if it is available.
      if (comp.modelLoadedCallback) {
        // $.proxy ensures that callback will be always executed
        // in the context of correct object ('this' binding).
        componentCallbacks.push($.proxy(comp.modelLoadedCallback, comp));
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
      var i, listener;

      setupCustomOutputs("basic", controller.currentModel.outputs, interactive.outputs);
      setupCustomParameters(controller.currentModel.parameters, interactive.parameters);
      // Setup filtered outputs after basic outputs and parameters, as filtered output require its input
      // to exist during its definition.
      setupCustomOutputs("filtered", controller.currentModel.filteredOutputs, interactive.filteredOutputs);

      // Call component callbacks *when* the layout is created.
      // Some callbacks require that their views are already attached to the DOM, e.g. (bar graph uses
      //getBBox() which in Firefox works only when element is visible and rendered).
      for(i = 0; i < componentCallbacks.length; i++) {
        componentCallbacks[i]();
      }

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
      var i, len, models, model, components, errMsg;

      function validateArray(modelName, array) {
        var i, len, errMsg;
        // Support undefined / null values - just return.
        if (!array) return;

        try {
          for (i = 0, len = array.length; i < len; i++) {
            array[i] = validator.validateCompleteness(metadata[modelName], array[i]);
          }
        } catch (e) {
          errMsg = "Incorrect " + modelName +  " definition:\n" + e.message;
          alert(errMsg);
          throw new Error(errMsg);
        }
      }

      // Validate top level interactive properties.
      try {
        interactive = validator.validateCompleteness(metadata.interactive, interactive);
      } catch (e) {
        errMsg = "Incorrect interactive definition:\n" + e.message;
        alert(errMsg);
        throw new Error(errMsg);
      }

      validateArray("model", interactive.models);
      validateArray("parameter", interactive.parameters);
      validateArray("output", interactive.outputs);
      validateArray("filteredOutput", interactive.filteredOutputs);

      // Validate also nested strucutres.
      models = interactive.models;
      for (i = 0, len = models.length; i < len; i++) {
        model = models[i];
        validateArray("parameter", model.parameters);
        validateArray("output", model.outputs);
        validateArray("filteredOutput", model.filteredOutputs);
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
      Is the Interactive the only element on the page?

      An Interactive can either be displayed as the only content on a page
      (often in an iframe) or in a dom element on a page with other elements.

      TODO: make more robust
      This function makes a simplifying assumption that the Interactive is the
      only content on the page if the parent of the parent is the <body> element
    */
    function onlyElementOnPage() {
      return $interactiveContainer.parent().parent().prop("nodeName") === "BODY";
    }

    /**
      The main method called when this controller is created.

      Populates the element pointed to by viewSelector with divs to contain the
      molecule container (view) and the various components specified in the interactive
      definition, and

      @param newInteractive
        hash representing the interactive specification
    */
    function loadInteractive(newInteractive) {
      var componentJsons,
          i, len;

      componentCallbacks = [];

      // Validate interactive.
      interactive = validateInteractive(newInteractive);

      // Set up the list of possible models.
      models = interactive.models;
      for (i = 0, len = models.length; i < len; i++) {
        modelsHash[models[i].id] = models[i];
      }

      // Prepare interactive components.
      componentJsons = interactive.components || [];

      // Clear component instances.
      componentList = [];
      componentByID = {};

      for (i = 0, len = componentJsons.length; i < len; i++) {
        createComponent(componentJsons[i]);
      }

      // Setup exporter, if any...
      if (interactive.exports) {
        // Regardless of whether or not we are able to export data to an enclosing container,
        // setup export controller so you can debug exports by typing script.exportData() in the
        // console.
        exportController = new ExportController(interactive.exports);
        componentCallbacks.push(exportController.modelLoadedCallback);

        // If there is an enclosing container we can export data to (e.g., we're iframed into
        // DataGames) then add an "Analyze Data" button the bottom position of the interactive
        if (ExportController.isExportAvailable()) {
          createComponent({
            "type": "button",
            "text": "Analyze Data",
            "id": "-lab-analyze-data",
            "action": "exportData();"
          });
        }
      }

      // When all components are created, we can initialize semantic layout.
      setupLayout();

      // FIXME: I moved this after setupLayout() on the previous line
      // when I added the possiblity of including the model definition in the model
      // section of the Interactive. We were counting on the ajax get operation taking
      // long enough to not occur until after setupLayout() finished.
      //
      // But ... there is a performance issue, it makes sense to start the ajax request
      // for the model definition as soon as the Interactive Controller can.
      //
      // Load first model
      loadModel(models[0].id);
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
                unitType: output.unitType,
                unitName: output.unitName,
                unitPluralName: output.unitPluralName,
                unitAbbreviation: output.unitAbbreviation
              }, scriptingAPI.makeFunctionInScriptContext(getStringFromArray(output.value)));
              break;
            case "filtered":
              model.defineFilteredOutput(output.name, {
                label: output.label,
                unitType: output.unitType,
                unitName: output.unitName,
                unitPluralName: output.unitPluralName,
                unitAbbreviation: output.unitAbbreviation
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
          i, parameter, onChangeFunc;

      // append modelParameters second so they're processed later (and override entries of the
      // same name in interactiveParameters)
      customParameters = (interactiveParameters || []).concat(modelParameters || []);

      for (i = 0; i < customParameters.length; i++) {
        parameter = customParameters[i];
        // onChange callback is optional.
        onChangeFunc = undefined;
        if (parameter.onChange) {
          onChangeFunc = scriptingAPI.makeFunctionInScriptContext('value', getStringFromArray(parameter.onChange));
        }
        // Define parameter using modeler.
        model.defineParameter(parameter.name, {
          label: parameter.label,
          unitType: parameter.unitType,
          unitName: parameter.unitName,
          unitPluralName: parameter.unitPluralName,
          unitAbbreviation: parameter.unitAbbreviation
        }, onChangeFunc);

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

      getNextTabIndex: getNextTabIndex,

      /**
        Notifies interactive controller that the dimensions of its container have changed.
        It triggers the layout algorithm again.
      */
      resize: function () {
        var i;

        semanticLayout.layoutInteractive();
        // TODO: use events!
        for(i = 0; i < resizeCallbacks.length; i++) {
          resizeCallbacks[i]();
        }
      },
      /**
       * Adds an event listener for the specified type.
       * Supported events are: "resize" and "modelLoaded".
       *
       * @param {string} type Event type ("resize" or "modelLoaded").
       * @param  {function|array} callback Callback function or an array of functions.
       */
      on: function (type, callback) {
        if (typeof callback === "function") {
          callback = [callback];
        } else if ($.isArray(callback)) {
          if (callback.some(function (cb) { return typeof cb !== 'function'; })) {
            throw new Error("Invalid callback, must be an array of functions.");
          }
        } else {
          throw new Error("Invalid callback, must be a function or array of functions.");
        }

        switch(type) {
          case "resize":
            resizeCallbacks = resizeCallbacks.concat(callback);
            break;
          case "modelLoaded":
            modelLoadedCallbacks = modelLoadedCallbacks.concat(callback);
            break;
        }
      },

      /**
       * Gets interactive property from interactive JSON definition.
       * @param  {string} name Property name.
       * @return {*}      Property value.
       */
      get: function (name) {
        return interactive[name];
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
          fontScale: interactive.fontScale,
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
        if (typeof interactive.template === "string") {
          result.template = interactive.template;
        } else {
          result.template = $.extend(true, {}, interactive.template);
        }

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
    // Select interactive container.
    // TODO: controller rather should create it itself to follow pattern of other components.
    $interactiveContainer = $(viewSelector);
    // add container to API
    controller.interactiveContainer = $interactiveContainer;
    // Initialize semantic layout.
    semanticLayout = new SemanticLayout($interactiveContainer);
    creditsDialog = new CreditsDialog();
    aboutDialog = new AboutDialog();
    shareDialog = new ShareDialog();
    controller.on("resize", $.proxy(shareDialog.updateIframeSize, shareDialog));
    // Run this when controller is created.
    loadInteractive(interactive, viewSelector);

    return controller;
  };
});
