/*globals controllers $ */

/*jslint onevar: true*/
controllers.interactivesController = function(interactive, interactive_view_id) {


  var controller = {},
      components = interactive.components,
      component,
      $interactiveContainer,
      i, ii;

  function loadModel(modelUrl) {
    var playerConfig = {    // to be removed
        layoutStyle        : 'simple-static-screen',
        maximum_model_steps: Infinity
      };
    $.get(modelUrl).done(function(modelConfig) {
      controller = controllers.simpleModelController('#molecule-container', modelConfig, playerConfig);
    });
  }

  function createComponent(component) {
    switch (component.type) {
      case "button":
        return createButton(component);
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

  $interactiveContainer = $(interactive_view_id);
  $interactiveContainer.append('<div id="molecule-container"/>');
  $interactiveContainer.append('<div id="bottom"/>');

  if (interactive.model) {
    loadModel(interactive.model);
  }

  for (i = 0, ii=components.length; i<ii; i++) {
    component = createComponent(components[i]);
    $('#bottom').append(component);
  }

  return controller;
};