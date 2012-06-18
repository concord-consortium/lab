/*globals $ controllers model alert */
/*jshint boss:true */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var ROOT = "/examples",
    ROOT_REGEX = new RegExp(ROOT + "/.*$"),
    ACTUAL_ROOT = document.location.pathname.replace(ROOT_REGEX, '');

(function() {

  var modelConfig = {
        temperature         : 3,
        epsilon             : -0.05,
        lennard_jones_forces: true,
        coulomb_forces      : false,
        atoms : {
          X : [
                3.3333332538604736,
                6.666666507720947,
                3.3333332538604736,
                6.666666507720947
              ],
          Y : [
                3.3333332538604736,
                3.3333332538604736,
                6.666666507720947,
                6.666666507720947
              ],
          VX: [
                0.0002,
                -0.0002,
                0.0002,
                -0.0002
              ],
          VY: [
                0.0002,
                0.0002,
                -0.0002,
                -0.0002
              ],
          CHARGE: [
                1,
                -1,
                -1,
                -1
              ]
        }
      },

      playerConfig = {
        layoutStyle        : 'simple-static-screen',
        autostart          : false,
        maximum_model_steps: Infinity,
        lj_epsilon_min     : -0.4,
        lj_epsilon_max     : -0.01034
      },

      optsLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),

      hash,
      controller,
      opts;

  if (hash = document.location.hash) {
    hash = hash.substr(1, hash.length);
    $.get('/model-config/' + hash).done(function(results) {
      if (typeof results === "string") { results = JSON.parse(results); }
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
      var props     = model.serialize(),
          propsStr  = JSON.stringify(props, 2),
          req;

      // temporarily, for debugging, also POST to /model-configs and show the resulting config
      req = $.ajax('/model-configs', {
        type: 'POST',
        contentType: 'application/json',
        data: propsStr
      }).done(function(data) {
        var loc  = req.getResponseHeader('Location'),
            hash = '#' + /\/model-config\/(.*)$/.exec(loc)[1],
            url  = document.location.pathname + hash;

        document.location.hash = hash;
        $('#flash').html('Saved to <a href="' + url + '">' + url + '</a>');
      }).fail(function() {
        $('#flash').html('<p class="error-message">Could not save model</p>');
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
