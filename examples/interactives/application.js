/*globals $ CodeMirror controllers model alert DEVELOPMENT: true */
/*jshint boss:true */

DEVELOPMENT = true;

var ROOT = "/examples",
    ROOT_REGEX = new RegExp(ROOT + "/.*$"),
    ACTUAL_ROOT = document.location.pathname.replace(ROOT_REGEX, '');

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
      hash,
      jsonModelPath, contentItems, mmlPath, cmlPath;

  function selectInteractiveHandler() {
    document.location.hash = '#' + selectInteractive.value;
  }
  selectInteractive.onchange = selectInteractiveHandler;

  if (!document.location.hash) {
    selectInteractiveHandler();
  }

  function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
      if (!obj.hasOwnProperty(i)) continue;
      if (typeof obj[i] == 'object') {
        objects = objects.concat(getObjects(obj[i], key, val));
      } else if (i == key && obj[key] == val) {
        objects.push(obj);
      }
    }
    return objects;
  }

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);
    selectInteractive.value = interactiveUrl;

    $.get(interactiveUrl).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      interactive = results;

      // construct link to embeddable version of Interactive
      $("#embeddable-link").attr("href", function(i, href) { return href + hash; });

      // construct Java MW link for running Interactive via jnlp
      // uses generated resource list: /imports/legacy-mw-content/model-list.js
      jsonModelPath = interactive.model.url;
      mmlPath = jsonModelPath.replace("/imports/legacy-mw-content/converted/", "").replace(".json", ".mml")
      contentItems = getObjects(modelList, "mml", mmlPath);
      if (contentItems.length > 0) {
        $("#java-mw-link").attr("href", function(i, href) {
          return "/jnlp/jnlps/org/concord/modeler/mw.jnlp?version-id=1.0&jnlp-args=remote," + window.location.origin + ACTUAL_ROOT + "/imports/legacy-mw-content/" + contentItems[0].cml;
        });
      }

      // Copy Interactive json to code editor
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
