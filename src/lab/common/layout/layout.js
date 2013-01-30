/*global define: false, $: false, model: false */
// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

define(function (require) {

  var layout = { version: "0.0.1" };

  layout.selection = "";

  layout.display = {};

  layout.canonical = {
    width:  1280,
    height: 800
  };

  layout.regularDisplay = false;

  layout.notRendered = true;
  layout.fontsize = false;
  layout.emsize = 1;
  layout.cancelFullScreen = false;
  layout.checkboxFactor = 1.1;
  layout.checkboxScale = 1.1;
  layout.fullScreenRender = false;

  layout.canonical.width  = 1280;
  layout.canonical.height = 800;

  layout.getDisplayProperties = function(obj) {
    if (!arguments.length) {
      obj = {};
    }
    obj.screen = {
        width:  screen.width,
        height: screen.height
    };
    obj.client = {
        width:  document.body.clientWidth,
        height: document.body.clientHeight
    };
    obj.window = {
        width:  $(window).width(),
        height: $(window).height()
    };
    obj.page = {
        width: layout.getPageWidth(),
        height: layout.getPageHeight()
    };
    obj.screenFactorWidth  = obj.window.width / layout.canonical.width;
    obj.screenFactorHeight = obj.window.height / layout.canonical.height;
    obj.emsize = Math.max(obj.screenFactorWidth * 1.1, obj.screenFactorHeight);
    return obj;
  };

  layout.setBodyEmsize = function(scale) {
    var emsize,
        $componentsWithText = $("#interactive-container  p,label,button,select,option").filter(":visible"),
        $headerContent = $("#content-banner div"),
        $popupPanes = $("#credits-pane, #share-pane, #about-pane").find("div,textarea,label,select"),
        minFontSize;
    if (!layout.display) {
      layout.display = layout.getDisplayProperties();
    }
    emsize = Math.max(layout.display.screenFactorWidth * 1.2, layout.display.screenFactorHeight * 1.2);
    if (scale) { emsize *= scale; }
    $('body').css('font-size', emsize + 'em');
    applyMinFontSizeFilter(emsize, $componentsWithText, "9px");
    applyMinFontSizeFilter(emsize, $headerContent, "10px");
    applyMinFontSizeFilter(emsize, $popupPanes, "9px");
    layout.emsize = emsize;
  };

  function applyMinFontSizeFilter(emsize, $elements, minSize) {
    if (emsize <= 0.5) {
      $elements.css("font-size", minSize);
    } else {
      $elements.each(function() {
        var style,
            index;
        if (!style) {
          style = $(this).attr('style');
        }
        if (style) {
          index = style.indexOf('font-size');
          if (index !== -1) {
            style = style.replace(/font-size: .*;/g, '');
            $(this).attr('style', style);
          }
        }
      });
    }
  }

  layout.getVizProperties = function(obj) {
    var $viz = $('#viz');

    if (!arguments.length) {
      obj = {};
    }
    obj.width = $viz.width();
    obj.height = $viz.height();
    obj.screenFactorWidth  = obj.width / layout.canonical.width;
    obj.screenFactorHeight = obj.height / layout.canonical.height;
    obj.emsize = Math.min(obj.screenFactorWidth * 1.1, obj.screenFactorHeight);
    return obj;
  };

  layout.setVizEmsize = function() {
    var emsize,
        $viz = $('#viz');

    if (!layout.vis) {
      layout.vis = layout.getVizProperties();
    }
    emsize = Math.min(layout.viz.screenFactorWidth * 1.2, layout.viz.screenFactorHeight * 1.2);
    $viz.css('font-size', emsize + 'em');
  };

  layout.screenEqualsPage = function() {
    return ((layout.display.screen.width  === layout.display.page.width) ||
            (layout.display.screen.height === layout.display.page.height));
  };

  layout.checkForResize = function() {
    if ((layout.display.screen.width  !== screen.width) ||
        (layout.display.screen.height !== screen.height) ||
        (layout.display.window.width  !== document.width) ||
        (layout.display.window.height !== document.height)) {
      layout.setupScreen();
    }
  };

  layout.views = {};

  layout.addView = function(type, view) {
    if (!layout.views[type]) {
      layout.views[type] = [];
    }
    layout.views[type].push(view);
  };

  layout.setView = function(type, viewArray) {
    layout.views[type] = viewArray;
  };

  layout.setupScreen = function(event) {
    var emsize,
        viewLists  = layout.views,
        fullscreen = document.fullScreen ||
                     document.webkitIsFullScreen ||
                     document.mozFullScreen;

    if (event && event.forceRender) {
      layout.notRendered = true;
    }

    layout.display = layout.getDisplayProperties();
    layout.viz = layout.getVizProperties();

    if (!layout.regularDisplay) {
      layout.regularDisplay = layout.getDisplayProperties();
    }


    if(fullscreen || layout.fullScreenRender  || layout.screenEqualsPage()) {
      layout.fullScreenRender = true;
      layout.screenFactorWidth  = layout.display.page.width / layout.canonical.width;
      layout.screenFactorHeight = layout.display.page.height / layout.canonical.height;
      layout.checkboxFactor = Math.max(0.8, layout.checkboxScale * layout.emsize);
      $('body').css('font-size', layout.emsize + "em");
      layout.notRendered = true;
      switch (layout.selection) {

        // only fluid on page load (and when resizing on transition to and from full-screen)
        default:
        if (layout.notRendered) {
          setupFullScreen();
        }
        break;
      }
    } else {
      if (layout.cancelFullScreen || layout.fullScreenRender) {
        layout.cancelFullScreen = false;
        layout.fullScreenRender = false;
        layout.notRendered = true;
        layout.regularDisplay = layout.previous_display;
      } else {
        layout.regularDisplay = layout.getDisplayProperties();
      }
      layout.screenFactorWidth  = layout.display.page.width / layout.canonical.width;
      layout.screenFactorHeight = layout.display.page.height / layout.canonical.height;
      layout.checkboxFactor = Math.max(0.8, layout.checkboxScale * layout.emsize);
      switch (layout.selection) {

        // all component position definitions are set from properties
        case "interactive-iframe":
        layout.setBodyEmsize();
        setupInteractiveIFrameScreen();
        break;

        // like interactive-iframe, but has editor on left
        case "interactive-author-iframe":
        layout.setBodyEmsize(0.7);
        setupInteractiveAuthorIFrameScreen();
        break;

        default:
        layout.setVizEmsize();
        setupRegularScreen();
        break;
      }
      layout.regularDisplay = layout.getDisplayProperties();
    }

    //
    //
    // Interactive iframe Screen Layout
    //
    function setupInteractiveIFrameScreen() {
      var i,
          modelWidth,
          modelHeight,
          modelDimensions,
          modelAspectRatio,
          modelWidthFactor,
          modelPaddingFactor,
          modelHeightFactor = 0.85,
          bottomFactor = 0.0015,
          viewSizes = {},
          viewType,
          containerWidth = $(window).width(),
          containerHeight = $(window).height(),
          mcWidth = $('#model-container').width();

      modelDimensions = viewLists.modelContainers[0].scale();
      modelAspectRatio = modelDimensions[2] / modelDimensions[3];
      modelWidthFactor = 0.85;

      modelWidthPaddingFactor = modelDimensions[0]/modelDimensions[2] - 1.05;
      modelWidthFactor -= modelWidthPaddingFactor;

      modelHeightPaddingFactor = modelDimensions[1]/modelDimensions[3] - 1.05;
      modelHeightFactor -= modelHeightPaddingFactor;

      if (viewLists.thermometers) {
        modelWidthFactor -= 0.10;
      }

      if (viewLists.energyGraphs) {
        modelWidthFactor -= 0.35;
      }

      // account for proportionally larger buttons when embeddable size gets very small
      if (layout.emsize <= 0.5) {
        bottomFactor *= 0.5/layout.emsize;
      }

      viewLists.bottomItems = $('#bottom').children().length;
      if (viewLists.bottomItems) {
        modelHeightFactor -= ($('#bottom').height() * bottomFactor);
      }

      modelWidth = containerWidth * modelWidthFactor;
      modelHeight = modelWidth / modelAspectRatio;
      if (modelHeight > containerHeight * modelHeightFactor) {
        modelHeight = containerHeight * modelHeightFactor;
        modelWidth = modelHeight * modelAspectRatio;
      }
      viewSizes.modelContainers = [modelWidth, modelHeight];
      if (viewLists.energyGraphs) {
        viewSizes.energyGraphs = [containerWidth * 0.40];
      }

      // Resize modelContainer first to determine actual container height for right-side
      // Probably a way to do this with CSS ...
      viewLists.modelContainers[0].resize(modelWidth, modelHeight);

      modelHeight = $("#model-container").height();
      $("#rightwide").height(modelHeight);

      if (viewLists.barGraphs) {
        // Keep width of the bar graph proportional to its height.
        viewSizes.barGraphs = [35 + modelHeight * 0.22];
      }

      for (viewType in viewLists) {
        // if (viewType === "modelContainers") continue;
        if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
          i = -1;  while(++i < viewLists[viewType].length) {
            if (viewSizes[viewType]) {
              viewLists[viewType][i].resize(viewSizes[viewType][0], viewSizes[viewType][1]);
            } else {
              viewLists[viewType][i].resize();
            }
          }
        }
      }
    }

    //
    //
    // Interactive authoring iframe Screen Layout
    //
    function setupInteractiveAuthorIFrameScreen() {
      var i,
          modelWidth,
          modelHeight,
          modelDimensions,
          modelAspectRatio,
          modelWidthFactor,
          modelPaddingFactor,
          modelHeightFactor = 0.85,
          bottomFactor = 0.0015,
          viewSizes = {},
          viewType,
          containerWidth = $("#content").width(),
          containerHeight = $("#content").height();

      modelDimensions = viewLists.modelContainers[0].scale();
      modelAspectRatio = modelDimensions[2] / modelDimensions[3];
      modelWidthFactor = 0.85;

      modelWidthPaddingFactor = modelDimensions[0]/modelDimensions[2] - 1.05;
      modelWidthFactor -= modelWidthPaddingFactor;

      modelHeightPaddingFactor = modelDimensions[1]/modelDimensions[3] - 1.05;
      modelHeightFactor -= modelHeightPaddingFactor;

      if (viewLists.thermometers) {
        modelWidthFactor -= 0.05;
      }

      if (viewLists.barGraphs) {
        modelWidthFactor -= 0.15;
      }

      if (viewLists.energyGraphs) {
        modelWidthFactor -= 0.35;
      }

      // account for proportionally larger buttons when embeddable size gets very small
      if (layout.emsize <= 0.5) {
        bottomFactor *= 0.5/layout.emsize;
      }

      viewLists.bottomItems = $('#bottom').children().length;
      if (viewLists.bottomItems) {
        modelHeightFactor -= ($('#bottom').height() * bottomFactor);
      }

      modelWidth = containerWidth * modelWidthFactor;
      modelHeight = modelWidth / modelAspectRatio;
      if (modelHeight > containerHeight * modelHeightFactor) {
        modelHeight = containerHeight * modelHeightFactor;
        modelWidth = modelHeight * modelAspectRatio;
      }
      viewSizes.modelContainers = [modelWidth, modelHeight];
      if (viewLists.energyGraphs) {
        viewSizes.energyGraphs = [containerWidth * 0.40];
      }

      // Resize modelContainer first to determine actual container height for right-side
      // Probably a way to do this with CSS ...
      viewLists.modelContainers[0].resize(modelWidth, modelHeight);

      modelHeight = $("#model-container").height();
      $("#rightwide").height(modelHeight);

      if (viewLists.barGraphs) {
        // Keep width of the bar graph proportional to its height.
        viewSizes.barGraphs = [35 + modelHeight * 0.22];
      }

      for (viewType in viewLists) {
        if (viewType === "modelContainers") continue;
        if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
          i = -1;  while(++i < viewLists[viewType].length) {
            if (viewSizes[viewType]) {
              viewLists[viewType][i].resize(viewSizes[viewType][0], viewSizes[viewType][1]);
            } else {
              viewLists[viewType][i].resize();
            }
          }
        }
      }
    }

    //
    // Compare Screen Layout
    //
    function compareScreen() {
      var i, width, height, mcsize, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.modelContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      width = pageWidth * 0.40;
      height = width * 1/modelAspectRatio;
      // HACK that will normally only work with one modelContainer
      // or if all the modelContainers end up the same width
      i = -1;  while(++i < viewLists.modelContainers.length) {
        viewLists.modelContainers[i].resize(width, height);
      }
      if (viewLists.appletContainers) {
        i = -1;  while(++i < viewLists.appletContainers.length) {
          viewLists.appletContainers[i].resize(width, height);
        }
      }
    }

    //
    // Full Screen Layout
    //
    function setupFullScreen() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.modelContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.46;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight*0.70) {
        height = pageHeight * 0.70;
        width = height * modelAspectRatio;
      }
      i = -1;  while(++i < viewLists.modelContainers.length) {
        viewLists.modelContainers[i].resize(width, height);
      }
      rightQuarterWidth = (pageWidth - width) * 0.41;
      rightHeight = height * 0.42;
      i = -1;  while(++i < viewLists.potentialCharts.length) {
        viewLists.potentialCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
        viewLists.speedDistributionCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      rightHalfWidth = (pageWidth - width) * 0.86;
      rightHeight = height * 0.57;
      i = -1;  while(++i < viewLists.energyCharts.length) {
        viewLists.energyCharts[i].resize(rightHalfWidth, rightHeight);
      }
    }
  };

  layout.getPageHeight = function() {
    return $(document).height();
  };

  layout.getPageWidth = function() {
    return $(document).width();
  };

  // Finally, return ready module.
  return layout;
});
