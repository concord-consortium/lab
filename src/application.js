/*global Lab, _, $, jQuery, d3, Shutterbug, CodeMirror, controllers, alert, modelList, benchmark, _gaq, DEVELOPMENT: true, AUTHORING: true */
/*jshint boss:true */

// Strawman setting for telling the interactive to be in "author mode",
// allowing things like positioning textBoxes by hand.
AUTHORING = false;

(function() {
      // Default interactive aspect ratio.
  var DEF_ASPECT_RATIO = 1.3,

      origin,
      embeddablePath,
      embeddableUrl,
      interactiveDescriptions,
      descriptionByPath,
      interactives,
      groups,
      iframePhone,
      shutterbug,

      $content = $("#content"),
      $interactiveTitle = $("#interactive-title"),
      $selectInteractive = $("#select-interactive"),
      $selectInteractiveGroups = $("#select-interactive-groups"),
      $selectInteractiveSize = $("#select-interactive-size"),

      $showEditor = $("#show-editor"),
      $showModelEditor = $("#show-model-editor"),
      $showModelEnergyGraph = $("#show-model-energy-graph"),
      $showModelDatatable = $("#show-model-datatable"),

      $previousInteractive = $("#previous-interactive"),
      $nextInteractive = $("#next-interactive"),

      $serializedControls = $("#header *.serialize"),

      applicationCallbacks,

      controller,
      indent = 2,

      interactiveUrl,
      interactive,
      hash,
      model,

      editor,
      modelEditor,

      jsonModelPath,
      $jsonModelLink = $("#json-model-link"),

      $jsonInteractiveLink = $("#json-interactive-link"),

      interactivesPromise,

      buttonHandlersAdded = false,

      widthBeforeEditMode,
      editMode = false;

  function sendGAPageview(){
    // send the pageview to GA
    if (typeof _gaq === 'undefined'){
      return;
    }
    // make an array out of the URL's hashtag string, splitting the string at every ampersand
    var my_hashtag_array = location.hash.split('&');

    // grab the first value of the array (assuming that's the value that indicates which interactive is being viewed)
    var my_hashtag = my_hashtag_array[0];
    _gaq.push(['_trackPageview', location.pathname + my_hashtag]);
  }

  function isFullIFramePage() {
    return ($("#render-in-iframe").is(':checked'));
  }

  function isFullPage(){
    return (!isFullIFramePage());
  }

  interactivesPromise = $.get('interactives.json');

  interactivesPromise.done(function(results) {
    if (typeof results === 'string') {
      results = JSON.parse(results);
    }
    interactiveDescriptions = results;

    descriptionByPath = {};
    interactiveDescriptions.interactives.forEach(function (i) {
      descriptionByPath[i.path] = i;
    });
    // Aspect ratios are now available, so it can affect container dimensions.
    selectInteractiveSizeHandler();
  });

  // TODO: some of the Deferred, ajax call have no error handlers?
  interactivesPromise.fail(function(){
    // TODO: need a better way to display errors
    var mesg = "Failed to retrieve interactives.json";
    if (Lab.benchmark.what_browser().browser === "Chrome") {
      mesg += "\n";
      mesg += "\nNote: Chrome prevents loading content directly";
      mesg += "\nfrom the file system.";
      mesg += "\n";
      mesg += "\nIf you are using Chrome to load Lab Interatives";
      mesg += "\nfrom the file system you will need to start a";
      mesg += "\nlocal web server instead.";
      mesg += "\n";
      mesg += "\nOne solution is to start a simple local web";
      mesg += "\nserver using Python in the same directory where";
      mesg += "\nthe static resources are located";
      mesg += "\n";
      mesg += "\n    python -m SimpleHTTPServer";
      mesg += "\n";
      mesg += "\nNow open this page in your browser:";
      mesg += "\n";
      mesg += "\n    http://localhost:8000/interactives.html";
      mesg += "\n";
    }
    console.log(mesg);
    alert(mesg);
  });

  if (!document.location.hash) {
    if ($selectInteractive.val()) {
      selectInteractiveHandler();
    } else {
      interactivesPromise.done(function(){
        // set the default interactive, from the first interactive in
        // the first group returned from the server
        var firstGroupPath = interactiveDescriptions.groups[0].path;
        var firstInteractive = _.find(interactiveDescriptions.interactives, function(interactive){
          return interactive.groupKey === firstGroupPath;
        });
        document.location.hash = firstInteractive.path;
      });
    }
  }

  hash = document.location.hash;
  if (hash) {
    interactiveUrl = hash.substr(1, hash.length);

    restoreOptionsFromCookie();
    selectInteractiveSizeHandler();

    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];
    embeddablePath = location.pathname.replace(/\/[^\/]+$/, "/embeddable.html");
    embeddableUrl = origin + embeddablePath + hash;

    AUTHORING = true;
    applicationCallbacks = [setupFullPage];

    if(isFullIFramePage()) {
      // If we are on a Full Interactive Browser page with render in iframe
      // enabled then *don't* create an instance of the Interatactive
      // Just setup the rest of the page and embed the Interactive in an iframe
      embedIframeInteractive();
    } else {
      // On all the other versions of this page we need to create an
      // instance of the Interactive now.
      controller = new Lab.InteractivesController(interactiveUrl, '#interactive-container');
      controller.on("modelLoaded", function() {
        model = controller.getModel();
        interactive = controller.serialize();
        setupFullPage();
      });
    }
    sendGAPageview();
  }

  function embedIframeInteractive() {
    var $iframeWrapper,
        $iframe;

    // setup iframe
    $iframeWrapper = $('<div id="iframe-wrapper" class="ui-widget-content ' + $selectInteractiveSize.val() + '"></div>');
    $iframe = $('<iframe id="iframe-interactive" width="100%" height="100%" frameborder="no" scrolling="no" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" src="' + embeddableUrl + '"></iframe>');
    $content.append($iframeWrapper);
    $("#responsive-content").hide();
    selectInteractiveSizeHandler();
    $selectInteractiveSize.removeAttr('disabled');
    $iframeWrapper.append($iframe);
    $iframeWrapper.resizable({
      helper: "ui-resizable-helper",
      stop: function (event, ui) {
        if (editMode) {
          var aspectRatio = ui.size.width / ui.size.height,
              fontScale = widthBeforeEditMode / ui.size.width;
          interactive.fontScale = fontScale;
          interactive.aspectRatio = aspectRatio;
          descriptionByPath[interactiveUrl].aspectRatio = aspectRatio;
          iframePhone.post({ type:'loadInteractive', data: interactive });
          // Update editor.
          editor.setValue(JSON.stringify(interactive, null, indent));
          console.log("new aspect ratio: " + aspectRatio);
        }
      }
    });
    $content.css("border", "none");
    // initiate communication with Interactive in iframe and setup callback
    iframePhone = new Lab.IFramePhone($iframe[0], function() {
      // On a Interactive Browser page with an iframe send the
      // focus to the Interactive.
      if (isFullIFramePage()) {
        iframePhone.post({ type:'setFocus' });
      }
      iframePhone.post({ type:'getInteractiveState' });
      iframePhone.addListener('interactiveState', function(message) {
        interactive = message;
        setupFullPage();
      });
    });
  }

  function setupFullPage() {
    var $interactiveHeader = $("#interactive-header");

    interactivesPromise.done(function() {
      document.title = "Lab Interactive Browser: " + interactive.title;
      restoreOptionsFromCookie();
      setupSelectList();
      $("#select-filters input").click(setupSelectList);
      $("#select-filters input").click(setupSelectGroups);
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

  function finishSetupFullPage() {
    var javaMWhref,
        $embeddableLink = $("#embeddable-link"),
        $dataGamesLink = $("#datagames-link"),
        $dataGamesStagingLink = $("#datagames-staging-link"),
        dgGameSpecification,
        origin;

    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];

    setupNextPreviousInteractive();

    // construct link to embeddable version of Interactive
    $embeddableLink.attr("href", function(i, href) { return href + hash; });
    $embeddableLink.attr("title", "Open this Interactive in a new page suitable for embedding.");

    $jsonInteractiveLink.attr("href", origin + Lab.config.actualRoot + interactiveUrl);

    $jsonModelLink.attr("title", "View model JSON in another window");

    // construct link to JSON version of model
    jsonModelPath = interactive.models[0].url;
    $jsonModelLink.attr("href", origin + Lab.config.actualRoot + jsonModelPath);
    $jsonModelLink.attr("title", "View model JSON in another window");

    if (Lab.config.dataGamesProxyPrefix) {
      // construct link to DataGames embeddable version of Interactive
      dgGameSpecification = JSON.stringify([{
        "name": $selectInteractive.find("option:selected").text(),
        "dimensions": {
          "width": 600,
          "height":400
        },
        "url": Lab.config.dataGamesProxyPrefix + "embeddable.html#" +  interactiveUrl
      }]);
    }

    if (Lab.config.static || !Lab.config.dataGamesProxyPrefix) {
      $dataGamesLink.hide();
      $dataGamesStagingLink.hide();
    } else {
      $dataGamesLink.show();
      $dataGamesLink.attr("href", encodeURI("http://is.kcptech.com/dg?moreGames=" + dgGameSpecification));
      $dataGamesLink.attr("title", "Run this Interactive inside DataGames");

      $dataGamesStagingLink.show();
      $dataGamesStagingLink.attr("href", encodeURI("http://is-test.kcptech.com/dg?moreGames=" + dgGameSpecification));
      $dataGamesStagingLink.attr("title", "Run this Interactive inside DataGames' staging server");
    }

    setupOriginalImportLinks();
    setupExtras();
  }

  //
  // Extras
  //
  function setupExtras() {
    if(isFullPage()) {
      // Interactive Browser with Interactive embedding in DOM (not in iframe)
      // set keyboard focus on MD2D view
      // FIXME: generalize when multiple model types implemented
      controller.modelController.modelContainer.setFocus();
      $("#json-model-link").attr("href", origin + Lab.config.actualRoot + jsonModelPath);
      // $selectInteractiveSize.attr('disabled', 'disabled');
      setupCodeEditor();
      setupModelCodeEditor();
      setupSnapshotButton();
      setupBenchmarks();
      // pass in the model
      setupEnergyGraph(model);
      setupAtomDataTable();
      $("#extras-bottom").show();
      $selectInteractiveSize.removeAttr('disabled');
      $content.resizable({
        helper: "ui-resizable-helper",
        resize: controller.resize
      });
      if (typeof Shutterbug !== 'undefined') {
        shutterbug = new Shutterbug('#responsive-content','#image_output');
      }
    } else {
      // Interactive Browser with Interactive embedding in iframe
      // data table not working in iframe embedding mode yet
      $("#model-datatable").hide();

      if (typeof Shutterbug !== 'undefined') {
        shutterbug = new Shutterbug("#iframe-interactive","#image_output");
      }
      setupCodeEditor();
      setupModelCodeEditor();
      setupSnapshotButton();
      setupBenchmarks();
      setupEnergyGraph(null, function() { });
    }
    // All the extra items are sortable
    // $(".sortable").sortable({
    //   axis: "y",
    //   containment: "parent",
    //   cursor: "row-resize"
    // });
  }

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

  function selectInteractiveHandler() {
    document.location.hash = '#' + $selectInteractive.val();
  }

  $selectInteractive.change(selectInteractiveHandler);

  function selectInteractiveSizeHandler() {
    var selection = $selectInteractiveSize.val(),
        intAspectRatio = descriptionByPath && interactiveUrl &&
                         descriptionByPath[interactiveUrl].aspectRatio || DEF_ASPECT_RATIO,
        widths = {
          "tiny":         "318px",
          "small":        "364px",
          "medium-small": "420px",
          "medium":       "565px",
          "large":        "960px"
        },
        width  = widths[selection],
        height = parseInt(width, 10) / intAspectRatio + "px";

    saveOptionsToCookie();
    if (isFullPage()) {
      $content.width(width).height(height);
      // Window size is not change, so we have to call "resize()"
      // method manually.
      if (controller) {
        controller.resize();
      }
    } else {
      $("#iframe-wrapper").width(width).height(height);
      // No need to call controller.resize(), as interactive controller
      // automatically binds to the window resize event.
    }
  }

  $selectInteractiveSize.change(selectInteractiveSizeHandler);

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
          brokenFilter = $("#broken").is(':checked'),
          interactiveGroup = interactives.filter(function (interactive) {
            if (interactive.groupKey !== group.path) return false;
            if (interactive.publicationStatus === 'sample') return true;
            if (publicFilter && interactive.publicationStatus === 'public') return true;
            if (draftFilter && interactive.publicationStatus === 'draft') return true;
            if (brokenFilter && interactive.publicationStatus === 'broken') return true;
          }),
          $optgroup = $("<optgroup>").attr('label', group.name);
      interactiveGroup.forEach(function (interactive) {
        var title;
        switch(interactive.publicationStatus) {
          case "draft":
          title = "* " + interactive.title;
          break;
          case "broken":
          title = "** " + interactive.title;
          break;
          default:
          title = interactive.title;
          break;
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
    $jsonModelLink.attr("href", origin + Lab.config.actualRoot + jsonModelPath);

    setupCodeEditor();
  }

  function restoreOptionsFromCookie() {
    var cookie = document.cookie.match(/lab-interactive-options=(.*)(;|$)/),
        str,
        settings;
    if (cookie) {
      str = cookie[1].split(";")[0];
      settings = str.split('&').map(function (i) { return i.split('='); });
      $serializedControls.each(function(i, el) {
        var match = _.find(settings, function(e) { return e[0] === el.id; }, this);
        switch(el.tagName) {
          case "INPUT":
          if (match && el.id === match[0]) {
            el.checked = true;
          } else {
            el.checked = false;
          }
          break;
          case "SELECT":
          if (match) {
            $(el).val(match[1]);
          }
          break;
        }
      });
    }
  }

  function saveOptionsToCookie() {
    var cookie;
    cookie = $serializedControls.serialize() + " ; max-age=" + 30*60*60*24;
    document.cookie = "lab-interactive-options=" + cookie;
  }

  function setupOriginalImportLinks() {
    var $originalImportLink = $("#original-import-link"),
        $originalModelLink = $("#original-model-link"),
        javaMW = "http://mw2.concord.org/tmp.jnlp?address=",
        javaMWhref,
        mmlPath,
        e2dModelPath,
        contentItems = [];

    function disableOriginalImportLink() {
      $originalImportLink.removeAttr("href");
      $originalImportLink.attr("title", "link to original model not available for this interactive");
      $originalImportLink.addClass("na");
    }
    function disableOriginalModelLink() {
      $originalModelLink.removeAttr("href");
      $originalModelLink.attr("title", "original import model file not available for this model");
      $originalModelLink.addClass("na");
    }
    function disableJsonModelLink() {
      $jsonModelLink.removeAttr("href");
      $jsonModelLink.attr("title", "link to JSON model not available for this interactive");
      $jsonModelLink.addClass("na");
    }
    if (jsonModelPath) {
      switch(interactive.models[0].type) {
        case "md2d":
        // construct Java MW link for running Interactive via jnlp
        // uses generated resource list: /imports/legacy-mw-content/model-list.js
        // also updates link to original MML in Model Editor
        mmlPath = jsonModelPath.replace("imports/legacy-mw-content/converted/", "imports/legacy-mw-content/").replace(".json", ".mml");
        $originalImportLink.attr("target", "");
        if (typeof modelList !== 'undefined') {
          contentItems = getObjects(modelList, "mml", mmlPath.replace("imports/legacy-mw-content/", ""));
        } else {
          $originalImportLink.hide();
        }
        if (contentItems.length > 0) {
          javaMWhref = javaMW + origin + Lab.config.actualRoot + "imports/legacy-mw-content/" + contentItems[0].cml;
          $originalImportLink.attr("href", javaMWhref);
          $originalImportLink.attr("title", "View original Java Molecular Workbench content using Java Web Start");
          $originalModelLink.attr("href", origin + Lab.config.actualRoot + mmlPath);
          $originalModelLink.attr("title", "View original Java Molecular Workbench MML file in another window");
        } else {
          disableOriginalImportLink();
          disableOriginalModelLink();
        }
        break;
        case "energy2d":
        e2dModelPath = interactive.models[0].importedFrom;
        $originalImportLink.attr("target", "_blank");
        if (interactive.importedFrom) {
          // The Energy2D model exist on a separate HTML page
          $originalImportLink.attr("href", interactive.importedFrom);
          $originalImportLink.attr("title", "View original html page with Java Energy2D applet in another window");
        } else if (e2dModelPath) {
          // The Energy2D model exists only as an e2d file, there is no associated HTML page,
          // use Generic Energy2D applet page instead:
          //    /imports/energy2d/energy2d-applet.html?e2dPath=content/compare-capacity.e2d&title=Compare%20Capacity
          $originalImportLink.attr("href", origin + Lab.config.actualRoot +
            "imports/energy2d/energy2d-applet.html?" +
            encodeURI("e2dPath=" + e2dModelPath.replace("imports/energy2d/", "") + "&title=" + interactive.title.replace(/\*+$/, '')));
          $originalImportLink.attr("title", "View original Java Energy2D applet in generic HTML page in another window");
        } else {
          disableOriginalImportLink();
        }
        if (e2dModelPath) {
          $originalModelLink.attr("href", origin + Lab.config.actualRoot + interactive.models[0].importedFrom);
          $originalModelLink.attr("title", "View original Java Energy2D applet e2d model file in another window");
        } else {
          disableOriginalModelLink();
        }
        break;
        default:
        disableOriginalImportLink();
        disableOriginalModelLink();
        break;
      }
    } else {
      disableOriginalImportLink();
      disableOriginalModelLink();
      disableJsonModelLink();
    }
    if (Lab.config.static) {
      $originalImportLink.hide();
    } else {
      $originalImportLink.show();
    }
  }

  function setupSelectGroups(){

    $selectInteractiveGroups.empty();
    _.each(groups, function(group) {
      var publicFilter = $("#public").is(':checked'),
      draftFilter = $("#draft").is(':checked'),
      interactiveGroups = interactives.filter(function (interactive) {
        if (interactive.groupKey !== group.path) return false;
        if (interactive.publicationStatus === 'sample') return true;
        if (publicFilter && interactive.publicationStatus === 'public') return true;
        if (draftFilter && interactive.publicationStatus === 'draft') return true;
      });

      $selectInteractiveGroups.append($("<option>")
                                      .attr('value', group.id)
                                      .text(group.name));

    });
    $selectInteractiveGroups.val(interactive.groupKey).attr('selected', true);
  }

  //
  // Setup and enable next and previous Interactive buttons
  //
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
        $selection.prop('selected', false);
        $($options[index-1]).prop('selected', true);
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
        $selection.prop('selected', false);
        $($options[index+1]).prop('selected', true);
        selectInteractiveHandler();
      } else {
        this.addClass("disabled");
      }
    });
  }

  function updateNextPreviousInteractiveStatus() {
    var $options = $selectInteractive.find("option:enabled"),
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
    var $updateInteractiveButton = $("#update-interactive-button"),
        $updateJsonFromInteractiveButton = $("#update-json-from-interactive-button"),
        $autoFormatInteractiveJsonButton = $("#autoformat-interactive-json-button"),
        $editModeCheckbox = $("#edit-mode"),
        $interactiveTextArea = $("#interactive-text-area"),
        $editor = $("#editor"),
        $editorContent = $("#editor-content"),
        foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);

    $interactiveTextArea.text(JSON.stringify(interactive, null, indent));

    if (!editor) {
      editor = CodeMirror.fromTextArea($interactiveTextArea.get(0), {
        mode: { name: "javascript", json: true },
        indentUnit: indent,
        lineNumbers: true,
        lineWrapping: false,
        matchBrackets: true,
        autoCloseBrackets: true,
        collapseRange: true,
        onGutterClick: foldFunc
      });
    }

    if (!buttonHandlersAdded) {
      buttonHandlersAdded = true;
      $updateInteractiveButton.on('click', function() {
        var aspectRatioChanged = false;
        try {
          interactive = JSON.parse(editor.getValue());
          if (typeof interactive.aspectRatio !== "undefined") {
            // Update aspect ratio.
            descriptionByPath[interactiveUrl].aspectRatio = interactive.aspectRatio;
            aspectRatioChanged = true;
          }
        } catch (e) {
          alert("Interactive JSON syntax error: " + e.message);
          throw new Error("Interactive JSON syntax error: " + e.message);
        }
        if(isFullPage()) {
          controller.loadInteractive(interactive, '#interactive-container');
        } else {
          iframePhone.post({ type:'loadInteractive', data:interactive  });
          $interactiveTitle.text(interactive.title);
          $('#interactive-subtitle').text(interactive.subtitle);
        }
        if (aspectRatioChanged) selectInteractiveSizeHandler();
      });

      $autoFormatInteractiveJsonButton.on('click', function() {
        autoFormatEditorContent(editor);
      });

      $updateJsonFromInteractiveButton.on('click', function() {
        var interactiveState;
        if(isFullPage()) {
          interactiveState = controller.serialize();
          editor.setValue(JSON.stringify(interactiveState, null, indent));
        } else {
          iframePhone.post({ type:'getInteractiveState' });
          iframePhone.addListener('interactiveState', function(message) {
            editor.setValue(JSON.stringify(message, null, indent));
          });
        }
      });

      $editModeCheckbox.on('change', function () {
        var $wrapper = $("#iframe-wrapper"),
            w = $wrapper.width(),
            h = $wrapper.height(),
            aspectRatio = w / h;

        widthBeforeEditMode = w;
        editMode = $editModeCheckbox.prop("checked");

        if (editMode && isFullIFramePage()) {
          interactive.aspectRatio = aspectRatio;
          descriptionByPath[interactiveUrl].aspectRatio = aspectRatio;
          iframePhone.post({ type:'loadInteractive', data: interactive });
          // Update editor.
          editor.setValue(JSON.stringify(interactive, null, indent));
          console.log("new aspect ratio: " + aspectRatio);
        }
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
  // Model Code Editor
  //
  function setupModelCodeEditor() {
    var $updateModelButton = $("#update-model-button"),
        $updateJsonFromModelButton = $("#update-json-from-model-button"),
        $autoFormatModelJsonButton = $("#autoformat-model-json-button"),
        $modelTextArea = $("#model-text-area"),
        $modelEditorContent = $("#model-editor-content"),
        modelButtonHandlersAdded,
        foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder),
        modelJson;

    function serializeModelAndUpdateEditor() {
      var modelState;
      if(isFullPage()) {
        modelState = controller.modelController.state();
        modelEditor.setValue(JSON.stringify(modelState, null, indent));
      } else {
        iframePhone.post({ type:'getModelState' });
        iframePhone.addListener('modelState', function(message) {
          modelEditor.setValue(JSON.stringify(message, null, indent));
        });
      }
    }

    if (!modelEditor) {
      modelEditor = CodeMirror.fromTextArea($modelTextArea.get(0), {
        mode: { name: "javascript", json: true },
        indentUnit: indent,
        lineNumbers: true,
        lineWrapping: false,
        onGutterClick: foldFunc
      });
    }

    serializeModelAndUpdateEditor();

    if (!modelButtonHandlersAdded) {
      modelButtonHandlersAdded = true;

      $updateModelButton.on('click', function() {
        try {
          modelJson = JSON.parse(modelEditor.getValue());
        } catch (e) {
          alert("Model JSON syntax error: " + e.message);
          throw new Error("Model JSON syntax error: " + e.message);
        }
        if(isFullPage()) {
          controller.loadModel(interactive.models[0].id, modelJson);
        } else {
          iframePhone.post({ type:'loadModel', data: { modelId: interactive.models[0].id, modelObject: modelJson } });
        }
      });

      $autoFormatModelJsonButton.on('click', function() {
        autoFormatEditorContent(modelEditor);
      });

      $updateJsonFromModelButton.on('click', serializeModelAndUpdateEditor);

      $showModelEditor.change(function() {
        if (this.checked) {
          $modelEditorContent.show(100);
        } else {
          $modelEditorContent.hide(100);
        }
      }).change();
    }
  }

  function setupSnapshotButton() {
    var $showSnapshot = $("#show-snapshot"),
        $snapshotContent = $("#snapshot-content");

    $showSnapshot.change(function() {
      if (this.checked) {
        $snapshotContent.show(100);
      } else {
        $snapshotContent.hide(100);
      }
    }).change();

    $('#export_interactive').on('click', function(e) {
      e.preventDefault();
      if (typeof shutterbug !== 'undefined') {
        shutterbug.getDomSnapshot();
      }
    });
  }

  // general format helper for both editors
  function autoFormatEditorContent(ed) {
    var cursorStart = ed.getCursor("start"),
        cursorEnd = ed.getCursor("end"),
        lastLine = ed.lineCount(),
        viewPort = ed.getViewport();
    ed.autoFormatRange({ ch:0, line: 0 }, { ch:0, line: lastLine });
    ed.setSelection(cursorStart, cursorEnd);
    ed.scrollIntoView({ ch:0, line: viewPort.from });
  }

  //
  // Benchmarks
  //
  function getFingerprint() {
    if (Lab.config.environment == 'production') {
      // fake fingerprint on production because library won't be loaded
      return "mock fingerprint";
    } else {
      return new Fingerprint().get(); // semi-unique browser id
    }
  }

  function setupBenchmarks() {
    var $showBenchmarks = $("#show-benchmarks"),
        $benchmarksContent = $("#benchmarks-content"),
        $runBenchmarksButton = $("#run-benchmarks-button"),
        $submitBenchmarksButton = $("#submit-benchmarks-button"),
        $submissionInfo = $("#browser-submission-info"),
        $showSubmissionInfo = $("#show-browser-submission-info"),
        $browserFingerprint = $("#browser-fingerprint"),
        fingerprint = getFingerprint();

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

      if (!$showBenchmarks.prop("checked")) {
        $("#show-benchmarks").prop("checked", true).change();
      }

      if(isFullPage()) {
        modelController = controller.modelController;
        // Run interactive benchmarks + model benchmarks.
        Lab.benchmark.run(controller.benchmarks.concat(modelController.benchmarks),
          benchmarksTable,
          function(results) { console.log(results); },
          function() { $runBenchmarksButton.attr('disabled', true); },
          function() { $runBenchmarksButton.attr('disabled', false); });
      } else {
        iframePhone.post({ type:'runBenchmarks' });
        iframePhone.addListener('returnBenchmarks', function(message) {
          Lab.benchmark.renderToTable(benchmarksTable, message.benchmarks, message.results);
        });
      }

      if (Lab.config.benchmarkAPIurl) {
        $submitBenchmarksButton.removeAttr("disabled");
      }
    });

    $browserFingerprint.text(fingerprint);

    $showSubmissionInfo.on('click', function() {
      $submissionInfo.toggle();
      return false;
    });

    $submitBenchmarksButton.on('click', function() {
      var data = {},
          headers = headers = $('#model-benchmark-results th');

      // create data object directly from the table element
      headers.each(function(i) {
        data[this.innerHTML] = $('#model-benchmark-results tr.average td:nth-child('+(i+1)+')').text()
      });

      data["browser id"] = fingerprint;

      $.ajax({
        type: "POST",
        url: Lab.config.benchmarkAPIurl,
        data: data,
        complete: function() { $('#submit-success').text("Sent!"); }
      });
    });
  }

  //
  // Energy Graph
  // If an Interactive is instanced on this page pass in the model object,
  // otherwize we'll assume the Interactive is embedded in an iframe.
  //
  function setupEnergyGraph(_model, callback) {
    var $modelEnergyGraphContent = $("#model-energy-graph-content"),
        energyGraphSamplePeriod,
        modelEnergyGraph,
        modelEnergyData = [];

    // private functions
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
      var timeStepsPerTick, timeStep;

      if (_model) {
        timeStepsPerTick = _model.get('timeStepsPerTick');
        timeStep    = _model.get('timeStep');
        return _model.get("timeStepsPerTick") * _model.get("timeStep")/100;
      }
      else {
        timeStepsPerTick = 60;
        timeStep = 10;
      }
      return timeStepsPerTick * timeStep / 10000;
    }

    function addEventHook(name, func, props) {
      var privateName = name + '.modelEnergyGraph';
      if (_model) {
        _model.on(privateName, func); // for now
      } else if (iframePhone) {
        iframePhone.addDispatchListener(privateName,func, props);
      }
    }

    function removeEventHook(name) {
      var privateName = name + '.modelEnergyGraph';
      if (_model) {
        _model.on(privateName, null); // for now
      } else if (iframePhone) {
        iframePhone.removeDispatchListener(privateName);
      }
    }

    function addIframeEventListeners() {
      addEventHook("tick", function(props) {
        updateModelEnergyGraph(props);
      }, ['kineticEnergy','potentialEnergy']);

      addEventHook('play', function(props) {
        if (modelEnergyGraph.numberOfPoints() && props.tickCounter < modelEnergyGraph.numberOfPoints()) {
          resetModelEnergyData(props.tickCounter);
          modelEnergyGraph.resetSamples(modelEnergyData);
        }
      }, ['tickCounter']);

      addEventHook('reset', function(props) {
        renderModelEnergyGraph();
      }, ['displayTimePerTick']);

      addEventHook('stepForward', function(props) {
        if (props.newStep) {
          updateModelEnergyGraph();
        } else {
          modelEnergyGraph.updateOrRescale(props.tickCounter);
        }
      }, ['tickCounter', 'newStep']);

      addEventHook('stepBack', function(props) {
        modelEnergyGraph.updateOrRescale(props.tickCounter);
      }, ['tickCounter']);
    }

    function addRegularEventListeners() {
      addEventHook("tick", function() {
        updateModelEnergyGraph();
      });

      addEventHook('play', function() {
        if (modelEnergyGraph.numberOfPoints() && _model.stepCounter() < modelEnergyGraph.numberOfPoints()) {
          resetModelEnergyData(model.stepCounter());
          modelEnergyGraph.resetSamples(modelEnergyData);
        }
      });

      addEventHook('reset', function() {
        renderModelEnergyGraph();
      });

      addEventHook('stepForward', function(props) {
        if (_model.isNewStep()) {
          updateModelEnergyGraph();
        } else {
          modelEnergyGraph.updateOrRescale(_model.stepCounter());
        }
      });

      addEventHook('stepBack', function(props) {
        modelEnergyGraph.updateOrRescale(_model.stepCounter());
      });
    }

    function addEventListeners() {
      if (_model) {
        addRegularEventListeners();
      } else {
        addIframeEventListeners();
      }
    }

    function removeEventListeners() {
      // remove listeners
      removeEventHook("tick");
      removeEventHook('play');
      removeEventHook('reset');
      removeEventHook('stepForward');
      removeEventHook('stepBack');
    }

    function updateModelEnergyGraph(props) {
      modelEnergyGraph.addSamples(updateModelEnergyData(props));
    }

    function renderModelEnergyGraph() {
      var options = {
            title:     "Energy of the System (KE:red, PE:green, TE:blue)",
            xlabel:    "Model Time (ps)",
            xmin:       0,
            xmax:      50,
            sampleInterval:    energyGraphSamplePeriod,
            ylabel:    "eV",
            ymin:     -25.0,
            ymax:      25.0,
            fontScaleRelativeToParent: false,
            realTime:  true
          };

      $.extend(options, interactive.models[0].energyGraphOptions || []);
      resetModelEnergyData();
      options.dataSamples = modelEnergyData;
      removeEventListeners();
      if (modelEnergyGraph) {
        modelEnergyGraph.reset('#model-energy-graph-chart', options);
      } else {
        modelEnergyGraph = Lab.grapher.Graph('#model-energy-graph-chart', options);
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
    // or empty the resetModelEnergyData arrays and initialize the first sample.
    function resetModelEnergyData(index) {
      var i,
          len;

      if (index && modelEnergyData[0].length > index) {
        for (i = 0, len = modelEnergyData.length; i < len; i++) {
          modelEnergyData[i].length = index;
        }
        return index;
      } else {
        modelEnergyData = [[0],[0],[0]];
        return 0;
      }
    }

    // Sets up show/hide listener
    function setupShowHideLHandler() {
      // Setup expansion/visibility listener
      $showModelEnergyGraph.change(function() {
        if (this.checked) {
          addEventListeners();
          $modelEnergyGraphContent.show(100);
        } else {
          removeEventListeners();
          $modelEnergyGraphContent.hide(100);
        }
      }).change();
    }

    // Intitialization
    energyGraphSamplePeriod = 1;
    if (_model) {
      energyGraphSamplePeriod = model.get('displayTimePerTick');
      renderModelEnergyGraph();
      if (callback && typeof callback === "function") {
        callback();
      }
      setupShowHideLHandler();
    } else if (iframePhone) {
      iframePhone.addListener('propertyValue', function(displayTimePerTick) {
        energyGraphSamplePeriod = displayTimePerTick;
        renderModelEnergyGraph();
        if (callback && typeof callback === "function") {
          callback();
        }
        setupShowHideLHandler();
      });
      iframePhone.post({
        'type': 'get',
        'propertyName': 'displayTimePerTick'
      });
    } else {
      renderModelEnergyGraph();
      if (callback && typeof callback === "function") {
        callback();
      }
    }
  }

  //
  // Atom Data Table
  //
  function setupAtomDataTable() {
    var $modelDatatableContent = $("#model-datatable-content"),
        $modelDatatableResults = $("#model-datatable-results"),
        $modelDatatableStats = $("#model-datatable-stats");

    // private functions
    function renderModelDatatable(reset) {
      var i,
          nodes = model.getAtoms(),
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
          f_formatter = d3.format(" 3.3f  "),
          e_formatter = d3.format(" 3.3e  "),
          formatters = [f_formatter, f_formatter, e_formatter,
                        e_formatter, e_formatter, e_formatter,
                        e_formatter, e_formatter, e_formatter,
                        charge_formatter, f2_formatter, f2_formatter, i_formatter, i_formatter, i_formatter];

      atoms.length = nodes.length;
      reset = reset || false;

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
            value = nodes[index][column];
            textValue = formatters[i](value);
            $cells[i+1].textContent = textValue;
          }
        } else {
          add_data($row, index);
          for(i = 0; i < column_titles.length; i++) {
            column = column_titles[i];
            value = nodes[index][column];
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
        datarows = add_data_rows(model.getNumberOfAtoms());
      }
      i = -1; while (++i < atoms.length) {
        add_molecule_data(i);
      }
    }

    function addEventListeners() {
      model.on("tick.dataTable", function() {
        renderModelDatatable();
      });
      model.on('play.dataTable', function() {
        renderModelDatatable();
      });
      model.on('reset.dataTable', function() {
        renderModelDatatable(true);
      });
      model.on('seek.dataTable', function() {
        renderModelDatatable();
      });
      model.on('stepForward.dataTable', function() {
        renderModelDatatable();
      });
      model.on('stepBack.dataTable', function() {
        renderModelDatatable();
      });
      model.on('addAtom.dataTable', function() {
        renderModelDatatable(true);
      });
      model.on('removeAtom.dataTable', function() {
        renderModelDatatable(true);
      });
    }

    function removeEventListeners() {
      model.on("tick.dataTable", null);
      model.on('play.dataTable', null);
      model.on('reset.dataTable', null);
      model.on('seek.dataTable', null);
      model.on('stepForward.dataTable', null);
      model.on('stepBack.dataTable', null);
      model.on('addAtom.dataTable', null);
      model.on('removeAtom.dataTable', null);
    }

    // Initialization
    $showModelDatatable.change(function() {
      if (this.checked) {
        addEventListeners();
        $modelDatatableContent.show(100);
        renderModelDatatable(true);
      } else {
        removeEventListeners();
        $modelDatatableContent.hide(100);
      }
    }).change();
  }

}());
