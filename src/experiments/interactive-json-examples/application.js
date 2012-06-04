/*globals $ controllers model alert */
/*jshint boss:true */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

(function() {

  var playerConfig = {
        layoutStyle        : 'simple-static-screen',
        autostart          : false,
        maximum_model_steps: Infinity,
        lj_epsilon_min     : -0.4,
        lj_epsilon_max     : -0.01034
      },

      optsLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),

      modelLocation, modelUrl,
      controller,
      opts,
      components, component,
      i, ii;

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);
    $.get(interactiveUrl).done(function(results) {
      interactive = results;
      console.log(interactive)
      optsLoaded.resolve();
    });
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(optsLoaded, windowLoaded).done(function(results) {
    modelLocation = interactive.model;
    modelUrl = ~modelLocation.indexOf(".json") ? modelLocation : '/md2d_models/' + modelLocation;

    $.get(modelUrl).done(function(modelConfig) {
      controller = controllers.simpleModelController('#molecule-container', modelConfig, playerConfig);
    });

    components = interactive.components;
    for (i=0, ii=components.length; i<ii; i++){
      component = components[i];
      loadComponent(component);
    }
  });

  function loadComponent(component) {
    var scriptStr, script;

    if (component.type == "button") {
      $button = $("<button>").html(component.text);

      if (typeof component.action == "string") {
        scriptStr = component.action;
      } else {
        scriptStr = component.action.join('\n');
      }
      eval("var script = function() {"+scriptStr+"}");

      $button.click(script);

      $('.bottom').append($button);
    }
  }

}());
