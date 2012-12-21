/*global define model $ ACTUAL_ROOT */

define(function (require) {
  // Dependencies.
  var ModelController         = require('md2d/controllers/model-controller'),
      BarGraphController      = require('md2d/controllers/bar-graph-controller'),
      GraphController         = require('md2d/controllers/graph-controller'),
      DgExportController      = require('md2d/controllers/dg-export-controller'),
      ScriptingAPI            = require('md2d/controllers/scripting-api'),
      SliderController        = require('md2d/controllers/slider-controller'),
      PulldownController      = require('md2d/controllers/pulldown-controller'),
      RealTimeGraph           = require('grapher/core/real-time-graph'),
      Thermometer             = require('cs!common/components/thermometer'),
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
          return createButton(component);
        case 'checkbox':
          return createCheckbox(component);
        case 'pulldown':
          compController = new PulldownController(component, scriptingAPI, controller);
          return {
            elem:     compController.getViewContainer(),
            callback: compController.modelLoadedCallback
          };
        case 'radio':
          return createRadio(component);
        case 'thermometer':
          thermometer = createThermometer(component);
          return thermometer;
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
          return createNumericOutput(component);
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

    function createButton(component) {
      var $button, scriptStr;

      $button = $('<button>').attr('id', component.id).html(component.text);
      $button.addClass("component");

      scriptStr = getStringFromArray(component.action);

      $button.click(scriptingAPI.makeFunctionInScriptContext(scriptStr));

      return { elem: $button };
    }

    function createCheckbox(component) {
      var propertyName  = component.property,
          onClickScript = component.onClick,
          $checkbox,
          $label;

      $checkbox = $('<input type="checkbox">').attr('id', component.id);
      $label = $('<label>').append(component.text).append($checkbox);
      // Append class to label, as it's the most outer container in this case.
      $label.addClass("component");

      // Process onClick script if it is defined.
      if (onClickScript) {
        onClickScript = getStringFromArray(onClickScript);
        // Create a function which assumes we pass it a parameter called 'value'.
        onClickScript = scriptingAPI.makeFunctionInScriptContext('value', onClickScript);
      }

      // Connect checkbox with model's property if its name is defined.
      if (propertyName !== undefined) {
        modelLoadedCallbacks.push(function () {
          var updateCheckbox = function () {
            var value = model.get(propertyName);
            if (value) {
              $checkbox.attr('checked', true);
            } else {
              $checkbox.attr('checked', false);
            }
          };
          // Register listener for 'propertyName'.
          model.addPropertiesListener([propertyName], updateCheckbox);
          // Perform initial checkbox setup.
          updateCheckbox();
        });
      }

      // Register handler for click event.
      $checkbox.click(function () {
        var value = false,
            propObj;
        // $(this) will contain a reference to the checkbox.
        if ($(this).is(':checked')) {
          value = true;
        }
        // Change property value if checkbox is connected
        // with model's property.
        if (propertyName !== undefined) {
          propObj = {};
          propObj[propertyName] = value;
          model.set(propObj);
        }
        // Finally, if checkbox has onClick script attached,
        // call it in script context with checkbox status passed.
        if (onClickScript !== undefined) {
          onClickScript(value);
        }
      });

      // Return label tag, as it contains checkbox anyway.
      return { elem: $label };
    }

    function createRadio(component) {
      var $div, $option, $span,
          options = component.options || [],
          option,
          id = component.id,
          i, ii;

      $div = $('<div>').attr('id', id);
      $div.addClass("component");

      for (i=0, ii=options.length; i<ii; i++) {
        option = options[i];
        $option = $('<input>')
          .attr('type', "radio")
          .attr('name', id);
        if (option.disabled) {
          $option.attr("disabled", option.disabled);
        }
        if (option.selected) {
          $option.attr("checked", option.selected);
        }
        $span = $('<span>')
          .append($option)
          .append(option.text);
        $div.append($span).append("<br/>");

        $option.change((function(option) {
          return function() {
            var scriptStr;
            if (option.action){
              scriptStr = getStringFromArray(option.action);
              scriptingAPI.makeFunctionInScriptContext(scriptStr)();
            } else if (option.loadModel){
              model.stop();
              loadModel(option.loadModel);
            }
          };
        })(option));
      }

      return { elem: $div };
    }

    function createNumericOutput(component) {
      var propertyName = component.property,
          label = component.label,
          units = component.units,
          displayValue = component.displayValue,
          $numericOutput,
          $label,
          $number,
          $units,
          value,
          propertyDescription;


      $label  = $('<span class="label"></span>');
      $number = $('<span class="value"></span>');
      $units  = $('<span class="units"></span>');
      if (label) { $label.html(label); }
      if (units) { $units.html(units); }
      $numericOutput = $('<div class="numeric-output">').attr('id', component.id)
          .append($label)
          .append($number)
          .append($units);

      if (displayValue) {
        displayValue = scriptingAPI.makeFunctionInScriptContext('value', displayValue);
      }

      function renderValue() {
        var value = model.get(propertyName);
        if (displayValue) {
          $number.text(displayValue(value));
        } else {
          $number.text(value);
        }
      }

      if (propertyName) {
        modelLoadedCallbacks.push(function() {
          propertyDescription = model.getPropertyDescription(propertyName);
          if (propertyDescription) {
            if (!label) { $label.html(propertyDescription.label); }
            if (!units) { $units.html(propertyDescription.units); }
          }
          renderValue();
          model.addPropertiesListener([propertyName], renderValue);
        });
      }
      return { elem: $numericOutput };
    }

    /**
      Returns an 'interactive thermometer' object, that wraps a base Thermometer with a label for use
      in Interactives.

      properties are:

       elem:      DOM element containing the Thermometer div and the label div
       component: base Thermometer object, with no label
       callback:  standard interactive component callback, called as soon as the display is ready
       update:    method to ask thermometer to update its display
    */
    function createThermometer(component) {
      var $thermometer = $('<div>').attr('id', component.id),

          reading,
          units = "K",
          offset = 0,
          scale = 1,
          digits = 0,

          labelIsReading = !!component.labelIsReading,
          labelText = labelIsReading ? "" : "Thermometer",
          $label = $('<p class="label">').text(labelText).width('6em'),
          $elem = $('<div class="interactive-thermometer">')
                  .append($thermometer)
                  .append($label),

          thermometerComponent = new Thermometer($thermometer, null, component.min, component.max),
          self;

      if (reading = component.reading) {
        if (reading.units != null)  units = reading.units;
        if (reading.offset != null) offset = reading.offset;
        if (reading.scale != null)  scale = reading.scale;
        if (reading.digits != null) digits = reading.digits;
      }

      function updateLabel(temperature) {
        temperature = scale*temperature + offset;
        $label.text(temperature.toFixed(digits) + " " + units);
      }
      // TODO: update to observe actual system temperature once output properties are observable
      queuePropertiesListener(['targetTemperature'], function() { self.update(); });

      return self = {
        elem:      $elem,
        component: thermometerComponent,

        callback: function() {
          thermometerComponent.resize();
          self.update();
        },

        update: function() {
          var t = model.get('targetTemperature');
          thermometerComponent.add_value(t);
          if (labelIsReading) updateLabel(t);
        }
      };
    }

    function queuePropertiesListener(properties, func) {
      if (typeof model !== 'undefined') {
        model.addPropertiesListener(properties, func);
      } else {
        propertiesListeners.push([properties, func]);
      }
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
      if (thermometer) layout.addView('thermometers', thermometer.component);
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
