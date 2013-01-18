/*global Lab _ $ d3 CodeMirror controllers model modelList benchmark layout DEVELOPMENT: true AUTHORING: true */
/*jshint boss:true */

DEVELOPMENT = true;

// Strawman setting for telling the interactive to be in "author mode",
// allowing things like positioning textBoxes by hand.
AUTHORING = false;

var ROOT = "/examples",
    ROOT_REGEX = new RegExp(ROOT + "/.*$"),
    ACTUAL_ROOT = document.location.pathname.replace(ROOT_REGEX, '');

(function() {

  var interactiveDefinitionLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),
      origin,
      embeddablePath,
      embeddableUrl,
      interactiveDescriptions,
      interactives,
      groups,
      iframePhone,

      $interactiveHeader = $("#interactive-header"),
      $interactiveTitle = $("#interactive-title"),
      $selectInteractive = $("#select-interactive"),

      $updateInteractiveButton = $("#update-interactive-button"),
      $autoFormatSelectionButton = $("#autoformat-selection-button"),
      $interactiveTextArea = $("#interactive-text-area"),

      $updateModelButton = $("#update-model-button"),
      $modelTextArea = $("#model-text-area"),

      $creditsLink = $("#credits-link"),
      $creditsPane = $("#credits-pane"),
      $creditsPaneClose = $('#credits-pane-close'),

      $aboutLink = $("#about-link"),
      $aboutPane = $("#about-pane"),
      $aboutPaneClose = $('#about-pane-close'),

      $shareLink = $("#share-link"),
      $sharePane = $("#share-pane"),
      $sharePaneClose = $('#share-pane-close'),
      $shareIframeContent = $("#share-iframe-content"),
      $shareSelectIframeSize = $("#share-select-iframe-size"),

      $editor = $("#editor"),
      $editorExtrasItem = $("editor.extras-item"),
      $showEditor = $("#show-editor"),
      $editorContent = $("#editor-content"),

      $modelEditor = $("#model-editor"),
      $showModelEditor = $("#show-model-editor"),
      $modelEditorContent = $("#model-editor-content"),

      $benchmarksExtrasItem = $("benchmarks.extras-item"),
      $showBenchmarks = $("#show-benchmarks"),
      $benchmarksContent = $("#benchmarks-content"),
      $runBenchmarksButton = $("#run-benchmarks-button"),
      benchmarksToRun,

      $modelEnergyGraphExtrasItem = $("model-energy-graph.extras-item"),
      $showModelEnergyGraph = $("#show-model-energy-graph"),
      $modelEnergyGraphContent = $("#model-energy-graph-content"),
      modelEnergyGraph,
      modelEnergyData = [],

      $modelDatatableExtrasItem = $("model-datatable.extras-item"),
      $showModelDatatable = $("#show-model-datatable"),
      $modelDatatableContent = $("#model-datatable-content"),
      $modelDatatableResults = $("#model-datatable-results"),
      $modelDatatableStats = $("#model-datatable-stats"),

      $previousInteractive = $("#previous-interactive"),
      $nextInteractive = $("#next-interactive"),

      applicationCallbacks,
      editor,
      modelEditor,
      controller,
      indent = 2,
      foldFunc,
      interactiveUrl,
      interactive,
      hash,
      jsonModelPath, contentItems, mmlPath,
      viewType,
      buttonHandlersAdded = false,
      modelButtonHandlersAdded = false;

  if (!document.location.hash) {
    if ($selectInteractive.length > 0 && $selectInteractive.val()) {
      selectInteractiveHandler();
    } else {
      document.location.hash = '#interactives/samples/1-oil-and-water-shake.json';
    }
  }

  function getHash() {
    var match,
        h = document.location.hash;
    if (h) {
      match = h.match(/(.*?\.json)/);
      h = match[1];
    }
    return h;
  }

  if (hash = getHash()) {
    interactiveUrl = hash.substr(1, hash.length);

    $.get(interactiveUrl).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      interactive = results;

      if (interactive.title) {
        document.title = interactive.title;
      }

      // Use the presense of selectInteractive as a proxy indicating that the
      // rest of the elements on the non-iframe-embeddable version of the page
      // are present and should be setup.
      if ($selectInteractive.length) {
        AUTHORING = true;
        applicationCallbacks = [setupFullPage];
      } else {
        if ($editor.length) {
          viewType = 'interactive-author-iframe';
          applicationCallbacks = [setupEmbeddableAuthorPage];
        } else {
          viewType = 'interactive-iframe';
        }
      }

      interactiveDefinitionLoaded.resolve();
    });
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  function onFullPage(){
    return ($selectInteractive.length > 0 && !$("#render-in-iframe").is(':checked'));
  }

  function onFullIFramePage() {
    return ($selectInteractive.length > 0 && $("#render-in-iframe").is(':checked'));
  }

  $.when(interactiveDefinitionLoaded, windowLoaded).done(function() {

    restoreOptionsFromCookie();

    if(!onFullIFramePage()) {
      controller = controllers.interactivesController(interactive, '#interactive-container', applicationCallbacks, viewType);
    }

    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];
    embeddablePath = location.pathname.replace(/\/[^\/]+$/, "/embeddable.html");
    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];
    embeddableUrl = origin + embeddablePath + hash;

    setupCreditsPane();
    setupAboutPane();
    setupSharePane();
    if(onFullIFramePage()) {
      applicationCallbacks[0]();
    }
  });

  $(window).bind('hashchange', function() {
    if (getHash() !== hash) {
      location.reload();
    }
  });

  function setupCreditsPane() {
    var interactiveCreditsUrl,
        newWindow,
        titleString,
        concordUrl, nextGenUrl,
        concordLink, nextGenLink,
        interactiveCreditsLink, googleOrgLink,
        utmString,
        $creditsContent = $('#credits-content');

    $creditsLink.click(function() {
      $creditsPane.show(100);
    });
    $creditsPaneClose.click(function() {
      $creditsPane.hide(100);
    });
    $creditsPane.draggable({ handle: "#credits-pane-banner" });
    $("#credits-pane-title").text("Credits: " + interactive.title);

    concordUrl = 'http://concord.org';
    nextGenUrl = 'http://mw.concord.org/nextgen/';
    interactiveCreditsUrl = Lab.config.home + Lab.config.homeEmbeddablePath + hash;
    newWindow = " class='opens-in-new-window' target='_blank";
    utmString = "utm_source=" + encodeURIComponent(interactive.title.replace(/ /gi,"+")) + "&utm_medium=embedded_interactive&utm_campaign=" + Lab.config.utmCampaign;

    if (Lab.config.utmCampaign) {
      concordUrl += "?" + utmString;
      nextGenUrl += "?" + utmString;
      interactiveCreditsUrl += "&" + encodeURI("utm_source=embed_link&utm_medium=embedded_interactive&utm_campaign=" + Lab.config.utmCampaign);
    }

    concordLink = "<a href='" + concordUrl + "'" + newWindow + "'>Concord Consortium</a>";
    nextGenLink = "<a href='" + nextGenUrl + "'" + newWindow + "'>Next-Generation Molecular Workbench</a>";
    interactiveCreditsLink = "<a href='" + "'" + interactiveCreditsUrl + newWindow + "'>shareable version</a>";
    googleOrgLink = "<a href='http://www.google.org/' " + newWindow + "'>Google.org</a>";
    $creditsContent.append('<p>This interactive was created by the ' + concordLink + ' using our ' + nextGenLink + ' software, with funding by a grant from ' + googleOrgLink + '.</p>');
    if (!Lab.config.sharing) {
      $creditsContent.append('<p>Explore or embed a <a href=' + interactiveCreditsUrl +
        ' class="opens-in-new-window" target="_blank">shareable version</a> of this interactive, and discover other open source interactives for math, science and engineering at <a href="' +
        concordUrl + '" class="opens-in-new-window" target="_blank">concord.org</a>.</p>');
    }
  }

  function setupAboutPane() {
    var about = interactive.about,
        $aboutContent = $('#about-content');

    if (interactive.subtitle || about) {
      $aboutLink.click(function() {
        $aboutPane.show(100);
      });
      $aboutPaneClose.click(function() {
        $aboutPane.hide(100);
      });
      $aboutPane.draggable({ handle: "#about-pane-banner" });
      $("#about-pane-title").text("About: " + interactive.title);

      if (interactive.subtitle) {
        $aboutContent.append('<p>' + interactive.subtitle + '</p>');
      }

      if (Object.prototype.toString.call(interactive.about) !== "[object Array]") {
        about = [about];
      }
      _.each(about, function(p) {
        $aboutContent.append('<p>' + p + '</p>');
      });
    } else {
      $aboutLink.hide();
    }
  }

  function setupSharePane() {
    if (Lab.config.sharing) {
      $shareLink.show();
      $shareLink.click(function() {
        $sharePane.show(100);
      });
      $sharePaneClose.click(function() {
        $sharePane.hide(100);
      });
      $shareSelectIframeSize.change(updateShareIframeContent);
      $sharePane.draggable({ handle: "#share-pane-banner" });
      $("#share-pane-title").text("Share: " + interactive.title);
      $("#share-embeddable-link").attr("href", embeddableUrl);
      $('#share-embeddable-link-content').val(embeddableUrl);
      updateShareIframeContent();
    } else {
      $shareLink.hide();
      return;
    }
    function updateShareIframeContent() {
      var actualWidth, actualHeight,
          sizeAttributes = "",
          sizeChoice = $shareSelectIframeSize.val(),
          notEmbedded = $selectInteractive.length,
          $content;

      if (notEmbedded) {
        $content = $("#content");
        actualWidth = $content.width();
        actualHeight = $content.height();
      } else {
        actualWidth = $(document).width();
        actualHeight = $(document).height();
      }
      switch(sizeChoice) {
        case "actual":
        sizeAttributes = 'width="' + actualWidth + 'px" height="' + actualHeight + 'px"';
        break;
        case "smaller":
        sizeAttributes = 'width="' + Math.floor(actualWidth * 0.7) + 'px" height="' + Math.floor(actualHeight  * 0.7) + 'px"';
        break;
        case "larger":
        sizeAttributes = 'width="' + Math.floor(actualWidth * 1.5) + 'px" height="' + Math.floor(actualHeight  * 1.5) + 'px"';
        break;
      }
      $shareIframeContent.val('<iframe ' + sizeAttributes + ' frameborder="no" scrolling="no" src="' + embeddableUrl + '"></iframe>');
    }
    setupSharePane.resize = updateShareIframeContent;
    layout.addView('setupSharePane', setupSharePane);
  }

  //
  // The following functions are only used when rendering the
  // non-embeddable Interactive page
  //
  function selectInteractiveHandler() {
    document.location.hash = '#' + $selectInteractive.val();
  }

  $selectInteractive.change(selectInteractiveHandler);

  // used to extract values from nested object: modelList
  function getObjects(obj, key, val) {
    var objects = [],
        i;

    for (i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (typeof obj[i] === 'object') {
          objects = objects.concat(getObjects(obj[i], key, val));
        } else if (i === key && obj[key] === val) {
          objects.push(obj);
        }
      }
    }
    return objects;
  }

  function setupSelectList() {
    $selectInteractive.empty();
    $selectInteractive.append($("<option>")
          .attr('value', 'select')
          .text("Select an Interactive ...")
          .attr('disabled', true));
    saveOptionsToCookie();
    interactives = interactiveDescriptions.interactives;
    groups = _.filter(interactiveDescriptions.groups, function(group) {
      var curriculumFilter = $("#curriculum-filter").is(':checked'),
          examplesFilter = $("#examples-filter").is(':checked'),
          benchmarksFilter = $("#benchmarks-filter").is(':checked'),
          testsFilter = $("#tests-filter").is(':checked');
      if (group.category === "Samples") return true;
      if (curriculumFilter && group.category === "Curriculum") return true;
      if (examplesFilter && group.category === "Examples") return true;
      if (benchmarksFilter && group.category === "Benchmarks") return true;
      if (testsFilter && group.category === "Tests") return true;
      return false;
    });
    _.each(groups, function (group) {
      var publicFilter = $("#public").is(':checked'),
          draftFilter = $("#draft").is(':checked'),
          interactiveGroup = interactives.filter(function (interactive) {
            if (interactive.groupKey !== group.path) return false;
            if (interactive.publicationStatus === 'sample') return true;
            if (publicFilter && interactive.publicationStatus === 'public') return true;
            if (draftFilter && interactive.publicationStatus === 'draft') return true;
          }),
          $optgroup = $("<optgroup>").attr('label', group.name);
      interactiveGroup.forEach(function (interactive) {
        var title;
        if (interactive.publicationStatus === 'draft') {
          title = "* " + interactive.title;
        } else {
          title = interactive.title;
        }
        $optgroup.append($("<option>")
          .attr('value', interactive.path)
          .text(title)
          .attr('data-path', interactive.path));
      });
      if (interactiveGroup.length > 0) {
        $selectInteractive.append($optgroup);
      }
    });
    if ($selectInteractive.find('option[value="' + interactiveUrl + '"]').length === 0) {
      $selectInteractive.val("select");
    } else {
      $selectInteractive.val(interactiveUrl);
    }
    updateNextPreviousInteractiveStatus();
  }

  function setupEmbeddableAuthorPage() {
    var origin;
    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];

    jsonModelPath = interactive.models[0].url;
    $("#json-model-link").attr("href", origin + ACTUAL_ROOT + jsonModelPath);

    setupCodeEditor();
  }

  function setupFullPage() {
    $.get('interactives.json').done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      interactiveDescriptions = results;
      restoreOptionsFromCookie();
      setupSelectList();
      $("#select-filters input").click(setupSelectList);
      $("#render-controls input").click(function() {
        saveOptionsToCookie();
        location.reload();
      });
      $interactiveTitle.text(interactive.title);
      if (interactive.publicationStatus === 'draft') {
        $interactiveTitle.append(" <i>(draft)</i>");
      }
      if (interactive.subtitle) {
        $("#interactive-subtitle").remove();
        $interactiveHeader.append('<div id="interactive-subtitle">' + interactive.subtitle + '</div>');
      }
      finishSetupFullPage();
    });
  }

  function restoreOptionsFromCookie() {
    var cookie = document.cookie.match(/lab-interactive-options=(.*)(;|$)/),
        str,
        settings;
    if (cookie) {
      str = cookie[1],
      settings = str.split('&').map(function (i) { return i.split('='); });
      $("#header input").each(function(i, el) {
        var match = _.find(settings, function(e) { return e[0] === el.id; }, this);
        if (match && el.id === match[0]) {
          el.checked = true;
        } else {
          el.checked = false;
        }
      });
    }
  }

  function saveOptionsToCookie() {
    document.cookie = "lab-interactive-options=" + $("#header input").serialize() + " ; max-age=" + 30*60*60*24;
  }


  function finishSetupFullPage() {
    var java_mw_href,
        java_mw_link = $("#java-mw-link"),
        origin;

    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];

    setupNextPreviousInteractive();

    // construct link to embeddable version of Interactive
    $("#embeddable-link").attr("href", function(i, href) { return href + hash; });

    jsonModelPath = interactive.models[0].url;

    // construct Java MW link for running Interactive via jnlp
    // uses generated resource list: /imports/legacy-mw-content/model-list.js
    mmlPath = jsonModelPath.replace("/imports/legacy-mw-content/converted/", "").replace(".json", ".mml");
    contentItems = getObjects(modelList, "mml", mmlPath);
    if (contentItems.length > 0) {
      java_mw_href = "/jnlp/jnlps/org/concord/modeler/mw.jnlp?version-id=1.0&jnlp-args=remote," +
                      origin + ACTUAL_ROOT + "/imports/legacy-mw-content/" + contentItems[0].cml;
      java_mw_link.attr("href", java_mw_href);
    } else {
      java_mw_link.removeAttr("href");
      java_mw_link.attr("title", "Java MW link not available for this interactive");
      java_mw_link.addClass("na");
    }

    // construct link to DataGames embeddable version of Interactive
    $("#datagames-link").attr("href", function() {
      var dgPayload = [{
            "name": $selectInteractive.find("option:selected").text(),
            "dimensions": {
              "width": 600,
              "height":400
            },
            "url": "DataGames/Games/concord-lab" + "/examples/interactives/embeddable.html#" +  interactiveUrl
          }],
          dgUrl = "http://is.kcptech.com/dg?moreGames=" + JSON.stringify(dgPayload);
      return encodeURI(dgUrl);
    });
    setupExtras();
  }

  function setupExtras() {
    //
    // Extras
    //
    if(onFullPage()) {
      // set keyboard focus on MD2D view
      // FIXME: generalize when multiple model types implemented
      controller.modelController.moleculeContainer.setFocus();
      $("#json-model-link").attr("href", origin + ACTUAL_ROOT + jsonModelPath);
      setupCodeEditor();
      setupModelCodeEditor();
      setupBenchmarks();
      // pass in the model
      setupEnergyGraph(model);

      setupAtomDataTable();
      $("#content-banner").show();
      $("#extras-bottom").show();
    } else {
      setupEnergyGraph();
      $("#content-banner").hide();
      // $("#model-energy-graph").hide();
      $("#model-datatable").hide();
      $("#content").css("border", "none");
      setupCodeEditor();
      setupModelCodeEditor();
      setupBenchmarks();
      // send this message to Interactive in iframe
      // controller.modelController.moleculeContainer.setFocus();
      var childIFrameObj = {},
          $iframeWrapper = $('<div id="iframe-wrapper" class="ui-widget-content"></div>'),
          $iframe = $('<iframe id="iframe-interactive" width="100%" height="100%" frameborder="no" scrolling="no" src="' + embeddableUrl + '"></iframe>');

      $iframeWrapper.append($iframe);
      $("#viz").append($iframeWrapper);
      iframePhone = setupIframeListenerFor($iframe[0]);



      $iframeWrapper.resizable({ helper: "ui-resizable-helper" });
      // $(".view").bind('resize', update);
    }
  }

  function setupIframeListenerFor(iframe) {
    var iframeOrigin = iframe.src.match(/(.*?\/\/.*?)\//)[1],
        selfOrigin   = window.location.href.match(/(.*?\/\/.*?)\//)[1],
        iframePhone  = {},
        post = function(message) {
          message.origin = selfOrigin;
          try {
            iframe.contentWindow.postMessage(message, iframeOrigin);
          } catch (e) {
              // Assume that failure means we can only post strings, not objects (IE9)
              // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
              iframe.contentWindow.postMessage(JSON.stringify(message), iframeOrigin);
            }
          };
    iframePhone.handlers = {};


    iframePhone.addListener = function(messageName,func) {
      iframePhone.handlers[messageName] = func;
    };

    iframePhone.removeListener = function(messageName) {
      iframePhone.handlers[messageName] = null;
    };

    iframePhone.addDispatchListener = function(eventName,func,properties) {
      iframePhone.addListener(eventName,func);
      iframePhone.post({
        'type': 'listenForDispatchEvent',
        'eventName': eventName,
        'properties': properties
      });
    };

    // when we receive 'hello':
    iframePhone.addListener('hello', function() {
      post({
        type: 'hello'
      });
      // tell the interactive to focus
      post({
        type: 'setFocus'
      });
    });

    var receiveMessage = function (message) {
      var messageData;

      if (message.source === iframe.contentWindow && message.origin === iframeOrigin) {
        messageData = message.data;
        if (typeof messageData === 'string') {
          messageData = JSON.parse(messageData);
        }
        if (iframePhone.handlers[messageData.type]){
          iframePhone.handlers[messageData.type](messageData.values);
        }
        else {
          console.log("cant handle type: " + messageData.type);
        }
      }
    };

    window.addEventListener('message', receiveMessage, false);
    iframePhone.post = post;
    return iframePhone;
  }

  // Setup and enable next and previous Interactive buttons
  function setupNextPreviousInteractive() {
    updateNextPreviousInteractiveStatus();
    $previousInteractive.click(function() {
      var $selectInteractive = $("#select-interactive"),
          $options = $selectInteractive.find("option:enabled"),
          $selection = $options.filter(":selected"),
          index = $options.index($options.filter(":selected"));
      // reset index if current Interactive not in select list
      if (index === -1) index = 1;
      if (index > 0) {
        $selection.removeAttr('selected');
        $($options[index-1]).attr('selected', 'selected');
        selectInteractiveHandler();
      } else {
        $previousInteractive.addClass("disabled");
      }
    });

    $nextInteractive.click(function() {
      var $selectInteractive = $("#select-interactive"),
          $options = $selectInteractive.find("option:enabled"),
          $selection = $options.filter(":selected"),
          index = $options.index($options.filter(":selected"));
      if (index+1 < $options.length) {
        $selection.removeAttr('selected');
        $($options[index+1]).attr('selected', 'selected');
        selectInteractiveHandler();
      } else {
        this.addClass("disabled");
      }
    });
  }

  function updateNextPreviousInteractiveStatus() {
    var $options = $selectInteractive.find("option:enabled"),
        $selection = $options.filter(":selected"),
        index = $options.index($options.filter(":selected"));

    if (index === 0) {
      $previousInteractive.addClass("disabled");
    }

    if (index+1 >= $options.length) {
      $nextInteractive.addClass("disabled");
    }
  }

  //
  // Interactive Code Editor
  //
  function setupCodeEditor() {
    $interactiveTextArea.text(JSON.stringify(interactive, null, indent));
    foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);
    if (!editor) {
      editor = CodeMirror.fromTextArea($interactiveTextArea.get(0), {
        mode: 'javascript',
        indentUnit: indent,
        lineNumbers: true,
        lineWrapping: false,
        onGutterClick: foldFunc
      });
    }

    if (!buttonHandlersAdded) {
      buttonHandlersAdded = true;
      $updateInteractiveButton.on('click', function() {
        interactive = JSON.parse(editor.getValue());
        if(onFullPage()) {
          controller.loadInteractive(interactive, '#interactive-container');
        } else {
          iframePhone.post({ type:'loadInteractive', data:interactive  });
        }
      });

      $autoFormatSelectionButton.on('click', function() {
        // getSelectedRange is no longer in code-mirror?
        editor.autoFormatRange(editor.getCursor(true), editor.getCursor(false));
      });

      $showEditor.change(function() {
        if (this.checked) {
          $editorContent.show(100);
        } else {
          $editorContent.hide(100);
        }
      }).change();
    }
  }

  //
  // Interactive Code Editor
  //
  function setupModelCodeEditor() {
    $.get(ACTUAL_ROOT + interactive.models[0].url).done(function(results) {
      if (typeof results === 'string') results = JSON.parse(results);
      md2dModel = results;
      $modelTextArea.text(JSON.stringify(md2dModel, null, indent));
      foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);
      if (!modelEditor) {
        modelEditor = CodeMirror.fromTextArea($modelTextArea.get(0), {
          mode: 'javascript',
          indentUnit: indent,
          lineNumbers: true,
          lineWrapping: false,
          onGutterClick: foldFunc
        });
      }
      if (!modelButtonHandlersAdded) {
        modelButtonHandlersAdded = true;
        $updateModelButton.on('click', function() {
          md2dModel = JSON.parse(modelEditor.getValue());
          if(onFullPage()) {
            controller.loadModel(interactive.models[0].id, md2dModel);
          } else {
            iframePhone.post({ type:'loadModel', data: { modelId: interactive.models[0].id, modelObject: md2dModel } });
          }
        });

        $showModelEditor.change(function() {
          if (this.checked) {
            $modelEditorContent.show(100);
          } else {
            $modelEditorContent.hide(100);
          }
        }).change();
      }
    });
  }

  //
  // Benchmarks
  //
  function setupBenchmarks() {
    $showBenchmarks.change(function() {
      if (this.checked) {
        $benchmarksContent.show(100);
        $showModelEnergyGraph.attr("checked", false).change();
        $showModelDatatable.attr("checked", false).change();
        $showEditor.attr("checked", false).change();
      } else {
        $benchmarksContent.hide(100);
      }
    }).change();

    $runBenchmarksButton.on('click', function() {
      var modelController,
          benchmarksTable = document.getElementById("model-benchmark-results");

      if(onFullPage()) {
        modelController = controller.getModelController();
        benchmark.run(modelController.benchmarks,
          benchmarksTable,
          function(results) { console.log(results); },
          function() { $runBenchmarksButton.attr('disabled', true); },
          function() { $runBenchmarksButton.attr('disabled', false); });
      } else {
        iframePhone.post({ type:'runBenchmarks' });
        iframePhone.addListener('returnBenchmarks', function(message) {
          benchmark.renderToTable(benchmarksTable, message.benchmarks, message.results);
        });
      }
    });
  }


  //
  // Energy Graph
  // Pass in a model object..
  function setupEnergyGraph(_model) {
    if (!modelEnergyGraph) {
      // if (_model) {
        renderModelEnergyGraph();
      // }
    }


    function modelStepCounter() {
      if (_model) {
        return _model.stepCounter();
      }
    }

    function modelIsNewStep() {
      if (_model) {
        return _model.isNewStep();
      }
    }

    function getKineticEnergy() {
      if (_model) {
        return _model.get('kineticEnergy');
      }
    }

    function getPotentialEnergy() {
      if (_model) {
        return _model.get('potentialEnergy');
      }
    }

    function modelSampleSizeInPs() {
      var viewRefreshInterval, timeStep;

      if (_model) {
        viewRefreshInterval = _model.get('viewRefreshInterval');
        timeStep    = _model.get('timeStep');
        return _model.get("viewRefreshInterval") * _model.get("timeStep")/1000;
      }
      else {
        viewRefreshInterval = 60;
        timeStep = 10;
      }
      return viewRefreshInterval * timeStep / 1000;
    }



    function addMessageHook(name, func, props) {
      var privateName = name + '.modelEnergyGraph';
      if(_model) {
        _model.on(privateName, func); // for now
      }
      if(iframePhone) {
        iframePhone.addDispatchListener(privateName,func, props);
      }
    }

    function removeMessageHook(name) {
      var privateName = name + '.modelEnergyGraph';
      if(_model) {
        _model.on(privateName); // for now
      }
      if(iframePhone) {
        iframePhone.removeListener(privateName);
      }
    }

    function addEventListeners() {
      addMessageHook("tick", function(props) {
        updateModelEnergyGraph(props);
      }, ['kineticEnergy','potentialEnergy']);

      addMessageHook('play', function() {
        if (modelEnergyGraph.number_of_points() && modelStepCounter() < modelEnergyGraph.number_of_points()) {
          resetModelEnergyData(modelStepCounter());
          modelEnergyGraph.new_data(modelEnergyData);
        }
        modelEnergyGraph.show_canvas();
      });

      addMessageHook('reset', function() {
        renderModelEnergyGraph();
      });

      addMessageHook('stepForward', function() {
        if (modelIsNewStep()) {
          updateModelEnergyGraph();
        } else {
          modelEnergyGraph.updateOrRescale(modelStepCounter());
          modelEnergyGraph.showMarker(modelStepCounter());
        }
      });

      addMessageHook('stepBack', function() {
        modelEnergyGraph.updateOrRescale(modelStepCounter());
        modelEnergyGraph.showMarker(modelStepCounter());
      });
      // addMessageHook('seek', function() {});
    }

    function removeListeners() {
      // remove listeners
      removeMessageHook("tick");
      removeMessageHook('play');
      removeMessageHook('reset');
      // removeMessageHook('seek');
      removeMessageHook('stepForward');
      removeMessageHook('stepBack');
    }

    $showModelEnergyGraph.change(function() {
      var options;
      if (this.checked) {
        addEventListeners();
        $modelEnergyGraphContent.show(100);

      } else {
        removeListeners();
        $modelEnergyGraphContent.hide(100);
      }
    }).change();

    function updateModelEnergyGraph(props) {
      modelEnergyGraph.add_points(updateModelEnergyData(props));
    }

    function renderModelEnergyGraph() {
      var options = {
            title:     "Energy of the System (KE:red, PE:green, TE:blue)",
            xlabel:    "Model Time (ps)",
            xmin:      0,
            xmax:     50,
            sample:    modelSampleSizeInPs(),
            ylabel:    "eV",
            ymin:      -5.0,
            ymax:      5.0
          };

      $.extend(options, interactive.models[0].energyGraphOptions || []);
      resetModelEnergyData();
      options.dataset = modelEnergyData;
      removeListeners();
      if (modelEnergyGraph) {
        modelEnergyGraph.reset('#model-energy-graph-chart', options);
      }
      else {
        modelEnergyGraph = Lab.grapher.realTimeGraph('#model-energy-graph-chart', options);
      }
      addEventListeners();
    }

    // Add another sample of model KE, PE, and TE to the arrays in resetModelEnergyData
    function updateModelEnergyData(props) {

      var ke = props ? props.kineticEnergy   : getKineticEnergy(),
          pe = props ? props.potentialEnergy : getPotentialEnergy(),
          te = ke + pe;
      modelEnergyData[0].push(ke);
      modelEnergyData[1].push(pe);
      modelEnergyData[2].push(te);
      return [ke, pe, te];
    }

    // Reset the resetModelEnergyData arrays to a specific length by passing in an index value,
    // or empty the resetModelEnergyData arrays an initialize the first sample.
    function resetModelEnergyData(index) {
      var modelsteps = modelStepCounter(),
          i,
          len;

      if (index) {
        for (i = 0, len = modelEnergyData.length; i < len; i++) {
          modelEnergyData[i].length = modelsteps;
        }
        return index;
      } else {
        modelEnergyData = [[0],[0],[0]];
        return 0;
      }
    }
  }


  //
  // Atom Data Table
  //
  function setupAtomDataTable() {
    $showModelDatatable.change(function() {
      if (this.checked) {
        model.on("tick.dataTable", renderModelDatatable);
        model.on('play.dataTable', renderModelDatatable);
        model.on('reset.dataTable', renderModelDatatable);
        model.on('seek.dataTable', renderModelDatatable);
        model.on('stepForward.dataTable', renderModelDatatable);
        model.on('stepBack.dataTable', renderModelDatatable);
        renderModelDatatable();
        $modelDatatableContent.show(100);
      } else {
        model.on("tick.dataTable");
        model.on('play.dataTable');
        model.on('reset.dataTable');
        model.on('seek.dataTable');
        model.on('stepForward.dataTable');
        model.on('stepBack.dataTable');
        $modelDatatableContent.hide(100);
      }
    }).change();
  }

  function renderModelDatatable(reset) {
    var i,
        nodes = model.get_atoms(),
        atoms = [],
        $thead =  $('#model-datatable-results>thead'),
        $tbody =  $('#model-datatable-results>tbody'),
        titlerows = $modelDatatableResults.find(".title"),
        datarows = $modelDatatableResults.find(".data"),
        timeFormatter = d3.format("5.0f"),
        timePrefix = "",
        timeSuffix = " (fs)",
        column_titles = ['x', 'y', 'vx', 'vy', 'ax', 'ay', 'px', 'py', 'speed', 'charge', 'radius', 'friction', 'visible', 'element', 'mass'],
        i_formatter = d3.format(" 2d"),
        charge_formatter = d3.format(" 1.1f"),
        f2_formatter = d3.format(" 1.2f"),
        r_formatter = d3.format(" 3.3r  "),
        f_formatter = d3.format(" 3.3f  "),
        e_formatter = d3.format(" 3.3e  "),
        formatters = [f_formatter, f_formatter, e_formatter,
                      e_formatter, e_formatter, e_formatter,
                      e_formatter, e_formatter, e_formatter,
                      charge_formatter, f2_formatter, f2_formatter, i_formatter, i_formatter, i_formatter];

    atoms.length = nodes.x.length;
    reset = reset || false;

    function table_is_empty() {
      return $modelDatatableResults.find("<tr>").length === 0;
    }

    function add_row($el, kind, rownum) {
      var $row = $("<tr>");
      kind = kind || "data";
      $row.addClass(kind);
      if (typeof rownum === "number") {
        $row.attr("id", "row_" + rownum);
      }
      $el.append($row);
      return $row;
    }

    function add_data($row, content) {
      var $el = $("<td>");
      $el.text(content);
      $row.append($el);
    }

    function add_molecule_data(index) {
      var i,
          value,
          textValue,
          column,
          $row = $tbody.find(".data#row_" + index),
          $cells = $row.find('td');

      if ($cells.length > 0) {
        $cells[0].textContent = index;
        for(i = 0; i < column_titles.length; i++) {
          column = column_titles[i];
          value = nodes[column][index];
          textValue = formatters[i](value);
          $cells[i+1].textContent = textValue;
        }
      } else {
        add_data($row, index);
        for(i = 0; i < column_titles.length; i++) {
          column = column_titles[i];
          value = nodes[column][index];
          textValue = formatters[i](value);
          add_data($row, textValue);
        }
      }
    }

    function columnSort(e) {
      var $heading = $(this),
          ascending = "asc",
          descending = "desc",
          sortOrder;

      sortOrder = ascending;
      if ($heading.hasClass(ascending)) {
        $heading.removeClass(ascending);
        $heading.addClass(descending);
        sortOrder = descending;
      } else if ($heading.hasClass(descending)) {
        $heading.removeClass(descending);
        $heading.addClass(ascending);
        sortOrder = ascending;
      } else {
        $heading.addClass(descending);
        sortOrder = descending;
      }
      $heading.siblings().removeClass("sorted");
      $tbody.find("tr").tsort('td:eq('+$heading.index()+')',
        {
          sortFunction:function(a, b) {
            var anum = Math.abs(parseFloat(a.s)),
                bnum = Math.abs(parseFloat(b.s));
            if (sortOrder === ascending) {
              return anum === bnum ? 0 : (anum > bnum ? 1 : -1);
            } else {
              return anum === bnum ? 0 : (anum < bnum ? 1 : -1);
            }
          }
        }
      );
      $heading.addClass("sorted");
      e.preventDefault();
    }

    function add_column_headings($title_row, titles) {
      var i,
          $el;

      $el = $("<th>");
      $el.text("atom");
      $title_row.append($el);
      $el.click(columnSort);
      i = -1; while (++i < titles.length) {
        $el = $("<th>");
        $el.text(titles[i]);
        $title_row.append($el);
        $el.click(columnSort);
      }
    }

    function add_data_rows(n) {
      var i = -1, j = datarows.length;
      while (++i < n) {
        if (i >= j) {
          add_row($tbody, 'data', i);
        }
      }
      while (--j >= i) {
        $tbody.remove(datarows[i]);
      }
      return $tbody.find(".data");
    }

    $modelDatatableStats.text(timePrefix + timeFormatter(model.get('time')) + timeSuffix);

    if (titlerows.length === 0) {
      var $title_row = add_row($thead, "title");
      add_column_headings($title_row, column_titles);
      datarows = add_data_rows(atoms.length);
    }
    if (reset) {
      datarows = add_data_rows(model.get_num_atoms());
    }
    i = -1; while (++i < atoms.length) {
      add_molecule_data(i);
    }
  }

}());
