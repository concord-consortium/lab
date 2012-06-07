var graph;
d3.text("data/cm-random-walk.csv", "text/csv", function(text) {
  var data = d3.csv.parseRows(text);
  data.length = 5000;
  var random_walk = data.map(function(e) { return [e[1], e[2]]; });
  var graph = grapher.graph("#graph", {
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
    dataChange: false,
    points: random_walk
  });
  selectSize = document.getElementById('select-size');

  function selectSizeHandler() {
    switch(selectSize.value) {
      case "large":
      graph.resize(1000, 1000);
      break;

      case "medium":
      graph.resize(700, 700);
      break;

      case "small":
      graph.resize(400, 500);
      break;

      case "tiny":
      graph.resize(240, 240);
      break;

      case "icon":
      graph.resize(120, 120);
      break;
    }
  }

  selectSize.onchange = selectSizeHandler;

});
