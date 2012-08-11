/*globals controllers model layout Thermometer $ alert */
controllers.interactivesController = function(interactive, viewSelector, layoutStyle) {

  if (typeof layoutStyle === 'undefined') {
    layoutStyle = 'interactive';
  }

  var controller = {},
      modelController,
      $interactiveContainer,
      propertiesListeners = [],
      actionQueue = [];

  /**
    Load the model from the url specified in the 'model' key.
    Calls 'modelLoaded' if modelController was previously undefined.

    @param: modelUrl
  */
  function loadModel(modelUrl) {

    var playerConfig = {
          layoutStyle : layoutStyle
        };

    $.get(modelUrl).done(function(modelConfig) {

      // Deal with the servers that return the json as text/plain
      modelConfig = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;

      if (modelController) {
        modelController.reload(modelConfig, playerConfig);
      } else {
        modelController = controllers.modelController('#molecule-container', modelConfig, playerConfig);
        modelLoaded();
      }
    });
  }

  function createComponent(component) {
    switch (component.type) {
      case 'button':
        return createButton(component);
      case 'thermometer':
        return createThermometer(component);
    }
  }

  /**
    Given a script string, return a function that executes that script in a context
    containing *only* the bindings to names we supply.
  */
  function evalInScriptContext(scriptSource) {
    var prop,
        whitelistedObjects,
        whitelistedNames,
        whitelistedObjectsArray,
        safedScriptSource;

    // The keys of the object below will be exposed to the script as if they were local vars
    // TODO: move this (which effectively defines the scripting API, an important
    // piece of Next Gen MW!) to its own home.
    whitelistedObjects = {
      // the methods we want to expose...
      addAtom: function addAtom() {
        return model.addRandomAtom.apply(model, arguments);
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

      console: window.console
    };

    // Construct parallel arrays of the keys and values above
    whitelistedNames = [];
    whitelistedObjectsArray = [];

    for (prop in whitelistedObjects) {
      if (whitelistedObjects.hasOwnProperty(prop)) {
        whitelistedNames.push(prop);
        whitelistedObjectsArray.push( whitelistedObjects[prop] );
      }
    }

    // Make sure the script runs in strict mode, so undeclared variables don't
    // escape to the toplevel scope.
    safedScriptSource =  "'use strict';" + scriptSource;

    // This function runs the script will all globals shadowed:
    return function() {
      var prop,
          blacklistedNames,
          scriptArgumentList,
          safedScript;

      // Blacklist all globals, except those we have whitelisted
      blacklistedNames = [];
      for (prop in window) {
        if (window.hasOwnProperty(prop) && whitelistedNames.indexOf(prop) < 0) {
          blacklistedNames.push(prop);
        }
      }

      // Here's the key. The Function constructor acccepts a list of argument names
      // followed by the source of the function to construct.
      // We supply the whitelist names, followed by the "blacklist" of globals, followed
      // by the script source. But we will only provide bindings for the whitelisted
      // names -- the "blacklist" names will be undefined
      scriptArgumentList = whitelistedNames.concat(blacklistedNames).concat(safedScriptSource);

      try {
        // make the script with the whitelist names, blacklist names, and source
        safedScript = Function.apply(null, scriptArgumentList);
      } catch (e) {
        alert("Error compiling script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
      }

      try {
        // invoke the script, passing only enough arguments for the whitelisted names
        safedScript.apply(null, whitelistedObjectsArray);
      } catch (e) {
        alert("Error running script: " + e.toString());
      }
    };
  }


  function createButton(component) {
    var $button, scriptStr;

    $button = $('<button>').attr('id', component.id).html(component.text);

    if (typeof component.action === 'string') {
      scriptStr = component.action;
    } else {
      scriptStr = component.action.join('\n');
    }

    $button.click(evalInScriptContext(scriptStr));

    return $button;
  }

  function createThermometer(component) {
    var $therm = $('<div>').attr('id', component.id),
        thermometer = new Thermometer($therm, 0, component.min, component.max),
        $wrapper = $('<div>').css('padding-bottom', '4em')
          .append($therm)
          .append($('<div>').text('Thermometer'));

    function updateTherm() {
      thermometer.add_value(model.get('temperature'));
    }

    queuePropertiesListener(['temperature'], updateTherm);
    queueActionOnModelLoad(function() {
      thermometer.resize();
      updateTherm();
    });

    layout.addView('thermometers', thermometer);
    return $wrapper;
  }

  function queuePropertiesListener(properties, func) {
    if (typeof model !== 'undefined') {
      model.addPropertiesListener(properties, func);
    } else {
      propertiesListeners.push([properties, func]);
    }
  }

  function queueActionOnModelLoad(action) {
    if (typeof model !== 'undefined') {
      action();
    } else {
      actionQueue.push(action);
    }
  }

  /**
    Call this after the model loads, to process any queued resize and update events
    that depend on the model's properties.
  */
  function modelLoaded() {
    var listener,
        action;

    while (propertiesListeners.length > 0) {
      listener = propertiesListeners.pop();
      model.addPropertiesListener(listener[0], listener[1]);
    }
    while (actionQueue.length > 0) {
      action = actionQueue.pop()();
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
    var componentJsons,
        components = {},
        component,
        divArray,
        div,
        componentId,
        $top, $right,
        i, ii;

    interactive = newInteractive;
    $interactiveContainer = $(viewSelector);
    if ($interactiveContainer.children().length === 0) {
      $top = $('<div class="top" id="top"/>');
      $top.append('<div id="molecule-container"/>');
      $right = $('<div id="right"/>');
      $top.append($right);
      $interactiveContainer.append($top);
      $interactiveContainer.append('<div class="bottom" id="bottom"/>');
    } else {
      $('#bottom').html('');
      $('#right').html('');
      $interactiveContainer.append('<div id="bottom"/>');
    }

    if (interactive.model) {
      loadModel(interactive.model);
    }

    componentJsons = interactive.components;

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
              $('#'+div).append(components[componentId]);
              delete components[componentId];
            }
          }
        }
      }
    }

    // add the remaining components to #bottom
    for (componentId in components) {
      if (components.hasOwnProperty(componentId)) {
        $('#bottom').append(components[componentId]);
      }
    }

  }

  // run this when controller is created
  loadInteractive(interactive, viewSelector);

  // make these private variables and functions available
  controller.loadInteractive = loadInteractive;

  return controller;
};
