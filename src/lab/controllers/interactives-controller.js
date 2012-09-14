/*global controllers model Thermometer layout $ alert ACTUAL_ROOT grapher */
/*jshint eqnull: true boss: true */
controllers.interactivesController = function(interactive, viewSelector, applicationCallbacks, layoutStyle) {

  var controller = {},
      modelController,
      $interactiveContainer,
      propertiesListeners = [],
      playerConfig,
      componentCallbacks = [],
      thermometer,
      energyGraph,
      energyData = [[],[],[]],

      //
      // Define the scripting API used by 'action' scripts on interactive elements.
      //
      // The properties of the object below will be exposed to the interactive's
      // 'action' scripts as if they were local vars. All other names (including
      // all globals, but exluding Javascript builtins) will be unavailable in the
      // script context; and scripts are run in strict mode so they don't
      // accidentally expose or read globals.
      //
      // TODO: move construction of this object to its own file.
      //

      scriptingAPI = {

        getRadialBond: function getRadialBond(i) {
          return [
            model.get_radial_bonds()[0][i],
            model.get_radial_bonds()[1][i],
            model.get_radial_bonds()[2][i],
            model.get_radial_bonds()[3][i]
          ];
        },

        setRadialBond: function setRadialBond(i, values) {
          model.get_radial_bonds()[0][i] = values[0];
          model.get_radial_bonds()[1][i] = values[1];
          model.get_radial_bonds()[2][i] = values[2];
          model.get_radial_bonds()[3][i] = values[3];
        },

        addAtom: function addAtom() {
          return model.addAtom.apply(model, arguments);
        },

        addRandomAtom: function addRandomAtom() {
          return model.addRandomAtom.apply(model, arguments);
        },

        get: function get() {
          return model.get.apply(model, arguments);
        },

        set: function set() {
          return model.set.apply(model, arguments);
        },

        adjustTemperature: function adjustTemperature(fraction) {
          model.set({temperature: fraction * model.get('temperature')});
        },

        limitHighTemperature: function limitHighTemperature(t) {
          if (model.get('temperature') > t) model.set({temperature: t});
        },

        loadModel: function loadModel(modelUrl, cb) {
          model.stop();
          controller.loadModel(modelUrl);
          if (typeof cb === 'function') {
            applicationCallbacks = applicationCallbacks || [];
            applicationCallbacks.push(cb);
          }
        },

        /**
          Sets individual atom properties using human-readable hash.
          e.g. setAtomProperties(5, {x: 1, y: 0.5, charge: 1})
        */
        setAtomProperties: function setAtomProperties(i, props, checkLocation, moveMolecule) {
          return model.setAtomProperties(i, props, checkLocation, moveMolecule);
        },

        /**
          Returns atom properties as a human-readable hash.
          e.g. getAtomProperties(5) --> {x: 1, y: 0.5, charge: 1, ... }
        */
        getAtomProperties: function getAtomProperties(i) {
          var props = {},
              atoms = model.get_nodes(),
              property;

          for (property in model.ATOM_PROPERTIES) {
            if (model.ATOM_PROPERTIES.hasOwnProperty(property)) {
              props[model.ATOM_PROPERTIES[property]] = atoms[model.INDICES[property]][i];
            }
          }
          return props;
        },

        pe: function pe() {
          return model.pe();
        },

        ke: function ke() {
          return model.ke();
        },

        start: function start() {
          model.start();
        },

        stop: function stop() {
          model.stop();
        },

        reset: function reset() {
          model.stop();
          modelController.reload();
        },

        tick: function tick() {
          model.tick();
        },

        repaint: function repaint() {
          modelController.moleculeContainer.update_drawable_positions();
        },

        // rudimentary debugging functionality
        alert: alert,

        console: window.console != null ? window.console : {
          log: function() {},
          error: function() {},
          warn: function() {},
          dir: function() {}
        }
      };

  /**
    Load the model from the url specified in the 'model' key. 'modelLoaded' is called
    after the model loads.

    @param: modelUrl
  */
  function loadModel(modelUrl) {

    modelUrl = ACTUAL_ROOT + modelUrl;

    $.get(modelUrl).done(function(modelConfig) {

      // Deal with the servers that return the json as text/plain
      modelConfig = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;

      if (modelController) {
        modelController.reload(modelConfig, playerConfig);
      } else {
        modelController = controllers.modelController('#molecule-container', modelConfig, playerConfig);
        modelLoaded();
        // also be sure to get notified when the underlying model changes
        modelController.on('modelReset', modelLoaded);
      }
    });
  }

  function createComponent(component) {
    switch (component.type) {
      case 'button':
        return createButton(component);
      case 'pulldown':
        return createPulldown(component);
      case 'thermometer':
        thermometer = createThermometer(component);
        return thermometer;
      case 'energyGraph':
        return createEnergyGraph(component);
    }
  }

  /**
    Given a script string, return a function that executes that script in a
    context containing *only* the bindings to names we supply.

    This isn't intended for XSS protection (in particular it relies on strict
    mode.) Rather, it's so script authors don't get too clever and start relying
    on accidentally exposed functionality, before we've made decisions about
    what scripting API and semantics we want to support.
  */
  function evalInScriptContext(scriptSource) {
    var prop,
        whitelistedNames,
        whitelistedObjectsArray,
        safedScriptSource;

    // Construct parallel arrays of the keys and values of the scripting API
    whitelistedNames = [];
    whitelistedObjectsArray = [];

    for (prop in scriptingAPI) {
      if (scriptingAPI.hasOwnProperty(prop)) {
        whitelistedNames.push(prop);
        whitelistedObjectsArray.push( scriptingAPI[prop] );
      }
    }

    // Make sure the script runs in strict mode, so undeclared variables don't
    // escape to the toplevel scope.
    safedScriptSource =  "'use strict';" + scriptSource;

    // This function runs the script with all globals shadowed:
    return function() {
      var prop,
          blacklistedNames,
          scriptArgumentList,
          safedScript;

      // Blacklist all globals, except those we have whitelisted. (Don't move
      // the construction of 'blacklistedNames' to the enclosing scope, because
      // new globals -- in particular, 'model' -- are created in between the
      // time the enclosing function executes and the time this function
      // executes.)
      blacklistedNames = [];
      for (prop in window) {
        if (window.hasOwnProperty(prop) && !scriptingAPI.hasOwnProperty(prop)) {
          blacklistedNames.push(prop);
        }
      }

      // Here's the key. The Function constructor acccepts a list of argument
      // names followed by the source of the *body* of the function to
      // construct. We supply the whitelist names, followed by the "blacklist"
      // of globals, followed by the script source. But when we invoke the
      // function thus created, we will only provide values for the whitelisted
      // names -- all of the "blacklist" names will therefore have the value
      // 'undefined' inside the function body.
      //
      // (Additionally, remember that functions created by the Function
      // constructor execute in the global context -- they don't capture names
      // from the scope they were created in.)
      scriptArgumentList = whitelistedNames.concat(blacklistedNames).concat(safedScriptSource);

      // TODO: obvious optimization: cache the result of the Function constructor
      // and don't reinvoke the Function constructor unless the blacklistedNames array
      // has changed. Create a unit test for this scenario.
      try {
        safedScript = Function.apply(null, scriptArgumentList);
      } catch (e) {
        alert("Error compiling script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
      }

      try {
        // invoke the script, passing only enough arguments for the whitelisted names
        safedScript.apply(null, whitelistedObjectsArray);
      } catch (e) {
        alert("Error running script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
      }
    };
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

    $button.click(evalInScriptContext(scriptStr));

    return { elem: $button };
  }

  function createPulldown(component) {
    var $pulldown, $option,
        options = component.options || [],
        option,
        i, ii;

    $pulldown = $('<select>').attr('id', component.id);
    $pulldown.addClass("component");

    for (i=0, ii=options.length; i<ii; i++) {
      option = options[i];
      $option = $('<option>').html(option.text);
      if (option.disabled) {
        $option.attr("disabled", option.disabled);
      }
      if (option.selected) {
        $option.attr("selected", option.selected);
      }
      $pulldown.append($option);
    }

    $pulldown.change(function() {
      var index = $(this).prop('selectedIndex'),
          action = component.options[index].action,
          scriptStr;

      if (action){
        scriptStr = getStringFromArray(action);
        evalInScriptContext(scriptStr)();
      } else if (component.options[index].loadModel){
        model.stop();
        loadModel(component.options[index].loadModel);
      }
    });

    return { elem: $pulldown };
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

        units =  component.readingUnits  || "K",
        offset = component.readingOffset || 0,
        scale =  component.readingScale  || 1,

        labelIsReading = !!component.labelIsReading,
        labelText = labelIsReading ? "" : "Thermometer",
        $label = $('<p class="label">').text(labelText).width('6em'),
        $elem = $('<div class="interactive-thermometer">')
                .append($thermometer)
                .append($label),

        thermometerComponent = new Thermometer($thermometer, null, component.min, component.max),
        self;

    function updateLabel(temperature) {
      temperature = (temperature - offset) * scale;
      $label.text(temperature.toFixed(0) + " " + units);
    }

    queuePropertiesListener(['temperature'], function() { self.update(); });

    return self = {
      elem:      $elem,
      component: thermometerComponent,

      callback: function() {
        thermometerComponent.resize();
        self.update();
      },

      update: function() {
        var t = model.get('temperature');
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
            sample = model.get("viewRefreshInterval")/1000,
            options = {
              title:     "Energy of the System (KE:red, PE:green, TE:blue)",
              xlabel:    "Model Time (ps)",
              xmin:      0,
              xmax:     20,
              sample:    sample,
              ylabel:    "eV",
              ymin:      -5.0,
              ymax:      5.0
            };

        resetEnergyData();

        model.addPropertiesListener(['viewRefreshInterval'], function() {
          options.sample = model.get("viewRefreshInterval")/1000;
          energyGraph.reset(options);
        });

        // Create energyGraph only if it hasn't been drawn before:
        if (!energyGraph) {
          $.extend(options, thisComponent.options || []);
          newEnergyGraph(thisComponent.id, options);
        } else {
          sample = model.get("viewRefreshInterval")/1000;
          options.sample = sample;
          energyGraph.reset('#' + thisComponent.id, options, $container[0]);
        }

        if (thisComponent.dimensions) {
          energyGraph.resize(thisComponent.dimensions.width, component.dimensions.height);
        }

        // This method is called whenever a model loads (i.e., a new model object is created.)
        // Always request event notifications from the new model object.

        model.on('tick.energyGraph', updateEnergyGraph);

        model.on('play.energyGraph', function() {
          if (energyGraph.number_of_points() && model.stepCounter() < energyGraph.number_of_points()) {
            resetEnergyData(model.stepCounter());
            energyGraph.new_data(energyData);
          }
          energyGraph.show_canvas();
        });

        model.on('reset.energyGraph', function() {
          sample = model.get("viewRefreshInterval")/1000;
          options.sample = sample;
          resetEnergyData();
          energyGraph.reset('#' + thisComponent.id, options);
          energyGraph.new_data(energyData);
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

  function newEnergyGraph(id, options) {
    options = options || {};
    options.dataset = energyData;
    energyGraph = grapher.realTimeGraph('#' + id, options);
  }

  function updateEnergyGraph() {
    energyGraph.add_points(updateEnergyData());
  }

  // Add another sample of model KE, PE, and TE to the arrays in energyData
  function updateEnergyData() {
    var ke = model.ke(),
        pe = model.pe(),
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

    for(i = 0; i < componentCallbacks.length; i++) {
      componentCallbacks[i]();
    }

    layout.addView('moleculeContainers', modelController.moleculeContainer);
    if (thermometer) layout.addView('thermometers', thermometer.component);
    if (energyGraph) layout.addView('energyGraphs', energyGraph);
    $(window).unbind('resize');

    if (layoutStyle) {
      // for compatibility with current implementation "embedded" interactive style
      layout.selection = layoutStyle;
      layout.setupScreen();
      $(window).on('resize', layout.setupScreen);
    } else {
      // preferred path...
      layout.setupInteractiveLayout();
      $(window).on('resize', layout.setupInteractiveLayout);
    }

    for(i = 0; i < propertiesListeners.length; i++) {
      listener = propertiesListeners[i];
      model.addPropertiesListener(listener[0], listener[1]);
    }


    if (applicationCallbacks) {
      for(i = 0; i < applicationCallbacks.length; i++) {
        applicationCallbacks[i]();
      }
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
    var modelUrl,
        componentJsons,
        components = {},
        component,
        divArray,
        div,
        componentId,
        $top, $right, $rightwide, $bottom,
        i, ii;

    componentCallbacks = [];
    interactive = newInteractive;
    $interactiveContainer = $(viewSelector);
    if ($interactiveContainer.children().length === 0) {
      $top = $('<div class="interactive-top" id="top"/>');
      $top.append('<div class="interactive-top" id="molecule-container"/>');
      if (interactive.layout && interactive.layout.right) {
        $right = $('<div class="interactive-top" id="right"/>');
        $top.append($right);
      }
      if (interactive.layout && interactive.layout.rightwide) {
        $rightwide = $('<div class="interactive-top" id="rightwide"/>');
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

    if (interactive.model != null) {
      modelUrl = interactive.model.url;
      if (interactive.model.viewOptions) {
        // make a deep copy of interactive.model.viewOptions, so we can freely mutate playerConfig
        // without the results being serialized or displayed in the interactives editor.
        playerConfig = $.extend(true, {}, interactive.model.viewOptions);
      } else {
        playerConfig = { controlButtons: 'play' };
      }
      playerConfig.fit_to_parent = !layoutStyle;
      playerConfig.interactiveUrl = modelUrl;
    }

    if (modelUrl) loadModel(modelUrl);

    componentJsons = interactive.components || [];

    for (i = 0, ii=componentJsons.length; i<ii; i++) {
      component = createComponent(componentJsons[i]);
      components[componentJsons[i].id] = component;
    }


    // look at each div defined in layout, and add any components in that
    // array to that div. Then rm the component from components so we can
    // add the remainder to #bottom at the end
    if (interactive.layout) {
      for (div in interactive.layout) {
        if (interactive.layout.hasOwnProperty(div)) {
          divArray = interactive.layout[div];
          for (i = 0, ii = divArray.length; i<ii; i++) {
            componentId = divArray[i];
            if (components[componentId]) {
              $('#'+div).append(components[componentId].elem);
              if (components[componentId].callback) {
                componentCallbacks.push(components[componentId].callback);
              }
              delete components[componentId];
            }
          }
        }
      }
    }

    // add the remaining components to #bottom
    for (componentId in components) {
      if (components.hasOwnProperty(componentId)) {
        $('#bottom').append(components[componentId].elem);
      }
    }


  }

  // run this when controller is created
  loadInteractive(interactive, viewSelector);

  // make these private variables and functions available
  controller.loadInteractive = loadInteractive;
  controller.loadModel = loadModel;

  return controller;
};
