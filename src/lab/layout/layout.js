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

      default:
      layout.setupFullScreen();
      break;
    }
  } else {
    switch (layout.selection) {
      case "simple-screen":
      layout.setupSimpleScreen();
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

layout.setupSimpleFullScreen = function() {
  layout.setupSimpleFullScreenMoleculeContainer();
  layout.setupFullScreenDescriptionRight();
}

//
// Regular Screen Layout
//
layout.setupRegularScreenMoleculeContainer = function() {
  moleculecontainer.style.width = document.body.clientWidth * 0.45 +"px";
  moleculecontainer.style.height = document.body.clientWidth * 0.45 + 2 +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupRegularScreenPotentialChart = function() {
  lj_potential_chart.style.width = document.body.clientWidth * 0.25 +"px";
  lj_potential_chart.style.height = document.body.clientWidth * 0.20 +"px";
  finishSetupPotentialChart();
}

layout.setupRegularSpeedDistributionChart = function() {
  speed_distribution_chart.style.width = document.body.clientWidth * 0.25 +"px";
  speed_distribution_chart.style.height = document.body.clientWidth * 0.20 +"px";
  finishSetupSpeedDistributionChart();
}

layout.setupRegularScreenKEChart = function() {
  kechart.style.width = document.body.clientWidth * 0.50  + 5 +"px";
  kechart.style.height = document.body.clientWidth * 0.25 - 3 +"px";
  finishSetupKEChart();
}

// Full Screen Layout

layout.setupFullScreenMoleculeContainer = function() {
  moleculecontainer.style.width = screen.width * 0.48 +"px";
  moleculecontainer.style.height = screen.height * 0.80 + 3 + "px";
  layout.finishSetupMoleculeContainer();
}

layout.setupFullScreenPotentialChart = function() {
  lj_potential_chart.style.width = screen.width * 0.22 +"px";
  lj_potential_chart.style.height = screen.height * 0.35 +"px";
  layout.finishSetupPotentialChart();
}

layout.setupFullScreenSpeedDistributionChart = function() {
  speed_distribution_chart.style.width = screen.width * 0.22 +"px";
  speed_distribution_chart.style.height = screen.height * 0.35 +"px";
  layout.finishSetupSpeedDistributionChart();
}

layout.setupFullScreenKEChart = function() {
  kechart.style.width = screen.width * 0.44 + 5 + "px";
  kechart.style.height = screen.height * 0.45 - 2 +"px";
  layout.finishSetupKEChart();
}

// Simple Screen Layout

layout.setupSimpleMoleculeContainer = function() {
  moleculecontainer.style.width = document.body.clientWidth * 0.45 +"px";
  moleculecontainer.style.height = document.body.clientWidth * 0.45 + 2 +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupDescriptionRight = function() {
  var description_right = document.getElementById("description-right");
  if (description_right !== null) {
    var size = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
    description_right.style.fontSize = size + "px";
    description_right.style.fontSize = "16px";
    description_right.style.width = document.body.clientWidth * 0.35 +"px";
    description_right.style.height = document.body.clientWidth * 0.35 + 2 +"px";
  }
}

// Simple Full Screen Layout

layout.setupSimpleFullScreenMoleculeContainer = function() {
  moleculecontainer.style.width = document.body.clientWidth * 0.55 +"px";
  moleculecontainer.style.height = document.body.clientWidth * 0.55 + 2 +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupFullScreenDescriptionRight = function() {
  var description_right = document.getElementById("description-right");
  var size = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
  description_right.style.fontSize = size * 1.5 + "px";
  description_right.style.width = document.body.clientWidth * 0.30 +"px";
  description_right.style.height = document.body.clientWidth * 0.30 + 2 +"px";
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
