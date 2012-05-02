/*globals $ controllers model */
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

    $('#save-button').attr("disabled", "disabled").click(function() {
      var props     = model.serialize(),
          propsStr  = JSON.stringify(props, 2);

      $.ajax('/model-config', {
        type: 'PUT',
        contentType: 'application/json',
        data: propsStr
      }).done(function() {
        model.lastModelConfig = propsStr;
        $('#save-button').attr("disabled", "disabled");
      });
    });

    // we will be rearanging this when we have a better model for history
    model.lastModelConfig = JSON.stringify(model.serialize(), 2);

    model.addPropertiesListener(["all"], function() {
      if (JSON.stringify(model.serialize(), 2) !== model.lastModelConfig) {
        $('#save-button').removeAttr("disabled");
      } else {
        $('#save-button').attr("disabled", "disabled");
      }
    });
  });

}());
