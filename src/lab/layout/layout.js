// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

layout = { version: "0.0.1" };

layout.selection = "";

layout.setupScreen = function(layout_selection) {
  var fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;
  if(fullscreen) {
    switch (layout.selection) {
      case "simple-screen":
      layout.setupSimpleFullScreen();
      break;

      case "simple-iframe":
      layout.setupSimpleFullScreen();
      break;

      default:
      layout.setupFullScreen();
      break;
    }
  } else {
    switch (layout.selection) {
      case "simple-screen":
      layout.setupSimpleScreen();
      break;

      case "simple-iframe":
      layout.setupSimpleIFrameScreen();
      break;

      default:
      layout.setupRegularScreen();
      break;
    }
  }
  layout.setupTemperature();
  if (benchmarks_table) {
    benchmarks_table.style.display = "none";
  }
}

layout.setupFullScreen = function() {
  layout.setupFullScreenMoleculeContainer();
  layout.setupFullScreenPotentialChart();
  layout.setupFullScreenSpeedDistributionChart();
  layout.setupFullScreenKEChart();
}

layout.setupRegularScreen = function() {
  layout.setupRegularScreenMoleculeContainer();
  layout.setupRegularScreenPotentialChart();
  layout.setupRegularSpeedDistributionChart();
  layout.setupRegularScreenKEChart();
}

layout.setupSimpleScreen = function() {
  layout.setupSimpleMoleculeContainer();
  layout.setupDescriptionRight();
}

layout.setupSimpleIFrameScreen = function() {
  layout.setupSimpleIFrameMoleculeContainer();
}

layout.setupSimpleFullScreen = function() {
  layout.setupSimpleFullScreenMoleculeContainer();
  layout.setupFullScreenDescriptionRight();
}

//
// Regular Screen Layout
//
layout.setupRegularScreenMoleculeContainer = function() {
  moleculecontainer.style.width = document.body.clientWidth * 0.45 +"px";
  moleculecontainer.style.height = document.body.clientWidth * 0.42 - 4 +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupRegularScreenPotentialChart = function() {
  lj_potential_chart.style.width = document.body.clientWidth * 0.24 +"px";
  lj_potential_chart.style.height = document.body.clientWidth * 0.20 +"px";
  layout.finishSetupPotentialChart();
}

layout.setupRegularSpeedDistributionChart = function() {
  speed_distribution_chart.style.width = document.body.clientWidth * 0.23 +"px";
  speed_distribution_chart.style.height = document.body.clientWidth * 0.20 +"px";
  layout.finishSetupSpeedDistributionChart();
}

layout.setupRegularScreenKEChart = function() {
  kechart.style.width = document.body.clientWidth * 0.48  + 4 +"px";
  kechart.style.height = document.body.clientWidth * 0.20 + 4 +"px";
  layout.finishSetupKEChart();
}

// Full Screen Layout

layout.setupFullScreenMoleculeContainer = function() {
  moleculecontainer.style.width = screen.width * 0.48 +"px";
  moleculecontainer.style.height = screen.height * 0.75 + 3 + "px";
  layout.finishSetupMoleculeContainer();
}

layout.setupFullScreenPotentialChart = function() {
  lj_potential_chart.style.width = screen.width * 0.24 +"px";
  lj_potential_chart.style.height = screen.height * 0.30 +"px";
  layout.finishSetupPotentialChart();
}

layout.setupFullScreenSpeedDistributionChart = function() {
  speed_distribution_chart.style.width = screen.width * 0.22 +"px";
  speed_distribution_chart.style.height = screen.height * 0.30 +"px";
  layout.finishSetupSpeedDistributionChart();
}

layout.setupFullScreenKEChart = function() {
  kechart.style.width = screen.width * 0.47 + 5 + "px";
  kechart.style.height = screen.height * 0.43 + 4 +"px";
  layout.finishSetupKEChart();
}

// Simple Screen Layout

layout.setupSimpleMoleculeContainer = function() {
  var size = Math.min(getPageHeight() * 0.75, window.innerWidth * 0.6);
  moleculecontainer.style.width = size +"px";
  moleculecontainer.style.height = size +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupDescriptionRight = function() {
  // var description_right = document.getElementById("description-right");
  // if (description_right !== null) {
  //   var size = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
  //   description_right.style.fontSize = size + "px";
  //   description_right.style.fontSize = "16px";
  //   description_right.style.width = document.body.clientWidth * 0.40 +"px";
  //   description_right.style.height = document.body.clientWidth * 0.40 + 2 +"px";
  // }
}

// Simple iFrame Screen Layout

layout.setupSimpleIFrameMoleculeContainer = function() {
  var size = Math.min(getPageHeight() * 0.75, window.innerWidth * 0.8);
  moleculecontainer.style.width = size +"px";
  moleculecontainer.style.height = size +"px";
  layout.finishSetupMoleculeContainer();
}

// Simple Full Screen Layout

layout.setupSimpleFullScreenMoleculeContainer = function() {
  var size = Math.min(getPageHeight() * 0.82, window.innerWidth * 0.7);
  moleculecontainer.style.width = size +"px";
  moleculecontainer.style.height = size +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupFullScreenDescriptionRight = function() {
  // var description_right = document.getElementById("description-right");
  // var size = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
  // description_right.style.fontSize = size * 1.5 + "px";
  // description_right.style.width = document.body.clientWidth * 0.30 +"px";
  // description_right.style.height = document.body.clientWidth * 0.30 + 2 +"px";
}

layout.getStyleForSelector = function(selector) {
    var rules = document.styleSheets[0].rules || document.styleSheets[0].cssRules
    for(var i = 0; i < rules.length; i++) {
        if (rules[i].selectorText == selector) {
          return rules[i]
        }
    }
    return false
};

// Adapted from getPageSize() by quirksmode.com
function getPageHeight() {
    var windowHeight
    if (self.innerHeight) { // all except Explorer
      windowHeight = self.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) {
      windowHeight = document.documentElement.clientHeight;
    } else if (document.body) { // other Explorers
      windowHeight = document.body.clientHeight;
    }
    return windowHeight
}