var fill = d3.scale.category10(),
    nodes = d3.range(100).map(Object);

var chart = document.getElementById("chart"),
    w = chart.clientWidth,
    h = chart.clientHeight;

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", w)
    .attr("height", h);

// add gradient defs
var mc_orange_gradient = vis.append("svg:defs")
    .append("svg:radialGradient")
    .attr("id", "orange-grad")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "50%")
    .attr("fx", "35%")
    .attr("fy", "35%");
mc_orange_gradient.append("svg:stop")
    .attr("stop-color", "#f9eec1")
    .attr("offset", "0%");
mc_orange_gradient.append("svg:stop")
    .attr("stop-color", "#f4b626")
    .attr("offset", "50%");
mc_orange_gradient.append("svg:stop")
    .attr("stop-color", "#eb8723")
    .attr("offset", "100%");
mc_blue_gradient = vis.append("svg:defs")
    .append("svg:radialGradient")
    .attr("id", "blue-grad")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "50%")
    .attr("fx", "35%")
    .attr("fy", "35%");
mc_blue_gradient.append("svg:stop")
    .attr("stop-color", "#bddfdf")
    .attr("offset", "0%");
mc_blue_gradient.append("svg:stop")
    .attr("stop-color", "#8cbbb8")
    .attr("offset", "50%");
mc_blue_gradient.append("svg:stop")
    .attr("stop-color", "#3a878b")
    .attr("offset", "100%");
mc_green_gradient = vis.append("svg:defs")
    .append("svg:radialGradient")
    .attr("id", "green-grad")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "50%")
    .attr("fx", "35%")
    .attr("fy", "35%");
mc_green_gradient.append("svg:stop")
    .attr("stop-color", "#a6caaa")
    .attr("offset", "0%");
mc_green_gradient.append("svg:stop")
    .attr("stop-color", "#75a643")
    .attr("offset", "50%");
mc_green_gradient.append("svg:stop")
    .attr("stop-color", "#2a7216")
    .attr("offset", "100%");
mc_red_gradient = vis.append("svg:defs")
    .append("svg:radialGradient")
    .attr("id", "red-grad")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "50%")
    .attr("fx", "35%")
    .attr("fy", "35%");
mc_red_gradient.append("svg:stop")
    .attr("stop-color", "#e57999")
    .attr("offset", "0%");
mc_red_gradient.append("svg:stop")
    .attr("stop-color", "#b45532")
    .attr("offset", "50%");
mc_red_gradient.append("svg:stop")
    .attr("stop-color", "#6b2105")
    .attr("offset", "100%");

var force = d3.layout.force()
    .nodes(nodes)
    .links([])
    .size([w, h])
    .start();

var node = vis.selectAll("circle.node")
    .data(nodes)
  .enter().append("svg:circle")
    .attr("class", "node")
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .attr("r", 8)
    .style("fill", function() { var grads = ['url("#orange-grad")','url("#blue-grad")','url("#red-grad")','url("#green-grad")']; var grad_num = Math.floor(Math.random()*4); return grads[grad_num]; })
    .style("stroke", "transparent")
    .style("stroke-width", 0)
    .call(force.drag);

vis.style("opacity", 1e-6)
  .transition()
    .duration(1000)
    .style("opacity", 1);

force.on("tick", function(e) {

  // Push different nodes in different directions for clustering.
  var k = 6 * e.alpha;
  nodes.forEach(function(o, i) {
    o.y += i & 1 ? k : -k;
    o.x += i & 2 ? k : -k;
  });

  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
});

d3.select("body").on("click", function() {
  nodes.forEach(function(o, i) {
    o.x += (Math.random() - .5) * 40;
    o.y += (Math.random() - .5) * 40;
  });
  force.resume();
});
