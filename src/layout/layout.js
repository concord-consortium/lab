// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

layout = { version: "0.0.1" };

layout.setupScreen = function() {
  var fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;
  if(fullscreen) {
    layout.setupFullScreen();
  } else {
    layout.setupRegularScreen()
  }
  layout.setupTemperature();
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
  finishSetupMoleculeContainer();
}

layout.setupFullScreenPotentialChart = function() {
  lj_potential_chart.style.width = screen.width * 0.22 +"px";
  lj_potential_chart.style.height = screen.height * 0.35 +"px";
  finishSetupPotentialChart();
}

layout.setupFullScreenSpeedDistributionChart = function() {
  speed_distribution_chart.style.width = screen.width * 0.22 +"px";
  speed_distribution_chart.style.height = screen.height * 0.35 +"px";
  finishSetupSpeedDistributionChart();
}

layout.setupFullScreenKEChart = function() {
  kechart.style.width = screen.width * 0.44 + 5 + "px";
  kechart.style.height = screen.height * 0.45 - 2 +"px";
  finishSetupKEChart();
}

