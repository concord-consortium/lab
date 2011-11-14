d3.json("cities.json", function(json) {

  graph = grapher.citiesSampleGraph(json.cities[10]);

});
