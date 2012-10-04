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

      interactiveUrl, interactive;

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);
    $.get(interactiveUrl).done(function(results) {
      if (typeof results === "string") { results = JSON.parse(results); }
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

}());
