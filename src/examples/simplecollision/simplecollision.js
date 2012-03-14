var chart = document.getElementById("chart"),
    w = chart.clientWidth,
    h = chart.clientHeight;

var nodes = d3.range(200).map(function() { return {radius: Math.random() * 12 + 4}; }),
    color = d3.scale.category10();

var force = d3.layout.force()
    .gravity(0.05)
    .charge(function(d, i) { return i ? 0 : -2000; })
    .nodes(nodes)
    .size([w, h]);

var root = nodes[0];
root.radius = 0;
root.fixed = true;

force.start();

var svg = d3.select("#chart").append("svg:svg")
    .attr("width", w)
    .attr("height", h);

	// add gradient defs
	var mc_orange_gradient = svg.append("svg:defs")
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
	mc_blue_gradient = svg.append("svg:defs")
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
	mc_green_gradient = svg.append("svg:defs")
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

svg.append("svg:rect")
    .attr("width", w)
    .attr("height", h);

svg.selectAll("circle")
    .data(nodes.slice(1))
  .enter().append("svg:circle")
    .attr("r", function(d) { return d.radius - 2; })
    .style("fill", function() { var grads = ['url("#orange-grad")','url("#blue-grad")','url("#green-grad")']; var grad_num = Math.floor(Math.random()*3); return grads[grad_num]; });

force.on("tick", function(e) {
  var q = d3.geom.quadtree(nodes),
      i = 0,
      n = nodes.length;

  while (++i < n) {
    q.visit(collide(nodes[i]));
  }

  svg.selectAll("circle")
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
});

svg.on("mousemove", function() {
  var p1 = d3.svg.mouse(this);
  root.px = p1[0];
  root.py = p1[1];
  force.resume();
});

function collide(node) {
  var r = node.radius + 16,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = node.radius + quad.point.radius;
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2
        || x2 < nx1
        || y1 > ny2
        || y2 < ny1;
  };
}
