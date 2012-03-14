var chart = document.getElementById("beamchart"),
    w = chart.clientWidth,
    h = chart.clientHeight,
    radius = 10,
    diameter = radius * 2,
    spacing = 1.0,
    columns = Math.floor(w / diameter / spacing) ,
    rows = 4,
    links = [];

var nodes = d3.range(columns * rows).map(function(i) { 
  return {
    radius: radius,
    x: i * diameter * spacing % w + radius * spacing, 
    y: Math.floor(i / columns) * diameter * spacing + 60
  }; 
})

// nodes.forEach(function(target) {
//   var x = target.x - node.x,
//       y = target.y - node.y;
//   if (Math.sqrt(x * x + y * y) < 30) {
//     links.push({source: node, target: target});
//   }
// });


for(var i = 0; i < nodes.length ; i += columns) {
  nodes[i].fixed = true;
  nodes[i + columns - 1].fixed = true;
}
// var nodes = d3.range(200).map(function() { return {radius: 12}; }),

d3.geom.delaunay(nodes).forEach(function(d) {
    links.push(edge(d[0], d[1]));
    links.push(edge(d[1], d[2]));
    links.push(edge(d[2], d[0]));
  });

var path = d3.geo.path();

var force = d3.layout.force()
    .gravity(0.00)
    .charge(function(d, i) { return 25; })
    .linkStrength(1)
    .linkDistance(function(d) { return d.distance; })
    .theta(function(d, i) { return 0.8; })
    .nodes(nodes)
    .size([w, h])
    .links(links)
    .start();

var svg = d3.select(chart).append("svg:svg")
    .attr("width", w)
    .attr("height", h);

// add gradient defs
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

var node = svg.selectAll("circle")
    .data(nodes)
  .enter().append("svg:circle")
    .attr("r",  function(d) { return d.radius; })
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .style("fill", function(d, i) { return "url('#green-grad')"; })
    .call(force.drag);

// var link = svg.selectAll("line")
//       .data(links)
//     .enter().append("svg:line")
//       .attr("x1", function(d) { return d.source.x; })
//       .attr("y1", function(d) { return d.source.y; })
//       .attr("x2", function(d) { return d.target.x; })
//       .attr("y2", function(d) { return d.target.y; });

force.on("tick", function(e) {
  var q = d3.geom.quadtree(nodes),
      i = 0,
      n = nodes.length;

  while (++i < n) {
    q.visit(collide(nodes[i]));
  }
  
  // link.attr("x1", function(d) { return d.source.x; })
  //     .attr("y1", function(d) { return d.source.y; })
  //     .attr("x2", function(d) { return d.target.x; })
  //     .attr("y2", function(d) { return d.target.y; });
  
  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });

  // svg.selectAll("circle")
  //     .attr("cx", function(d) { return d.x; })
  //     .attr("cy", function(d) { return d.y; });
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

function edge(a, b) {
  var dx = a.x - b.x, dy = a.y - b.y;
  return {
    source: a,
    target: b,
    distance: Math.sqrt(dx * dx + dy * dy)
  };
}