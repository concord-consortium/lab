/*globals modeler, ModelPlayer, layout, modelController */

// simplemolecules.js
//

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
      elements            : [ // example element. Actually the same as md2d's default
                              {
                                id: 0,
                                mass: 39.95,
                                sigma: 0.34,
                                epsilon: -0.1
                              }
                            ],
      mol_number          : 50,
      temperature_control : false,
      lennard_jones_forces: true,
      coulomb_forces      : false,
      width               : 10,
      height              : 10
    },

    playerConfig = {
      layoutStyle        : 'full-static-screen',
      autostart          : false,
      maximum_model_steps: 5000,
      lj_epsilon_min     : -0.4,
      lj_epsilon_max     : -0.01034
    },

    optsLoaded = $.Deferred(),
    windowLoaded = $.Deferred(),

    hash, modelUrl,
    opts;

function actualRootPath(url) {
  if (typeof ACTUAL_ROOT === "undefined" || url.charAt(0) !== "/") {
    return url;
  } else {
    return ACTUAL_ROOT + url;
  }
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
  controller = controllers.complexModelController('#molecule-container', '#ke-chart', '#lj-potential-chart', '#speed-distribution-chart', modelConfig, playerConfig);
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
      hash = '#' + /\/md2d_models\/(.*)$/.exec(loc)[1];
      var url = /[^#]*/.exec(document.location.href)[0] + hash;

      document.location.hash = hash;
      $('#flash').html('Saved to <a href="' + url + '">' + url + '</a>');
    }).fail(function() {
      $('#flash').html('<p class="error-message">Could not save model</p>');
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

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });
});

}());