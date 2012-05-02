/*globals
  modeler
  ModelPlayer
  $
  layout
  controllers
*/

// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

(function() {

  var modelConfig = {
        layoutStyle        : 'simple-static-screen',
        mol_number         : 50,
        autostart          : false,
        maximum_model_steps: Infinity,
        lj_epsilon_min     : -0.4,
        lj_epsilon_max     : -0.01034,
        epsilon            : -0.1
      },

      request = $.get('/model-config'),
      windowLoad = $.Deferred(),

      controller,
      opts,
      _rev;

  $(window).load(function() {
    windowLoad.resolve();

    $('#save-button').click(function() {
      var props = model.serialize();
      props._rev = _rev;

      $.ajax('/model-config', {
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(props, 2)
      });
    });
  });

  $.when(request, windowLoad).done(function(xhr) {
    opts = xhr[0];
    _rev = opts._rev;
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
