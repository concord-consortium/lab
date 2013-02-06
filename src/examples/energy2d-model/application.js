/*jslint indent: 2, browser: true */
/*globals lab: false, $: false, interactivesIndex: false, require: false */
// ------------------------------------------------------------
//
// Energy2D Demo
//
// ------------------------------------------------------------

(function () {
  'use strict';

  // Application logic.
  var applicationCallback = function () {
    var
      DEFAULT_INTERACTIVE = "benard_cell",
      hash,
      interactive_url,
      interactive_options,
      controller,
      select = $("#select-interactive");

    // Build interactive selection.
    $.each(interactivesIndex, function (key, value) {
      select.append($("<option>")
        .attr('value', key)
        .text(value.name)
        .attr('data-path', value.path));
    });

    // Handle hash.
    hash = document.location.hash || "#" + interactivesIndex[DEFAULT_INTERACTIVE].path;
    document.location.hash = hash;
    interactive_url = hash.substr(1, hash.length);

    select.find("option[data-path='" + interactive_url + "']").attr('selected', true);

    // Download interactive options and create Energy2D Interactive Controller.
    $.get(interactive_url).done(function (results) {
      if (typeof results === "string") { results = JSON.parse(results); }
      interactive_options = results;

      controller = Lab.energy2d.InteractiveController(
        interactive_options,
        '#interactive-container',
        '#interactive-description'
      );
    });

    // Implement events callbacks.
    select.change(function (option) {
      document.location.hash = "#" + $(select.find("option:selected")[0]).data('path');
    });

    $(window).bind('hashchange', function () {
      if (document.location.hash !== hash) {
        location.reload();
      }
    });
  };

  if (typeof require === 'function') {
    // Use RequireJS if it's available.

    // Config for Energy2D application.
    require.config({
      baseUrl: "../../lab-amd/energy2d",
      paths: {
        jquery: "../../vendor/jquery/jquery.min",
        domReady: "../../vendor/domReady/domReady",
        // Text RequireJS plugin is required by Energy2D application.
        text: "../../vendor/text/text"
      }
    });

    // Finally, call require to resolve dependencies and run application callback.
    require([
      // Dependencies:

      // Use domReady RequireJS plugin, as jquery(document).ready() doesn't work
      // with RequireJS asynchronous module loading.
      // See: http://requirejs.org/docs/api.html#pageload
      'domReady!',

      // Load jQuery.
      'jquery',

      // This file creates global variable called interactivesIndex.
      // To load local file, not RequireJS module, add .js suffix
      // (RequireJS won't use baseUrl defined above in the config).
      'interactives-index.js',

      // Energy2D Public API.
      // It exposes public API to Lab.energy2d global object.
      // Note that particular classes can be loaded directly, e.g.:
      // 'controller/interactive'
      // but to keep consistency with optimized built, use 
      // global namespace.
      'public-api'
    ], applicationCallback);
  } else {
    // Use traditional approach.
    // Assume that dependencies are injected somehow (e.g. using HTML script tag).

    // Use jQuery(window).load as it's available when RequireJS is not used.
    $(window).load(applicationCallback);
  }

}());
