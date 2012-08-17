/*globals $ CodeMirror controllers model alert DEVELOPMENT: true */
/*jshint boss:true */

DEVELOPMENT = true;

(function() {

  var interactiveDefinitionLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),

      selectInteractive = document.getElementById('select-interactive'),
      interactiveTextArea = document.getElementById('interactive-text-area'),
      updateInteractiveButton = document.getElementById('update-interactive-button'),
      autoFormatSelectionButton = document.getElementById('autoformat-selection-button'),

      editor,
      controller,
      indent = 2,
      foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder),
      interactiveUrl,
      interactive,
      hash;

  function selectInteractiveHandler() {
    document.location.hash = '#' + selectInteractive.value;
  }
  selectInteractive.onchange = selectInteractiveHandler;

  if (!document.location.hash) {
    selectInteractiveHandler();
  }

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);
    selectInteractive.value = interactiveUrl;
    $("#embeddable-link").attr("href", function(i, href) { return href + hash; });

    $.get(interactiveUrl).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      interactive = results;

      interactiveTextArea.textContent = JSON.stringify(interactive, null, indent);
      editor = CodeMirror.fromTextArea(interactiveTextArea, {
        mode: 'javascript',
        indentUnit: indent,
        lineNumbers: true,
        lineWrapping: false,
        onGutterClick: foldFunc
      });
      interactiveDefinitionLoaded.resolve();
    });
  }

  function getSelectedRange() {
    return { from: editor.getCursor(true), to: editor.getCursor(false) };
  }

  function autoFormatSelection() {
    var range = getSelectedRange();
    editor.autoFormatRange(range.from, range.to);
  }
  autoFormatSelectionButton.onclick = autoFormatSelection;

  function updateInteractiveHandler() {
    interactive = JSON.parse(editor.getValue());
    controller.loadInteractive(interactive, '#interactive-container');
  }
  updateInteractiveButton.onclick = updateInteractiveHandler;

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(interactiveDefinitionLoaded, windowLoaded).done(function(results) {
    controller = controllers.interactivesController(interactive, '#interactive-container');
  });

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

}());
