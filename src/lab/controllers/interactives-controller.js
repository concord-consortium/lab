/*globals controllers $ */

/*jslint onevar: true*/
controllers.interactivesController = function(interactive, interactive_view_id) {

  var controller = {},
      components,
      component,
      simpleController,
      $interactiveContainer,
      propertiesListeners = [],
      actionQueue = [],
      i, ii;

  function loadModel(modelUrl) {
    var playerConfig = {    // to be removed
        layoutStyle        : 'simple-static-screen',
        maximum_model_steps: Infinity
      };
    $.get(modelUrl).done(function(modelConfig) {
      if (simpleController) {
        simpleController.reload(modelConfig, playerConfig);
      } else {
        simpleController = controllers.simpleModelController('#molecule-container', modelConfig, playerConfig);
        modelLoaded();
      }
    });
  }

  function createComponent(component) {
    switch (component.type) {
      case "button":
        return createButton(component);
      case "thermometer":
        return createThermometer(component);
    }
  }

  function createButton(component) {
    var $button, scriptStr, script;

    $button = $("<button>").html(component.text);

    if (typeof component.action === "string") {
      scriptStr = component.action;
    } else {
      scriptStr = component.action.join('\n');
    }
    eval("script = function() {"+scriptStr+"}");
    $button.click(script);

    return $button;
  }

  function createThermometer(component) {
    var $therm = $('<div id="thermometer"/>'),
        thermometer = new Thermometer($therm, 0, component.min, component.max);

    function updateTherm() {
      thermometer.add_value(model.get("temperature"));
    }

    queuePropertiesListener(["temperature"], updateTherm);
    queueActionOnModelLoad(function() {
      thermometer.resize();
      updateTherm();
    });
    return $therm;
  }

  function queuePropertiesListener(properties, func) {
    if (typeof model !== "undefined") {
      model.addPropertiesListener(properties, func)
    } else {
      propertiesListeners.push([properties, func]);
    }
  }

  function queueActionOnModelLoad(action) {
    if (typeof model !== "undefined") {
      action();
    } else {
      actionQueue.push(action);
    }
  }

  function modelLoaded() {
    while (propertiesListeners.length > 0) {
      listener = propertiesListeners.pop();
      model.addPropertiesListener(listener[0], listener[1]);
    }
    while (actionQueue.length > 0) {
      action = actionQueue.pop()();
    }
  }

  function loadInteractive(newInteractive, interactive_view_id) {
    interactive = newInteractive;
    $interactiveContainer = $(interactive_view_id);
    if ($interactiveContainer.children().length === 0) {
      $top = $('<div id="top"/>');
      $top.append('<div id="molecule-container"/>');
      $interactiveContainer.append($top);
      $interactiveContainer.append('<div id="bottom"/>');
    } else {
      $('#bottom').remove();
      $interactiveContainer.append('<div id="bottom"/>');
    }

    if (interactive.model) {
      loadModel(interactive.model);
    }

    components = interactive.components;

    for (i = 0, ii=components.length; i<ii; i++) {
      component = createComponent(components[i]);
      $('#bottom').append(component);
    }
  }

  function updateLayout() {
    simpleController.updateLayout();
  }

  // run this when controller is created
  loadInteractive(interactive, interactive_view_id);

  // make these private variables and functions available
  controller.loadInteractive = loadInteractive;
  controller.updateLayout = updateLayout;

  return controller;
};
