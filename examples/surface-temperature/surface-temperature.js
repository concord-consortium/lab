d3.json("surface-temperature-data.json", function(json) {

  graph = grapher.surfaceTemperatureSampleGraph(json.global_temperatures);

});
