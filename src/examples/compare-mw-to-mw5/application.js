/*globals $ controllers model alert */
/*jshint boss:true */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

var controller;

(function() {

  var modelConfig = {
        mol_number          : 50,
        lennardJonesForces  : true,
        coulombForces       : false,
        width               : 10,
        height              : 10
      },

      playerConfig = {
        layoutStyle        : 'compare-screen',
        autostart          : false,
        maximum_model_steps: Infinity,
        lj_epsilon_min     : -0.4,
        lj_epsilon_max     : -0.01034
      },

      optsLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),

      hash, modelUrl, fragment,
      initialHash = "#" + "/imports/legacy-mw-content/converted/potential-tests/two-atoms-two-elements/two-atoms-two-elements$0.json",
      opts,
      timer;

  function actualRootPath(url) {
    if (typeof Lab.config.actualRoot === "undefined" || url.charAt(0) !== "/") {
      return url;
    } else {
      return Lab.config.actualRoot + url;
    }
  }

  if (document.location.hash === "") {
    document.location.hash = initialHash;
  }
  if (hash = document.location.hash) {
    hash = hash.substr(1, hash.length);
    modelUrl = ~hash.indexOf(".json") ? hash : '/md2d_models/' + hash;
    $.get(actualRootPath(modelUrl)).done(function(results) {
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
    controller = controllers.compareModelsController('#model-container', '#applet-container', 'model-select', modelConfig, playerConfig);

    $('#save-button').attr("disabled", "disabled").click(function() {
      var props     = model.serialize(true),
          propsStr  = JSON.stringify(props, 2),
          req;

      // temporarily, for debugging, also POST to /model-configs and show the resulting config
      req = $.ajax('/md2d_models', {
        type: 'POST',
        contentType: 'application/json',
        data: propsStr
      }).done(function(data) {
        var loc  = req.getResponseHeader('Location');

        fragment = /\/md2d_models\/(.*)$/.exec(loc)[1];
        hash = "#" + fragment;

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
