/*globals $ controllers model alert */
/*jshint boss:true */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

(function() {

  var optsLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),
      selectInteractive = document.getElementById('select-interactive'),

      interactiveUrl, interactive;

  function selectInteractiveHandler() {
    document.location.hash = "#" + selectInteractive.value;
  }
  selectInteractive.onchange = selectInteractiveHandler;

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);
    selectInteractive.value = interactiveUrl;
    $.get(interactiveUrl).done(function(results) {
      interactive = results;
      optsLoaded.resolve();
    });
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(optsLoaded, windowLoaded).done(function(results) {
    controllers.interactivesController(interactive, '#interactive-container');
  });

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

}());
