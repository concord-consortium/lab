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
      jsonModelPath, contentItems, mmlPath, cmlPath,
      viewType,
      dgPaylod, dgUrl;

  if (!document.location.hash) {
    if (selectInteractive) {
      selectInteractiveHandler();
    } else {
      document.location.hash = '#interactives/heat-and-cool-example.json';
    }
  }

  if (hash = document.location.hash) {
    interactiveUrl = hash.substr(1, hash.length);

    $.get(interactiveUrl).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      interactive = results;

      // Use the presense of selectInteractive as a proxy indicating that the
      // rest of the elements on the non-iframe-embeddable version of the page
      // are present and should be setup.
      if (selectInteractive) {
        setupFullPage();
      } else {
        viewType = 'interactive-iframe';
      }

      interactiveDefinitionLoaded.resolve();
    });
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(interactiveDefinitionLoaded, windowLoaded).done(function(results) {
    controller = controllers.interactivesController(interactive, '#interactive-container', viewType);
  });

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

  //
  // The following functions are only used when rendering the
  // non-embeddable Interactive page
  //
  function selectInteractiveHandler() {
    document.location.hash = '#' + selectInteractive.value;
  }

  function updateInteractiveHandler() {
    interactive = JSON.parse(editor.getValue());
    controller.loadInteractive(interactive, '#interactive-container');
  }

  function getSelectedRange() {
    return { from: editor.getCursor(true), to: editor.getCursor(false) };
  }

  function autoFormatSelection() {
    var range = getSelectedRange();
    editor.autoFormatRange(range.from, range.to);
  }

  // used to extract values from nested object: modelList
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

  function setupFullPage() {
    selectInteractive.value = interactiveUrl;

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

    // construct link to DataGames embeddable version of Interactive
    $("#datagames-link").attr("href", function(i, href) {
      dgPayload = [{
        "name": $(selectInteractive).find("option:selected").text(),
        "dimensions": {
          "width": 600,
          "height":400
        },
        "url": "DataGames/Games/concord-lab" + "/examples/interactives/embeddable.html#" +  interactiveUrl
      }];
      dgUrl = "http://is.kcptech.com/dg?moreGames=" + JSON.stringify(dgPayload);
      return encodeURI(dgUrl)
    });

    // Copy Interactive json to code editor
    interactiveTextArea.textContent = JSON.stringify(interactive, null, indent);
    editor = CodeMirror.fromTextArea(interactiveTextArea, {
      mode: 'javascript',
      indentUnit: indent,
      lineNumbers: true,
      lineWrapping: false,
      onGutterClick: foldFunc
    });

    selectInteractive.onchange = selectInteractiveHandler;
    updateInteractiveButton.onclick = updateInteractiveHandler;
    autoFormatSelectionButton.onclick = autoFormatSelection;
  }

}());
