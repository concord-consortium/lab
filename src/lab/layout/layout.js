// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

layout = { version: "0.0.1" };

layout.selection = "";

layout.display = {};
layout.regular_display = false;

layout.not_rendered = true;
layout.fontsize = false;
layout.cancelFullScreen = false;
layout.full_screen_factor = 1;

layout.getDisplayProperties = function(obj) {
  if (!arguments.length) {
    var obj = {}
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
  }
  return obj
}

layout.checkForResize = function() {
  if ((layout.display.screen.width  != screen.width) ||
      (layout.display.screen.height != screen.height) ||
      (layout.display.window.width  != document.width) ||
      (layout.display.window.height != document.height)) {
    layout.setupScreen()
  }
}

layout.setupScreen = function(layout_selection) {
  var fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;

  layout.display = layout.getDisplayProperties();

  if (!layout.regular_display) {
    layout.regular_display = layout.getDisplayProperties();
  }

  if(fullscreen) {
    layout.not_rendered = true;
    layout.full_screen_factor = layout.display.screen.width / layout.regular_display.window.width;
    layout.bodycss.style.fontSize = layout.full_screen_factor + 'em';
    switch (layout.selection) {

      case "simple-screen":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      case "simple-static-screen":
      if (layout.not_rendered) {
        setupSimpleFullScreenMoleculeContainer();
        setupFullScreenDescriptionRight();
      }
      break;

      case "simple-iframe":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      default:
      setupFullScreenMoleculeContainer();
      setupFullScreenPotentialChart();
      setupFullScreenSpeedDistributionChart();
      setupFullScreenKEChart();
      break;
    }
  } else {
    if (layout.cancelFullScreen) {
      layout.cancelFullScreen = false;
      layout.regular_display = layout.previous_display
    } else {
      layout.regular_display = layout.getDisplayProperties();
    }
    layout.full_screen_factor = 1;
    layout.bodycss.style.fontSize = "1em"
    switch (layout.selection) {

      case "simple-screen":
      setupSimpleMoleculeContainer();
      setupDescriptionRight();
      break;

      case "simple-static-screen":
      if (layout.not_rendered) {
        setupSimpleMoleculeContainer();
        setupDescriptionRight();
        layout.not_rendered = false;
      }
      break;

      case "simple-iframe":
      setupSimpleIFrameMoleculeContainer();
      break;

      default:
      setupRegularScreenMoleculeContainer();
      setupRegularScreenPotentialChart();
      setupRegularSpeedDistributionChart();
      setupRegularScreenKEChart();
      break;
    }
    layout.regular_display = layout.getDisplayProperties();
  }
  layout.setupTemperature();
  if (benchmarks_table) {
    benchmarks_table.style.display = "none";
  }

  //
  // Regular Screen Layout
  //
  function setupRegularScreenMoleculeContainer() {
    moleculecontainer.style.width = layout.display.page.width * 0.42 +"px";
    moleculecontainer.style.height = layout.display.page.width * 0.40 - 4 +"px";
    layout.finishSetupMoleculeContainer();
  }

  function setupRegularScreenPotentialChart() {
    lj_potential_chart.style.width = layout.display.page.width * 0.24 +"px";
    lj_potential_chart.style.height = layout.display.page.width * 0.18 +"px";
    layout.finishSetupPotentialChart();
  }

  function setupRegularSpeedDistributionChart() {
    speed_distribution_chart.style.width = layout.display.page.width * 0.23 +"px";
    speed_distribution_chart.style.height = layout.display.page.width * 0.18 +"px";
    layout.finishSetupSpeedDistributionChart();
  }

  function setupRegularScreenKEChart() {
    kechart.style.width = layout.display.page.width * 0.48  + 4 +"px";
    kechart.style.height = layout.display.page.width * 0.20 + 5 +"px";
    layout.finishSetupKEChart();
  }

  //
  // Full Screen Layout
  //
  function setupFullScreenMoleculeContainer() {
    moleculecontainer.style.width = layout.display.page.height * 0.70 + "px";
    moleculecontainer.style.height = layout.display.page.height * 0.70 + "px";
    layout.finishSetupMoleculeContainer();
  }

  function setupFullScreenPotentialChart() {
    lj_potential_chart.style.width = layout.display.page.width * 0.24 +"px";
    lj_potential_chart.style.height = layout.display.page.height * 0.28 +"px";
    layout.finishSetupPotentialChart();
  }

  function setupFullScreenSpeedDistributionChart() {
    speed_distribution_chart.style.width = layout.display.page.width * 0.22 +"px";
    speed_distribution_chart.style.height = layout.display.page.height * 0.28 +"px";
    layout.finishSetupSpeedDistributionChart();
  }

  function setupFullScreenKEChart() {
    kechart.style.width = layout.display.page.width * 0.47 + 5 + "px";
    kechart.style.height = layout.display.page.height * 0.40 + 0 +"px";
    layout.finishSetupKEChart();
  }

  //
  // Simple Screen Layout
  //
  function setupSimpleMoleculeContainer() {
    var size = layout.display.page.height * 0.70;
    moleculecontainer.style.width = size +"px";
    moleculecontainer.style.height = size +"px";
    layout.finishSetupMoleculeContainer();
  }

  function setupDescriptionRight() {
    var description_right = document.getElementById("description-right");
    if (description_right !== null) {
      description_right.style.width = Math.max(layout.display.page.width * 0.3,  layout.display.page.width - layout.display.page.height) +"px";
    }
  }

  //
  // Simple iframe Screen Layout
  //
  function setupSimpleIFrameMoleculeContainer() {
    var size = layout.display.page.height * 0.75;
    moleculecontainer.style.width = size +"px";
    moleculecontainer.style.height = size +"px";
    layout.finishSetupMoleculeContainer();
  }

  //
  // Simple Full Screen Layout
  //
  function setupSimpleFullScreenMoleculeContainer() {
    var size = layout.display.page.height * 0.75;
    moleculecontainer.style.width = size +"px";
    moleculecontainer.style.height = size +"px";
    layout.finishSetupMoleculeContainer();
  }

  function setupFullScreenDescriptionRight() {
    var description_right = document.getElementById("description-right");
    if (description_right !== null) {
      description_right.style.width = layout.display.window.width * 0.30 +"px";
    }
  }
}

layout.getStyleForSelector = function(selector) {
  var rule_lists = document.styleSheets
  for(var i = 0; i < rule_lists.length; i++) {
    var rules = rule_lists[i].rules || rule_lists[i].cssRules
    for(var j = 0; j < rules.length; j++) {
      if (rules[j].selectorText == selector) {
        return rules[j]
      }
    }
  }
  return false
};

// Adapted from getPageSize() by quirksmode.com
layout.getPageHeight = function() {
  var windowHeight
  if (self.innerHeight) { // all except Explorer
    windowHeight = self.innerHeight;
  } else if (document.documentElement && document.documentElement.clientHeight) {
    windowHeight = document.documentElement.clientHeight;
  } else if (document.body) { // other Explorers
    windowHeight = layout.display.window.height;
  }
  return windowHeight
}

layout.getPageWidth = function() {
  var windowWidth
  if (self.innerWidth) { // all except Explorer
    windowWidth = self.innerWidth;
  } else if (document.documentElement && document.documentElement.clientWidth) {
    windowWidth = document.documentElement.clientWidth;
  } else if (document.body) { // other Explorers
    windowWidth = window.width;
  }
  return windowWidth
}

var description_right = document.getElementById("description-right");
if (description_right !== null) {
  layout.fontsize = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
}

layout.bodycss = layout.getStyleForSelector("body");

