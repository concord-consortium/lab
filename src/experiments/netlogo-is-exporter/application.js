/*globals $ CodeMirror Lab controllers model alert DEVELOPMENT: true */
/*jshint boss:true */

DEVELOPMENT = true;

var ROOT = "/experiments",
    ROOT_REGEX = new RegExp(ROOT + "/.*$"),
    ACTUAL_ROOT = document.location.pathname.replace(ROOT_REGEX, '');

(function() {

  var interactiveDefinitionLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),

      selectInteractive = document.getElementById('select-interactive'),
      exportData = document.getElementById('export-data'),
      showData = document.getElementById('show-data'),
      exportedData = document.getElementById('exported-data'),

      $exportedData = $("exported-data"),
      editor,
      controller,
      indent = 2,
      interactiveUrl,
      interactive,
      hash,
      jsonModelPath, contentItems, mmlPath, cmlPath,
      viewType,
      dgPaylod, dgUrl,
      appletString, applet,
      nl_obj_panel, nl_obj_workspace, nl_obj_world,
      nl_obj_program, nl_obj_observer, nl_obj_globals,
      nlGlobals,
      clearDataReady,
      exportedTimeStamps = {};

  if (!document.location.hash) {
    if (selectInteractive) {
      selectInteractiveHandler();
    } else {
      document.location.hash = '#interactives/IS-harmonic-motion-model.json';
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

      if (interactive.model.modelType == "netlogo-applet") {
        appletString =
          ['<applet id="netlogo-applet" code="org.nlogo.lite.Applet"',
          '     width="' + interactive.model.viewOptions.appletDimensions.width + '" height="' + interactive.model.viewOptions.appletDimensions.height + '" MAYSCRIPT="true"',
          '     archive="' + ACTUAL_ROOT + '/jnlp/org/nlogo/NetLogoLite.jar"',
          '     MAYSCRIPT="true">',
          '  <param name="DefaultModel" value="' + interactive.model.url + '"/>',
          '  <param name="java_arguments" value="-Djnlp.packEnabled=true">',
          '  <param name="MAYSCRIPT" value="true"/>',
          '  Your browser is completely ignoring the applet tag!',
          '</applet>'].join('\n');

        document.getElementById("applet-container").innerHTML = appletString;
        applet = document.getElementById('netlogo-applet');
        applet.ready = false;
        applet.checked_more_than_once = false;
        var self = this;
        window.setTimeout(appletReady, 250);
      }
      ISNetLogo.DGExporter.init(interactive.model.viewOptions.dimensions);
      interactiveDefinitionLoaded.resolve();
    });
  }

  function appletReady() {
    var globalsStr;

    applet.ready = false;

    try {
      nl_obj_panel     = applet.panel();                                           // org.nlogo.lite.Applet object
      nl_obj_workspace = nl_obj_panel.workspace();                                 // org.nlogo.lite.LiteWorkspace
      nl_obj_world     = nl_obj_workspace.org$nlogo$lite$LiteWorkspace$$world;     // org.nlogo.agent.World
      nl_obj_program   = nl_obj_world.program();                                   // org.nlogo.api.Program
      nl_obj_observer  = nl_obj_world.observer();
      nl_obj_globals   = nl_obj_program.globals();
      globalsStr = nl_obj_globals.toString();
      nlGlobals = globalsStr.substr(1, globalsStr.length-2).split(",").map(function(e) { return stripWhiteSpace(e); });
      if (nlGlobals.length > 1) {
        applet.ready = true;
      }
    } catch (e) {
      // applet is not ready
    }

    if (applet.ready) {
      window.setInterval(buttonStatusCallback, 250);
    } else {
      applet.checked_more_than_once = window.setTimeout(appletReady, 250);
    }

    return applet.ready;
  }

  function buttonStatusCallback() {
    var enable = dgDataReady();

    if (enable === null || !exportData) {
      // Do nothing--we'll try again in the next timer interval.
      return;
    }
    exportData.disabled = !enable;
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(interactiveDefinitionLoaded, windowLoaded).done(function(results) {
    // controller = controllers.interactivesController(interactive, '#interactive-container', viewType);
  });

  $(window).bind('hashchange', function() {
    if (document.location.hash !== hash) {
      location.reload();
    }
  });

  function stripWhiteSpace(str) {
    return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  }

  function nlCmdExecute(cmd) {
    nl_obj_panel.commandLater(cmd);
  }

  function nlReadGlobal(global) {
    if (nlGlobals.indexOf(global) < 0) return null;
    return nl_obj_observer.getVariable(nlGlobals.indexOf(global));
  }

  function nlDataExportModuleAvailable() {
    return this.nlReadGlobal("DATA-EXPORT:MODULE-AVAILABLE");
  }

  function nlDataAvailable() {
    return nlReadGlobal("DATA-EXPORT:DATA-AVAILABLE?");
  }

  function nlDataReady() {
    return nlReadGlobal("DATA-EXPORT:DATA-READY?");
  }

  function getExportedData() {
    return nlReadGlobal("DATA-EXPORT:MODEL-DATA");
  }

  function dgDataReady() {
    var ready = nlReadGlobal("DG-DATA-READY?");
    if (ready !== null) return ready;
    return nlDataAvailable();
  }

  function getExportedData() {
    return nlReadGlobal("DG-OUTPUT") || nlReadGlobal("DATA-EXPORT:MODEL-DATA");
  }

  function exportDataHandler() {
    try {
      nlCmdExecute("export-data");
    } catch (e) {
      nlCmdExecute("data-export:make-model-data");
    }
    clearDataReady = window.setInterval(exportDataReadyCallback, 250);
  }

  function exportDataReadyCallback() {
    var dgExportDone = nlReadGlobal("DG-EXPORTED?"),
        nRunsExported = 0,
        data;

    if (dgExportDone === null) dgExportDone = nlDataReady();
    if (dgExportDone) {
      clearInterval(clearDataReady);
      data = getExportedData();

      if (exportedData) {
        exportedData.textContent = data;
        if (editor) {
          editor.setValue(data);
        }
      } else {
        console.log(data);
        data = JSON.parse(data);

        if (data.collection_name) {
          // data appears to be in format required by ISNetLogo.DGExporter
          ISNetLogo.DGExporter.exportData(data);
        } else if (data.description) {
          // data appears to be in format of the NetLogo data exporter module (readable by
          // Lab.importExport.netlogoImporter)

          Lab.importExport.netlogoImporter.timeStamps(data).forEach(function(ts) {
            if (exportedTimeStamps[ts]) {
              return;
            }

            var n   = Lab.importExport.netlogoImporter.runHavingTimeStamp(data, ts),
                run = Lab.importExport.netlogoImporter.importRun(data, n);

            Lab.importExport.dgExporter.exportData(
              run.perRunLabels,
              run.perRunValues,
              run.perTickLabels,
              run.perTickValues
            );
            nRunsExported++;
            exportedTimeStamps[ts] = true;
          });

          if (nRunsExported > 0) Lab.importExport.dgExporter.openTable();
        }
      }
    }
  }

  if (exportData) {
    exportData.onclick = exportDataHandler;
  }

  //
  // The following functions are only used when rendering the
  // non-embeddable Interactive page
  //
  function selectInteractiveHandler() {
    document.location.hash = '#' + selectInteractive.value;
  }

  function setupFullPage() {
    selectInteractive.value = interactiveUrl;

    // construct link to embeddable version of Interactive
    $("#embeddable-link").attr("href", function(i, href) { return href + hash; });

    // construct link to DataGames embeddable version of Interactive
    $("#datagames-link").attr("href", function(i, href) {
      dgPayload = [{
        "name": $(selectInteractive).find("option:selected").text(),
        "dimensions": interactive.model.viewOptions.dimensions,
        "url": Lab.config.dataGamesProxyPrefix + "experiments/netlogo-is-exporter/embeddable.html#" +  interactiveUrl
      }];
      dgUrl = "http://is.kcptech.com/dg?moreGames=" + JSON.stringify(dgPayload);
      return encodeURI(dgUrl);
    });

    setupCodeEditor();

    selectInteractive.onchange = selectInteractiveHandler;
  }

  //
  // Interactive Code Editor
  //
  function setupCodeEditor() {
    var foldFunc = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder);
    $exportedData.text("");
    if (!editor) {
      editor = CodeMirror.fromTextArea(exportedData, {
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
  }

  // startButtonStatusCallback();

}());
