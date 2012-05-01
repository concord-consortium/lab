d3.json("surface-temperature-data.json", function(data) {
  var surface_temperatures = data.global_temperatures.temperature_anomolies.map(function(e) {
      return [e[0], e[1] + data.global_temperatures.global_surface_temperature_1961_1990];
    });
  var graph = grapher.graph("#chart", {
    title:  "Earth's Surface Temperature: years 500-2009",
    xlabel: "Year",
    ylabel: "Degrees C",
    xmax:   2000,
    xmin:   500,
    ymax:   15,
    ymin:   13,
    circleRadius: 4.0,
    dataChange: false,
    points: surface_temperatures
  });
});
