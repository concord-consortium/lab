/*globals $ controllers model alert */
/*jshint boss:true */
// ------------------------------------------------------------
//
// General Parameters for the Molecular Simulation
//
// ------------------------------------------------------------

DEVELOPMENT = true;

(function() {

  var optsLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),
      selectInteractive = document.getElementById('select-interactive'),
      interactiveTextArea = document.getElementById('interactive-text-area'),
      updateInteractiveButton = document.getElementById('update-interactive-button'),
      autoFormatSelectionButton = document.getElementById('auto-format-selection-button'),
      editor, controller, 
      indent = 2,
      foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder),

      interactiveUrl, interactive;

  function selectInteractiveHandler() {
    document.location.hash = "#" + selectInteractive.value;
  }
  selectInteractive.onchange = selectInteractiveHandler;

  if (!document.location.hash) {
     document.location.hash = "#interactives/heat-and-cool-example.json";
  }

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);
    selectInteractive.value = interactiveUrl;
    $.get(interactiveUrl).done(function(results) {
      interactive = results;
      interactiveTextArea.textContent = JSON.stringify(interactive, null, indent);
      editor = CodeMirror.fromTextArea(interactiveTextArea, {
        mode: "javascript",
        indentUnit: indent,
        lineNumbers: true,
        lineWrapping: false,
        onGutterClick: foldFunc
      });
      optsLoaded.resolve();
    });
  }

  function getSelectedRange() {
    return { from: editor.getCursor(true), to: editor.getCursor(false) };
  }

  function autoFormatSelection() {
    var range = getSelectedRange();
    editor.autoFormatRange(range.from, range.to);
  }
  autoFormatSelectionButton = autoFormatSelection;

  function updateInteractiveHandler() {
    interactive = JSON.parse(editor.getValue());
    controller.loadInteractive(interactive, '#interactive-container');
    controller.updateLayout();
  }
  updateInteractiveButton.onclick = updateInteractiveHandler;

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(optsLoaded, windowLoaded).done(function(results) {
    controller = controllers.interactivesController(interactive, '#interactive-container');
  });

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

}());
