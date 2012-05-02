/*globals $ controllers */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

(function() {

  var modelConfig = {
        mol_number          : 50,
        temperature         : 3,
        epsilon             : -0.1,
        lennard_jones_forces: true,
        coulomb_forces      : false
      },

      playerConfig = {
        layoutStyle        : 'simple-static-screen',
        autostart          : false,
        maximum_model_steps: Infinity,
        lj_epsilon_min     : -0.4,
        lj_epsilon_max     : -0.01034
      },

      request = $.get('/model-config'),
      windowLoad = $.Deferred(),

      controller,
      opts;

  $(window).load(function() {
    windowLoad.resolve();
  });

  $.when(request, windowLoad).done(function(xhr) {
    opts = xhr[0];
  }).fail(function() {
    opts = {};
  }).always(function() {
    $.extend(modelConfig, opts);
    controller = controllers.simpleModelController('#molecule-container', modelConfig, playerConfig);

    $('#save-button').click(function() {
      var props = model.serialize();

      $.ajax('/model-config', {
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(props, 2)
      });
    });
  });

}());
