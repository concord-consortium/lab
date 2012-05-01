/*globals $ controllers */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

(function() {

  var request = $.get('/model-config'),
      windowLoad = $.Deferred(),
      controller,
      opts,
      modelConfig = {
        layoutStyle: 'simple-static-screen',
        autostart: false,
        maximum_model_steps: Infinity,
        mol_number: 50
      };

  $(window).load(function() {
    windowLoad.resolve();
  });

  $.when(request, windowLoad).done(function(xhr) {
    opts = xhr[0];
  }).fail(function() {
    opts = {
      lj_epsilon_min     : -0.4,
      lj_epsilon_max     : -0.01034,
      initial_epsilon    : -0.1,
      temperature        : 3
    };
  }).always(function() {
    $.extend(modelConfig, opts);
    controller = controllers.simpleModelController('#molecule-container', modelConfig);
  });

}());
