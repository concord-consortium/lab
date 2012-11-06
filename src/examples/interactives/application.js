/*global $ d3 CodeMirror controllers model modelList benchmark DEVELOPMENT: true */
/*jshint boss:true */

DEVELOPMENT = true;

var ROOT = "/examples",
    ROOT_REGEX = new RegExp(ROOT + "/.*$"),
    ACTUAL_ROOT = document.location.pathname.replace(ROOT_REGEX, '');

(function() {

  var interactiveDefinitionLoaded = $.Deferred(),
      windowLoaded = $.Deferred(),
      origin,
      embeddablePath,
      embeddableUrl,

      $selectInteractive = $("#select-interactive"),

      $updateInteractiveButton = $("#update-interactive-button"),
      $autoFormatSelectionButton = $("#autoformat-selection-button"),
      $interactiveTextArea = $("#interactive-text-area"),

      $aboutLink = $("#about-link"),
      $aboutPane = $("#about-pane"),
      $aboutPaneClose = $('#about-pane-close'),

      $shareLink = $("#share-link"),
      $sharePane = $("#share-pane"),
      $sharePaneClose = $('#share-pane-close'),
      $shareIframeContent = $("#share-iframe-content"),
      $shareSelectIframeSize = $("#share-select-iframe-size"),

      $editorExtrasItem = $("editor.extras-item"),
      $showEditor = $("#show-editor"),
      $editorContent = $("#editor-content"),

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

      applicationCallbacks,
      editor,
      controller,
      indent = 2,
      foldFunc,
      interactiveUrl,
      interactive,
      hash,
      jsonModelPath, contentItems, mmlPath,
      viewType,
      buttonHandlersAdded = false;

  if (!document.location.hash) {
    if ($selectInteractive.length > 0) {
      selectInteractiveHandler();
    } else {
      document.location.hash = '#interactives/basic-examples/oil-and-water-shake.json';
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
        applicationCallbacks = [setupFullPage];
      } else {
        viewType = 'interactive-iframe';
      }

      interactiveDefinitionLoaded.resolve();
    });
  }

  $(window).load(function() {
    windowLoaded.resolve();
  });

  $.when(interactiveDefinitionLoaded, windowLoaded).done(function() {
    controller = controllers.interactivesController(interactive, '#interactive-container', applicationCallbacks, viewType);

    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];
    embeddablePath = location.pathname.replace(/\/[^\/]+$/, "/embeddable.html");
    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];
    embeddableUrl = origin + embeddablePath + hash;

    setupAboutPane();
    setupSharePane();
  });

  $(window).bind('hashchange', function() {
    if (getHash() !== hash) {
      location.reload();
    }
  });

  function setupAboutPane() {
    var interactiveAboutUrl,
        newWindow,
        titleString,
        $aboutContent = $('#about-content');
    $aboutLink.click(function() {
      $aboutPane.show(100);
    });
    $aboutPaneClose.click(function() {
      $aboutPane.hide(100);
    });
    $aboutPane.draggable();
    $("#about-pane-title").text("About: " + interactive.title);

    concordUrl = 'http://concord.org';
    nextGenUrl = 'http://mw.concord.org/nextgen/';
    interactiveAboutUrl = Lab.config.home + Lab.config.homeEmbeddablePath + hash;
    newWindow = " class='opens-in-new-window' target='_blank";
    utmString = "utm_source=" + encodeURIComponent(interactive.title.replace(/ /gi,"+")) + "&utm_medium=embedded_interactive&utm_campaign=" + Lab.config.utmCampaign;

    if (Lab.config.utmCampaign) {
      concordUrl += "?" + utmString;
      nextGenUrl += "?" + utmString;
      interactiveAboutUrl += "&" + encodeURI("utm_source=embed_link&utm_medium=embedded_interactive&utm_campaign=" + Lab.config.utmCampaign);
    }

    concordLink = "<a href='" + concordUrl + "'" + newWindow + "'>Concord Consortium</a>";
    nextGenLink = "<a href='" + nextGenUrl + "'" + newWindow + "'>Next-Generation Molecular Workbench</a>";
    interactiveAboutLink = "<a href='" + "'" + interactiveAboutUrl + newWindow + "'>shareable version</a>";
    googleOrgLink = "<a href='http://www.google.org/' " + newWindow + "'>Google.org</a>";
    $aboutContent.append('<p>This interactive was created by the ' + concordLink + ' using our ' + nextGenLink + ' software, with funding by a grant from ' + googleOrgLink + '.</p>');
    if (!Lab.config.sharing) {
      $aboutContent.append('<p>Explore or embed a <a href=' + interactiveAboutUrl + ' class="opens-in-new-window" target="_blank">shareable version</a> of this interactive, and discover other open source interactives for math, science and engineering at <a href="' + concordUrl + '" class="opens-in-new-window" target="_blank">concord.org</a>.</p>');
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
      $sharePane.draggable();
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
        actualWidth = document.width;
        actualHeight = document.height;
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

  function setupFullPage() {
    var java_mw_href,
        java_mw_link = $("#java-mw-link"),
        origin;
    origin = document.location.href.match(/(.*?\/\/.*?)\//)[1];
    $selectInteractive.val(interactiveUrl);

    // construct link to embeddable version of Interactive
    $("#embeddable-link").attr("href", function(i, href) { return href + hash; });

    jsonModelPath = interactive.models[0].url;
    $("#json-model-link").attr("href", origin + ACTUAL_ROOT + jsonModelPath);

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

    //
    // Extras
    //

    //
    // Interactive Code Editor
    //

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
        controller.loadInteractive(interactive, '#interactive-container');
      });

      $autoFormatSelectionButton.on('click', function() {
        var range = getSelectedRange();
        editor.autoFormatRange(range.from, range.to);
      });

      $showEditor.change(function() {
        if (this.checked) {
          $editorContent.show(100);
        } else {
          $editorContent.hide(100);
        }
      }).change();

      //
      // Benchmarks
      //
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
        benchmark.run(document.getElementById("model-benchmark-results"), benchmarksToRun, function() {
          $runBenchmarksButton.attr('disabled', true);
        }, function() {
          $runBenchmarksButton.attr('disabled', false);
        });
      });
    }

    benchmarksToRun = [
      {
        name: "commit",
        run: function(done) {
          var link = "<a href='"+Lab.version.repo.commit.url+"' class='opens-in-new-window' target='_blank'>"+Lab.version.repo.commit.short_sha+"</a>";
          if (Lab.version.repo.dirty) {
            link += " <i>dirty</i>";
          }
          done(link);
        }
      },
      {
        name: "molecules",
        run: function(done) {
          done(model.get_num_atoms());
        }
      },
      {
        name: "targetTemperature",
        run: function(done) {
          done(model.get("temperature"));
        }
      },
      {
        name: "just graphics (steps/s)",
        run: function(done) {
          var elapsed, start, i;

          model.stop();
          start = +Date.now();
          i = -1;
          while (i++ < 100) {
            controller.modelController.moleculeContainer.update_drawable_positions();
          }
          elapsed = Date.now() - start;
          done(d3.format("5.1f")(100/elapsed*1000));
        }
      },
      {
        name: "model (steps/s)",
        run: function(done) {
          var elapsed, start, i;

          model.stop();
          start = +Date.now();
          i = -1;
          while (i++ < 100) {
            // advance model 1 tick, but don't paint the display
            model.tick(1, { dontDispatchTickEvent: true });
          }
          elapsed = Date.now() - start;
          done(d3.format("5.1f")(100/elapsed*1000));
        }
      },
      {
        name: "model+graphics (steps/s)",
        run: function(done) {
          var start, elapsed, i;

          model.stop();
          start = +Date.now();
          i = -1;
          while (i++ < 100) {
            model.tick();
          }
          elapsed = Date.now() - start;
          done(d3.format("5.1f")(100/elapsed*1000));
        }
      },
      {
        name: "fps",
        run: function(done) {
          // warmup
          model.start();
          setTimeout(function() {
            model.stop();
            var start = model.get('time');
            setTimeout(function() {
              // actual fps calculation
              model.start();
              setTimeout(function() {
                model.stop();
                var elapsedModelTime = model.get('time') - start;
                done( elapsedModelTime / (model.get('viewRefreshInterval') * model.get('timeStep')) / 2 );
              }, 2000);
            }, 100);
          }, 1000);
        }
      },
      {
        name: "interactive",
        run: function(done) {
          done(window.location.pathname + window.location.hash);
        }
      }
    ];

    //
    // Energy Graph
    //

    if (!modelEnergyGraph) {
      renderModelEnergyGraph();
    }

    $showModelEnergyGraph.change(function() {
      var options;
      if (this.checked) {
        model.on("tick.modelEnergyGraph", function() {
          updateModelEnergyGraph();
        });

        model.on('play.modelEnergyGraph', function() {
          if (modelEnergyGraph.number_of_points() && model.stepCounter() < modelEnergyGraph.number_of_points()) {
            resetModelEnergyData(model.stepCounter());
            modelEnergyGraph.new_data(modelEnergyData);
          }
          modelEnergyGraph.show_canvas();
        });

        model.on('reset.modelEnergyGraph', function() {
          renderModelEnergyGraph();
        });

        model.on('stepForward.modelEnergyGraph', function() {
          if (model.isNewStep()) {
            updateModelEnergyGraph();
          } else {
            modelEnergyGraph.updateOrRescale(model.stepCounter());
            modelEnergyGraph.showMarker(model.stepCounter());
          }
        });

        model.on('stepBack.modelEnergyGraph', function() {
          modelEnergyGraph.updateOrRescale(model.stepCounter());
          modelEnergyGraph.showMarker(model.stepCounter());
        });

        model.on('seek.modelEnergyGraph', function() {
        });

        $modelEnergyGraphContent.show(100);

      } else {
        // remove listeners
        model.on("tick.modelEnergyGraph");
        model.on('play.modelEnergyGraph');
        model.on('reset.modelEnergyGraph');
        model.on('seek.modelEnergyGraph');
        model.on('stepForward.modelEnergyGraph');
        model.on('stepBack.modelEnergyGraph');
        $modelEnergyGraphContent.hide(100);
      }
    }).change();

    function updateModelEnergyGraph() {
      modelEnergyGraph.add_points(updateModelEnergyData());
    }

    function renderModelEnergyGraph() {
      var sample = model.get("viewRefreshInterval")/1000,
          options = {
            title:     "Energy of the System (KE:red, PE:green, TE:blue)",
            xlabel:    "Model Time (ps)",
            xmin:      0,
            xmax:     50,
            sample:    sample,
            ylabel:    "eV",
            ymin:      -5.0,
            ymax:      5.0
          };

      $.extend(options, interactive.models[0].energyGraphOptions || []);
      resetModelEnergyData();
      options.dataset = modelEnergyData;
      modelEnergyGraph = grapher.realTimeGraph('#model-energy-graph-chart', options);
    }

    // Add another sample of model KE, PE, and TE to the arrays in resetModelEnergyData
    function updateModelEnergyData() {
      var ke = model.get('kineticEnergy'),
          pe = model.get('potentialEnergy'),
          te = ke + pe;
      modelEnergyData[0].push(ke);
      modelEnergyData[1].push(pe);
      modelEnergyData[2].push(te);
      return [ke, pe, te];
    }

    // Reset the resetModelEnergyData arrays to a specific length by passing in an index value,
    // or empty the resetModelEnergyData arrays an initialize the first sample.
    function resetModelEnergyData(index) {
      var modelsteps = model.stepCounter(),
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


    //
    // Atom Data Table
    //
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
          $row = $tbody.find(".data#row_" + index);
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
