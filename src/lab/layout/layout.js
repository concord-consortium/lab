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
  return obj;
};

layout.checkForResize = function() {
  if ((layout.display.screen.width  != screen.width) ||
      (layout.display.screen.height != screen.height) ||
      (layout.display.window.width  != document.width) ||
      (layout.display.window.height != document.height)) {
    layout.setupScreen();
  }
};

layout.setupScreen = function(viewLists) {
  var fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;

  layout.display = layout.getDisplayProperties();

  if (!layout.regular_display) {
    layout.regular_display = layout.getDisplayProperties();
  }


  if(fullscreen) {
    layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
    layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
    layout.screen_factor = layout.screen_factor_height;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    layout.bodycss.style.fontSize = layout.screen_factor + 'em';
    layout.not_rendered = true;
    switch (layout.selection) {

      case "simple-screen":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      case "simple-static-screen":
      if (layout.not_rendered) {
        setupSimpleFullScreenMoleculeContainer();
        setupDescriptionRight();
      }
      break;

      case "simple-iframe":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      default:
      setupFullScreen();
      break;
    }
  } else {
    if (layout.cancelFullScreen) {
      layout.cancelFullScreen = false;
      layout.regular_display = layout.previous_display;
    } else {
      layout.regular_display = layout.getDisplayProperties();
    }
    layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
    layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
    layout.screen_factor = layout.screen_factor_height;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    switch (layout.selection) {

      case "simple-screen":
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupSimpleMoleculeContainer();
      setupDescriptionRight();
      break;

      case "simple-static-screen":
      if (layout.not_rendered) {
        var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        layout.bodycss.style.fontSize = emsize + 'em';
        simpleStaticScreen();
        layout.not_rendered = false;
      }
      break;

      case "simple-iframe":
      var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      setupSimpleIFrameScreen();
      break;

      case "full-static-screen":
      if (layout.not_rendered) {
        var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
        layout.bodycss.style.fontSize = emsize + 'em';
        setupRegularScreen();
        layout.not_rendered = false;
      }
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

  if (benchmarks_table) {
    benchmarks_table.style.display = "none";
  }

  //
  // Regular Screen Layout
  //
  function setupRegularScreen() {
    var i, width, height, mcsize, widthToPageRatio;
    height = Math.min(layout.display.page.height * 0.70, layout.display.page.width * 0.40);
    i = -1;  while(++i < viewLists.moleculeContainers.length) {
      viewLists.moleculeContainers[i].resize(height, height);
    };
    // HACK that will normally only work with one moleculeContainer
    // or if all the moleculeContainers end up the same width
    mcsize = viewLists.moleculeContainers[0].scale();
    widthToPageRatio = mcsize[0] / layout.display.page.width;
    width = (layout.display.page.width - mcsize[0]) * 0.34;
    height = layout.display.page.height * 0.30;
    i = -1;  while(++i < viewLists.potentialCharts.length) {
      viewLists.potentialCharts[i].resize(width, height);
    };
    width = (layout.display.page.width - mcsize[0]) * 0.34;
    height = layout.display.page.height * 0.30;
    i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
      viewLists.speedDistributionCharts[i].resize(width, height);
    };
    width = (layout.display.page.width - mcsize[0]) * 0.70;
    height = layout.display.page.height * 0.39 + 0;
    i = -1;  while(++i < viewLists.energyCharts.length) {
      viewLists.energyCharts[i].resize(width, height);
    };
  }

  //
  // Full Screen Layout
  //
  function setupFullScreen() {
    var i, width, height;
    height = layout.display.page.height * 0.70;
    i = -1;  while(++i < viewLists.moleculeContainers.length) {
      viewLists.moleculeContainers[i].resize(height, height);
    };
    width = layout.display.page.width * 0.24;
    height = layout.display.page.height * 0.35;
    i = -1;  while(++i < viewLists.potentialCharts.length) {
      viewLists.potentialCharts[i].resize(width, height);
    };
    width = layout.display.page.width * 0.22;
    height = layout.display.page.height * 0.35;
    i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
      viewLists.speedDistributionCharts[i].resize(width, height);
    };
    width = layout.display.page.width * 0.47 + 5;
    height = layout.display.page.height * 0.40 + 0;
    i = -1;  while(++i < viewLists.energyCharts.length) {
      viewLists.energyCharts[i].resize(width, height);
    };
  }

  //
  // Simple Screen Layout
  //
  function simpleStaticScreen() {
    var i, width, height, mcsize, widthToPageRatio,
        description_right = document.getElementById("description-right");

    height = Math.min(layout.display.page.height * 0.70, layout.display.page.width * 0.53);
    viewLists.moleculeContainers[0].resize(height, height);
    mcsize = viewLists.moleculeContainers[0].scale();
    widthToPageRatio = mcsize[0] / layout.display.page.width;
    if (widthToPageRatio > 0.53) {
      height *= (0.53 / widthToPageRatio);
      viewLists.moleculeContainers[0].resize(height, height);
      // if (description_right !== null) {
      //   description_right.style.width = (layout.display.page.width - mcsize[0]) * 0.50 + "px";
      // }
    }
  }

  //
  // Simple iframe Screen Layout
  //
  function setupSimpleIFrameScreen() {
    var i, width, height, mcsize, widthToPageRatio;

    height = Math.min(layout.display.page.height * 0.78, layout.display.page.width * 0.75);
    viewLists.moleculeContainers[0].resize(height, height);
    mcsize = viewLists.moleculeContainers[0].scale();
    widthToPageRatio = mcsize[0] / layout.display.page.width;
    if (widthToPageRatio > 0.75) {
      height *= (0.75 / widthToPageRatio);
      viewLists.moleculeContainers[0].resize(height, height);
    }
  }

  //
  // Simple Full Screen Layout
  //
  function setupSimpleFullScreenMoleculeContainer() {
    var height = layout.display.page.height * 0.70;
    viewLists.moleculeContainers[0].resize(height, height);
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
  if (self.innerHeight) { // all except Explorer
    windowHeight = self.innerHeight;
  } else if (document.documentElement && document.documentElement.clientHeight) {
    windowHeight = document.documentElement.clientHeight;
  } else if (document.body) { // other Explorers
    windowHeight = layout.display.window.height;
  }
  return windowHeight;
};

layout.getPageWidth = function() {
  var windowWidth;
  if (self.innerWidth) { // all except Explorer
    windowWidth = self.innerWidth;
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
    while (p = properties.shift()) {
        if (typeof element.style[p] != 'undefined') {
            return p;
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

