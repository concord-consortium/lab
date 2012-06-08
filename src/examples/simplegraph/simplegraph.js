
graph = grapher.graph('#chart');

stopStreaming = false;

selectSize = document.getElementById('select-size');
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

selectData = document.getElementById('select-data');
function selectDataHandler() {
  stopStreaming = true;
  switch(selectData.value) {
    case "fake":
    graph.reset({ points: false });
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
        frequency2 = 4,
        amplitude2 = 0.2,
        twopifreq2 = twopi * frequency2,
        time = 0,
        lastSample = 0,
        value1, value2;

    d3.timer(function(elapsed) {
      time = (time + (elapsed - lastSample) / 1000);
      lastSample = elapsed;
      value1 = Math.sin(twopifreq1 * time) * amplitude1;
      value2 = Math.sin(twopifreq2 * time) * amplitude2;
      graph.add_data([time, value1 + value2]);
      return time > maxtime * 0.95 || stopStreaming;
    });
    break;
  }
}
selectData.onchange = selectDataHandler;
