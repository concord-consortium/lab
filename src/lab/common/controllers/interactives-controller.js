/*global define, $, setTimeout, document, window */

define(function (require) {
  // Dependencies.
  var labConfig               = require('lab.config'),
      arrays                  = require('arrays'),
      alert                   = require('common/alert'),
      metadata                = require('common/controllers/interactive-metadata'),
      validator               = require('common/validator'),
      interactiveNotFound     = require('common/interactive-not-found'),
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
      TableController         = require('common/controllers/table-controller'),
      ParentMessageAPI        = require('common/controllers/parent-message-api'),
      ThermometerController   = require('common/controllers/thermometer-controller'),
      PlaybackController      = require('common/controllers/playback-controller'),
      DivController           = require('common/controllers/div-controller'),
      DispatchSupport         = require('common/dispatch-support'),
      HelpSystem              = require('common/controllers/help-system'),
      tooltip                 = require('common/views/tooltip'),
      cookies                 = require('common/cookies'),

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
        'iframe-model':     require('iframe-model/controller'),
        'sensor':           require('sensor/controller'),
        'energy2d':         require('energy2d/controllers/controller')
      },

      ExperimentController = require('common/controllers/experiment-controller'),

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
      // # modelLoadedCallback(model) - optional function with , a callback which is called when the model is loaded.
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
        'table':         TableController,
        'div':           DivController,
        'playback':      PlaybackController
      };

  return function InteractivesController(interactiveReference, viewSelector) {

    var interactive = {},
        controller = {},
        experimentController,
        experimentDefinition,
        modelController,
        model,
        modelId,
        $interactiveContainer,
        helpSystem,
        modelDefinitions = [],
        modelHash = {},
        componentModelLoadedCallbacks = [],
        onLoadScripts = [],
        resizeCallbacks = [],
        modelLoadedCallbacks = [],
        modelResetCallbacks = [],
        willResetModelCallbacks = [],
        ignoreModelResetEvent = false,
        isModelLoaded = false,
        interactiveRenderedCallbacks = [],
        isInteractiveRendered = false,

        // Hash of instantiated components.
        // Key   - component ID.
        // Value - array of component instances.
        componentByID = {},

        // Simple list of instantiated components.
        componentList = [],

        // List of custom parameters which are used by the interactive.
        customParametersByName = [],

        // API for scripts defined in the interactive JSON file.
        // and additional model-specific scripting api if one is defined
        scriptingAPI,

        // Handles exporting data to DataGames, if 'exports' are specified.
        exportController,

        // Doesn't currently have any public methods, but probably will.
        parentMessageAPI,

        // Dialogs which can be shown using banner.
        aboutDialog,
        shareDialog,
        creditsDialog,

        semanticLayout,
        getNextTabIndex,

        // This is not the complete list of events, as we have custom hacks to maintain lists of
        // event listeners.
        dispatch = new DispatchSupport('layoutUpdated');

    // simple tabindex support, also exposed via api.getNextTabIndex()
    getNextTabIndex = function () {
      var tabIndex = -1;
      return function() {
        return tabIndex++;
      };
    };

    function getModelDefinition(id) {
      modelId = id;
      if (modelHash[modelId]) {
        return modelHash[modelId];
      }
      throw new Error("No model found with id "+modelId);
    }

    function layoutInteractive() {
      // Do nothing if this is called before the model loads (for example via a resize event).
      // The interactive will be laid out as soon as the model loads anyway, and furthermore the
      // semantic layout mechanism calls at least one modelController method.
      if (!semanticLayout.isReady()) {
        return;
      }
      semanticLayout.layoutInteractive();
      dispatch.layoutUpdated();
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
      var template, layout, comp, components, banner, resizeAfterFullscreen;

      if (typeof interactive.template === "string") {
        template = templates[interactive.template];
      } else {
        template = interactive.template;
      }

      // The authored definition of which components go in which container.
      layout = interactive.layout;

      // Banner hash containing components, layout containers and layout deinition
      // (components location). Keep it in a separate structure, because we do not
      // expect these objects to be serialized!
      banner = setupBanner(controller, interactive, model, creditsDialog, aboutDialog, shareDialog);
      // Register callbacks of banner components.
      components = banner.components;
      for (comp in components) {
        if (components.hasOwnProperty(comp)) {
          comp = components[comp];
          if (comp.modelLoadedCallback) {
            // $.proxy ensures that callback will be always executed
            // in the context of correct object ('this' binding).
            componentModelLoadedCallbacks.push($.proxy(comp.modelLoadedCallback, comp));
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
      semanticLayout.initialize(template, layout, components,
                                interactive.aspectRatio, interactive.fontScale);

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
      comp = new ComponentConstructor[type](component, controller);

      if (!comp.getViewContainer().hasClass("component")) {
        throw new Error("Invalid Interactive Component implementation. Each component has to have 'component' class.");
      }

      // Save the new instance.
      componentByID[id] = comp;
      componentList.push(comp);

      // Register component modelLoaded callbacks if available.
      // FIXME. These callbacks should be event listeners.
      if (comp.modelLoadedCallback) {
        // $.proxy ensures that callback will be always executed
        // in the context of correct object ('this' binding).
        componentModelLoadedCallbacks.push($.proxy(comp.modelLoadedCallback, comp));
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
      Call this after the Interactive renders to process any callbacks.
    */
    function interactiveRendered() {
      var i;
      for(i = 0; i < interactiveRenderedCallbacks.length; i++) {
        interactiveRenderedCallbacks[i]();
      }
      isInteractiveRendered = true;
    }

    /**
      Validates interactive definition.

      Displays meaningful info in case of any errors. Also an exception is being thrown.

      @param interactive
        hash representing the interactive specification
    */
    function validateInteractive(interactive) {
      var i, len, modelDefinitions, modelDefinition, components, errMsg;

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
      validateArray("helpTip", interactive.helpTips);

      // Validate also nested structures.
      modelDefinitions = interactive.models;
      for (i = 0, len = modelDefinitions.length; i < len; i++) {
        modelDefinition = modelDefinitions[i];
        validateArray("parameter", modelDefinition.parameters);
        validateArray("output", modelDefinition.outputs);
        validateArray("filteredOutput", modelDefinition.filteredOutputs);
      }


      // If an experiment template exists validate nested experiment structures.
      if (interactive.experiment) {
        experimentDefinition = interactive.experiment;
        validator.validateCompleteness(metadata.experimentTimeSeries, experimentDefinition.timeSeries);
        validateArray("experimentParameter", experimentDefinition.parameters);
        validateArray("experimentDestination", experimentDefinition.destinations);
        validateArray("experimentSavedRun", experimentDefinition.savedRuns);
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

    function createScriptingAPI() {
      // Only create scripting API after model is loaded.
      scriptingAPI = new ScriptingAPI(controller);
      // Expose API to global namespace (prototyping / testing using the browser console).
      scriptingAPI.exposeScriptingAPI();

      // Extend universal Interactive scriptingAPI with optional model-specific scripting API
      if (modelController.ScriptingAPI) {
        scriptingAPI.extend(modelController.ScriptingAPI);
        scriptingAPI.exposeScriptingAPI();
      }
    }

    /**
      The main method called when this controller is created.

      Populates the element pointed to by viewSelector with divs to contain the
      molecule container (view) and the various components specified in the interactive
      definition, and

      @param newInteractive
        hash representing the interactive specification or string representing path or full url
    */
    function loadInteractive(newInteractive) {
      isModelLoaded = false;
      isInteractiveRendered = false;
      function nextStep() {
        // Validate interactive.
        controller.interactive = validateInteractive(controller.interactive);
        interactive = controller.interactive;

        // Set up the list of possible modelDefinitions.
        modelDefinitions = interactive.models;
        for (var i = 0, len = modelDefinitions.length; i < len; i++) {
          modelHash[modelDefinitions[i].id] = modelDefinitions[i];
        }
        loadModelFirstBeforeCompletingInteractive();
      }
      if (typeof newInteractive === "string") {
        $.get(newInteractive).done(function(results) {
          if (typeof results === 'string') results = JSON.parse(results);
          controller.interactive = results;
          nextStep();
        })
        .fail(function() {
          document.title = "Interactive not found";
          controller.interactive = interactiveNotFound(newInteractive);
          nextStep();
        });
      } else {
        // we were passed an interactive object
        controller.interactive = newInteractive;
        nextStep();
      }
    }

    function loadModelFirstBeforeCompletingInteractive() {
      // There is a performance issue, it makes sense to start the ajax request
      // for the model definition as soon as the Interactive Controller can.
      //
      // Load first model in modelDefinitions array
      if (modelDefinitions && modelDefinitions.length > 0) {
        loadModel(modelDefinitions[0].id);
      } else {
        // Setup proxy modelController object with a 0x0 px view for semantic layout system
        modelController = {
          getViewContainer: function() {
            var $el = $("<div>")
              .attr({
                "id": "model-container",
                "class": "container",
                "tabindex": getNextTabIndex
              })
              // Set initial dimensions.
              .css({
                "width": "0px",
                "height": "0px"
              });
            return $el;
          },
          getHeightForWidth: function() { return 0; },
          resize: function() {},
          model: {
            on: function() {},
            isStopped: function() {},
            set: function() {},
            get: function() {},
            addObserver: function() {},
            properties: {}
          },
          modelSetupComplete: function() {},
          initializeView: function() {}
        };
        model = modelController.model;

        // setup fake model definition
        controller.currentModel = {};
        createScriptingAPI();
        finishLoadingInteractive();
      }
    }

    /**
      Load the model from the model definitions hash.

      @param: modelId.
      @optionalParam modelObject
    */
    function loadModel(id, modelConfig) {
      var modelDefinition = getModelDefinition(id),
          interactiveViewOptions,
          interactiveModelOptions;

      modelId = id;
      isModelLoaded = false;
      controller.currentModel = modelDefinition;

      if (modelDefinition.viewOptions) {
        // Make a deep copy of modelDefinition.viewOptions, so we can freely mutate interactiveViewOptions
        // without the results being serialized or displayed in the interactives editor.
        interactiveViewOptions = $.extend(true, {}, modelDefinition.viewOptions);
      } else {
        interactiveViewOptions = { controlButtons: 'play' };
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

      function processOptions(modelConfig, interactiveModelConfig, interactiveViewConfig) {
        var modelOptions,
            viewOptions;

        function meldOptions (base, overlay) {
          var p;
          for(p in base) {
            if (overlay[p] === undefined) {
              if (arrays.isArray(base[p])) {
                // Array.
                overlay[p] = $.extend(true, [], base[p]);
              } else if (typeof base[p] === "object") {
                // Object.
                overlay[p] = $.extend(true, {}, base[p]);
              } else {
                // Basic type.
                overlay[p] = base[p];
              }
            } else if (typeof overlay[p] === "object" && !(overlay[p] instanceof Array)) {
              overlay[p] = meldOptions(base[p], overlay[p]);
            } else if (overlay[p] instanceof Array && base[p] instanceof Array) {
              overlay[p] = $.extend(true, base[p], overlay[p]);
            }
          }
          return overlay;
        }

        // 1. Process view options.
        // Do not modify initial configuration.
        viewOptions = $.extend(true, {}, interactiveViewConfig);
        // Merge view options defined in interactive (interactiveViewConfig)
        // with view options defined in the basic model description.
        viewOptions = meldOptions(modelConfig.viewOptions || {}, viewOptions);

        // 2. Process model options.
        // Do not modify initial configuration.
        modelOptions = $.extend(true, {}, interactiveModelConfig);
        // Merge model options defined in interactive (interactiveModelConfig)
        // with the basic model description.
        modelOptions = meldOptions(modelConfig || {}, modelOptions);

        // Update view options in the basic model description after merge.
        // Note that many unnecessary options can be passed to Model constructor
        // because of that (e.g. view-only options defined in the interactive).
        // However, all options which are unknown for Model will be discarded
        // during options validation, so this is not a problem
        // (but significantly simplifies configuration).
        modelOptions.viewOptions = viewOptions;

        return modelOptions;
      }

      function finishWithLoadedModel(modelUrl, modelConfig) {
        var modelOptions = processOptions(modelConfig, interactiveModelOptions, interactiveViewOptions);

        if (modelController) {
          modelController.reload(modelUrl, modelOptions, true);
        } else {
          modelController = createModelController(modelConfig.type, modelUrl, modelOptions);
          // also be sure to get notified when the underlying model changes
          // (this catches reloads)
          modelController.on('modelLoaded', modelLoadedHandler);
          modelController.on('modelReset', modelResetHandler);
        }

        setupModelPlayerKeyboardHandler();


        finishLoadingInteractive();
      }

      function createModelController(type, modelUrl, modelOptions) {
        // set default model type to "md2d"
        var modelType = type || "md2d";
        var modelController;

        if (ModelControllerFor[modelType] === null) {
          throw new Error("Couldn't understand modelType '" + modelType + "'!");
        }

        modelController = new ModelControllerFor[modelType](modelUrl, modelOptions, controller);

        return modelController;
      }
    }

    function finishLoadingInteractive() {
      var componentJsons,
          i, len;

      componentModelLoadedCallbacks = [];

      // Prepare interactive components.
      componentJsons = interactive.components || [];

      // Clear component instances.
      componentList = [];
      componentByID = {};

      // Setup model and notify observers that model was loaded.
      // modelLoadedHandler(ModelController.LOAD_CAUSE.INITIAL_LOAD);

      model = modelController.model;

      createScriptingAPI();
      initializeModelOutputsAndParameters();

      onLoadScripts = [];
      if (controller.currentModel.onLoad) {
        onLoadScripts.push( scriptingAPI.makeFunctionInScriptContext( getStringFromArray(controller.currentModel.onLoad) ) );
      }

      for (i = 0, len = componentJsons.length; i < len; i++) {
        createComponent(componentJsons[i]);
      }

      // Setup exporter, if any...
      if (interactive.exports) {
        // Regardless of whether or not we are able to export data to an enclosing container,
        // setup export controller so you can debug exports by typing script.exportData() in the
        // console.
        exportController = new ExportController(interactive.exports, controller, model);
        componentModelLoadedCallbacks.push(exportController.modelLoadedCallback);

        // If there is an enclosing container we can export data to (e.g., we're iframed into
        // DataGames) then add an "Analyze Data" button the bottom position of the interactive
        if (ExportController.canExportData() && !interactive.hideExportDataControl) {
          createComponent({
            "type": "button",
            "text": "Analyze Data",
            "id": "-lab-analyze-data",
            "action": "exportData();"
          });
        }
      }

      // Setup help system if help tips are defined.
      if (interactive.helpTips.length > 0) {
        helpSystem = new HelpSystem(interactive.helpTips, $interactiveContainer);
        controller.on("interactiveRendered", function () {
          function hashCode(string) {
            var hash = 0, len = string.length, i, c;
            if (len === 0) return hash;
            for (i = 0; i < len; i++) {
              c = string.charCodeAt(i);
              hash = ((hash<<5) - hash) + c;
              hash = hash & hash;
            }
            return hash;
          }
          var hash = hashCode(JSON.stringify(interactive));
          // When displayOnLoad is set to true, the help mode will be automatically shown,
          // but only when user opens interactive for the first time.
          if (interactive.helpOnLoad && !cookies.hasItem("lab-help-" + hash)) {
            helpSystem.start();
            cookies.setItem("lab-help-" + hash, true);
          }
        });
      }

      // When all components are created, we can initialize semantic layout.
      setupLayout();

      // This will attach model container to DOM.
      semanticLayout.setupModel(modelController);

      // Call component callbacks *when* the layout is created.
      // Some callbacks require that their views are already attached to the DOM, e.g. (bar graph uses
      //getBBox() which in Firefox works only when element is visible and rendered).
      for(i = 0; i < componentModelLoadedCallbacks.length; i++) {
        componentModelLoadedCallbacks[i](model, scriptingAPI);
      }

      // setup messaging with embedding parent window
      parentMessageAPI = new ParentMessageAPI(model, modelController.modelContainer, controller);

      for(i = 0; i < onLoadScripts.length; i++) {
        onLoadScripts[i]();
      }

      // Setup experimentController, if defined...
      if (interactive.experiment) {
        experimentController = new ExperimentController(interactive.experiment, controller, onLoadScripts);
        modelLoadedCallbacks.push(experimentController.modelLoadedCallback);
      }

      modelController.modelSetupComplete();

      for(i = 0; i < modelLoadedCallbacks.length; i++) {
        modelLoadedCallbacks[i](model);
      }

      isModelLoaded = true;

      // Replace native tooltips with custom, styled and responsive tooltips.
      tooltip($interactiveContainer);

      layoutInteractive();

      modelController.initializeView();

      // notify observers that interactive is rendered.
      interactiveRendered();

    }

    function initializeModelOutputsAndParameters() {
      setupCustomOutputs("basic", controller.currentModel.outputs, interactive.outputs);
      setupCustomParameters(controller.currentModel.parameters, interactive.parameters);
      // Setup filtered outputs after basic outputs and parameters, as filtered output require its input
      // to exist during its definition.
      setupCustomOutputs("filtered", controller.currentModel.filteredOutputs, interactive.filteredOutputs);
    }

    /**
      Call this after the model loads, to process any queued resize and update events
      that depend on the model's properties, then draw the screen.
    */
    function modelLoadedHandler(cause) {
      var i;

      model = modelController.model;
      createScriptingAPI();

      initializeModelOutputsAndParameters();

      modelController.modelSetupComplete();
      modelController.initializeView();

      onLoadScripts = [];
      if (controller.currentModel.onLoad) {
        onLoadScripts.push( scriptingAPI.makeFunctionInScriptContext( getStringFromArray(controller.currentModel.onLoad) ) );
      }

      // Call component callbacks *when* the layout is created.
      // Some callbacks require that their views are already attached to the DOM, e.g. (bar graph uses
      //getBBox() which in Firefox works only when element is visible and rendered).
      for(i = 0; i < componentModelLoadedCallbacks.length; i++) {
        componentModelLoadedCallbacks[i](model, scriptingAPI);
      }

      // setup messaging with embedding parent window
      parentMessageAPI = new ParentMessageAPI(model, modelController.modelContainer, controller);

      for(i = 0; i < onLoadScripts.length; i++) {
        onLoadScripts[i]();
      }

      for(i = 0; i < modelLoadedCallbacks.length; i++) {
        modelLoadedCallbacks[i](model, cause);
      }
      isModelLoaded = true;
    }

    function modelResetHandler(cause) {
      if ( !ignoreModelResetEvent ) {
        notifyModelResetCallbacks(cause);
      }
    }

    /**
      Notify observers that a model was reset, passing along the cause of the reset event.
    */
    function notifyModelResetCallbacks(cause) {
      modelResetCallbacks.forEach(function(cb) {
        cb(cause);
      });
    }

    /**
      Notify observers that a reset event is pending for a given model, passing them the model that
      will be reset and a reset-request object that is unique for each observer.

      If any observers return true, the reset operation will be paused. They can cache the reset
      request object and asynchronously indicate that it is ok to proceed with the reset by calling
      the cached object's 'proceed' or 'cancel' method.

      Once the a reset request's 'proceed' method has been called, calling its 'cancel' method has
      no effect, and vice versa.

      If any observers that returned true fail to later call either method of the reset request,
      then the reset will be put off indefinitely.

      (Note that, for the time being, there is no practical difference between canceling a reset and
      putting it off indefintely. However, almost surely we will want to keep track of whether
      reset has been canceled or not, so that we can block subsequent requests to reset the model,
      give UI feedback, etc.)

      If no observers return a truthy value--and also do not call their reset request's 'cancel'
      method during their execution--then the reset will take place synchronously.

      Note that observers that do not return a truthy value are treated like observers that call the
      'proceed' method: subsequently calling the 'cancel' method of their reset request will have no
      effect.
    */
    function notifyWillResetModelAnd(closure) {

      // Fast path; also required because no callbacks => we never call resetRequest.proceed()
      if (willResetModelCallbacks.length === 0) {
        closure();
      }

      var numberOfResponsesRequired = willResetModelCallbacks.length;
      var numberOfProceedResponses = 0;
      var resetWasCanceled = false;

      function proceedIfReady() {
        if (!resetWasCanceled && numberOfProceedResponses === numberOfResponsesRequired) {
          closure();
        }
      }

      // Returns a new "use once" object that the willResetModel callback can use to asynchronously
      // allow the reset to proceed or cancel.
      function makeResetRequest() {
        var wasUsed = false;

        return {
          proceed: function() {
            if (wasUsed) {
              return;
            }
            wasUsed = true;
            numberOfProceedResponses++;
            proceedIfReady();
          },

          cancel: function() {
            if (wasUsed) {
              return;
            }
            wasUsed = true;
            resetWasCanceled = true;
          }
        };
      }

      willResetModelCallbacks.forEach(function(willResetModelCallback) {
        var resetRequest = makeResetRequest();

        // willResetModel callbacks that don't return a value (or return a falsy value) without
        // having invoked resetRequest.cancel() should be treated as having requested to proceed.
        if (!willResetModelCallback(model, resetRequest)) {
          // remember this has no effect if the callback already called resetRequest.cancel():
          resetRequest.proceed();
        }
      });
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
        // and modelDefinitions section, one from model sections will be defined in this hash.
        // It's necessary to update correctly values of parameters during serialization.
        customParametersByName[parameter.name] = parameter;
      }

      model.set(initialValues);
    }

    function allParametersExcept(exceptions) {
      var exceptionsByName = {};

      exceptions.forEach(function(exception) {
        exceptionsByName[exception] = true;
      });

      return Object.keys(customParametersByName).filter(function(key) {
        return !exceptionsByName[key];
      });
    }

    function getProperties(propertyKeys) {
      var properties = {};

      propertyKeys.forEach(function(key) {
        properties[key] = model.properties[key];
      });

      return properties;
    }

    //
    // Public API.
    //
    controller = {
      get scriptingAPI() {
        return scriptingAPI;
      },
      get helpSystem() {
        return helpSystem;
      },
      get modelController() {
        return modelController;
      },
      getDGExportController: function () {
        return exportController;
      },

      /**
        Return the model object. Note this is provided behind a method because we eventually
        want to support multiple model objects accesible by id.
      */
      getModel: function() {
        return model;
      },

      getScriptingAPI: function() {
        return scriptingAPI;
      },

      getModelController: function () {
        return modelController;
      },
      getComponent: function (id) {
        return componentByID[id];
      },
      pushOnLoadScript: function (callback) {
        onLoadScripts.push(callback);
      },

      getNextTabIndex: getNextTabIndex,

      reloadModel: function() {
        model.stop();
        notifyWillResetModelAnd(function() {
          modelController.reload();
        });
      },

      /**
        Reset the model to its initial state, restoring or retaining model parameters according to
        these options. The interactives controller will emit a 'willResetModel'.  The willResetModel
        observers can ask to wait for asynchronous confirmation before the model is actually reset;
        see the notifyWillResetModelAnd function.

        Once the reset is confirmed, model will issue a 'willReset' event, reset its tick history,
        and emit a 'reset' event.

        Options:
          parametersToRetain:
            a list of parameters to save before the model reset and restore after reset
            if the value is 'all', retain all parameters

          parametersToReset:
           (mutually exclusive with parametersToRetain)
            a list of parameters to reset to their initial values after the model reset
            if the value is 'all', reset all parameters

          cause:
            optional string giving the cause of the reset, e.g., "new-run"
      */
      resetModel: function(options) {
        model.stop();
        notifyWillResetModelAnd(function() {
          options = options || {};

          var parameters;

          // Option processing.
          var parametersToRetain = options.retainParameters;
          var parametersToReset = options.resetParameters;

          if (parametersToReset && parametersToRetain) {
            throw new Error("resetModel: resetParameters and retainParameters are mutually exclusive");
          }

          // default behavior is to reset all parameters
          if (!parametersToRetain && !parametersToReset) {
            parametersToReset = 'all';
          }

          if (parametersToRetain === 'all') {
            parametersToRetain = undefined;
            parametersToReset = [];
          }

          if (parametersToReset === 'all') {
            parametersToRetain = [];
            parametersToReset = undefined;
          }

          // Invariants (assuming correct input):
          // 1. exactly one of (parametersToReset, parametersToRetain) is defined
          // 2. for each x in (parametersToReset, parametersToRetain), x is defined => x is an array

          // identify the complete list of parametersToRetain (whose values need to be saved)
          if (parametersToReset) {
            parametersToRetain = allParametersExcept(parametersToReset);
          }

          parameters = getProperties(parametersToRetain);

          // Consumers of the model's events will see a reset event followed by the invalidation event
          // emitted when we set the model's parameters to their desired initial state. That's because
          // the model semantics don't include reset-with-saving-of-parameters, just reset-to-initial-
          // state. However, consumers of the interactive controller's modelReset event would expect
          // reset-to-initial-state and restoration-of-saved-parameter-values to be a single,
          // atomic event, given that they are triggered by the single
          // interactiveController.resetModel() method. (This is similar to the reason that the
          // interactive controller decorates its modelReset with a "cause" -- the model itself has no
          // notion of *why* it's reset, and doesn't distinguish "setting up an experimental run" from
          // "starting over"; those are interactive-level concepts.)
          //
          // Therefore, make sure to supress the modelReset event that would be automatically
          // emitted by our listener to the modelController's modelReset event, and emit modelReset
          // only after parameter values have been reset/restored.
          ignoreModelResetEvent = true;

          modelController.reset(options.cause);
          model.set(parameters);
          notifyModelResetCallbacks(options.cause);

          ignoreModelResetEvent = false;
        });
      },

      updateModelView: function() {
        modelController.updateView();
      },

      repaintModelView: function() {
        modelController.repaint();
      },

      /**
        Notifies interactive controller that the dimensions of its container have changed.
        It triggers the layout algorithm again.
      */
      resize: function () {
        layoutInteractive();
        // TODO: use events!
        for(var i = 0; i < resizeCallbacks.length; i++) {
          resizeCallbacks[i]();
        }
      },
      /**
       * Adds an event listener for the specified type. Supported events:
       * "resize", "modelLoaded", "modelReset", "interactiveRendered" and "layoutUpdated".
       *
       * @param {string} type
       * @param  {function|array} callback Callback function or an array of functions.
       *
       * FIXME: We should using DispatchSupport exclusively to emit events (i.e., instead of
       * maintaining custom arrays of callbacks in interactives controller, pass each callback we
       * are given to dispatch.on()). The first step would be to modify dispatchSupport to handle
       * multiple listeners for a given event, instead of reusing d3.dispatch, which is intended for
       * a simpler use case. Similar code is already checked into Lab!
       *
       * As a second step, we should modify components so that instead of defining a
       * 'modelLoadedCallback' they simply register listeners for some event. (Note that we will
       * want to create 2 events to disambiguate the 2 senses of 'modelLoaded';
       * componentModelLoadedCallbacks are called at a slightly different point in the model loading
       * sequence than 'regular' modelLoadedCallbacks.)
       */
      on: function (type, callback) {
        var callbacks;

        if (typeof callback === "function") {
          callbacks = [callback];
        } else if (Array.isArray(callback)) {
          callbacks = callback;
          if (callbacks.some(function (cb) { return typeof cb !== 'function'; })) {
            throw new Error("Invalid callback, must be an array of functions.");
          }
        } else {
          throw new Error("Invalid callback, must be a function or array of functions.");
        }

        switch(type) {
          case "resize":
            resizeCallbacks = resizeCallbacks.concat(callbacks);
            break;
          case "modelLoaded":
            modelLoadedCallbacks = modelLoadedCallbacks.concat(callbacks);
            break;
          case "modelReset":
            modelResetCallbacks = modelResetCallbacks.concat(callbacks);
            break;
          case "willResetModel":
            willResetModelCallbacks = willResetModelCallbacks.concat(callbacks);
            break;
          case "interactiveRendered":
            interactiveRenderedCallbacks = interactiveRenderedCallbacks.concat(callbacks);
            break;
          default:
            if (typeof callback !== "function") {
              throw new Error("Event type " + type + " does not support multiple callbacks in one call to .on()");
            }
            dispatch.on(type, callback);
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
        // with updated values and avoid deciding whether this parameter is defined in 'modelDefinitions' section
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
        // FIXME: this should be based on enumerating properties in the metadata. The issue is properties
        // added to the metadata like "importedFrom" have to be then manually added here.
        result = {
          title: interactive.title,
          publicationStatus: interactive.publicationStatus,
          subtitle: interactive.subtitle,
          aspectRatio: interactive.aspectRatio,
          fontScale: interactive.fontScale,
          helpOnLoad: interactive.helpOnLoad,
          about: arrays.isArray(interactive.about) ? $.extend(true, [], interactive.about) : interactive.about,
          // Node that modelDefinitions section can also contain custom parameters definition. However, their initial values
          // should be already updated (take a look at the beginning of this function), so we can just serialize whole array.
          models: $.extend(true, [], interactive.models),
          // All used parameters are already updated, they contain currently used values.
          parameters: $.extend(true, [], interactive.parameters),
          // Outputs are directly bound to the model, we can copy their initial definitions.
          outputs: $.extend(true, [], interactive.outputs),
          filteredOutputs: $.extend(true, [], interactive.filteredOutputs),
          helpTips: $.extend(true, [], interactive.helpTips)
        };

        // add optional attributes to result if defined
        if (interactive.importedFrom !== undefined) {
          result.importedFrom = interactive.importedFrom;
        }

        if (interactive.hideExportDataControl !== undefined) {
          result.hideExportDataControl = interactive.hideExportDataControl;
        }
        if (interactive.exports !== undefined) {
          result.exports = $.extend(true, {}, interactive.exports);
        }

        if (interactive.experiment !== undefined) {
          result.experiment = $.extend(true, {}, interactive.experiment);
        }

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
          result.template = $.extend(true, [], interactive.template);
        }

        return result;
      },
      modelLoaded: function () {
        return isModelLoaded;
      },
      interactiveRendered: function () {
        return isInteractiveRendered;
      },
      benchmarks: [
        {
          name: "layout (iterations)",
          numeric: true,
          formatter: d3.format("g"),
          run: function(done) {
            done(semanticLayout.layoutInteractive());
          }
        },
        {
          name: "layout (ms)",
          numeric: true,
          formatter: d3.format("5.1f"),
          run: function(done) {
            var start = +Date.now();
            semanticLayout.layoutInteractive();
            done(Date.now() - start);
          }
        }
      ],

      getLoadedModelId: function () {
        return modelId;
      },

      // Make these private variables and functions available
      loadInteractive: loadInteractive,
      validateInteractive: validateInteractive,
      loadModel: loadModel,
      interactiveNotFound: interactiveNotFound
    };

    //
    // Initialization.
    //

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
    loadInteractive(interactiveReference);

    return controller;
  };
});
