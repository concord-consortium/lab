/*global Lab d3 document window $ */
/*jslint indent: 2 */
// ------------------------------------------------------------
//
// Graphing Demo
//
// ------------------------------------------------------------

var graph,
    stopStreaming = false,
    selectSize = document.getElementById('select-size'),
    selectData = document.getElementById('select-data'),
    DEFAULT_GRAPH = "earth-surface-temperature",
    hash = document.location.hash || "#" + DEFAULT_GRAPH,
    interactive_url = hash.substr(1, hash.length);

document.location.hash = hash;
selectData.value = interactive_url;

function selectSizeHandler() {
  switch(selectSize.value) {
    case "large":
    graph.resize(1280, 666);
    break;

    case "medium":
    graph.resize(960, 500);
    break;

    case "small":
    graph.resize(480, 250);
    break;

    case "tiny":
    graph.resize(240, 125);
    break;

    case "icon":
    graph.resize(120, 62);
    break;
  }
}
selectSize.onchange = selectSizeHandler;

function selectDataHandler() {
  stopStreaming = true;
  interactive_url = selectData.value;
  hash = "#" + interactive_url;
  document.location.hash = hash;
  if (!graph) {
    graph = Lab.grapher.graph('#chart');
  }
  switch(selectData.value) {
    case "fake":
    graph.reset({ points: "fake" });
    break;

    case "stair-steps":
    graph.reset({
      title:  "Stair-Step Data",
      xlabel: "Distance",
      ylabel: "Height",
      xmax:   14,
      xmin:   0,
      ymax:   20,
      ymin:   8,
      circleRadius: 6.0,
      dataChange: true,
      addData: true,
      points: [
        [0, 10], [2, 10],
        [2, 12], [4, 12],
        [4, 14], [6, 14],
        [6, 16], [8, 16],
        [8, 18], [10, 18]
      ]
    });
    break;

    case "earth-surface-temperature":
    d3.json("data/surface-temperature-data.json", function(data) {
      var surface_temperatures = data.global_temperatures.temperature_anomolies.map(function(e) {
          return [e[0], e[1] + data.global_temperatures.global_surface_temperature_1961_1990];
        });
      graph.reset({
        title:  "Earth's Surface Temperature: years 500-2009",
        xlabel: "Year",
        ylabel: "Degrees C",
        xmax:   2000,
        xmin:   500,
        ymax:   15,
        ymin:   13,
        circleRadius: false,
        dataChange: false,
        points: surface_temperatures
      });
    });
    break;

    case "world-population":
    d3.json("data/world-population.json", function(data) {
      var worldPopulation = data.worldPopulation.data;
      graph.reset({
        title:  "World Population, Historical and Projected: 10,000 BCE to 2050",
        xlabel: "Year",
        ylabel: "Population (Millions)",
        xmax:   2500,
        xmin:   -10000,
        ymax:   20000,
        ymin:   0,
        circleRadius: false,
        dataChange: false,
        points: worldPopulation
      });
    });
    break;

    case "world-population-semi-log":
    d3.json("data/world-population.json", function(data) {
      var worldPopulation = data.worldPopulation.data;
      graph.reset({
        title:  "World Population, Historical and Projected: 10,000 BCE to 2050 (semi-log)",
        xlabel: "Year",
        ylabel: "Population (Millions)",
        xmax:   2500,
        xmin:   -10000,
        ymax:   20000,
        ymin:   0.1,
        yFormatter: "3.3r",
        yscale: "log",
        circleRadius: false,
        dataChange: false,
        points: worldPopulation
      });
    });
    break;

    case "md2d-center-of-mass":
    d3.text("data/cm-random-walk.csv", "text/csv", function(text) {
      var data = d3.csv.parseRows(text);
      data.length = 5000;
      var random_walk = data.map(function(e) { return [e[1], e[2]]; });
      graph.reset({
        title:  [
                  "Constrained random walk of center of mass of Lab molecular simulation",
                  "(L-J forces only; 50 atoms; no thermostat; initial temperature = \"5\")"
                ],
        xlabel: "x-location of center of mass",
        ylabel: "y-location of center of mas",
        xmax:   50,
        xmin:   -50,
        ymax:   50,
        ymin:   -50,
        circleRadius: false,
        strokeWidth: 1,
        dataChange: false,
        points: random_walk
      });
    });
    break;

    case "streaming":
    var maxtime = 20;
    graph.reset({
      title:  "Sin Waves",
      xlabel: "Time",
      ylabel: "Amplitude",
      xmax:   maxtime,
      xmin:   0,
      ymax:   2,
      ymin:   -2,
      circleRadius: false,
      strokeWidth: 1,
      dataChange: false,
      addData: false,
      points: []
    });
    stopStreaming = false;
    var twopi = Math.PI * 2,
        frequency1 = 0.5,
        amplitude1 = 1,
        twopifreq1 = twopi * frequency1,
        frequency2 = Math.PI,
        amplitude2 = 0.2,
        twopifreq2 = twopi * frequency2,
        time = 0,
        lastSample = 0,
        value1, value2;

    d3.timer(function(elapsed) {
      time = (time + (elapsed - lastSample) / 1000);
      lastSample = elapsed;
      if (stopStreaming) { return true; }
      value1 = Math.sin(twopifreq1 * time) * amplitude1;
      value2 = Math.sin(twopifreq2 * time) * amplitude2;
      graph.add_data([time, value1 + value2]);
      return time > maxtime * 2 || stopStreaming;
    });
    break;
  }
}

selectData.onchange = selectDataHandler;
selectDataHandler();

$(window).bind('hashchange', function () {
  if (document.location.hash !== hash) {
    selectDataHandler();
  }
});
