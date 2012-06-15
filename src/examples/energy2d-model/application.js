/*globals energy2d, $ */
/*jslint indent: 2 */
// ------------------------------------------------------------
//
// Energy2D Demo
//
// ------------------------------------------------------------

(function () {
  'use strict';
  var
    DEFAULT_INTERACTIVE_HASH = "#interactives/simple-example.json",
    window_loaded = $.Deferred(),
    options_loaded = $.Deferred(),
    hash,
    interactive_url,
    interactive_options,
    controller,
    loadInteractive = function () {

    };

  hash = document.location.hash || DEFAULT_INTERACTIVE_HASH;
  interactive_url = hash.substr(1, hash.length);

  $.get(interactive_url).done(function (results) {
    interactive_options = results;
    options_loaded.resolve();
  });

  $(window).load(function () {
    window_loaded.resolve();
  });

  $.when(window_loaded, options_loaded).done(function () {
    controller = energy2d.controllers.makeInteractiveController(interactive_options, '#interactive-container');
  });
}());