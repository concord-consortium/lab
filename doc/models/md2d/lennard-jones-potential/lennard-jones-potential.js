var graph = {};

graph.epsilon = -0.5;                           // depth of the potential well
graph.sigma   = 2;                             // finite distance at which the inter-particle potential is zero

graph.xmax    = graph.sigma * 4;
graph.xmin    = graph.sigma * 0.5;

graph.ymax    =  0.6;
graph.ymin    = -0.6;

graph.title   = "Lennard-Jones potential";
graph.xlabel  = "Distance r (radii)";
graph.ylabel  = "Potential Energy";

graph.lennard_jones_potential = [];

update_coefficients();

graph.coefficients = [
  { coefficient:"epsilon", x:graph.r_min, y:graph.epsilon }, 
  { coefficient:"sigma", x:graph.sigma, y:0 }
];

function update_epsilon(e) {
  graph.epsilon = e;
  update_coefficients();
}

function update_sigma(s) {
  graph.sigma = s;
  update_coefficients();
}

function update_coefficients() {
  graph.r_min   = Math.pow(2, 1/6) * graph.sigma; // distance at which the potential well reaches its minimum
  graph.lennard_jones_potential = []
  graph.alpha   = 4 * graph.epsilon * Math.pow(graph.sigma, 12);
  graph.beta    = 4 * graph.epsilon * Math.pow(graph.sigma, 6);
  var y;
  for(var r = graph.xmin; r < graph.xmax * 3;) {
    y = (graph.alpha/Math.pow(r, 12) - graph.beta/Math.pow(r, 6)) * -1;
    if (y > 100) {
      r += 0.05
    } else {
      graph.lennard_jones_potential.push([r, (graph.alpha/Math.pow(r, 12) - graph.beta/Math.pow(r, 6)) * -1]);
      if (r < graph.r_min * 3) {
        r += 0.01
      } else {
        r += 0.1
      }
    }
  }
}

var chart = document.getElementById("chart"),
    cx = chart.clientWidth,
    cy = chart.clientHeight,
    padding = {
       "top":    graph.title  ? 40 : 20, 
       "right":                 30, 
       "bottom": graph.xlabel ? 50 : 10,
       "left":   graph.ylabel ? 70 : 45
    },
    size = { 
      "width":  cx - padding.left - padding.right, 
      "height": cy - padding.top  - padding.bottom 
    },
    mw = size.width,
    mh = size.height,
    tx = function(d) { return "translate(" + x(d) + ",0)"; },
    ty = function(d) { return "translate(0," + y(d) + ")"; },
    stroke = function(d) { return d ? "#ccc" : "#666"; };

// x-scale
x = d3.scale.linear()
    .domain([graph.xmin, graph.xmax])
    .range([0, size.width]),

// drag x-axis logic
downscalex = x.copy(),
downx = Math.NaN,

// y-scale (inverted domain)
y = d3.scale.linear()
    .domain([graph.ymax, graph.ymin])
    .nice()
    .range([0, size.height])
    .nice(),
line = d3.svg.line()
    .x(function(d, i) { return x(graph.lennard_jones_potential[i][0]); })
    .y(function(d, i) { return y(graph.lennard_jones_potential[i][1]); }),

// drag y-axis logic
downscaley = y.copy(),
downy = Math.NaN,

dragged = null,
selected = graph.coefficients[0];

var vis = d3.select(chart).append("svg")
    .attr("width", cx)
    .attr("height", cy)
    .append("g")
      .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

var plot = vis.append("rect")
    .attr("width", size.width)
    .attr("height", size.height)
    .style("fill", "#EEEEEE")
    .attr("pointer-events", "all")
    .call(d3.behavior.zoom().x(x).y(y).scaleExtent([1, 8]).on("zoom", redraw));

vis.append("svg")
    .attr("top", 0)
    .attr("left", 0)
    .attr("width", size.width)
    .attr("height", size.height)
    .attr("viewBox", "0 0 "+size.width+" "+size.height)
    .append("path")
        .attr("class", "line")
        .attr("d", line(graph.lennard_jones_potential))

// add Chart Title
if (graph.title) {
  vis.append("text")
      .text(graph.title)
      .attr("x", size.width/2)
      .attr("dy","-0.8em")
      .style("text-anchor","middle");
}

// Add the x-axis label
if (graph.xlabel) {
  vis.append("text")
      .text(graph.xlabel)
      .attr("x", size.width/2)
      .attr("y", size.height)
      .attr("dy","2.4em")
      .style("text-anchor","middle");
}

// add y-axis label
if (graph.ylabel) {
  vis.append("g")
      .append("text")
          .text( graph.ylabel)
          .style("text-anchor","middle")
          .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
}

d3.select(window)
    .on("mousemove.drag", mousemove)
    .on("touchmove.drag", mousemove)
    .on("mouseup.drag",   mouseup)
    .on("touchend.drag",  mouseup);

//
// draw the data
//
function update() {

  var epsilon_circle = vis.selectAll("circle")
      .data(graph.coefficients, function(d) { return d });

  var lines = vis.select("path").attr("d", line(graph.lennard_jones_potential)),
      x_extent = x.domain()[1] - x.domain()[0];
      
  epsilon_circle.enter().append("circle")
      .attr("class", function(d) { return d === selected ? "selected" : null; })
      .attr("cx",    function(d) { return x(d.x); })
      .attr("cy",    function(d) { return y(d.y); })
      .attr("r", 12.0)
      .on("mousedown", function(d) {
        if (d.coefficient == "epsilon") {
          d.x = graph.r_min;
        } else {
          d.y = 0
        }
        selected = dragged = d;
        update();
      });

  epsilon_circle
      .attr("class", function(d) { return d === selected ? "selected" : null; })
      .attr("cx",    function(d) { return x(d.x); })
      .attr("cy",    function(d) { return y(d.y); });

  epsilon_circle.exit().remove();

  if (d3.event && d3.event.keyCode) {
    d3.event.preventDefault();
    d3.event.stopPropagation();
  }
}

graph.coefficients[0].y;

function mousemove() {
  if (!dragged) return;
  var m = d3.svg.mouse(vis.node()),
    newx, newy;
  if (dragged.coefficient == "epsilon") {
    newx = graph.r_min;
    newy = y.invert(Math.max(0, Math.min(size.height, m[1])));
    if (newy > 0) { newy = 0 };
    if (newy < -2) { newy = -2 };
    update_epsilon(newy);
  } else {
    newy = 0;
    newx = x.invert(Math.max(0, Math.min(size.width, m[0])));
    if (newx < 1.1) { newx = 1.1 };
    if (newx > 5.0) { newx = 5.0 };
    update_sigma(newx);
    graph.coefficients[0].x = graph.r_min;
  }
  dragged.x = newx;
  dragged.y = newy;
  update();
}

function mouseup() {
  if (!dragged) return;
  mousemove();
  dragged = null;
}

redraw();

function redraw() {
  if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
      d3.event.transform(x, y);
  };

  var fx = x.tickFormat(10),
      fy = y.tickFormat(10);

  // Regenerate x-ticks…
  var gx = vis.selectAll("g.x")
      .data(x.ticks(10), String)
      .attr("transform", tx);

  gx.select("text")
      .text(fx);

  var gxe = gx.enter().insert("g", "a")
      .attr("class", "x")
      .attr("transform", tx);

  gxe.append("line")
      .attr("stroke", stroke)
      .attr("y1", 0)
      .attr("y2", size.height);

   gxe.append("text")
       .attr("y", size.height)
       .attr("dy", "1em")
       .attr("text-anchor", "middle")
       .style("cursor", "ew-resize")
       .text(fx)
       .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
       .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
       .on("mousedown", function(d) {
            var p = d3.svg.mouse(vis[0][0]);
            downx = x.invert(p[0]);
            downscalex = null;
            downscalex = x.copy();
            // d3.behavior.zoom().off("zoom", redraw);
       });
    

  gx.exit().remove();

  // Regenerate y-ticks…
  var gy = vis.selectAll("g.y")
      .data(y.ticks(10), String)
      .attr("transform", ty);

  gy.select("text")
      .text(fy);

  var gye = gy.enter().insert("g", "a")
      .attr("class", "y")
      .attr("transform", ty)
      .attr("background-fill", "#FFEEB6");

  gye.append("line")
      .attr("stroke", stroke)
      .attr("x1", 0)
      .attr("x2", size.width);

  gye.append("text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .style("cursor", "ns-resize")
      .text(fy)
      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
      .on("mousedown", function(d) {
           var p = d3.svg.mouse(vis[0][0]);
           downy = y.invert(p[1]);
           downscaley = y.copy();
           // d3.behavior.zoom().off("zoom", redraw);
      });
    

  gy.exit().remove();
  update();

}

//
// axis scaling
//
// attach the mousemove and mouseup to the body
// in case one wanders off the axis line
d3.select('body')
  .on("mousemove", function(d) {
    var p = d3.svg.mouse(vis[0][0]);
    if (!isNaN(downx)) {
      var rupx = downscalex.invert(p[0]),
        xaxis1 = downscalex.domain()[0],
        xaxis2 = downscalex.domain()[1],
        xextent = xaxis2 - xaxis1;
      if (rupx !== 0) {
          var changex, dragx_factor, new_domain;
          dragx_factor = xextent/downx;
          changex = 1 + (downx / rupx - 1) * (xextent/(downx-xaxis1))/dragx_factor;
          new_domain = [xaxis1, xaxis1 + (xextent * changex)];
          x.domain(new_domain);
          redraw();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
    if (!isNaN(downy)) {
        var rupy = downscaley.invert(p[1]),
        yaxis1 = downscaley.domain()[1],
        yaxis2 = downscaley.domain()[0],
        yextent = yaxis2 - yaxis1;
      if (rupy !== 0) {
          var changey, dragy_factor, new_range;
          dragy_factor = yextent/downy;
          changey = 1 - (rupy / downy - 1) * (yextent/(downy-yaxis1))/dragy_factor;
          new_range = [yaxis1 + (yextent * changey), yaxis1];
          y.domain(new_range);
          redraw();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  })
  .on("mouseup", function(d) {
      if (!isNaN(downx)) {
          redraw();
          downx = Math.NaN;
          d3.event.preventDefault();
          d3.event.stopPropagation();
      }
      if (!isNaN(downy)) {
          redraw();
          downy = Math.NaN;
          d3.event.preventDefault();
          d3.event.stopPropagation();
      }
  });
