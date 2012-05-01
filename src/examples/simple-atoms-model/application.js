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
        layoutStyle        : 'simple-static-screen',
        autostart          : false,
        maximum_model_steps: Infinity,
        lj_epsilon_min     : -0.4,
        lj_epsilon_max     : -0.01034
      };

  $(window).load(function() {
    windowLoad.resolve();

    $('#save-button').click(function() {
      var json = model.serialize();
      alert(json);
    });
  });

  $.when(request, windowLoad).done(function(xhr) {
    opts = xhr[0];
  }).fail(function() {
    opts = {
      mol_number          : 50,
      temperature         : 3,
      epsilon             : -0.1,
      lennard_jones_forces: true,
      coulomb_forces      : false
    };
  }).always(function() {
    $.extend(modelConfig, opts);
    controller = controllers.simpleModelController('#molecule-container', modelConfig);
  });

}());
