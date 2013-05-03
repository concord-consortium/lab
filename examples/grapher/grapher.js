/*global Lab d3 document window $ */
/*jslint indent: 2 */
// ------------------------------------------------------------
//
// Graphing Demo
//
// ------------------------------------------------------------

var graph,
    selectSize = document.getElementById('select-size'),
    selectData = document.getElementById('select-data'),
    responsiveLayout = document.getElementById('responsive-layout'),
    DEFAULT_GRAPH = "earth-surface-temperature",
    hash = document.location.hash || "#" + DEFAULT_GRAPH,
    interactive_url = hash.substr(1, hash.length),

    // used in the streaming examples
    timerId,
    maxtime,
    twopi = Math.PI * 2,
    frequency1,
    amplitude1,
    frequency2,
    amplitude2,
    twopifreq2,
    time,
    count,
    value1,
    value2,
    stopStreaming = false;

document.location.hash = hash;
selectData.value = interactive_url;

function selectSizeHandler() {
  switch (selectSize.value) {
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
    graph = Lab.grapher.Graph('#chart');
  }
  switch(selectData.value) {
  case "fake":
    graph.reset('#chart', {
      title:  "Fake Data",

      responsiveLayout: responsiveLayout.checked,
      fontScaleRelativeToParent: false,
      dataType: 'fake',

      markAllDataPoints: true,
      dataChange: true,
      addData: true
    });
    break;

  case "stair-steps":
    graph.reset('#chart', {
      title:  "Stair-Step Data",
      xlabel: "Distance",
      ylabel: "Height",
      xmax:   14,
      xmin:   0,
      ymax:   20,
      ymin:   8,

      responsiveLayout: responsiveLayout.checked,
      fontScaleRelativeToParent: false,
      dataType: 'points',
      dataPoints: [
        [0, 10], [2, 10],
        [2, 12], [4, 12],
        [4, 14], [6, 14],
        [6, 16], [8, 16],
        [8, 18], [10, 18]
      ],

      markAllDataPoints: true,
      dataChange: true,
      addData: true
    });
    break;

  case "earth-surface-temperature":
    d3.json("data/surface-temperature-data.json", function (data) {
      var surfaceTemperatures = data.global_temperatures.temperature_anomolies.map(function (e) {
          return [e[0], e[1] + data.global_temperatures.global_surface_temperature_1961_1990];
        });
      graph.reset('#chart', {
        title:  "Earth's Surface Temperature: years 500-2009",
        xlabel: "Year",
        ylabel: "Degrees C",
        xmax:   2000,
        xmin:   500,
        ymax:   15,
        ymin:   13,
        xFormatter: ".3r",
        yFormatter: ".1f",

        responsiveLayout: responsiveLayout.checked,
        fontScaleRelativeToParent: false,
        dataType: 'points',
        dataPoints: surfaceTemperatures,

        markAllDataPoints: false,
        dataChange: false
      });
    });
    break;

  case "world-population":
    d3.json("data/world-population.json", function(data) {
      var worldPopulation = data.worldPopulation.data;
      graph.reset('#chart', {
        title:  "World Population, Historical and Projected: 10,000 BCE to 2050",
        xlabel: "Year",
        ylabel: "Population (Millions)",
        xmax:   2500,
        xmin:   -10000,
        ymax:   20000,
        ymin:   0,

        responsiveLayout: responsiveLayout.checked,
        fontScaleRelativeToParent: false,
        dataType: 'points',
        dataPoints: worldPopulation,

        markAllDataPoints: false,
        dataChange: false
      });
    });
    break;

  case "world-population-semi-log":
    d3.json("data/world-population.json", function(data) {
      var worldPopulation = data.worldPopulation.data;
      graph.reset('#chart', {
        title:  "World Population, Historical and Projected: 10,000 BCE to 2050 (semi-log)",
        xlabel: "Year",
        ylabel: "Population (Millions)",
        xmax:   2500,
        xmin:   -10000,
        ymax:   20000,
        ymin:   0.1,
        xFormatter: ".3r",
        yscale: "log",

        responsiveLayout: responsiveLayout.checked,
        fontScaleRelativeToParent: false,
        dataType: 'points',
        dataPoints: worldPopulation,

        markAllDataPoints: false,
        dataChange: false
      });
    });
    break;

  case "md2d-center-of-mass":
    d3.text("data/cm-random-walk.csv", "text/csv", function(text) {
      var data = d3.csv.parseRows(text);
      data.length = 5000;
      var randomWalk = data.map(function(e) { return [e[1], e[2]]; });
      graph.reset('#chart', {
        title:  [
          "Constrained random walk of center of mass of Lab molecular simulation",
          "(L-J forces only; 50 atoms; no thermostat; initial temperature = \"5\")"
        ],
        xlabel: "x-location of center of mass",
        ylabel: "y-location of center of mas",

        responsiveLayout: responsiveLayout.checked,
        fontScaleRelativeToParent: false,
        dataType: 'points',
        dataPoints: randomWalk,

        xmax:   50,
        xmin:   -50,
        ymax:   50,
        ymin:   -50,
        markAllDataPoints: false,
        strokeWidth: 1,
        dataChange: false
      });
    });
    break;

  case "streaming":
    maxtime = 20;
    graph.reset('#chart', {
      title:  "Sin Waves",
      xlabel: "Time",
      ylabel: "Amplitude",
      xmax:   maxtime,
      xmin:   0,
      ymax:   2,
      ymin:   -2,

      responsiveLayout: responsiveLayout.checked,
      fontScaleRelativeToParent: false,
      dataType: 'points',
      dataPoints: [],

      markAllDataPoints: false,
      strokeWidth: 1,
      dataChange: false,
      addData: false
    });

    stopStreaming = false;
    frequency1 = 0.5;
    amplitude1 = 1;
    twopifreq1 = twopi * frequency1;
    frequency2 = Math.PI;
    amplitude2 = 0.2;
    twopifreq2 = twopi * frequency2;
    time = 0,
    lastSample = 0;

    d3.timer(function(elapsed) {
      time = (time + (elapsed - lastSample) / 1000);
      lastSample = elapsed;
      if (stopStreaming) { return true; }
      value1 = Math.sin(twopifreq1 * time) * amplitude1;
      value2 = Math.sin(twopifreq2 * time) * amplitude2;
      graph.addPoint([time, value1 + value2]);
      return time > maxtime * 2 || stopStreaming;
    });
    break;

  case "earth-surface-temperature-samples":
    d3.json("data/surface-temperature-data.json", function(data) {
      var surfaceTemperatures = data.global_temperatures.temperature_anomolies.map(function(e) {
          return e[1] + data.global_temperatures.global_surface_temperature_1961_1990;
        });
      graph.reset('#chart', {
        title:  "Earth's Surface Temperature: years 500-2009",
        xlabel: "Year",
        ylabel: "Degrees C",
        xmax:   2100,
        xmin:   400,
        ymax:   15,
        ymin:   13,
        xFormatter: ".3r",
        yFormatter: ".1f",

        responsiveLayout: responsiveLayout.checked,
        fontScaleRelativeToParent: false,

        dataType: 'samples',
        dataSamples: surfaceTemperatures,
        sampleInterval: 1,
        dataSampleStart: 500,

        markAllDataPoints: false,
        dataChange: false
      });
    });
    break;


  case "realtime-markers":
    maxtime = 10;
    sampleInterval = 0.05;
    graph.reset('#chart', {
      title:  "Sin Waves",
      xlabel: "Time",
      ylabel: "Amplitude",
      xmax:   maxtime+0.6,
      xmin:   0,
      ymax:   1.6,
      ymin:   -1.6,

      responsiveLayout: responsiveLayout.checked,
      fontScaleRelativeToParent: false,

      dataType: 'samples',
      dataSamples: [],
      sampleInterval: sampleInterval,
      dataSampleStart: 0,

      markAllDataPoints: false,
      markNearbyDataPoints: true,
      extraCirclesVisibleOnHover: 1,
      showRulersOnSelection: true,

      strokeWidth: 5,
      dataChange: false,
      addData: false
    });

    stopStreaming = false;
    frequency1 = 0.102;
    amplitude1 = 1;
    twopifreq1 = twopi * frequency1;
    frequency2 = 0.5;
    amplitude2 = 0.5;
    twopifreq2 = twopi * frequency2;
    time = 0;
    count = 0;

    timerId = setInterval(function() {
      count++;
      time = count * sampleInterval;
      if (time > maxtime || stopStreaming) { clearInterval(timerId); }
      value1 = Math.sin(twopifreq1 * time) * amplitude1;
      value2 = Math.sin(twopifreq2 * time) * amplitude2;
      graph.addSamples([value1 + value2]);
    }, 1000*sampleInterval);
    break;

  case "multiline-realtime-markers":
    maxtime = 10;
    sampleInterval = 0.05;
    graph.reset('#chart', {
      title:  "Sin Waves",
      xlabel: "Time",
      ylabel: "Amplitude",
      xmax:   maxtime+0.6,
      xmin:   0,
      ymax:   1.6,
      ymin:   -1.6,

      responsiveLayout: responsiveLayout.checked,
      fontScaleRelativeToParent: false,

      dataType: 'samples',
      dataSamples: [],
      sampleInterval: sampleInterval,
      dataSampleStart: 0,

      markAllDataPoints: false,
      markNearbyDataPoints: true,
      extraCirclesVisibleOnHover: 1,
      showRulersOnSelection: true,

      strokeWidth: 5,
      dataChange: false,
      addData: false
    });

    stopStreaming = false;
    frequency1 = 0.102;
    amplitude1 = 1;
    twopifreq1 = twopi * frequency1;
    frequency2 = 0.5;
    amplitude2 = 0.5;
    twopifreq2 = twopi * frequency2;
    time = 0;
    count = 0;

    timerId = setInterval(function() {
      count++;
      time = count * sampleInterval;
      if (time > maxtime || stopStreaming) { clearInterval(timerId); }
      value1 = Math.sin(twopifreq1 * time) * amplitude1;
      value2 = Math.sin(twopifreq2 * time) * amplitude2;
      graph.addSamples([[(value1 + value2)], [0-(value1+value2)]]);
    }, 1000*sampleInterval);
    break;
  }
}

selectData.onchange = selectDataHandler;
responsiveLayout.onchange = selectDataHandler;
selectDataHandler();

$(window).bind('hashchange', function () {
  if (document.location.hash !== hash) {
    selectDataHandler();
  }
});
