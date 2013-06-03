/*jslint indent: 2, browser: true */
/*global Lab: false, $: false, interactivesIndex: false */
// ------------------------------------------------------------
//
// Energy2D Demo
//
// ------------------------------------------------------------

$(window).load(function () {
  'use strict';

  var
    DEFAULT_INTERACTIVE = "vortex100",
    hash,
    interactive_url,
    interactive_options,
    controller,
    select = $("#select-interactive"),
    enable_WebGL_checkbox = $('#enable-WebGL');

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

  select.find("option[data-path='" + interactive_url + "']").prop('selected', true);

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
  select.change(function () {
    document.location.hash = "#" + $(select.find("option:selected")[0]).data('path');
  });

  enable_WebGL_checkbox.change(function () {
    controller.setWebGLEnabled($(this).prop("checked"));
  });

  $(window).bind('hashchange', function () {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });
});
