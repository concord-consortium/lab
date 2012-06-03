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
});
