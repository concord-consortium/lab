/*globals $ controllers model alert */
/*jshint boss:true */
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
        sigma               : 0.34,
        lennard_jones_forces: true,
        coulomb_forces      : false,
        width               : 10,
        height              : 10
      },

      playerConfig = {
        layoutStyle        : 'simple-iframe',
        autostart          : false,
        maximum_model_steps: Infinity,
        lj_epsilon_min     : -0.4,
        lj_epsilon_max     : -0.01034
      },

      optsLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),

      hash, modelUrl,
      controller,
      opts,
      timer;

  if (hash = document.location.hash) {
    hash = hash.substr(1, hash.length);
    modelUrl = ~hash.indexOf(".json") ? hash : '/model-config/' + hash;
    $.get(modelUrl).done(function(results) {
      opts = results;
      optsLoaded.resolve();
    }).fail(function() {
      $('#flash').html('<p class="error-message">Could not load config ' + document.location.hash + '</p>');
      optsLoaded.resolve();
    });
  }
  else {
    optsLoaded.resolve();
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(optsLoaded, windowLoaded).done(function(results) {
    // update modelConfig with opts, if any
    $.extend(modelConfig, opts);
    controller = controllers.simpleModelController('#molecule-container', modelConfig, playerConfig);

    $('#save-button').attr("disabled", "disabled").click(function() {
      var props     = model.serialize(true),
          propsStr  = JSON.stringify(props, 2),
          req;

      // temporarily, for debugging, also POST to /model-configs and show the resulting config
      req = $.ajax('/model-configs', {
        type: 'POST',
        contentType: 'application/json',
        data: propsStr
      }).done(function(data) {
        var loc  = req.getResponseHeader('Location');

        hash = '#' + /\/model-config\/(.*)$/.exec(loc)[1];

        var url = /[^#]*/.exec(document.location.href)[0] + hash;

        document.location.hash = hash;

        $('#flash').
          removeClass().
          addClass('informational-message').
          html('<p>Saved to <a href="' + url + '">' + url + '</a></p>');
      }).fail(function() {
        $('#flash').
          removeClass().
          addClass('error-message').
          html('<p>Could not save model.</p>');
      }).always(function() {
        clearTimeout(timer);
        // add .fade-out after a delay so CSS transitions notice a change.
        timer = setTimeout(function() {
          $('#flash').addClass('fade-out');
        }, 100);
      });
    });

    // we will be rearanging this when we have a better model for history
    model.lastModelConfig = JSON.stringify(model.serialize(), 2);

    model.addPropertiesListener(["all"], function() {
      if (JSON.stringify(model.serialize(true), 2) !== model.lastModelConfig) {
        $('#save-button').removeAttr("disabled");
      } else {
        $('#save-button').attr("disabled", "disabled");
      }
    });
  });

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

}());
