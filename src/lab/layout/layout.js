// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

layout = { version: "0.0.1" };

layout.selection = "";

layout.display = {};

layout.canonical = {
  width:  1280,
  height: 800
};

layout.regular_display = false;

layout.not_rendered = true;
layout.fontsize = false;
layout.cancelFullScreen = false;
layout.screen_factor = 1;
layout.checkbox_factor = 1.1;
layout.checkbox_scale = 1.1;
layout.fullScreenRender = false;

layout.canonical.width  = 1280;
layout.canonical.height = 800;

layout.getDisplayProperties = function(obj) {
  if (!arguments.length) {
    var obj = {};
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
      width:  document.width,
      height: document.height
  };
  obj.page = {
      width: layout.getPageWidth(),
      height: layout.getPageHeight()
  };
  obj.screen_factor_width  = obj.page.width / layout.canonical.width;
  obj.screen_factor_height = obj.page.height / layout.canonical.height;
  obj.emsize = Math.min(obj.screen_factor_width * 1.1, obj.screen_factor_height);
  return obj;
};

layout.screenEqualsPage = function() {
  return ((layout.display.screen.width  === layout.display.page.width) ||
          (layout.display.screen.height === layout.display.page.height))
};

layout.checkForResize = function() {
  if ((layout.display.screen.width  != screen.width) ||
      (layout.display.screen.height != screen.height) ||
      (layout.display.window.width  != document.width) ||
      (layout.display.window.height != document.height)) {
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

layout.setupScreen = function(forceRender) {
  var viewLists  = layout.views,
      fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;

  if (forceRender) {
    layout.not_rendered = true;
  }

  layout.display = layout.getDisplayProperties();

  if (!layout.regular_display) {
    layout.regular_display = layout.getDisplayProperties();
  }


  if(fullscreen || layout.fullScreenRender  || layout.screenEqualsPage()) {
    layout.fullScreenRender = true;
    layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
    layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
    layout.screen_factor = layout.screen_factor_height;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    layout.bodycss.style.fontSize = layout.screen_factor + 'em';
    layout.not_rendered = true;
    switch (layout.selection) {

      // fluid layout
      case "simple-screen":
      if (layout.not_rendered) {
        setupSimpleFullScreenMoleculeContainer();
      }
      break;

      // only fluid on page load (and when resizing on trnasition to and from full-screen)
      case "simple-static-screen":
      if (layout.not_rendered) {
        setupSimpleFullScreenMoleculeContainer();
      }
      break;

      // fluid (but normally the iframe doesn't expose the full-screen action)
      case "simple-iframe":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      // fluid layout
      case "compare-screen":
      var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      compareScreen();
      layout.not_rendered = false;
      break;

      // only fluid on page load (and when resizing on trnasition to and from full-screen)
      default:
      if (layout.not_rendered) {
        setupFullScreen();
      }
      break;
    }
  } else {
    if (layout.cancelFullScreen || layout.fullScreenRender) {
      layout.cancelFullScreen = false;
      layout.fullScreenRender = false;
      layout.not_rendered = true;
      layout.regular_display = layout.previous_display;
    } else {
      layout.regular_display = layout.getDisplayProperties();
    }
    layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
    layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
    layout.screen_factor = layout.screen_factor_height;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    switch (layout.selection) {

      // fluid layout
      case "simple-screen":
      var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      simpleScreen();
      break;

      // only fluid on page load (and when resizing on trnasition to and from full-screen)
      case "simple-static-screen":
      if (layout.not_rendered) {
        var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        layout.bodycss.style.fontSize = emsize + 'em';
        simpleStaticScreen();
        layout.not_rendered = false;
      }
      break;

      // fluid layout
      case "simple-iframe":
      var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      setupSimpleIFrameScreen();
      break;

      // only fluid on page load (and when resizing on trnasition to and from full-screen)
      case "full-static-screen":
      if (layout.not_rendered) {
        var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
        layout.bodycss.style.fontSize = emsize + 'em';
        regularScreen();
        layout.not_rendered = false;
      }
      break;

      // fluid layout
      case "compare-screen":
      var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      compareScreen();
      break;

      // like full-static-screen, but all component position definitions are set from properties
      case "interactive":
      if (layout.not_rendered) {
        var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
        layout.bodycss.style.fontSize = emsize + 'em';
        setupInteractiveScreen();
        layout.not_rendered = false;
      }
      break;

      // like simple-iframe, but all component position definitions are set from properties
      case "interactive-iframe":
      var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      setupInteractiveIFrameScreen();
      break;

      default:
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupRegularScreen();
      break;
    }
    layout.regular_display = layout.getDisplayProperties();
  }
  if (layout.transform) {
    $('input[type=checkbox]').css(layout.transform, 'scale(' + layout.checkbox_factor + ',' + layout.checkbox_factor + ')');
  }

  layout.setupTemperature(model);
  if (layout.temperature_control_checkbox) {
    model.addPropertiesListener(["temperature_control"], layout.temperatureControlUpdate);
    layout.temperatureControlUpdate();
  }

  var benchmarks_table = document.getElementById("benchmarks-table");
  if (benchmarks_table) {
    benchmarks_table.style.display = "none";
  }

  //
  // Regular Screen Layout
  //
  function regularScreen() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.40;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight * 0.55) {
      height = pageHeight * 0.55;
      width = height * modelAspectRatio;
    }
    // HACK that will normally only work with one moleculeContainer
    // or if all the moleculeContainers end up the same width
    i = -1;  while(++i < viewLists.moleculeContainers.length) {
      viewLists.moleculeContainers[i].resize(width, height);
    }
    rightQuarterWidth = (pageWidth - width) * 0.35;
    rightHeight = height * 0.52;
    i = -1;  while(++i < viewLists.potentialCharts.length) {
      viewLists.potentialCharts[i].resize(rightQuarterWidth, rightHeight);
    }
    i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
      viewLists.speedDistributionCharts[i].resize(rightQuarterWidth, rightHeight);
    }
    rightHalfWidth = (pageWidth - width) * 0.72;
    rightHeight = height * 0.76;
    i = -1;  while(++i < viewLists.energyCharts.length) {
      viewLists.energyCharts[i].resize(rightHalfWidth, rightHeight);
    }
  }

  /**
    At the moment, this just finds every view in viewlist and calls resize()
    on it. Eventually this should work out which div each component wants to
    be in and resize it in some intelligent way
  **/
  function setupInteractiveScreen() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.46;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight*0.70) {
      height = pageHeight * 0.70;
      width = height * modelAspectRatio;
    }

    for (viewType in viewLists) {
      if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
        i = -1;  while(++i < viewLists[viewType].length) {
          viewLists[viewType][i].resize(width, height);
        }
      }
    }
  }

  //
  // Interactive iframe Screen Layout
  //
  function setupInteractiveIFrameScreen() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.70
    height = width * 1/modelAspectRatio;
    if (height > pageHeight * 0.70) {
      height = pageHeight * 0.70;
      width = height * modelAspectRatio;
    }
    for (viewType in viewLists) {
      if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
        i = -1;  while(++i < viewLists[viewType].length) {
          viewLists[viewType][i].resize(width, height);
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

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    width = pageWidth * 0.44;
    height = width * 1/modelAspectRatio;
    // HACK that will normally only work with one moleculeContainer
    // or if all the moleculeContainers end up the same width
    i = -1;  while(++i < viewLists.moleculeContainers.length) {
      viewLists.moleculeContainers[i].resize(width, height);
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

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.46;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight*0.70) {
      height = pageHeight * 0.70;
      width * height * modelAspectRatio;
    }
    i = -1;  while(++i < viewLists.moleculeContainers.length) {
      viewLists.moleculeContainers[i].resize(width, height);
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

  //
  // Simple Screen Layout
  //
  function simpleScreen() {
    var i, width, height, mcsize, widthToPageRatio;

    height = Math.min(layout.display.page.height * 0.45, layout.display.page.width * 0.50);
    viewLists.moleculeContainers[0].resize(height, height);
    mcsize = viewLists.moleculeContainers[0].scale();
    widthToPageRatio = mcsize[0] / layout.display.page.width;
    if (widthToPageRatio > 0.50) {
      height *= (0.50 / widthToPageRatio);
      viewLists.moleculeContainers[0].resize(height, height);
    }
    viewLists.thermometers[0].resize();
  }

  //
  // Simple Static Screen Layout
  //
  function simpleStaticScreen() {
    var i, width, height, mcsize, widthToPageRatio,
        description_right = document.getElementById("description-right");

    height = Math.min(layout.display.page.height * 0.65, layout.display.page.width * 0.50);
    viewLists.moleculeContainers[0].resize(height, height);
    mcsize = viewLists.moleculeContainers[0].scale();
    widthToPageRatio = mcsize[0] / layout.display.page.width;
    if (widthToPageRatio > 0.50) {
      height *= (0.50 / widthToPageRatio);
      viewLists.moleculeContainers[0].resize(height, height);
      // if (description_right !== null) {
      //   description_right.style.width = (layout.display.page.width - mcsize[0]) * 0.50 + "px";
      // }
    }
    viewLists.thermometers[0].resize();
  }

  //
  // Simple iframe Screen Layout
  //
  function setupSimpleIFrameScreen() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.70;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight * 0.70) {
      height = pageHeight * 0.70;
      width * height * modelAspectRatio;
    }
    viewLists.moleculeContainers[0].resize(width, height);
    mcsize = viewLists.moleculeContainers[0].scale();
    viewLists.thermometers[0].resize();
  }

  //
  // Simple Full Screen Layout
  //
  function setupSimpleFullScreenMoleculeContainer() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.60;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight * 0.60) {
      height = pageHeight * 0.60;
      width * height * modelAspectRatio;
    }
    viewLists.moleculeContainers[0].resize(width, height);
  }

  function setupFullScreenDescriptionRight() {
    var description_right = document.getElementById("description-right");
    if (description_right !== null) {
      // description_right.style.width = layout.display.window.width * 0.30 +"px";
    }
  }
};

layout.getStyleForSelector = function(selector) {
  var rules, rule_lists = document.styleSheets;
  for(var i = 0; i < rule_lists.length; i++) {
    if (rule_lists[i]) {
      try {
         rules = rule_lists[i].rules || rule_lists[i].cssRules;
         if (rules) {
           for(var j = 0; j < rules.length; j++) {
             if (rules[j].selectorText == selector) {
               return rules[j];
             }
           }
         }
      }
      catch (e) {
      }
    }
  }
  return false;
};

// Adapted from getPageSize() by quirksmode.com
layout.getPageHeight = function() {
  var windowHeight;
  if (window.innerHeight) { // all except Explorer
    windowHeight = window.innerHeight;
  } else if (document.documentElement && document.documentElement.clientHeight) {
    windowHeight = document.documentElement.clientHeight;
  } else if (document.body) { // other Explorers
    windowHeight = layout.display.window.height;
  }
  return windowHeight;
};

layout.getPageWidth = function() {
  var windowWidth;
  if (window.innerWidth) { // all except Explorer
    windowWidth = window.innerWidth;
  } else if (document.documentElement && document.documentElement.clientWidth) {
    windowWidth = document.documentElement.clientWidth;
  } else if (document.body) { // other Explorers
    windowWidth = window.width;
  }
  return windowWidth;
};

// http://www.zachstronaut.com/posts/2009/02/17/animate-css-transforms-firefox-webkit.html
layout.getTransformProperty = function(element) {
    // Note that in some versions of IE9 it is critical that
    // msTransform appear in this list before MozTransform
    var properties = [
        'transform',
        'WebkitTransform',
        'msTransform',
        'MozTransform',
        'OTransform'
    ];
    var p;
    if (element) {
      while (p = properties.shift()) {
          if (typeof element.style[p] != 'undefined') {
              return p;
          }
      }
    }
    return false;
};

var description_right = document.getElementById("description-right");
if (description_right !== null) {
  layout.fontsize = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
}

layout.bodycss = layout.getStyleForSelector("body");
layout.transform = layout.getTransformProperty(document.body);

