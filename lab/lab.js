(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

grapher = {version: "0.0.1"}; // semver
grapher.data = function(array) {
  var i = 0,
      n = array.length,
      points = [];
  for (i = 0; i < n;  i = i + 2) {
    points.push( { x: array[i], y: array[i+1] } )
  };
  return points;
};
grapher.indexedData = function(array, initial_index) {
  var i = 0,
      start_index = initial_index || 0,
      n = array.length,
      points = [];
  for (i = 0; i < n;  i++) {
    points.push( { x: i+start_index, y: array[i] } )
  };
  return points;
};
// comments
grapher.colors = function(color) {
  var colors = {
    bright_red:       '#ff0000',
    dark_red:         '#990000',
    bright_blue:      '#4444ff',
    dark_blue:        '#110077',
    bright_green:     '#00dd00',
    dark_green:       '#118800',
    bright_purple:    '#cc00cc',
    dark_purple:      '#770099',
    bright_orange:    '#ee6600',
    dark_orange:      '#aa4400',
    bright_turquoise: '#00ccbb',
    dark_turquoise:   '#008877',
  };
  return colors[color]
};

grapher.sampleGraph = function(array) {

  var graph = {};

  graph.xmax    = 60;
  graph.xmin    = 0;

  graph.ymax    = 40;
  graph.ymin    = 0;

  graph.title   = "Simple Graph";
  graph.xlabel  = "X Axis";
  graph.ylabel  = "Y Axis";

  var chart = document.getElementById("chart"),
      cx = chart.clientWidth,
      cy = chart.clientHeight,
      padding = {
         "top":    graph.title  ? 30 : 20,
         "right":                 30,
         "bottom": graph.xlabel ? 40 : 10,
         "left":   graph.ylabel ? 70 : 45
      },
      size = {
        "width":  cx - padding.left - padding.right,
        "height": cy - padding.top  - padding.bottom
      },
      tx = function(d) { return "translate(" + x(d) + ",0)"; },
      ty = function(d) { return "translate(0," + y(d) + ")"; },
      stroke = function(d) { return d ? "#ccc" : "#666"; },
      points = grapher.indexedData(d3.range(1, 60).map(function(i) { return i , 15 + Math.random() * 10 ; }))

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
          .x(function(d, i) { return x(points[i].x); })
          .y(function(d, i) { return y(points[i].y); }),

      // drag y-axis logic
      downscaley = y.copy(),
      downy = Math.NaN,

      dragged = selected = null;

  var vis = d3.select(chart).append("svg:svg")
      .attr("width", cx)
      .attr("height", cy)
      .append("svg:g")
        .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

  var plot = vis.append("svg:rect")
      .attr("width", size.width)
      .attr("height", size.height)
      .style("fill", "#EEEEEE")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().x(x).y(y).scaleExtent([1, 8]).on("zoom", redraw))
      .on("mousedown", function() {
        if (d3.event.altKey) {
            points.push(selected = dragged = d3.svg.mouse(vis.node()));
            update();
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
      });

  vis.append("svg:svg")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", size.width)
      .attr("height", size.height)
      .attr("viewBox", "0 0 "+size.width+" "+size.height)
      .append("svg:path")
          .attr("class", "line")
          .attr("d", line(points))

  // add Chart Title
  if (graph.title) {
    vis.append("svg:text")
        .text(graph.title)
        .attr("x", size.width/2)
        .attr("dy","-1em")
        .style("text-anchor","middle");
  }

  // Add the x-axis label
  if (graph.xlabel) {
    vis.append("svg:text")
        .text(graph.xlabel)
        .attr("x", size.width/2)
        .attr("y", size.height)
        .attr("dy","2.4em")
        .style("text-anchor","middle");
  }

  // add y-axis label
  if (graph.ylabel) {
    vis.append("svg:g")
        .append("svg:text")
            .text( graph.ylabel)
            .style("text-anchor","middle")
            .attr("transform","translate(" + -50 + " " + size.height/2+") rotate(-90)");
  }

  d3.select(window)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup)
      .on("keydown", keydown);

  function update() {
    var lines = vis.select("path").attr("d", line(points));

    var circle = vis.select("svg").selectAll("circle")
        .data(points, function(d) { return d; });

    circle.enter().append("svg:circle")
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d.x); })
        .attr("cy",    function(d) { return y(d.y); })
        .attr("r", 6.0)
        .on("mousedown", function(d) {
          selected = dragged = d;
          update();
        });

    circle
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d.x); })
        .attr("cy",    function(d) { return y(d.y); });

    circle.exit().remove();

    if (d3.event && d3.event.keyCode) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }

  function mousemove() {
    if (!dragged) return;
    var m = d3.svg.mouse(vis.node());
    dragged.x = x.invert(Math.max(0, Math.min(size.width, m[0])));
    dragged.y = y.invert(Math.max(0, Math.min(size.height, m[1])));
    update();
  }

  function mouseup() {
    if (!dragged) return;
    mousemove();
    dragged = null;
  }

  function keydown() {
    if (!selected) return;
    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        var i = points.indexOf(selected);
        points.splice(i, 1);
        selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
        update();
        break;
      }
    }
  }

  redraw();

  function redraw() {

    var fx = x.tickFormat(10),
        fy = y.tickFormat(10);

    // Regenerate x-ticks…
    var gx = vis.selectAll("g.x")
        .data(x.ticks(10), String)
        .attr("transform", tx);

    gx.select("text")
        .text(fx);

    var gxe = gx.enter().insert("svg:g", "a")
        .attr("class", "x")
        .attr("transform", tx);

    gxe.append("svg:line")
        .attr("stroke", stroke)
        .attr("y1", 0)
        .attr("y2", size.height);

    gxe.append("svg:text")
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
        });

    gx.exit().remove();

    // Regenerate y-ticks…
    var gy = vis.selectAll("g.y")
        .data(y.ticks(10), String)
        .attr("transform", ty);

    gy.select("text")
        .text(fy);

    var gye = gy.enter().insert("svg:g", "a")
        .attr("class", "y")
        .attr("transform", ty)
        .attr("background-fill", "#FFEEB6");

    gye.append("svg:line")
        .attr("stroke", stroke)
        .attr("x1", 0)
        .attr("x2", size.width);

    gye.append("svg:text")
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
        });

    gy.exit().remove();
    update();

  }

  // attach the mousemove and mouseup to the body
  // in case one wonders off the axis line

  d3.select('body')
    .on("mousemove", function(d) {
      var p = d3.svg.mouse(vis[0][0]);
      if (!isNaN(downx)) {
        var rupx = downscalex.invert(p[0]),
          xaxis1 = downscalex.domain()[0],
          xaxis2 = downscalex.domain()[1],
          xextent = xaxis2 - xaxis1;
        if (rupx != 0) {
            var changex, new_domain;
            changex = 1 + (downx / rupx - 1) * (xextent/(downx-xaxis1));
            new_domain = [xaxis1, xaxis1 + (xextent * changex)];
            x.domain(new_domain);
            redraw();
        }
        d3.event.preventDefault();
        d3.event.stopPropagation();
      };
      if (!isNaN(downy)) {
          rupy = downscaley.invert(p[1]),
          yaxis1 = downscaley.domain()[1],
          yaxis2 = downscaley.domain()[0],
          yextent = yaxis2 - yaxis1;
        if (rupy != 0) {
            var changey, new_domain;
            changey = downy / rupy;
            new_domain = [yaxis1 + (yextent * changey), yaxis1];
            y.domain(new_domain);
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
            // graph.call(d3.behavior.zoom().on("zoom", redraw));
        };
        if (!isNaN(downy)) {
            redraw();
            downy = Math.NaN;
            d3.event.preventDefault();
            d3.event.stopPropagation();
            // graph.call(d3.behavior.zoom().on("zoom", redraw));
        };
        // d3.event.preventDefault();
        // d3.event.stopPropagation();
    });
};
grapher.graph = function(array) {
  
  function graph(g) {
    g.each(function(d, i) {
      var g = d3.select(this),
          xMin = Infinity, xMin = Infinity,
          xMax = -Infinity, xMax = -Infinity,
          dx = x.call(this, d, i),
          dy = y.call(this, d, i),
          xd = domain && domain.call(this, d, i) || [d3.min(dx), d3.max(dx)], // new x-domain
          yd = domain && domain.call(this, d, i) || [d3.min(dy), d3.max(dy)], // new y-domain
          x1 = d3.scale.linear().domain(xd).range([0, width]), // new x-scale
          y1 = d3.scale.linear().domain(yd).range([height, 0]), // new y-scale
          x0 = this.__chart__ && this.__chart__.x || x1, // old x-scale
          y0 = this.__chart__ && this.__chart__.y || y1; // old y-scale

      // x-axis
      var gx = g.selectAll(".x.axis").data([,]);
      gx.enter().append("svg:g").attr("class", "x axis");
      gx.attr("transform", "translate(0," + height + ")").call(xAxis.scales([x0, x1]));

      // y-axis
      var gy = g.selectAll(".y.axis").data([,]);
      gy.enter().append("svg:g").attr("class", "y axis")
      gy.call(yAxis.scales([y0, y1]));

      // Stash the new scales.
      this.__chart__ = {x: x1, y: y1};

      // Update scatter plots.
      var datum = g.selectAll("g.datum")
          .data(dx);

      var t = function(d, i) { return "translate(" + x1(d) + "," + y1(dy[i]) + ")"; };

      datum.enter().append("svg:g")
          .attr("class", "datum")
          .attr("transform", function(d, i) { return "translate(" + x0(d) + "," + y0(dy[i]) + ")"; })
          .style("opacity", 1e-6)
        .transition()
          .duration(duration)
          .delay(function(d) { return x0(d) * 5; })
          .attr("transform", t)
          .style("opacity", 1);

      datum.transition()
          .duration(duration)
          .delay(function(d) { return x1(d) * 5; })
          .attr("transform", t)
          .style("opacity", 1);

      datum.exit().transition()
          .duration(duration)
          .delay(function(d) { return x1(d) * 5; })
          .attr("transform", t)
          .style("opacity", 1e-6)
          .remove();

      d3.timer.flush();
    });
  }
  
  var size = [890, 450],
      padding = [20, 30, 20, 40], // top right bottom left
      mw = size[0] - padding[1] - padding[3],
      mh = size[1] - padding[0] - padding[2],
      tx = function(d) { return "translate(" + x(d) + ",0)"; },
      ty = function(d) { return "translate(0," + y(d) + ")"; },
      stroke = function(d) { return d ? "#ccc" : "#666"; },
      points = grapher.indexedData(d3.range(1, 60).map(function(i) { return i , 15 + Math.random() * 10 ; }))
      // x = d3.time.scale()
      //     .domain([0,60])
      //     .range([0,mw]),
      // x-scale
      x = d3.scale.linear()
          .domain([15,45])
          .range([0, mw]),
      // drag x-axis logic
      downscalex = x.copy(),
      downx = Math.NaN,
      // y-scale (inverted domain)
      y = d3.scale.linear()
          .domain([40, 10])
          .range([0, mh]),
      line = d3.svg.line()
          .x(function(d, i) { return x(points[i].x); })
          .y(function(d, i) { return y(points[i].y); }),
      // drag x-axis logic
      downscaley = y.copy(),
      downy = Math.NaN,
      dragged = null,
      selected = points[0];

  var vis = d3.select("#chart").append("svg:svg")
      .attr("width", size[0] + padding[3] + padding[1])
      .attr("height", size[1] + padding[0] + padding[2])
      // .style("background-fill", "#FFEEB6")
      .append("svg:g")
        .attr("transform", "translate(" + padding[3] + "," + padding[0] + ")");

  var graph = vis.append("svg:rect")
      .attr("width", size[0])
      .attr("height", size[1])
      // .attr("stroke", "none")
      .style("fill", "#EEEEEE")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().on("zoom", redraw))
      .on("mousedown", function() {
        if (d3.event.altKey) {
            points.push(selected = dragged = d3.svg.mouse(vis.node()));
            update();
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
      });

  vis.append("svg:path")
      .attr("class", "line")
      .attr("d", line(points));

  d3.select(window)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup)
      .on("keydown", keydown);

  // Add interpolator dropdown
  d3.select("#interpolate")
      .on("change", function() {
        line.interpolate(this.value);
        update();
      })
    .selectAll("option")
      .data([
        "linear",
        "step-before",
        "step-after",
        "basis",
        "basis-open",
        "basis-closed",
        "cardinal",
        "cardinal-open",
        "cardinal-closed",
        "monotone"
      ])
    .enter().append("option")
      .attr("value", String)
      .text(String);

  function update() {
    var lines = vis.select("path").attr("d", line(points));
        
    var circle = vis.selectAll("circle")
        .data(points, function(d) { return d; });

    circle.enter().append("svg:circle")
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d.x); })
        .attr("cy",    function(d) { return y(d.y); })
        .attr("r", 6.0)
        .on("mousedown", function(d) {
          selected = dragged = d;
          update();
        });
      // .transition()
      //   .duration(100)
      //   .ease("elastic")
      //   .attr("r", 6.0);

    circle
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d.x); })
        .attr("cy",    function(d) { return y(d.y); });

    circle.exit().remove();

    if (d3.event && d3.event.keyCode) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }

  function mousemove() {
    if (!dragged) return;
    var m = d3.svg.mouse(vis.node());
    dragged.x = x.invert(Math.max(0, Math.min(size[0], m[0])));
    dragged.y = y.invert(Math.max(0, Math.min(size[1], m[1])));
    update();
  }

  function mouseup() {
    if (!dragged) return;
    mousemove();
    dragged = null;
  }

  function keydown() {
    if (!selected) return;
    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        var i = points.indexOf(selected);
        points.splice(i, 1);
        selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
        update();
        break;
      }
    }
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

    var gxe = gx.enter().insert("svg:g", "a")
        .attr("class", "x")
        .attr("transform", tx);

    gxe.append("svg:line")
        .attr("stroke", stroke)
        .attr("y1", 0)
        .attr("y2", size[1]);

     gxe.append("svg:text")
         .attr("y", size[1])
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

    var gye = gy.enter().insert("svg:g", "a")
        .attr("class", "y")
        .attr("transform", ty)
        .attr("background-fill", "#FFEEB6");

    gye.append("svg:line")
        .attr("stroke", stroke)
        .attr("x1", 0)
        .attr("x2", size[0]);

    gye.append("svg:text")
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

  // attach the mousemove and mouseup to the body
  // in case one wonders off the axis line

  d3.select('body')
    .on("mousemove", function(d) {
      var p = d3.svg.mouse(vis[0][0]);
      if (!isNaN(downx)) {
        var rupx = downscalex.invert(p[0]),
          xaxis1 = downscalex.domain()[0],
          xaxis2 = downscalex.domain()[1],
          xextent = xaxis2 - xaxis1;
        if (rupx != 0) {
            var changex, new_domain;
            changex = 1 + (downx / rupx - 1) * (xextent/(downx-xaxis1));
            new_domain = [xaxis1, xaxis1 + (xextent * changex)];
            x.domain(new_domain);
            redraw();
        }
        d3.event.preventDefault();
        d3.event.stopPropagation();
      };
      if (!isNaN(downy)) {
          rupy = downscaley.invert(p[1]),
          yaxis1 = downscaley.domain()[1],
          yaxis2 = downscaley.domain()[0],
          yextent = yaxis2 - yaxis1;
        if (rupy != 0) {
            var changey, new_domain;
            changey = downy / rupy;
            new_domain = [yaxis1 + (yextent * changey), yaxis1];
            y.domain(new_domain);
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
            // graph.call(d3.behavior.zoom().on("zoom", redraw));
        };
        if (!isNaN(downy)) {
            redraw();
            downy = Math.NaN;
            d3.event.preventDefault();
            d3.event.stopPropagation();
            // graph.call(d3.behavior.zoom().on("zoom", redraw));
        };
        // d3.event.preventDefault();
        // d3.event.stopPropagation();
    });
};
grapher.citiesSampleGraph = function(city) {
  
  var size = [890, 450],
      padding = [20, 30, 20, 40], // top right bottom left
      mw = size[0] - padding[1] - padding[3],
      mh = size[1] - padding[0] - padding[2],
      tx = function(d) { return "translate(" + x(d) + ",0)"; },
      ty = function(d) { return "translate(0," + y(d) + ")"; },
      stroke = function(d) { return d ? "#ccc" : "#666"; },
      points = grapher.indexedData(city.average_temperatures, 1)
      // x = d3.time.scale()
      //     .domain([0,60])
      //     .range([0,mw]),
      // x-scale
      x = d3.scale.linear()
          .domain([1,12])
          .range([0, mw]),
      // drag x-axis logic
      downscalex = x.copy(),
      downx = Math.NaN,
      // y-scale (inverted domain)
      y = d3.scale.linear()
          .domain([30, -30])
          .range([0, mh]),
      line = d3.svg.line()
          .x(function(d, i) { return x(points[i].x); })
          .y(function(d, i) { return y(points[i].y); }),
      // drag x-axis logic
      downscaley = y.copy(),
      downy = Math.NaN,
      dragged = null,
      selected = points[0];

  var vis = d3.select("#chart").append("svg:svg")
      .attr("width", size[0] + padding[3] + padding[1])
      .attr("height", size[1] + padding[0] + padding[2])
      // .style("background-fill", "#FFEEB6")
      .append("svg:g")
        .attr("transform", "translate(" + padding[3] + "," + padding[0] + ")");

  var graph = vis.append("svg:rect")
      .attr("width", size[0])
      .attr("height", size[1])
      // .attr("stroke", "none")
      .style("fill", "#EEEEEE")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().on("zoom", redraw))
      .on("mousedown", function() {
        if (d3.event.altKey) {
            points.push(selected = dragged = d3.svg.mouse(vis.node()));
            update();
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
      });

  vis.append("svg:path")
      .attr("class", "line")
      .attr("d", line(points));

  d3.select(window)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup)
      .on("keydown", keydown);

  // Add interpolator dropdown
  d3.select("#interpolate")
      .on("change", function() {
        line.interpolate(this.value);
        update();
      })
    .selectAll("option")
      .data([
        "linear",
        "step-before",
        "step-after",
        "basis",
        "basis-open",
        "basis-closed",
        "cardinal",
        "cardinal-open",
        "cardinal-closed",
        "monotone"
      ])
    .enter().append("option")
      .attr("value", String)
      .text(String);

  function update() {
    var lines = vis.select("path").attr("d", line(points));
        
    var circle = vis.selectAll("circle")
        .data(points, function(d) { return d; });

    circle.enter().append("svg:circle")
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d.x); })
        .attr("cy",    function(d) { return y(d.y); })
        .attr("r", 6.0)
        .on("mousedown", function(d) {
          selected = dragged = d;
          update();
        });
      // .transition()
      //   .duration(100)
      //   .ease("elastic")
      //   .attr("r", 6.0);

    circle
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d.x); })
        .attr("cy",    function(d) { return y(d.y); });

    circle.exit().remove();

    if (d3.event && d3.event.keyCode) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }

  function mousemove() {
    if (!dragged) return;
    var m = d3.svg.mouse(vis.node());
    dragged.x = x.invert(Math.max(0, Math.min(size[0], m[0])));
    dragged.y = y.invert(Math.max(0, Math.min(size[1], m[1])));
    update();
  }

  function mouseup() {
    if (!dragged) return;
    mousemove();
    dragged = null;
  }

  function keydown() {
    if (!selected) return;
    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        var i = points.indexOf(selected);
        points.splice(i, 1);
        selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
        update();
        break;
      }
    }
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

    var gxe = gx.enter().insert("svg:g", "a")
        .attr("class", "x")
        .attr("transform", tx);

    gxe.append("svg:line")
        .attr("stroke", stroke)
        .attr("y1", 0)
        .attr("y2", size[1]);

     gxe.append("svg:text")
         .attr("y", size[1])
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

    var gye = gy.enter().insert("svg:g", "a")
        .attr("class", "y")
        .attr("transform", ty)
        .attr("background-fill", "#FFEEB6");

    gye.append("svg:line")
        .attr("stroke", stroke)
        .attr("x1", 0)
        .attr("x2", size[0]);

    gye.append("svg:text")
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

  // attach the mousemove and mouseup to the body
  // in case one wonders off the axis line

  d3.select('body')
    .on("mousemove", function(d) {
      var p = d3.svg.mouse(vis[0][0]);
      if (!isNaN(downx)) {
        var rupx = downscalex.invert(p[0]),
          xaxis1 = downscalex.domain()[0],
          xaxis2 = downscalex.domain()[1],
          xextent = xaxis2 - xaxis1;
        if (rupx != 0) {
            var changex, new_domain;
            changex = downx / rupx;
            new_domain = [xaxis1, xaxis1 + (xextent * changex)];
            x.domain(new_domain);
            redraw();
        }
        d3.event.preventDefault();
        d3.event.stopPropagation();
      };
      if (!isNaN(downy)) {
          rupy = downscaley.invert(p[1]),
          yaxis1 = downscaley.domain()[1],
          yaxis2 = downscaley.domain()[0],
          yextent = yaxis2 - yaxis1;
        if (rupy != 0) {
            var changey, new_domain;
            changey = downy / rupy;
            new_domain = [yaxis1 + (yextent * changey), yaxis1];
            y.domain(new_domain);
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
            // graph.call(d3.behavior.zoom().on("zoom", redraw));
        };
        if (!isNaN(downy)) {
            redraw();
            downy = Math.NaN;
            d3.event.preventDefault();
            d3.event.stopPropagation();
            // graph.call(d3.behavior.zoom().on("zoom", redraw));
        };
        // d3.event.preventDefault();
        // d3.event.stopPropagation();
    });
};
grapher.surfaceTemperatureSampleGraph = function(global_temperatures) {

  var graph = {};

  graph.xmax    = 2000;
  graph.xmin    = 500;

  graph.ymax    = 15;
  graph.ymin    = 13;

  graph.title   = "Earth's Surface Temperature: years 500-2009";
  graph.xlabel  = "Year";
  graph.ylabel  = "Degrees C";

  var chart = document.getElementById("chart"),
      cx = chart.clientWidth,
      cy = chart.clientHeight,
      padding = {
         "top":    graph.title  ? 30 : 20,
         "right":                 30,
         "bottom": graph.xlabel ? 40 : 10,
         "left":   graph.ylabel ? 70 : 45
      },
      size = {
        "width":  cx - padding.left - padding.right,
        "height": cy - padding.top  - padding.bottom
      },
      tx = function(d) { return "translate(" + x(d) + ",0)"; },
      ty = function(d) { return "translate(0," + y(d) + ")"; },
      stroke = function(d) { return d ? "#ccc" : "#666"; },

      surface_temperature = global_temperatures
        .temperature_anomolies.map(function(e) {
          return [e[0], e[1] + global_temperatures.global_surface_temperature_1961_1990];
        }),

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
          .x(function(d, i) { return x(surface_temperature[i][0]); })
          .y(function(d, i) { return y(surface_temperature[i][1]); }),

      // drag y-axis logic
      downscaley = y.copy(),
      downy = Math.NaN,

      dragged = selected = null;

  var vis = d3.select("#chart").append("svg:svg")
      .attr("width", cx)
      .attr("height", cy)
      .append("svg:g")
        .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

  var plot = vis.append("svg:rect")
      .attr("width", size.width)
      .attr("height", size.height)
      .style("fill", "#EEEEEE")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().x(x).y(y).on("zoom", redraw))
      .on("mousedown", function() {
        if (d3.event.altKey) {
            points.push(selected = dragged = d3.svg.mouse(vis.node()));
            update();
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
      });

  vis.append("svg:svg")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", size.width)
      .attr("height", size.height)
      .attr("viewBox", "0 0 "+size.width+" "+size.height)
      .append("svg:path")
          .attr("class", "line")
          .attr("d", line(surface_temperature));

  // add Chart Title
  if (graph.title) {
    vis.append("svg:text")
        .text(graph.title)
        .attr("x", size.width/2)
        .attr("dy","-1em")
        .style("text-anchor","middle");
  }

  // Add the x-axis label
  if (graph.xlabel) {
    vis.append("svg:text")
        .text(graph.xlabel)
        .attr("x", size.width/2)
        .attr("y", size.height)
        .attr("dy","2.4em")
        .style("text-anchor","middle");
  }

  // add y-axis label
  if (graph.ylabel) {
    vis.append("svg:g")
        .append("svg:text")
            .text( graph.ylabel)
            .style("text-anchor","middle")
            .attr("transform","translate(" + -50 + " " + size.height/2+") rotate(-90)");
  }

  d3.select(window)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup)
      .on("keydown", keydown);

  //
  // draw the data
  //
  function update() {
    var lines = vis.select("path").attr("d", line(surface_temperature));

    var circle = vis.select("svg").selectAll("circle")
        .data(surface_temperature, function(d) { return d; });

    circle.enter().append("svg:circle")
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return
          x(d[0]); })
        .attr("cy",    function(d) { return y(d[1]); })
        .attr("r", 4.0)
        // .attr("r", function(d) { return 800 / (x.domain()[1] - x.domain()[0]); })
        .on("mousedown", function(d) {
          selected = dragged = d;
          update();
        })
      .transition()
        .duration(300)
        .ease("elastic")
        .attr("r", 2.0);
        // .attr("r", function(d) { return 400 / (x.domain()[1] - x.domain()[0]); });

    circle
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d[0]); })
        .attr("cy",    function(d) { return y(d[1]); });

    circle.exit().remove();

    if (d3.event && d3.event.keyCode) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }


  function mousemove() {
    if (!dragged) return;
    var m = d3.svg.mouse(vis.node());
    dragged[0] = x.invert(Math.max(0, Math.min(size.width, m[0])));
    dragged[1] = y.invert(Math.max(0, Math.min(size.height, m[1])));
    update();
  }

  function mouseup() {
    if (!dragged) return;
    mousemove();
    dragged = null;
  }

  function keydown() {
    if (!selected) return;
    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        var i = surface_temperature.indexOf(selected);
        surface_temperature.splice(i, 1);
        selected = surface_temperature.length ? surface_temperature[i > 0 ? i - 1 : 0] : null;
        update();
        break;
      }
    }
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

    var gxe = gx.enter().insert("svg:g", "a")
        .attr("class", "x")
        .attr("transform", tx);

    gxe.append("svg:line")
        .attr("stroke", stroke)
        .attr("y1", 0)
        .attr("y2", size.height);

    gxe.append("svg:text")
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

    var gye = gy.enter().insert("svg:g", "a")
        .attr("class", "y")
        .attr("transform", ty)
        .attr("background-fill", "#FFEEB6");

    gye.append("svg:line")
        .attr("stroke", stroke)
        .attr("x1", 0)
        .attr("x2", size.width);

    gye.append("svg:text")
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

};
grapher.lennardJonesSampleGraph = function() {

  
  var graph = {};

  graph.epsilon = -0.5;                           // depth of the potential well
  graph.sigma   = 10;                             // finite distance at which the inter-particle potential is zero
  graph.r_min   = Math.pow(2, 1/6) * graph.sigma; // distance at which the potential well reaches its minimum
  graph.alpha   = 4 * Math.pow(graph.epsilon * graph.sigma, 12);
  graph.beta    = 4 * Math.pow(graph.epsilon * graph.sigma, 6);

  graph.xmax    = graph.sigma;
  graph.xmin    = 0;

  graph.ymax    = 5;
  graph.ymin    = -1;

  graph.title   = "Lennard-Jones potential";
  graph.xlabel  = "Radius";
  graph.ylabel  = "Potential Well";

  var chart = document.getElementById("chart"),
      cx = chart.clientWidth,
      cy = chart.clientHeight,
      padding = {
         "top":    graph.title  ? 100 : 20, 
         "right":                 30, 
         "bottom": graph.xlabel ? 40 : 10,
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


      var lennard_jones_potential = d3.range(graph.sigma * 10).map(function(i) {
        return { x: i* 0.1, y: graph.alpha/Math.pow(i*10, 12) - graph.beta/Math.pow(i*10, 6) }
      });

      // x-scale
      x = d3.scale.linear()
          .domain([graph.xmin, graph.xmax])
          .range([0, mw]),

      // drag x-axis logic
      downscalex = x.copy(),
      downx = Math.NaN,

      // y-scale (inverted domain)
      y = d3.scale.linear()
          .domain([graph.ymax, graph.ymin])
          .nice()
          .range([0, mh])
          .nice(),
      line = d3.svg.line()
          .x(function(d, i) { return x(lennard_jones_potential[i].x); })
          .y(function(d, i) { return y(lennard_jones_potential[i].y); }),

      // drag x-axis logic
      downscaley = y.copy(),
      downy = Math.NaN,
      dragged = null,
      selected = lennard_jones_potential[0];

  var vis = d3.select("#chart").append("svg:svg")
      .attr("width", cx)
      .attr("height", cy)
      .append("svg:g")
        .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

  var plot = vis.append("svg:rect")
      .attr("width", size.width)
      .attr("height", size.height)
      .style("fill", "#EEEEEE")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().on("zoom", redraw))
      .on("mousedown", function() {
        if (d3.event.altKey) {
            points.push(selected = dragged = d3.svg.mouse(vis.node()));
            update();
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
      });

  vis.append("svg:svg")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", size.width)
      .attr("height", size.height)
      .attr("viewBox", "0 0 "+size.width+" "+size.height)
      .append("svg:path")
          .attr("class", "line")
          .attr("d", line(lennard_jones_potential))

  // add Chart Title
  if (graph.title) {
    vis.append("svg:text")
        .text(graph.title)
        .attr("x", size.width/2)
        .attr("dy","-1em")
        .style("text-anchor","middle");
  }

  // Add the x-axis label
  if (graph.xlabel) {
    vis.append("svg:text")
        .text(graph.xlabel)
        .attr("x", size.width/2)
        .attr("y", size.height)
        .attr("dy","2.4em")
        .style("text-anchor","middle");
  }

  // add y-axis label
  if (graph.ylabel) {
    vis.append("svg:g")
        .append("svg:text")
            .text( graph.ylabel)
            .style("text-anchor","middle")
            .attr("transform","translate(" + -50 + " " + size.height/2+") rotate(-90)");
  }

  d3.select(window)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup)
      .on("keydown", keydown);

  //
  // draw the data
  //
  function update() {
    var lines = vis.select("path").attr("d", line(lennard_jones_potential)),
        x_extent = x.domain()[1] - x.domain()[0];
        
    var circle = vis.select("svg").selectAll("circle")
        .data(lennard_jones_potential, function(d) { return d; });

    circle.enter().append("svg:circle")
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d.x); })
        .attr("cy",    function(d) { return y(d.y); })
        .attr("r", 4.0)
        // .attr("r", function(d) { return 800 / (x.domain()[1] - x.domain()[0]); })
        .on("mousedown", function(d) {
          selected = dragged = d;
          update();
        })
      .transition()
        .duration(300)
        .ease("elastic")
        .attr("r", 2.0);
        // .attr("r", function(d) { return 400 / (x.domain()[1] - x.domain()[0]); });

    circle
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d.x); })
        .attr("cy",    function(d) { return y(d.y); });

    circle.exit().remove();

    if (d3.event && d3.event.keyCode) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }


  function mousemove() {
    if (!dragged) return;
    var m = d3.svg.mouse(vis.node());
    dragged[0] = x.invert(Math.max(0, Math.min(size.width, m[0])));
    dragged[1] = y.invert(Math.max(0, Math.min(size.height, m[1])));
    update();
  }

  function mouseup() {
    if (!dragged) return;
    mousemove();
    dragged = null;
  }

  function keydown() {
    if (!selected) return;
    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        var i = lennard_jones_potential.indexOf(selected);
        lennard_jones_potential.splice(i, 1);
        selected = lennard_jones_potential.length ? lennard_jones_potential[i > 0 ? i - 1 : 0] : null;
        update();
        break;
      }
    }
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

    var gxe = gx.enter().insert("svg:g", "a")
        .attr("class", "x")
        .attr("transform", tx);

    gxe.append("svg:line")
        .attr("stroke", stroke)
        .attr("y1", 0)
        .attr("y2", size.height);

     gxe.append("svg:text")
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

    var gye = gy.enter().insert("svg:g", "a")
        .attr("class", "y")
        .attr("transform", ty)
        .attr("background-fill", "#FFEEB6");

    gye.append("svg:line")
        .attr("stroke", stroke)
        .attr("x1", 0)
        .attr("x2", size.width);

    gye.append("svg:text")
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

};
})();
var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

require.define("path", function (require, module, exports, __dirname, __filename) {
function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/arrays/arrays.js", function (require, module, exports, __dirname, __filename) {
/*globals window Uint8Array Int8Array Uint16Array Int16Array Uint32Array Int32Array Float32Array Float64Array */
/*jshint newcap: false */

//
// 'requirified' version of Typed Array Utilities.
//

var arrays;

arrays = exports.arrays = {};

arrays.version = '0.0.1';
arrays.webgl = (typeof window !== 'undefined') && !!window.WebGLRenderingContext;
arrays.typed = false;
try {
  var a = new Float64Array(0);
  arrays.typed = true;
} catch(e) {

}

// regular
// Uint8Array
// Uint16Array
// Uint32Array
// Int8Array
// Int16Array
// Int32Array
// Float32Array

arrays.create = function(size, fill, array_type) {
  if (!array_type) {
    if (arrays.webgl || arrays.typed) {
      array_type = "Float32Array";
    } else {
      array_type = "regular";
    }
  }
  fill = fill || 0;
  var a, i;
  if (array_type === "regular") {
    a = new Array(size);
  } else {
    switch(array_type) {
      case "Float64Array":
      a = new Float64Array(size);
      break;
      case "Float32Array":
      a = new Float32Array(size);
      break;
      case "Int32Array":
      a = new Int32Array(size);
      break;
      case "Int16Array":
      a = new Int16Array(size);
      break;
      case "Int8Array":
      a = new Int8Array(size);
      break;
      case "Uint32Array":
      a = new Uint32Array(size);
      break;
      case "Uint16Array":
      a = new Uint16Array(size);
      break;
      case "Uint8Array":
      a = new Uint8Array(size);
      break;
      default:
      a = new Array(size);
      break;
    }
  }
  i=-1; while(++i < size) { a[i] = fill; }
  return a;
};

arrays.constructor_function = function(source) {
  if (source.buffer && source.buffer.__proto__.constructor) {
    return source.__proto__.constructor;
  }
  if (source.constructor === Array) {
    return source.constructor;
  }
  throw new Error(
      "arrays.constructor_function: must be an Array or Typed Array: " +
      "  source: " + source +
      ", source.constructor: " + source.constructor +
      ", source.buffer: " + source.buffer +
      ", source.buffer.slice: " + source.buffer.slice +
      ", source.buffer.__proto__: " + source.buffer.__proto__ +
      ", source.buffer.__proto__.constructor: " + source.buffer.__proto__.constructor
    );
};

arrays.copy = function(source, dest) {
  var len = source.length,
      i = -1;
  while(++i < len) { dest[i] = source[i]; }
  dest.length = len;
  return dest;
};

arrays.clone = function(source) {
  var i, len = source.length, clone, constructor;
  constructor = arrays.constructor_function(source);
  if (constructor === Array) {
    clone = new constructor(len);
    for (i = 0; i < len; i++) { clone[i] = source[i]; }
    return clone;
  }
  if (source.buffer.slice) {
    clone = new constructor(source.buffer.slice(0));
    return clone;
  }
  clone = new constructor(len);
  for (i = 0; i < len; i++) { clone[i] = source[i]; }
  return clone;
};

/** @return true if x is between a and b. */
// float a, float b, float x
arrays.between = function(a, b, x) {
  return x < Math.max(a, b) && x > Math.min(a, b);
};

// float[] array
arrays.max = function(array) {
  return Math.max.apply( Math, array );
};

// float[] array
arrays.min = function(array) {
  return Math.min.apply( Math, array );
};

// FloatxxArray[] array
arrays.maxTypedArray = function(array) {
  var test, i,
  max = Number.MIN_VALUE,
  length = array.length;
  for(i = 0; i < length; i++) {
    test = array[i];
    max = test > max ? test : max;
  }
  return max;
};

// FloatxxArray[] array
arrays.minTypedArray = function(array) {
  var test, i,
  min = Number.MAX_VALUE,
  length = array.length;
  for(i = 0; i < length; i++) {
    test = array[i];
    min = test < min ? test : min;
  }
  return min;
};

// float[] array
arrays.maxAnyArray = function(array) {
  try {
    return Math.max.apply( Math, array );
  }
  catch (e) {
    if (e instanceof TypeError) {
      var test, i,
      max = Number.MIN_VALUE,
      length = array.length;
      for(i = 0; i < length; i++) {
        test = array[i];
        max = test > max ? test : max;
      }
      return max;
    }
  }
};

// float[] array
arrays.minAnyArray = function(array) {
  try {
    return Math.min.apply( Math, array );
  }
  catch (e) {
    if (e instanceof TypeError) {
      var test, i,
      min = Number.MAX_VALUE,
      length = array.length;
      for(i = 0; i < length; i++) {
        test = array[i];
        min = test < min ? test : min;
      }
      return min;
    }
  }
};

arrays.average = function(array) {
  var i, acc = 0,
  length = array.length;
  for (i = 0; i < length; i++) {
    acc += array[i];
  }
  return acc / length;
};
});

require.define("/math/index.js", function (require, module, exports, __dirname, __filename) {
exports.normal              = require('./distributions').normal;
exports.getWindowedAverager = require('./utils').getWindowedAverager;

});

require.define("/math/distributions.js", function (require, module, exports, __dirname, __filename) {
/*jslint eqnull: true */

// Simple (Box-Muller) univariate-normal random number generator.
//
// The 'science.js' library includes a Box-Muller implementation which is likely to be slower, especially in a
// modern Javascript engine, because it uses a rejection method to pick the random point in the unit circle.
// See discussion on pp. 1-3 of:
// http://www.math.nyu.edu/faculty/goodman/teaching/MonteCarlo2005/notes/GaussianSampling.pdf
//
exports.normal = (function() {
  var next = null;

  return function(mean, sd) {
    if (mean == null) mean = 0;
    if (sd == null)   sd = 1;

    var r, ret, theta, u1, u2;

    if (next) {
      ret  = next;
      next = null;
      return ret;
    }

    u1    = Math.random();
    u2    = Math.random();
    theta = 2 * Math.PI * u1;
    r     = Math.sqrt(-2 * Math.log(u2));

    next = mean + sd * (r * Math.sin(theta));
    return mean + sd * (r * Math.cos(theta));
  };
}());

});

require.define("/math/utils.js", function (require, module, exports, __dirname, __filename) {
/*jslint eqnull: true */
/**
  Returns a function which accepts a single numeric argument and returns:

   * the arithmetic mean of the windowSize most recent inputs, including the current input
   * NaN if there have not been windowSize inputs yet.

  The default windowSize is 1000.

*/
exports.getWindowedAverager = function(windowSize) {
  if (windowSize == null) windowSize = 1000;      // default window size

  var i = 0,
      vals = [],
      sum_vals = 0;

  return function(val) {
    sum_vals -= (vals[i] || 0);
    sum_vals += val;
    vals[i] = val;

    if (++i === windowSize) i = 0;

    if (vals.length === windowSize) {
      return sum_vals / windowSize;
    }
    else {
      // don't allow any numerical comparisons with result to be true
      return NaN;
    }
  }
};

});

require.define("/potentials/index.js", function (require, module, exports, __dirname, __filename) {
var potentials = exports.potentials = {};

exports.coulomb = require('./coulomb').coulomb;
exports.getLennardJonesCalculator = require('./lennard-jones').getLennardJonesCalculator;

});

require.define("/potentials/coulomb.js", function (require, module, exports, __dirname, __filename) {
var coulomb = exports.coulomb = {};

var k_e = -50;            // Coulomb constant

coulomb.potential = function(r, q1, q2) {
  return -k_e * ((q1 * q2) / r);
};

coulomb.force = function(r, q1, q2) {
  return coulomb.forceFromSquaredDistance(r*r);
};

coulomb.forceFromSquaredDistance = function(r_sq, q1, q2) {
  return k_e * ((q1 * q2) / r_sq);
};

});

require.define("/potentials/lennard-jones.js", function (require, module, exports, __dirname, __filename) {
/**
  Returns a new object with methods for calculating the force and potential for a Lennard-Jones
  potential with particular values of its parameters epsilon and sigma. These can be adjusted.

  To avoid the needing to take square roots during calculation of pairwise forces, there are
  also methods which calculate the inter-particle potential directly from a squared distance, and
  which calculate the quantity (force/distance) directly from a squared distance.

  This function also accepts a callback function which will be called with a hash representing
  the new coefficients, whenever the LJ coefficients are changed for the returned calculator.
*/
exports.getLennardJonesCalculator = function(cb) {

  var epsilon = -1.0,   // depth of the potential well
      sigma   =  4.0,   // distance from particle at which the potential is 0

      rmin,             // distance from particle at which the potential is minimimal, and equal to -epsilon
      alpha,            // precalculated from epsilon and sigma for computational convenience
      beta,             // precalculated from epsilon and sigma for computational convenience

      coefficients = function(e, s) {
        if (arguments.length) {
          epsilon = e;
          sigma   = s;
          rmin    = Math.pow(2, 1/6) * sigma;
          alpha   = 4 * epsilon * Math.pow(sigma, 12);
          beta    = 4 * epsilon * Math.pow(sigma, 6);
        }

        var coefficients = {
          epsilon: epsilon,
          sigma  : sigma,
          rmin   : rmin,
          alpha  : alpha,
          beta   : beta
        };

        if (typeof cb === 'function') cb(coefficients);

        return coefficients;
      },

      potentialFromSquaredDistance = function(r_sq) {
        return -(alpha*Math.pow(r_sq, -6) - beta*Math.pow(r_sq, -3));
      },

      forceOverDistanceFromSquaredDistance = function(r_sq) {
        // optimizing divisions actually does appear to be *slightly* faster
        var r_minus2nd  = 1 / r_sq,
            r_minus6th  = r_minus2nd * r_minus2nd * r_minus2nd,
            r_minus8th  = r_minus6th * r_minus2nd,
            r_minus14th = r_minus8th * r_minus6th;

        return 12*alpha*r_minus14th - 6*beta*r_minus8th;
      };

  // initial calculation of values dependent on (epsilon, sigma)
  coefficients(epsilon, sigma);

  return {

    coefficients: coefficients,

    setEpsilon: function(e) {
      return coefficients(e, sigma);
    },

    setSigma: function(s) {
      return coefficients(epsilon, s);
    },

    // "fast" forms which avoid the need for a square root
    potentialFromSquaredDistance: potentialFromSquaredDistance,

    potential: function(r) {
      return potentialFromSquaredDistance(r*r);
    },

    forceOverDistanceFromSquaredDistance: forceOverDistanceFromSquaredDistance,

    force: function(r) {
      return r * forceOverDistanceFromSquaredDistance(r*r);
    }
  };
};

});

require.define("/md2d.js", function (require, module, exports, __dirname, __filename) {
    /*globals Float32Array */
/*jslint eqnull: true */

var model = exports.model = {},

    arrays       = require('./arrays/arrays').arrays,
    math         = require('./math'),
    coulomb      = require('./potentials').coulomb,
    lennardJones = require('./potentials').getLennardJonesCalculator(),

    makeIntegrator,
    ljfLimitsNeedCalculating = true,
    setup_ljf_limits,
    setup_coulomb_limits,

    // TODO: Actually check for Safari. Typed arrays are faster almost everywhere
    // ... except Safari.
    notSafari = true,

    hasTypedArrays = (function() {
      try {
        new Float32Array();
      }
      catch(e) {
        return false;
      }
      return true;
    }()),

    // revisit these for export:
    minLJAttraction =    0.001,
    maxLJRepulsion  = -200.0,
    cutoffDistance_LJ,

    minCoulombForce =   0.01,
    maxCoulombForce = 20.0,
    cutoffDistance_Coulomb,

    size = [100, 100],

    //
    // Individual property arrays for the nodes
    //
    radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge,

    //
    // Number of individual properties for a node
    //
    nodePropertiesCount = 12,

    //
    // A two dimensional array consisting of arrays of node property values
    //
    nodes,

    //
    // Indexes into the nodes array for the individual node property arrays
    //
    // Access to these within this module will be faster if they are vars in this closure rather than property lookups.
    // However, publish the indices to model.INDICES for use outside this module.
    //
    RADIUS_INDEX   =  0,
    PX_INDEX       =  1,
    PY_INDEX       =  2,
    X_INDEX        =  3,
    Y_INDEX        =  4,
    VX_INDEX       =  5,
    VY_INDEX       =  6,
    SPEED_INDEX    =  7,
    AX_INDEX       =  8,
    AY_INDEX       =  9,
    HALFMASS_INDEX = 10,
    CHARGE_INDEX   = 11;

model.INDICES = {
  RADIUS   : RADIUS_INDEX,
  PX       : PX_INDEX,
  PY       : PY_INDEX,
  X        : X_INDEX,
  Y        : Y_INDEX,
  VX       : VX_INDEX,
  VY       : VY_INDEX,
  SPEED    : SPEED_INDEX,
  AX       : AX_INDEX,
  AY       : AY_INDEX,
  HALFMASS : HALFMASS_INDEX,
  CHARGE   : CHARGE_INDEX
};

model.setSize = function(x) {
  size = x;
};

model.setLJEpsilon = function(e) {
  lennardJones.setEpsilon(e);
  ljfLimitsNeedCalculating = true;
};

model.setLJSigma = function(s) {
  lennardJones.setSigma(s);
  ljfLimitsNeedCalculating = true;
};

//
// Calculate the minimum and maximum distances for applying Lennard-Jones forces
//
setup_ljf_limits = function() {
  var i, f,
      min_ljf_distance;

  for (i = 0; i <= 100; i+=0.001) {
    f = lennardJones.force(i);
    if (f > maxLJRepulsion) {
      min_ljf_distance = i;
      break;
    }
  }

  for (;i <= 100; i+=0.001) {
    f = lennardJones.force(i);
    if (f > minLJAttraction) {
      break;
    }
  }

  for (;i <= 100; i+=0.001) {
    f = lennardJones.force(i);
    if (f < minLJAttraction) {
      cutoffDistance_LJ = i;
      break;
    }
  }
  ljfLimitsNeedCalculating = false;
};

//
// Calculate the minimum and maximum distances for applying Coulomb forces
//
setup_coulomb_limits = function() {
  var i, f,
      min_coulomb_distance;

  for (i = 0.001; i <= 100; i+=0.001) {
    f = coulomb.force(i, -1, 1);
    if (f < maxCoulombForce) {
      min_coulomb_distance = i;
      break;
    }
  }

  for (;i <= 100; i+=0.001) {
    f = coulomb.force(i, -1, 1);
    if (f < minCoulombForce) {
      break;
    }
  }
  cutoffDistance_Coulomb = i;
};

model.createNodes = function(options) {
  options = options || {};

  var num                    = options.num                    || 50,
      temperature            = options.temperature            || 1,
      rmin                   = options.rmin                   || 4.4,
      mol_rmin_radius_factor = options.mol_rmin_radius_factor || 0.38,

      // special-case:
      arrayType = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',

      v0,
      i, r, c, nrows, ncols, rowSpacing, colSpacing,
      vMagnitude, vDirection, v_CM_initial;

  nrows = Math.floor(Math.sqrt(num));
  ncols = Math.ceil(num/nrows);

  model.nodes = nodes = arrays.create(nodePropertiesCount, null, 'regular');

  // model.INDICES.RADIUS = 0
  nodes[model.INDICES.RADIUS] = arrays.create(num, rmin * mol_rmin_radius_factor, arrayType );
  model.radius = radius = nodes[model.INDICES.RADIUS];

  // model.INDICES.PX     = 1;
  nodes[model.INDICES.PX] = arrays.create(num, 0, arrayType);
  model.px = px = nodes[model.INDICES.PX];

  // model.INDICES.PY     = 2;
  nodes[model.INDICES.PY] = arrays.create(num, 0, arrayType);
  model.py = py = nodes[model.INDICES.PY];

  // model.INDICES.X      = 3;
  nodes[model.INDICES.X] = arrays.create(num, 0, arrayType);
  model.x = x = nodes[model.INDICES.X];

  // model.INDICES.Y      = 4;
  nodes[model.INDICES.Y] = arrays.create(num, 0, arrayType);
  model.y = y = nodes[model.INDICES.Y];

  // model.INDICES.VX     = 5;
  nodes[model.INDICES.VX] = arrays.create(num, 0, arrayType);
  model.vx = vx = nodes[model.INDICES.VX];

  // model.INDICES.VY     = 6;
  nodes[model.INDICES.VY] = arrays.create(num, 0, arrayType);
  model.vy = vy = nodes[model.INDICES.VY];

  // model.INDICES.SPEED  = 7;
  nodes[model.INDICES.SPEED] = arrays.create(num, 0, arrayType);
  model.speed = speed = nodes[model.INDICES.SPEED];

  // model.INDICES.AX     = 8;
  nodes[model.INDICES.AX] = arrays.create(num, 0, arrayType);
  model.ax = ax = nodes[model.INDICES.AX];

  // model.INDICES.AY     = 9;
  nodes[model.INDICES.AY] = arrays.create(num, 0, arrayType);
  model.ay = ay = nodes[model.INDICES.AY];

  // model.INDICES.HALFMASS = 10;
  nodes[model.INDICES.HALFMASS] = arrays.create(num, 0.5, arrayType);
  model.halfmass = halfmass = nodes[model.INDICES.HALFMASS];

  // model.INDICES.CHARGE   = 11;
  nodes[model.INDICES.CHARGE] = arrays.create(num, 0, arrayType);
  model.charge = charge = nodes[model.INDICES.CHARGE];

  // Actually arrange the atoms.
  v0 = Math.sqrt(2*temperature);

  colSpacing = size[0] / (1+ncols);
  rowSpacing = size[1] / (1+nrows);

  // Arrange molecules in a lattice. Not guaranteed to have CM exactly on center, and is an artificially low-energy
  // configuration. But it works OK for now.
  i = -1;

  v_CM_initial = [0, 0];

  for (r = 1; r <= nrows; r++) {
    for (c = 1; c <= ncols; c++) {
      i++;
      if (i === num) break;

      x[i] = c*colSpacing;
      y[i] = r*rowSpacing;

      // Randomize velocities, exactly balancing the motion of the center of mass by making the second half of the
      // set of atoms have the opposite velocities of the first half. (If the atom number is odd, the "odd atom out"
      // should have 0 velocity).
      //
      // Note that although the instantaneous temperature will be 'temperature' exactly, the temperature will quickly
      // settle to a lower value because we are initializing the atoms spaced far apart, in an artificially low-energy
      // configuration.

      if (i < Math.floor(num/2)) {      // 'middle' atom will have 0 velocity
        vMagnitude = math.normal(v0, v0/4);
        vDirection = 2 * Math.random() * Math.PI;
        vx[i] = vMagnitude * Math.cos(vDirection);
        vy[i] = vMagnitude * Math.sin(vDirection);
        vx[num-i-1] = -vx[i];
        vy[num-i-1] = -vy[i];
      }

      v_CM_initial[0] += vx[i];
      v_CM_initial[1] += vy[i];

      ax[i] = 0;
      ay[i] = 0;

      speed[i]  = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);
      charge[i] = 2*(i%2)-1;      // alternate negative and positive charges
    }
  }

  v_CM_initial[0] /= num;
  v_CM_initial[1] /= num;
};


makeIntegrator = function(args) {

  var time           = 0,
      setOnceState   = args.setOnceState,
      readWriteState = args.readWriteState,
      settableState  = args.settableState || {},

      outputState    = {},

      size                   = setOnceState.size,

      ax                   = readWriteState.ax,
      ay                   = readWriteState.ay,
      charge               = readWriteState.charge,
      nodes                = readWriteState.nodes,
      radius               = readWriteState.radius,
      speed                = readWriteState.speed,
      vx                   = readWriteState.vx,
      vy                   = readWriteState.vy,
      x                    = readWriteState.x,
      y                    = readWriteState.y,

      useCoulombInteraction      = settableState.useCoulombInteraction,
      useLennardJonesInteraction = settableState.useLennardJonesInteraction,
      useThermostat              = settableState.useThermostat,

      // Desired temperature. We will simulate coupling to an infinitely large heat bath at desired
      // temperature T_target.
      T_target                   = settableState.targetTemperature,

      // Set to true when a temperature change is requested, reset to false when system approaches temperature
      temperatureChangeInProgress = false,

      // Whether to immediately break out of the integration loop when the target temperature is reached.
      // Used only by relaxToTemperature()
      breakOnTargetTemperature = false,

      twoKE = (function() {
        var twoKE = 0, i, n = nodes[0].length;
        for (i = 0; i < n; i++) {
          twoKE += speed[i]*speed[i];
        }
        return twoKE;
      }()),

      // initial center of mass; used to calculate drift
      CM_initial = (function() {
        var CM = [0, 0], i, n = nodes[0].length;
        for (i = 0; i < n; i++) {
          CM[0] += x[i];
          CM[1] += y[i];
        }
        CM[0] /= n;
        CM[1] /= n;

        return CM;
      }()),

      driftCM = [0, 0],

      // Coupling factor for Berendsen thermostat.
      dt_over_tau = 0.5,

      // Tolerance for (T_actual - T_target) relative to T_target
      tempTolerance = 0.001,

      // Take a value T, return an average of the last n values
      T_windowed,

      getWindowSize = function() {
        // Average over a larger window if Coulomb force (which should result in larger temperature excursions)
        // is in effect. 50 vs. 10 below were chosen by fiddling around, not for any theoretical reasons.
        return useCoulombInteraction ? 1000 : 1000;
      },

      adjustTemperature = function(options)  {
        if (options == null) options = {};

        var windowSize = options.windowSize || getWindowSize();
        temperatureChangeInProgress = true;
        T_windowed = math.getWindowedAverager( windowSize );
      },

      KE_to_T = function(KE) {
        return KE / nodes[0].length;
      };

  outputState.time = time;

  return {

    useCoulombInteraction      : function(v) {
      if (v !== useCoulombInteraction) {
        useCoulombInteraction = v;
        adjustTemperature();
      }
    },

    useLennardJonesInteraction : function(v) {
      if (v !== useLennardJonesInteraction) {
        useLennardJonesInteraction = v;
        if (useLennardJonesInteraction) {
          adjustTemperature();
        }
      }
    },

    useThermostat              : function(v) {
      useThermostat = v;
    },

    setTargetTemperature       : function(v) {
      if (v !== T_target) {
        T_target = v;
        adjustTemperature();
      }
      T_target = v;
    },

    relaxToTemperature: function(T) {
      if (T != null) T_target = T;

      // doesn't work on IE9
      // console.log("T_target = ", T_target);
      // override window size
      adjustTemperature();

      breakOnTargetTemperature = true;
      while (temperatureChangeInProgress) {
        this.integrate();
      }
      breakOnTargetTemperature = false;
    },

    getOutputState: function() {
      return outputState;
    },

    integrate: function(duration, dt) {

      if (duration == null)  duration = 1;  // how much "time" to integrate over
      if (dt == null)        dt = 1/50;     // time step

      if (ljfLimitsNeedCalculating) setup_ljf_limits();

      var t_start = time,
          n_steps = Math.floor(duration/dt),  // number of steps
          dt_sq = dt*dt,                      // time step, squared
          n = nodes[0].length,                // number of particles
          i,
          j,
          v_sq, r_sq,

          cutoffDistance_LJ_sq      = cutoffDistance_LJ * cutoffDistance_LJ,
          cutoffDistance_Coulomb_sq = cutoffDistance_Coulomb * cutoffDistance_Coulomb,
          maxLJRepulsion_sq         = maxLJRepulsion * maxLJRepulsion,

          f, f_over_r, fx, fy,        // pairwise forces and their x, y components
          dx, dy,
          iloop,
          leftwall   = radius[0],
          bottomwall = radius[0],
          rightwall  = size[0] - radius[0],
          topwall    = size[1] - radius[0],

          PE,                               // potential energy
          CM,                               // center of mass as [x, y]
          vCM = [0,0],                      // velocity of center of mass, sort of.
          T = KE_to_T(twoKE/2),             // temperature
          vRescalingFactor;                 // rescaling factor for Berendsen thermostat

          // measurements to be accumulated during the integration loop:
          // pressure = 0;

      // update time
      for (iloop = 1; iloop <= n_steps; iloop++) {
        time = t_start + iloop*dt;

        if (temperatureChangeInProgress && Math.abs(T_windowed(T) - T_target) <= T_target * tempTolerance) {
          temperatureChangeInProgress = false;
          if (breakOnTargetTemperature) break;
        }

        // rescale velocities based on ratio of target temp to measured temp (Berendsen thermostat)
        vRescalingFactor = 1;
        if (temperatureChangeInProgress || useThermostat && T > 0) {
          vRescalingFactor = 1 + dt_over_tau * ((T_target / T) - 1);
        }

        // Initialize sums such as 'twoKE' which need be accumulated once per integration loop:
        twoKE = 0;
        CM = [0, 0];

        //
        // Use velocity Verlet integration to continue particle movement integrating acceleration with
        // existing position and previous position while managing collision with boundaries.
        //
        // Update positions for first half of verlet integration
        //
        for (i = 0; i < n; i++) {

          // Rescale v(t) using T(t)
          if (vRescalingFactor !== 1) {
            vx[i] *= vRescalingFactor;
            vy[i] *= vRescalingFactor;
          }

          // calculate x(t+dt) from v(t) and a(t)
          x[i] += vx[i]*dt + 0.5*ax[i]*dt_sq;
          y[i] += vy[i]*dt + 0.5*ay[i]*dt_sq;

          v_sq  = vx[i]*vx[i] + vy[i]*vy[i];
          speed[i] = Math.sqrt(v_sq);

          // Bounce off vertical walls
          if (x[i] < leftwall) {
            x[i]  = leftwall + (leftwall - x[i]);
            vx[i] *= -1;
          } else if (x[i] > rightwall) {
            x[i]  = rightwall - (x[i] - rightwall);
            vx[i] *= -1;
          }

          // Bounce off horizontal walls
          if (y[i] < bottomwall) {
            y[i]  = bottomwall + (bottomwall - y[i]);
            vy[i] *= -1;
          } else if (y[i] > topwall) {
            y[i]  = topwall - (y[i] - topwall);
            vy[i] *= -1;
          }

          // Accumulate xs & ys for CM (AFTER collision)
          CM[0] += x[i];
          CM[1] += y[i];

          // FIRST HALF of calculation of v(t+dt):  v1(t+dt) <- v(t) + 0.5*a(t)*dt;
          vx[i] += 0.5*ax[i]*dt;
          vy[i] += 0.5*ay[i]*dt;
        }

        // Calculate center of mass and change in center of mass between t and t+dt
        CM[0] /= n;
        CM[1] /= n;

        // Calculate a(t+dt), step 1: Zero out the acceleration, in order to accumulate pairwise interactions.
        for (i = 0; i < n; i++) {
          ax[i] = 0;
          ay[i] = 0;
        }

        // Calculate a(t+dt), step 2: Sum over all pairwise interactions.
        if (useLennardJonesInteraction || useCoulombInteraction) {
          for (i = 0; i < n; i++) {
            for (j = i+1; j < n; j++) {
              dx = x[j] - x[i];
              dy = y[j] - y[i];

              r_sq = dx*dx + dy*dy;

              if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq) {
                f_over_r = lennardJones.forceOverDistanceFromSquaredDistance(r_sq);

                // Cap force to maxLJRepulsion. This should be a relatively rare occurrence, so ignore
                // the cost of the (expensive) square root calculation.
                if (f_over_r * f_over_r * r_sq > maxLJRepulsion_sq) {
                  f_over_r = maxLJRepulsion / Math.sqrt(r_sq);
                }

                fx = f_over_r * dx;
                fy = f_over_r * dy;

                ax[i] += fx;
                ay[i] += fy;
                ax[j] -= fx;
                ay[j] -= fy;
              }
              if (useCoulombInteraction && r_sq < cutoffDistance_Coulomb_sq) {
                f = Math.min(coulomb.forceFromSquaredDistance(r_sq, charge[i], charge[j]), maxCoulombForce);

                f_over_r = f / Math.sqrt(r_sq);
                fx = f_over_r * dx;
                fy = f_over_r * dy;

                ax[i] += fx;
                ay[i] += fy;
                ax[j] -= fx;
                ay[j] -= fy;
              }
            }
          }
        }

        vCM[0] = 0;
        vCM[1] = 0;

        // SECOND HALF of calculation of v(t+dt): v(t+dt) <- v1(t+dt) + 0.5*a(t+dt)*dt
        for (i = 0; i < n; i++) {
          vx[i] += 0.5*ax[i]*dt;
          vy[i] += 0.5*ay[i]*dt;

          vCM[0] += vx[i];
          vCM[1] += vy[i];

          v_sq  = vx[i]*vx[i] + vy[i]*vy[i];
          twoKE += v_sq;
          speed[i] = Math.sqrt(v_sq);
        }

        vCM[0] /= n;
        vCM[1] /= n;

        driftCM[0] += vCM[0]*dt;
        driftCM[1] += vCM[1]*dt;

        // Calculate T(t+dt) from v(t+dt)
        T = KE_to_T( twoKE/2 );
      }

      // Calculate potentials. Note that we only want to do this once per call to integrate(), not once per
      // integration loop!
      PE = 0;

      for (i = 0; i < n; i++) {
        for (j = i+1; j < n; j++) {
          dx = x[j] - x[i];
          dy = y[j] - y[i];

          r_sq = dx*dx + dy*dy;

          if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq) {
            PE += lennardJones.potentialFromSquaredDistance(r_sq);
          }
          if (useCoulombInteraction && r_sq < cutoffDistance_Coulomb_sq) {
            PE += coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j]);
          }
        }
      }

      // State to be read by the rest of the system:
      outputState.time = time;
      outputState.pressure = 0;// (time - t_start > 0) ? pressure / (time - t_start) : 0;
      outputState.PE = PE;
      outputState.KE = twoKE / 2;
      outputState.T = T;
      outputState.CM = CM || CM_initial;
      outputState.vCM = vCM;
      outputState.driftCM = driftCM;
    }
  };
};

model.getIntegrator = function(options, integratorOutputState) {
  options = options || {};
  var lennard_jones_forces = options.lennard_jones_forces || true,
      coulomb_forces       = options.coulomb_forces       || false,
      temperature_control  = options.temperature_control  || false,
      temperature          = options.temperature          || 1,
      integrator;

  // just needs to be done once, right now.
  setup_coulomb_limits();

  integrator = makeIntegrator({

    setOnceState: {
      size                : size
    },

    settableState: {
      useLennardJonesInteraction : lennard_jones_forces,
      useCoulombInteraction      : coulomb_forces,
      useThermostat              : temperature_control,
      targetTemperature          : temperature
    },

    readWriteState: {
      ax     : ax,
      ay     : ay,
      charge : charge,
      nodes  : nodes,
      px     : px,
      py     : py,
      radius : radius,
      speed  : speed,
      vx     : vx,
      vy     : vy,
      x      : x,
      y      : y
    },

    outputState: integratorOutputState
  });

  // get initial state
  integrator.integrate(0);

  return integrator;
};

});
require("/md2d.js");
(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

// ------------------------------------------------------------
//
// Couloumb forces
//
// ------------------------------------------------------------

molecules_coulomb = {};
molecules_coulomb = { version: "0.0.1" };

var ke_constant = -50;            // coulomb constant

molecules_coulomb.force = function(distance, q1, q2) {
  return ke_constant * ((q1 * q2) / (distance * distance));
};

molecules_coulomb.potential = function(distance, q1, q2) {
  return -ke_constant * ((q1 * q2) / distance);
};
/*globals molecules_lennard_jones: true */
// ------------------------------------------------------------
//
// Lennard-Jones potential and forces
//
// ------------------------------------------------------------

molecules_lennard_jones = {};
molecules_lennard_jones = { version: "0.0.1" };

var epsilon = -1.0,                   // depth of the potential well
    sigma   =  4.0,                   // finite distance at which the inter-particle potential is zero
    rmin = Math.pow(2, 1/6) * sigma,  // distance at which the potential well reaches its minimum

    alpha = 4 * epsilon * Math.pow(sigma, 12),
    beta  = 4 * epsilon * Math.pow(sigma, 6);

molecules_lennard_jones.epsilon = function(e) {
  return molecules_lennard_jones.coefficients(e, sigma);
};

molecules_lennard_jones.sigma = function(s) {
  return molecules_lennard_jones.coefficients(epsilon, s);
};

molecules_lennard_jones.coefficients = function(e, s) {
  if (arguments.length)  {
    epsilon = e;
    sigma = s;
    rmin = Math.pow(2, 1/6) * sigma;
    alpha = 4 * epsilon * Math.pow(sigma, 12);
    beta  = 4 * epsilon * Math.pow(sigma, 6);
  }
  var coefficients = {
    epsilon: epsilon,
    sigma: sigma,
    rmin: rmin,
    alpha: alpha,
    beta: beta
  };
  return coefficients;
};

molecules_lennard_jones.potential = function(distance) {
  return (alpha/Math.pow(distance, 12) - beta/Math.pow(distance, 6)) * -1;
};

molecules_lennard_jones.force = function(distance) {
  var r_6th  = Math.pow(distance, 6),
      r_7th  = r_6th * distance,
      r_13th = r_6th * r_7th;

  return (12*alpha/r_13th - 6*beta/r_7th);
};
/*globals modeler:true, require, d3, arrays, benchmark */
/*jslint onevar: true devel:true eqnull: true */

// modeler.js
//

var coreModel = require('./md2d').model;

modeler = {};
modeler.VERSION = '0.2.0';

modeler.model = function() {
  var model = {},
      atoms = [],
      event = d3.dispatch("tick"),
      size = [100, 100],
      temperature_control,
      lennard_jones_forces, coulomb_forces,
      pe,
      ke,
      stopped = true,
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = 0,
      new_step = false,
      epsilon, sigma,
      pressure, pressures = [0],
      sample_time, sample_times = [],
      temperature,

      integrator,
      integratorOutputState,
      model_listener,

      //
      // Individual property arrays for the nodes
      //
      radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge,

      //
      // Number of individual properties for a node
      //
      node_properties_length = 12,

      //
      // A two dimensional array consisting of arrays of node property values
      //
      nodes;

  //
  // Indexes into the nodes array for the individual node property arrays
  // (re-export these from coreModel for convenience)
  //
  model.INDICES = {
    RADIUS   : coreModel.INDICES.RADIUS,
    PX       : coreModel.INDICES.PX,
    PY       : coreModel.INDICES.PY,
    X        : coreModel.INDICES.X,
    Y        : coreModel.INDICES.Y,
    VX       : coreModel.INDICES.VX,
    VY       : coreModel.INDICES.VY,
    SPEED    : coreModel.INDICES.SPEED,
    AX       : coreModel.INDICES.AX,
    AY       : coreModel.INDICES.AY,
    HALFMASS : coreModel.INDICES.HALFMASS,
    CHARGE   : coreModel.INDICES.CHARGE
  };

  coreModel.setSize(size);

  //
  // The abstract_to_real_temperature(t) function is used to map temperatures in abstract units
  // within a range of 0..10 to the 'real' temperature <mv^2>/2k (remember there's only 2 DOF)
  //
  function abstract_to_real_temperature(t) {
    return 0.19*t + 0.1;  // Translate 0..10 to 0.1..2
  }

  function average_speed() {
    var i, s = 0, n = nodes[0].length;
    i = -1; while (++i < n) { s += speed[i]; }
    return s/n;
  }

  function tick_history_list_is_empty() {
    return tick_history_list_index === 0;
  }

  function tick_history_list_push() {
    var i,
        newnodes = [],
        n = node_properties_length;

    i = -1; while (++i < n) {
      newnodes[i] = arrays.clone(nodes[i]);
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({ nodes: newnodes, ke:ke });
    if (tick_history_list_index > 1000) {
      tick_history_list.splice(0,1);
      tick_history_list_index = 1000;
    }
  }

  function tick() {
    var t;

    if (tick_history_list_is_empty()) {
      tick_history_list_push();
    }

    integrator.integrate();
    pressure = integratorOutputState.pressure;
    pe = integratorOutputState.PE;

    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    ke = integratorOutputState.KE;
    tick_history_list_push();
    if (!stopped) {
      t = Date.now();
      if (sample_time) {
        sample_time  = t - sample_time;
        if (sample_time) { sample_times.push(sample_time); }
        sample_time = t;
        sample_times.splice(0, sample_times.length - 128);
      } else {
        sample_time = t;
      }
      event.tick({type: "tick"});
    }
    return stopped;
  }

  function reset_tick_history_list() {
    tick_history_list = [];
    tick_history_list_index = 0;
    tick_counter = -1;
  }

  function tick_history_list_reset_to_ptr() {
    tick_history_list.length = tick_history_list_index + 1;
  }

  function tick_history_list_extract(index) {
    var i, n=node_properties_length;
    if (index < 0) {
      throw new Error("modeler: request for tick_history_list[" + index + "]");
    }
    if (index >= tick_history_list.length) {
      throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length);
    }
    i = -1; while(++i < n) {
      arrays.copy(tick_history_list[index].nodes[i], nodes[i]);
    }
    ke = tick_history_list[index].ke;
  }

  function container_pressure() {
    return pressures.reduce(function(j,k) { return j+k; })/pressures.length;
  }

  function speed_history(speeds) {
    if (arguments.length) {
      speed_history.push(speeds);
      // limit the pressures array to the most recent 16 entries
      speed_history.splice(0, speed_history.length - 100);
    } else {
      return speed_history.reduce(function(j,k) { return j+k; })/pressures.length;
    }
  }

  function average_rate() {
    var i, ave, s = 0, n = sample_times.length;
    i = -1; while (++i < n) { s += sample_times[i]; }
    ave = s/n;
    return (ave ? 1/ave*1000: 0);
  }

  function set_temperature(t) {
    temperature = t;
    if (integrator) integrator.setTargetTemperature(abstract_to_real_temperature(t));
  }

  // ------------------------------------------------------------
  //
  // Public functions
  //
  // ------------------------------------------------------------

  model.getStats = function() {
    return {
      speed       : average_speed(),
      ke          : ke,
      temperature : temperature,
      pressure    : container_pressure(),
      current_step: tick_counter,
      steps       : tick_history_list.length-1
    };
  };

  /**
    Current seek position
  */
  model.stepCounter = function() {
    return tick_counter;
  };

  /** Total number of ticks that have been run & are stored, regardless of seek
      position
  */
  model.steps = function() {

    // If no ticks have run, tick_history_list will be uninitialized.
    if (tick_history_list_is_empty()) {
      return 0;
    }

    // The first tick will push 2 states to the tick_history_list: the initialized state ("step 0")
    // and the post-tick model state ("step 1")
    // Subsequent ticks will push 1 state per tick. So subtract 1 from the length to get the step #.
    return tick_history_list.length - 1;
  };

  model.isNewStep = function() {
    return new_step;
  };

  model.seek = function(location) {
    if (!arguments.length) { location = 0; }
    stopped = true;
    new_step = false;
    tick_history_list_index = location;
    tick_counter = location;
    tick_history_list_extract(tick_history_list_index);
    return tick_counter;
  };

  model.stepBack = function(num) {
    if (!arguments.length) { num = 1; }
    var i = -1;
    stopped = true;
    new_step = false;
    while(++i < num) {
      if (tick_history_list_index > 1) {
        tick_history_list_index--;
        tick_counter--;
        tick_history_list_extract(tick_history_list_index-1);
        if (model_listener) { model_listener(); }
      }
    }
    return tick_counter;
  };

  model.stepForward = function(num) {
    if (!arguments.length) { num = 1; }
    var i = -1;
    stopped = true;
    while(++i < num) {
      if (tick_history_list_index < tick_history_list.length) {
        tick_history_list_extract(tick_history_list_index);
        tick_history_list_index++;
        tick_counter++;
        if (model_listener) { model_listener(); }
      } else {
        tick();
        if (model_listener) { model_listener(); }
      }
    }
    return tick_counter;
  };

  // The next four functions assume we're are doing this for
  // all the atoms will need to be changed when different atoms
  // can have different LJ sigma values

  model.set_lj_coefficients = function(e, s) {
    // am not using the coefficients beyond setting the ljf limits yet ...
    epsilon = e;
    sigma = s;

    // Does nothing useful now. TODO adapt for multiple models & multiple molecule types.
    coreModel.setLJEpsilon(e);
    coreModel.setLJSigma(s);
  };

  model.getEpsilon = function() {
    return epsilon;
  };

  model.getSigma = function() {
    return sigma;
  };

  model.set_radius = function(r) {
    var i, n = nodes[0].length;
    i = -1; while(++i < n) { radius[i] = r; }
  };

  // return a copy of the array of speeds
  model.get_speed = function() {
    return arrays.copy(speed, []);
  };

  model.get_rate = function() {
    return average_rate();
  };

  model.set_temperature_control = function(tc) {
   temperature_control = tc;
   if (integrator) integrator.useThermostat(tc);
  };

  model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
   if (integrator) integrator.useLennardJonesInteraction(lj);
  };

  model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
   if (integrator) integrator.useCoulombInteraction(cf);
  };

  model.get_nodes = function() {
    return nodes;
  };

  model.get_atoms = function() {
    return atoms;
  };

  model.initialize = function(options) {
    options = options || {};

    if (options.temperature != null) options.temperature = abstract_to_real_temperature(options.temperature);
    lennard_jones_forces = options.lennard_jones_forces || true;
    coulomb_forces       = options.coulomb_forces       || false;
    temperature_control  = options.temperature_control  || false;

    // who is listening to model tick completions
    model_listener = options.model_listener || false;

    reset_tick_history_list();
    new_step = true;
    // pressures.push(pressure);
    // pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

    integrator = coreModel.getIntegrator(options);
    integratorOutputState = integrator.getOutputState();

    return model;
  };

  model.relax = function() {
    // thermalize enough that relaxToTemperature doesn't need a ridiculous window size
    integrator.integrate(100, 1/20);
    integrator.relaxToTemperature();
    return model;
  };

  model.on = function(type, listener) {
    event.on(type, listener);
    return model;
  };

  model.tickInPlace = function() {
    event.tick({type: "tick"});
    return model;
  };

  model.tick = function(num) {
    if (!arguments.length) { num = 1; }
    var i = -1;
    while(++i < num) {
      tick();
    }
    return model;
  };

  model.nodes = function(options) {
    options = options || {};

    if (options.temperature != null) options.temperature = abstract_to_real_temperature(options.temperature);

    coreModel.createNodes(options);

    nodes    = coreModel.nodes;
    radius   = coreModel.radius;
    px       = coreModel.px;
    py       = coreModel.py;
    x        = coreModel.x;
    y        = coreModel.y;
    vx       = coreModel.vx;
    vy       = coreModel.vy;
    speed    = coreModel.speed;
    ax       = coreModel.ax;
    ay       = coreModel.ay;
    halfmass = coreModel.halfmass;
    charge   = coreModel.charge;

    // The d3 molecule viewer requires this length to be set correctly:
    atoms.length = nodes[0].length;

    return model;
  };

  model.start = function() {
    model.initialize();
    return model.resume();
  };

  model.resume = function() {
    stopped = false;
    d3.timer(tick);
    return model;
  };

  model.stop = function() {
    stopped = true;
    return model;
  };

  model.ke = function() {
    return integratorOutputState ? integratorOutputState.KE : undefined;
  };

  model.ave_ke = function() {
    return integratorOutputState? integratorOutputState.KE / nodes[0].length : undefined;
  };

  model.pe = function() {
    return integratorOutputState ? integratorOutputState.PE : undefined;
  };

  model.ave_pe = function() {
    return integratorOutputState? integratorOutputState.PE / nodes[0].length : undefined;
  };

  model.speed = function() {
    return average_speed();
  };

  model.pressure = function() {
    return container_pressure();
  };

  model.temperature = function(x) {
    if (!arguments.length) return temperature;
    set_temperature(x);
    return model;
  };

  model.size = function(x) {
    if (!arguments.length) return size;
    size = x;
    coreModel.setSize(x);
    return model;
  };

  return model;
};
})();
(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

// ------------------------------------------------------------
//
// Simple benchmark runner and results generator
//
//   see: https://gist.github.com/1364172
//
// ------------------------------------------------------------
//
// Runs benchmarks and generates the results in a table.
// 
// Setup benchmarks to run in an array of objects with two properties:
// 
//   name: a title for the table column of results
//   run: a function that is called to run the benchmark and returns a value
// 
// Start the benchmarks by passing the table element where the results are to
// be placed and an array of benchmarks to run.
// 
// Example:
// 
//   var benchmarks_table = document.getElementById("benchmarks-table");
// 
//   var benchmarks_to_run = [
//     {
//       name: "molecules",
//       run: function() {
//         return mol_number
//       }
//     },
//     {
//       name: "100 Steps (steps/s)",
//       run: function() {
//         modelStop();
//         var start = +Date.now();
//         var i = -1;
//         while (i++ < 100) {
//           model.tick();
//         }
//         elapsed = Date.now() - start;
//         return d3.format("5.1f")(100/elapsed*1000)
//       }
//     },
//   ];
//   
//   benchmark.run(benchmarks_table, benchmarks_to_run)
// 
// The first four columns in the generated table consist of:
// 
//   browser, version, cpu/os, date
// 
// These columns are followed by a column for each benchmark passed in.
// 
// Subsequent calls to: benchmark.run(benchmarks_table, benchmarks_to_run) will
// add additional rows to the table.
//
// Here are some css styles for the table:
//
//   table {
//     font: 11px/24px Verdana, Arial, Helvetica, sans-serif;
//     border-collapse: collapse; }
//   th {
//     padding: 0 1em;
//     text-align: left; }
//   td {
//     border-top: 1px solid #cccccc;
//     padding: 0 1em; }
// 

benchmark = {};
benchmark = { version: "0.0.1" };

benchmark.what_browser = function() {
  return what_browser();
};

benchmark.run = function(benchmarks_table, benchmarks_to_run) {
  run(benchmarks_table, benchmarks_to_run);
};

function what_browser() {
  var chromematch = / (Chrome)\/(.*?) /,
      ffmatch =     / (Firefox)\/([0123456789ab.]+)/,
      safarimatch = / Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
      iematch =     / (MSIE) ([0123456789.]+);/,
      ipadmatch =   /([0123456789.]+) \((iPad);.*? Version\/([0123456789.]+) Mobile\/(\S+)/,
      match;

  match = navigator.userAgent.match(chromematch);
  if (match && match[1]) {
    if (navigator.platform.match(/Win/)) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: navigator.platform
      }
    } else {
      return {
        browser: match[1],
        version: match[2],
        oscpu: navigator.appVersion.match(/(Macintosh); (.*?)\)/)[2]
      }
    }
  }
  match = navigator.userAgent.match(ffmatch);
  if (match && match[1]) {
    if (navigator.oscpu.match(/Windows /)) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: navigator.platform
      }
    } else {
      return {
        browser: match[1],
        version: match[2],
        oscpu: navigator.oscpu
      }
    }
  }
  match = navigator.userAgent.match(safarimatch);
  if (match && match[2]) {
    return {
      browser: match[2],
      version: match[1],
      oscpu: navigator.appVersion.match(/(Macintosh); (.*?)\)/)[2]
    }
  }
  match = navigator.userAgent.match(iematch);
  if (match && match[1]) {
    return {
      browser: match[1],
      version: match[2],
      oscpu: navigator.cpuClass + "/" + navigator.platform
    }
  }
  match = navigator.userAgent.match(ipadmatch);
  if (match && match[2]) {
    return {
      browser: match[2],
      version: match[3] + "/" + match[4],
      oscpu: match[1]
    }
  }
  return {
    browser: "",
    version: navigator.appVersion,
    oscpu:   ""
  }
}

function run(benchmarks_table, benchmarks_to_run) {
  var i = 0, b, browser_info, results = [];
  benchmarks_table.style.display = "";

  var empty_table = benchmarks_table.getElementsByTagName("tr").length == 0;
  function add_row() {
    return benchmarks_table.appendChild(document.createElement("tr"));
  }

  var title_row = add_row(),
      results_row = add_row();

  function add_data(row, content, el) {
    el = el || "td";
    row.appendChild(document.createElement(el))
      .textContent = content;
  }

  function add_column(title, data) {
    if (empty_table) { add_data(title_row, title, "th") };
    add_data(results_row, data)
  }

  browser_info = what_browser();
  add_column("browser", browser_info.browser);
  add_column("version", browser_info.version);
  add_column("cpu/os", browser_info.oscpu);

  var formatter = d3.time.format("%Y-%m-%d %H:%M");
  add_column("date", formatter(new Date()))

  // add_column("molecules", mol_number);
  // add_column("temperature", temperature);

  for (i = 0; i < benchmarks_to_run.length; i++) {
    b = benchmarks_to_run[i];
    add_column(b.name, b.run());
  }
}
})();
(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

//
// Utilities
//

(function(){ 

  arrays = {};
  arrays = { version: "0.0.1" };
  arrays.webgl = !!window.WebGLRenderingContext;
  arrays.typed = false;
  try {
    var a = new Float64Array(0);
    arrays.typed = true
  } catch(e) {
    
  }

  // regular
  // Uint8Array
  // Uint16Array
  // Uint32Array
  // Int8Array
  // Int16Array
  // Int32Array
  // Float32Array
  
  arrays.create = function(size, fill, array_type) {
    if (!array_type) {
      if (arrays.webgl || arrays.typed) {
        array_type = "Float32Array"
      } else {
        array_type = "regular"
      }
    }
    fill = fill || 0;
    var a, i;
    if (array_type === "regular") {
      a = new Array(size);
    } else {
      switch(array_type) {
        case "Float64Array":
        a = new Float64Array(size);
        break;
        case "Float32Array":
        a = new Float32Array(size);
        break;
        case "Int32Array":
        a = new Int32Array(size);
        break;
        case "Int16Array":
        a = new Int16Array(size);
        break;
        case "Int8Array":
        a = new Int8Array(size);
        break;
        case "Uint32Array":
        a = new Uint32Array(size);
        break;
        case "Uint16Array":
        a = new Uint16Array(size);
        break;
        case "Uint8Array":
        a = new Uint8Array(size);
        break;
        default:
        a = new Array(size);
        break;
      }
    }
    i=-1; while(++i < size) { a[i] = fill };
    return a;
  }

  arrays.constructor_function = function(source) {
    if (source.buffer && source.buffer.__proto__.constructor) {
      return source.__proto__.constructor
    }
    if (source.constructor === Array) {
      return source.constructor
    }
    throw new Error(
        "arrays.constructor_function: must be an Array or Typed Array: " +
        "  source: " + source +
        ", source.constructor: " + source.constructor +
        ", source.buffer: " + source.buffer +
        ", source.buffer.slice: " + source.buffer.slice +
        ", source.buffer.__proto__: " + source.buffer.__proto__ +
        ", source.buffer.__proto__.constructor: " + source.buffer.__proto__.constructor
      )
  }

  arrays.copy = function(source, dest) {
    var len = source.length; i = -1; 
    while(++i < len) { dest[i] = source[i] }
    dest.length = len;
    return dest
  }

  arrays.clone = function(source) {
    var i, len = source.length, clone, constructor;
    constructor = arrays.constructor_function(source);
    if (constructor == Array) {
      clone = new constructor(len);
      for (i = 0; i < len; i++) { clone[i] = source[i]; }
      return clone
    }
    if (source.buffer.slice) {
      clone = new constructor(source.buffer.slice(0));
      return clone
    }
    clone = new constructor(len);
    for (i = 0; i < len; i++) { clone[i] = source[i]; }
    return clone
  }

  /** @return true if x is between a and b. */
  // float a, float b, float x
  arrays.between = function(a, b, x) {
    return x < Math.max(a, b) && x > Math.min(a, b);
  }

  // float[] array
  arrays.max = function(array) {
    return Math.max.apply( Math, array );
  }

  // float[] array
  arrays.min = function(array) {
    return Math.min.apply( Math, array );
  }

  // FloatxxArray[] array
  arrays.maxTypedArray = function(array) {
    var test, i,
    max = Number.MIN_VALUE,
    length = array.length;
    for(i = 0; i < length; i++) {
      test = array[i];
      max = test > max ? test : max;
    }
    return max;
  }

  // FloatxxArray[] array
  arrays.minTypedArray = function(array) {
    var test, i,
    min = Number.MAX_VALUE,
    length = array.length;
    for(i = 0; i < length; i++) {
      test = array[i];
      min = test < min ? test : min;
    }
    return min;
  }

  // float[] array
  arrays.maxAnyArray = function(array) {
    try {
      return Math.max.apply( Math, array );
    }
    catch (e) {
      if (e instanceof TypeError) {
        var test, i,
        max = Number.MIN_VALUE,
        length = array.length;
        for(i = 0; i < length; i++) {
          test = array[i];
          max = test > max ? test : max;
        }
        return max;
      }
    }
  }

  // float[] array
  arrays.minAnyArray = function(array) {
    try {
      return Math.min.apply( Math, array );
    }
    catch (e) {
      if (e instanceof TypeError) {
        var test, i,
        min = Number.MAX_VALUE,
        length = array.length;
        for(i = 0; i < length; i++) {
          test = array[i];
          min = test < min ? test : min;
        }
        return min;
      }
    }
  }

  arrays.average = function(array) {
    var i, acc = 0,
    length = array.length;
    for (i = 0; i < length; i++) {
      acc += array[i];
    }
    return acc / length;
  }

})()
})();
(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

layout = { version: "0.0.1" };

layout.selection = "";

layout.display = {};

layout.canonical = {
  width:  1280,
  height: 800
};


layout.regular_display = false;

layout.not_rendered = true;
layout.fontsize = false;
layout.cancelFullScreen = false;
layout.screen_factor = 1;
layout.checkbox_factor = 1.1;
layout.checkbox_scale = 1.1;

layout.canonical.width  = 1280
layout.canonical.height = 800

layout.getDisplayProperties = function(obj) {
  if (!arguments.length) {
    var obj = {}
  }
  obj.screen = {
      width:  screen.width,
      height: screen.height
  };
  obj.client = {
      width:  document.body.clientWidth,
      height: document.body.clientHeight
  };
  obj.window = {
      width:  document.width,
      height: document.height
  };
  obj.page = {
      width: layout.getPageWidth(),
      height: layout.getPageHeight()
  }
  return obj
}

layout.checkForResize = function() {
  if ((layout.display.screen.width  != screen.width) ||
      (layout.display.screen.height != screen.height) ||
      (layout.display.window.width  != document.width) ||
      (layout.display.window.height != document.height)) {
    layout.setupScreen()
  }
}

layout.setupScreen = function(layout_selection) {
  var fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;

  layout.display = layout.getDisplayProperties();

  if (!layout.regular_display) {
    layout.regular_display = layout.getDisplayProperties();
  }


  if(fullscreen) {
    layout.screen_factor = layout.display.screen.width / layout.canonical.width;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    layout.bodycss.style.fontSize = layout.screen_factor + 'em';
    layout.not_rendered = true;
    switch (layout.selection) {

      case "simple-screen":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      case "simple-static-screen":
      if (layout.not_rendered) {
        setupSimpleFullScreenMoleculeContainer();
        setupDescriptionRight();
      }
      break;

      case "simple-iframe":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      default:
      setupFullScreenMoleculeContainer();
      setupFullScreenPotentialChart();
      setupFullScreenSpeedDistributionChart();
      setupFullScreenKEChart();
      break;
    }
  } else {
    if (layout.cancelFullScreen) {
      layout.cancelFullScreen = false;
      layout.regular_display = layout.previous_display
    } else {
      layout.regular_display = layout.getDisplayProperties();
    }
    layout.screen_factor = layout.regular_display.page.width / layout.canonical.width;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    switch (layout.selection) {

      case "simple-screen":
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupSimpleMoleculeContainer();
      setupDescriptionRight();
      break;

      case "simple-static-screen":
      if (layout.not_rendered) {
        layout.bodycss.style.fontSize = layout.screen_factor + 'em';
        setupSimpleMoleculeContainer();
        setupDescriptionRight();
        layout.not_rendered = false;
      }
      break;

      case "simple-iframe":
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupSimpleIFrameMoleculeContainer();
      break;

      case "full-static-screen":
      if (layout.not_rendered) {
        layout.bodycss.style.fontSize = layout.screen_factor + 'em';
        setupRegularScreenMoleculeContainer();
        setupRegularScreenPotentialChart();
        setupRegularSpeedDistributionChart();
        setupRegularScreenKEChart();
        layout.not_rendered = false;
      }
      break;

      default:
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupRegularScreenMoleculeContainer();
      setupRegularScreenPotentialChart();
      setupRegularSpeedDistributionChart();
      setupRegularScreenKEChart();
      break;
    }
    layout.regular_display = layout.getDisplayProperties();
  }
  if (layout.transform) {
    $('input[type=checkbox]').css(layout.transform, 'scale(' + layout.checkbox_factor + ',' + layout.checkbox_factor + ')')
  }
  layout.setupTemperature();
  if (benchmarks_table) {
    benchmarks_table.style.display = "none";
  }

  //
  // Regular Screen Layout
  //
  function setupRegularScreenMoleculeContainer() {
    moleculecontainer.style.width = layout.display.page.width * 0.42 +"px";
    moleculecontainer.style.height = layout.display.page.width * 0.40 - 4 +"px";
    layout.finishSetupMoleculeContainer();
  }

  function setupRegularScreenPotentialChart() {
    lj_potential_chart.style.width = layout.display.page.width * 0.24 +"px";
    lj_potential_chart.style.height = layout.display.page.width * 0.18 +"px";
    layout.finishSetupPotentialChart();
  }

  function setupRegularSpeedDistributionChart() {
    speed_distribution_chart.style.width = layout.display.page.width * 0.23 +"px";
    speed_distribution_chart.style.height = layout.display.page.width * 0.18 +"px";
    layout.finishSetupSpeedDistributionChart();
  }

  function setupRegularScreenKEChart() {
    kechart.style.width = layout.display.page.width * 0.48  + 4 +"px";
    kechart.style.height = layout.display.page.width * 0.20 + 5 +"px";
    layout.finishSetupKEChart();
  }

  //
  // Full Screen Layout
  //
  function setupFullScreenMoleculeContainer() {
    moleculecontainer.style.width = layout.display.page.height * 0.70 + "px";
    moleculecontainer.style.height = layout.display.page.height * 0.70 + "px";
    layout.finishSetupMoleculeContainer();
  }

  function setupFullScreenPotentialChart() {
    lj_potential_chart.style.width = layout.display.page.width * 0.24 +"px";
    lj_potential_chart.style.height = layout.display.page.height * 0.28 +"px";
    layout.finishSetupPotentialChart();
  }

  function setupFullScreenSpeedDistributionChart() {
    speed_distribution_chart.style.width = layout.display.page.width * 0.22 +"px";
    speed_distribution_chart.style.height = layout.display.page.height * 0.28 +"px";
    layout.finishSetupSpeedDistributionChart();
  }

  function setupFullScreenKEChart() {
    kechart.style.width = layout.display.page.width * 0.47 + 5 + "px";
    kechart.style.height = layout.display.page.height * 0.40 + 0 +"px";
    layout.finishSetupKEChart();
  }

  //
  // Simple Screen Layout
  //
  function setupSimpleMoleculeContainer() {
    var size = layout.display.page.height * 0.74;
    moleculecontainer.style.width = size +"px";
    moleculecontainer.style.height = size +"px";
    layout.finishSetupMoleculeContainer();
  }

  function setupDescriptionRight() {
    var description_right = document.getElementById("description-right");
    if (description_right !== null) {
      description_right.style.width = Math.max(layout.display.page.width * 0.3,  layout.display.page.width - layout.display.page.height - 20) +"px";
    }
  }

  //
  // Simple iframe Screen Layout
  //
  function setupSimpleIFrameMoleculeContainer() {
    var size = layout.display.page.height * 0.78;
    moleculecontainer.style.width = size +"px";
    moleculecontainer.style.height = size +"px";
    layout.finishSetupMoleculeContainer();
  }

  //
  // Simple Full Screen Layout
  //
  function setupSimpleFullScreenMoleculeContainer() {
    var size = layout.display.page.height * 0.75;
    moleculecontainer.style.width = size +"px";
    moleculecontainer.style.height = size +"px";
    layout.finishSetupMoleculeContainer();
  }

  function setupFullScreenDescriptionRight() {
    var description_right = document.getElementById("description-right");
    if (description_right !== null) {
      description_right.style.width = layout.display.window.width * 0.30 +"px";
    }
  }
}

layout.getStyleForSelector = function(selector) {
  var rules, rule_lists = document.styleSheets;
  for(var i = 0; i < rule_lists.length; i++) {
    if (rule_lists[i]) {
      try {
         rules = rule_lists[i].rules || rule_lists[i].cssRules
         if (rules) {
           for(var j = 0; j < rules.length; j++) {
             if (rules[j].selectorText == selector) {
               return rules[j]
             }
           }
         }
      }
      catch (e) {
      }
    }
  }
  return false
};

// Adapted from getPageSize() by quirksmode.com
layout.getPageHeight = function() {
  var windowHeight
  if (self.innerHeight) { // all except Explorer
    windowHeight = self.innerHeight;
  } else if (document.documentElement && document.documentElement.clientHeight) {
    windowHeight = document.documentElement.clientHeight;
  } else if (document.body) { // other Explorers
    windowHeight = layout.display.window.height;
  }
  return windowHeight
}

layout.getPageWidth = function() {
  var windowWidth
  if (self.innerWidth) { // all except Explorer
    windowWidth = self.innerWidth;
  } else if (document.documentElement && document.documentElement.clientWidth) {
    windowWidth = document.documentElement.clientWidth;
  } else if (document.body) { // other Explorers
    windowWidth = window.width;
  }
  return windowWidth
}

// http://www.zachstronaut.com/posts/2009/02/17/animate-css-transforms-firefox-webkit.html
layout.getTransformProperty = function(element) {
    // Note that in some versions of IE9 it is critical that
    // msTransform appear in this list before MozTransform
    var properties = [
        'transform',
        'WebkitTransform',
        'msTransform',
        'MozTransform',
        'OTransform'
    ];
    var p;
    while (p = properties.shift()) {
        if (typeof element.style[p] != 'undefined') {
            return p;
        }
    }
    return false;
}

var description_right = document.getElementById("description-right");
if (description_right !== null) {
  layout.fontsize = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
}

layout.bodycss = layout.getStyleForSelector("body");
layout.transform = layout.getTransformProperty(document.body);

// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

var moleculecontainer = document.getElementById("molecule-container");

var mc_cx, mc_cy, mc_padding, mc_size,
    mc_mw, mc_mh, mc_tx, mc_ty, mc_stroke,
    mc_x, mc_downscalex, mc_downx,
    mc_y, mc_downscaley, mc_downy,
    mc_dragged,
    mc_vis1, playback_component,
    mc_vis, mc_plot, mc_time_label,
    pc_xpos, pc_ypos,
    model_time_formatter = d3.format("5.3f"),
    ns_string_prefix = "time: ",
    ns_string_suffix = " (ns)",
    mc_red_gradient,
    mc_blue_gradient,
    mc_green_gradient,
    mc_atom_tooltip_on,
    mc_offset_left, mc_offset_top;

function modelTimeLabel() {
  return ns_string_prefix + model_time_formatter(model.stepCounter() * sample_time) + ns_string_suffix;
}

function get_x(i) {
  return nodes[model.INDICES.X][i];
}

function get_y(i) {
  return nodes[model.INDICES.Y][i];
}

function get_radius(i) {
  return nodes[model.INDICES.RADIUS][i];
}

function get_speed(i) {
  return nodes[model.INDICES.SPEED][i];
}

function get_vx(i) {
  return nodes[model.INDICES.VX][i];
}

function get_vy(i) {
  return nodes[model.INDICES.VY][i];
}

function get_ax(i) {
  return nodes[model.INDICES.AX][i];
}

function get_ay(i) {
  return nodes[model.INDICES.AY][i];
}

function get_charge(i) {
  return nodes[model.INDICES.CHARGE][i];
}

layout.finishSetupMoleculeContainer = function() {
  mc_graph.grid_lines = (mc_graph.grid_lines == undefined) | mc_graph.grid_lines;
  mc_graph.xunits = (mc_graph.xunits == undefined) | mc_graph.xunits;
  mc_graph.yunits = (mc_graph.yunits == undefined) | mc_graph.yunits;
  mc_graph.model_time_label = (mc_graph.model_time_label == undefined) | mc_graph.model_time_label;

  mc_graph.atom_mubers = (mc_graph.atom_mubers == undefined) | mc_graph.atom_mubers;

  mc_graph.playback_controller = (mc_graph.playback_controller == undefined) | mc_graph.playback_controller;
  mc_graph.playback_only_controller = (mc_graph.playback_only_controller == undefined) | mc_graph.playback_only_controller;

  mc_cx = moleculecontainer.clientWidth;
  mc_cy = moleculecontainer.clientHeight;

  mc_padding = {
     "top":    mc_graph.title  ? 40 * layout.screen_factor : 20,
     "right":                    25,
     "bottom": mc_graph.xlabel ? 46  * layout.screen_factor : 20,
     "left":   mc_graph.ylabel ? 60  * layout.screen_factor : 25
  };
  if (mc_graph.playback_controller || mc_graph.playback_only_controller) { mc_padding.bottom += (30  * layout.screen_factor) }
  mc_size = {
    "width":  mc_cx - mc_padding.left - mc_padding.right,
    "height": mc_cy - mc_padding.top  - mc_padding.bottom
  },
  mc_offset_left = moleculecontainer.offsetLeft + mc_padding.left,
  mc_offset_top = moleculecontainer.offsetTop + mc_padding.top,
  pc_xpos = mc_size.width / 2 - 50,
  pc_ypos = mc_size.height + (mc_graph.ylabel ? 75 * layout.screen_factor : 30),
  mc_mw = mc_size.width,
  mc_mh = mc_size.height,
  mc_tx = function(d, i) { return "translate(" + mc_x(d) + ",0)"; },
  mc_ty = function(d, i) { return "translate(0," + mc_y(d) + ")"; },
  mc_stroke = function(d, i) { return d ? "#ccc" : "#666"; }
  // mc_x-scale
  mc_x = d3.scale.linear()
      .domain([mc_graph.xmin, mc_graph.xmax])
      .range([0, mc_mw]),

  // drag x-axis logic
  mc_downscalex = mc_x.copy(),
  mc_downx = Math.NaN,

  // mc_y-scale (inverted domain)
  mc_y = d3.scale.linear()
      .domain([mc_graph.ymax, mc_graph.ymin])
      .nice()
      .range([0, mc_mh])
      .nice(),

  // drag mc_x-axis logic
  mc_downscaley = mc_y.copy(),
  mc_downy = Math.NaN,
  mc_dragged = null;

  if (undefined !== mc_vis) {
    d3.select(moleculecontainer).select("svg")
        .attr("width", mc_cx)
        .attr("height", mc_cy);

    mc_vis.select("svg")
        .attr("width", mc_cx)
        .attr("height", mc_cy);

    mc_vis.select("rect.mc_plot")
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .style("fill", "#EEEEEE");

    mc_vis.select("svg.mc_container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .attr("viewBox", "0 0 "+mc_size.width+" "+mc_size.height);

    if (mc_graph.title) {
      mc_vis.select("text.title")
          .attr("x", mc_size.width/2)
          .attr("dy","-1em");
    }

    if (mc_graph.xlabel) {
      mc_vis.select("text.xlabel")
          .attr("x", mc_size.width/2)
          .attr("y", mc_size.height);
    }

    if (mc_graph.ylabel) {
      mc_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + mc_size.height/2+") rotate(-90)");
    }

    if (mc_graph.model_time_label) {
      mc_time_label.text(modelTimeLabel())
          .attr("x", mc_size.width - 100)
          .attr("y", mc_size.height)
    }

    mc_vis.selectAll("g.x").remove();
    mc_vis.selectAll("g.y").remove();

    layout.update_molecule_radius();

    particle.attr("cx", function(d, i) { return mc_x(get_x(i)); })
            .attr("cy", function(d, i) { return mc_y(get_y(i)); })
            .attr("r",  function(d, i) { return mc_x(get_radius(i)) });

    label.attr("transform", function(d, i) {
      return "translate(" + mc_x(get_x(i)) + "," + mc_y(get_y(i)) + ")";
    });

    if (mc_graph.playback_controller || mc_graph.play_only_controller) {
      playback_component.position(pc_xpos, pc_ypos, layout.screen_factor);
    }
    layout.mc_redraw();
  } else {
    mc_vis1 = d3.select(moleculecontainer).append("svg:svg")
      .attr("width", mc_cx)
      .attr("height", mc_cy);

    mc_vis = mc_vis1.append("svg:g")
        .attr("transform", "translate(" + mc_padding.left + "," + mc_padding.top + ")");

    mc_plot = mc_vis.append("svg:rect")
      .attr("class", "mc_plot")
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .style("fill", "#EEEEEE");

    // add Chart Title
    if (mc_graph.title) {
      mc_vis.append("svg:text")
          .attr("class", "title")
          .text(mc_graph.title)
          .attr("x", mc_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (mc_graph.xlabel) {
      mc_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(mc_graph.xlabel)
          .attr("x", mc_size.width/2)
          .attr("y", mc_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (mc_graph.ylabel) {
      mc_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text(mc_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + mc_size.height/2+") rotate(-90)");
    }

    // add model time display
    if (mc_graph.model_time_label) {
      mc_time_label = mc_vis.append("svg:text")
          .attr("class", "model_time_label")
          .text(modelTimeLabel())
          .attr("x", mc_size.width - 100)
          .attr("y", mc_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","start");
    }
    if (mc_graph.playback_controller) {
      playback_component = new PlaybackComponentSVG(mc_vis1, model_player, pc_xpos, pc_ypos, layout.screen_factor);
    }
    if (mc_graph.play_only_controller) {
      playback_component = new PlayOnlyComponentSVG(mc_vis1, model_player, pc_xpos, pc_ypos, layout.screen_factor);
    }
    layout.mc_redraw();
    mc_create_container();
  }
};

layout.mc_redraw = function() {
  if (d3.event && d3.event.transform && isNaN(mc_downx) && isNaN(mc_downy)) {
      d3.event.transform(x, y);
  };

  var mc_fx = mc_x.tickFormat(10),
      mc_fy = mc_y.tickFormat(10);

  if (mc_graph.xunits) {
    // Regenerate x-ticks…
    var mc_gx = mc_vis.selectAll("g.x")
        .data(mc_x.ticks(10), String)
        .attr("transform", mc_tx);

    mc_gx.select("text")
        .text(mc_fx);

    var mc_gxe = mc_gx.enter().insert("svg:g", "a")
        .attr("class", "x")
        .attr("transform", mc_tx);

    if (mc_graph.grid_lines) {
      mc_gxe.append("svg:line")
          .attr("stroke", mc_stroke)
          .attr("y1", 0)
          .attr("y2", mc_size.height);
    }

    mc_gxe.append("svg:text")
        .attr("y", mc_size.height)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .text(mc_fx);

    mc_gx.exit().remove();
  }

  if (mc_graph.xunits) {
    // Regenerate y-ticks…
    var mc_gy = mc_vis.selectAll("g.y")
        .data(mc_y.ticks(10), String)
        .attr("transform", mc_ty);

    mc_gy.select("text")
        .text(mc_fy);

    var mc_gye = mc_gy.enter().insert("svg:g", "a")
        .attr("class", "y")
        .attr("transform", mc_ty)
        .attr("background-fill", "#FFEEB6");

    if (mc_graph.grid_lines) {
      mc_gye.append("svg:line")
          .attr("stroke", mc_stroke)
          .attr("x1", 0)
          .attr("x2", mc_size.width);
    }

    mc_gye.append("svg:text")
        .attr("x", -3)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(mc_fy);

    // update model time display
    if (mc_graph.model_time_label) {
      mc_time_label.text(modelTimeLabel());
    }

    mc_gy.exit().remove();
  }
}

function mc_create_container() {
  layout.mc_container = mc_vis.append("svg:svg")
    .attr("class", "mc_container")
    .attr("top", 0)
    .attr("left", 0)
    .attr("width", mc_size.width)
    .attr("height", mc_size.height)
    .attr("viewBox", "0 0 "+mc_size.width+" "+mc_size.height);

  // add gradient defs
  mc_red_gradient = layout.mc_container.append("svg:defs")
      .append("svg:radialGradient")
      .attr("id", "neg-grad")
      .attr("cx", "50%")
      .attr("cy", "47%")
      .attr("r", "53%")
      .attr("fx", "35%")
      .attr("fy", "30%");
  mc_red_gradient.append("svg:stop")
      .attr("stop-color", "#ffefff")
      .attr("offset", "0%");
  mc_red_gradient.append("svg:stop")
      .attr("stop-color", "#fdadad")
      .attr("offset", "40%");
  mc_red_gradient.append("svg:stop")
      .attr("stop-color", "#e95e5e")
      .attr("offset", "80%");
  mc_red_gradient.append("svg:stop")
      .attr("stop-color", "#fdadad")
      .attr("offset", "100%");

  mc_blue_gradient = layout.mc_container.append("svg:defs")
      .append("svg:radialGradient")
      .attr("id", "pos-grad")
      .attr("cx", "50%")
      .attr("cy", "47%")
      .attr("r", "53%")
      .attr("fx", "35%")
      .attr("fy", "30%");
  mc_blue_gradient.append("svg:stop")
      .attr("stop-color", "#dfffff")
      .attr("offset", "0%");
  mc_blue_gradient.append("svg:stop")
      .attr("stop-color", "#9abeff")
      .attr("offset", "40%");
  mc_blue_gradient.append("svg:stop")
      .attr("stop-color", "#767fbf")
      .attr("offset", "80%");
  mc_blue_gradient.append("svg:stop")
      .attr("stop-color", "#9abeff")
      .attr("offset", "100%");

  mc_green_gradient = layout.mc_container.append("svg:defs")
      .append("svg:radialGradient")
      .attr("id", "neu-grad")
      .attr("cx", "50%")
      .attr("cy", "47%")
      .attr("r", "53%")
      .attr("fx", "35%")
      .attr("fy", "30%");
  mc_green_gradient.append("svg:stop")
      .attr("stop-color", "#dfffef")
      .attr("offset", "0%");
  mc_green_gradient.append("svg:stop")
      .attr("stop-color", "#75a643")
      .attr("offset", "40%");
  mc_green_gradient.append("svg:stop")
      .attr("stop-color", "#2a7216")
      .attr("offset", "80%");
  mc_green_gradient.append("svg:stop")
      .attr("stop-color", "#75a643")
      .attr("offset", "100%");
}

layout.update_molecule_radius = function() {
  var ljf = molecules_lennard_jones.coefficients();
  var r = ljf.rmin * mol_rmin_radius_factor;
  model.set_radius(r);
  layout.mc_container.selectAll("circle")
      .data(atoms)
    .attr("r",  function(d, i) { return mc_x(get_radius(i)) });
  layout.mc_container.selectAll("text")
    .attr("font-size", mc_x(r * 1.3) );
}

var particle, label, labelEnter, tail;

var molecule_div = d3.select("#viz").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

var molecule_div_pre = molecule_div.append("pre")

layout.setup_particles = function() {
  var ljf = molecules_lennard_jones.coefficients();
  var r = ljf.rmin * mol_rmin_radius_factor;
  model.set_radius(r);

  layout.mc_container.selectAll("circle").remove();
  layout.mc_container.selectAll("g").remove();

  particle = layout.mc_container.selectAll("circle").data(atoms);

  particle.enter().append("svg:circle")
      .attr("r",  function(d, i) { return mc_x(get_radius(i)); })
      .attr("cx", function(d, i) { return mc_x(get_x(i)); })
      .attr("cy", function(d, i) { return mc_y(get_y(i)); })
      .style("cursor", "crosshair")
      .style("fill", function(d, i) {
        if (layout.coulomb_forces_checkbox.checked) {
          return (mc_x(get_charge(i)) > 0) ? "url('#pos-grad')" : "url('#neg-grad')"
        } else {
          return "url('#neu-grad')"
        }
      })
      .on("mousedown", molecule_mousedown)
      .on("mouseout", molecule_mouseout);

  var font_size = mc_x(ljf.rmin * mol_rmin_radius_factor * 1.5);
  if (mol_number > 100) { font_size *= 0.9 };

  label = layout.mc_container.selectAll("g.label")
        .data(atoms);

  labelEnter = label.enter().append("svg:g")
      .attr("class", "label")
      .attr("transform", function(d, i) {
        return "translate(" + mc_x(get_x(i)) + "," + mc_y(get_y(i)) + ")";
      });

  if (mc_graph.atom_mubers) {
    labelEnter.append("svg:text")
        .attr("class", "index")
        .attr("font-size", font_size)
        .attr("style", "font-weight: bold; opacity: .7")
        .attr("x", 0)
        .attr("y", "0.31em")
        .text(function(d) { return d.index; })
  } else {
    labelEnter.append("svg:text")
        .attr("class", "index")
        .attr("font-size", font_size)
        .attr("style", "font-weight: bold; opacity: .7")
        .attr("x", 0)
        .attr("y", "0.31em")
        .text(function(d, i) {
          if (layout.coulomb_forces_checkbox.checked) {
            return (mc_x(get_charge(i)) > 0) ? "+" : "–"
          } else {
            return ""
          }
        })
  }
}

function molecule_mouseover(d) {
  // molecule_div.transition()
  //       .duration(250)
  //       .style("opacity", 1);
}

function molecule_mousedown(d, i) {
  if (mc_atom_tooltip_on) {
    molecule_div.style("opacity", 1e-6);
    mc_atom_tooltip_on = false
  } else {
    if (d3.event.shiftKey) {
      mc_atom_tooltip_on = i;
    } else {
      mc_atom_tooltip_on = false
    }
    render_atom_tooltip(i);
  }
}

function render_atom_tooltip(i) {
  molecule_div
        .style("opacity", 1)
        .style("left", mc_x(nodes[model.INDICES.X][i]) + mc_offset_left + 6 + "px")
        .style("top",  mc_y(nodes[model.INDICES.Y][i]) + mc_offset_top - 30 + "px")
        .transition().duration(250);

  molecule_div_pre.text(
      modelTimeLabel() + "\n" +
      "speed: " + d3.format("+6.3e")(get_speed(i)) + "\n" +
      "vx:    " + d3.format("+6.3e")(get_vx(i))    + "\n" +
      "vy:    " + d3.format("+6.3e")(get_vy(i))    + "\n" +
      "ax:    " + d3.format("+6.3e")(get_ax(i))    + "\n" +
      "ay:    " + d3.format("+6.3e")(get_ay(i))    + "\n"
    )
}

function molecule_mousemove(d) {
}

function molecule_mouseout() {
  if (!mc_atom_tooltip_on) {
    molecule_div.style("opacity", 1e-6);
  }
}

layout.update_molecule_positions = function() {

  // update model time display
  if (mc_graph.model_time_label) {
    mc_time_label.text(modelTimeLabel());
  }

  label = layout.mc_container.selectAll("g.label").data(atoms);

  label.attr("transform", function(d, i) {
      return "translate(" + mc_x(get_x(i)) + "," + mc_y(get_y(i)) + ")";
    });

  particle = layout.mc_container.selectAll("circle").data(atoms);

  particle.attr("cx", function(d, i) {
            return mc_x(nodes[model.INDICES.X][i]); })
          .attr("cy", function(d, i) {
            return mc_y(nodes[model.INDICES.Y][i]); })
          .attr("r",  function(d, i) {
            return mc_x(nodes[model.INDICES.RADIUS][i]) });
  if (mc_atom_tooltip_on) {
    render_atom_tooltip(mc_atom_tooltip_on)
  }
}
// ------------------------------------------------------------
//
//   Lennard-Jones Potential Chart
//
// ------------------------------------------------------------

var lj_potential_chart = document.getElementById("lj-potential-chart");

var lj_cx, lj_cy, lj_padding, lj_size, 
    lj_mw, lj_mh, lj_tx, lj_ty, lj_stroke,
    lj_x, lj_downx, 
    lj_y, lj_downy, 
    lj_dragged, coefficient_dragged,  
    lj_vis, lj_plot, lj_container;

layout.finishSetupPotentialChart = function() {
  lj_cx = lj_potential_chart.clientWidth,
  lj_cy = lj_potential_chart.clientHeight,
  lj_padding = {
     "top":    lj_graph.title  ? 36 : 20, 
     "right":                    30, 
     "bottom": lj_graph.xlabel ? 46 : 20,
     "left":   lj_graph.ylabel ? 60 : 45
  },
  lj_size = { 
    "width":  lj_cx - lj_padding.left - lj_padding.right, 
    "height": lj_cy - lj_padding.top  - lj_padding.bottom 
  },
  lj_mw = lj_size.width,
  lj_mh = lj_size.height,
  lj_tx = function(d) { return "translate(" + lj_x(d) + ",0)"; },
  lj_ty = function(d) { return "translate(0," + lj_y(d) + ")"; },
  lj_stroke = function(d) { return d ? "#ccc" : "#666"; };

  // x-scale
  lj_x = d3.scale.linear()
    .domain([lj_data.xmin, lj_data.xmax])
    .range([0, lj_mw]),

  // drag x-axis logic
  lj_downx = Math.NaN,

  // y-scale (inverted domain)
  lj_y = d3.scale.linear()
      .domain([lj_data.ymax, lj_data.ymin])
      .nice()
      .range([0, lj_mh])
      .nice(),

  lj_line = d3.svg.line()
      .x(function(d, i) { return lj_x(lennard_jones_potential[i][0]); })
      .y(function(d, i) { return lj_y(lennard_jones_potential[i][1]); }),

  // drag x-axis logic
  lj_downy = Math.NaN,
  lj_dragged = null,
  lj_selected = lj_data.variables[0],

  // drag coefficients logic
  coefficient_dragged, 
  coefficient_selected = lj_data.variables[0];
  
  if (undefined !== lj_vis) {
    d3.select(lj_potential_chart).select("svg")
        .attr("width", lj_cx)
        .attr("height", lj_cy);

    lj_vis.select("svg")
        .attr("width", lj_cx)
        .attr("height", lj_cy);

    lj_vis.select("rect.plot")
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .style("fill", "#EEEEEE");

    lj_vis.select("svg.container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height);

    lj_vis.select("svg.linebox")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height);
    
    if (lj_graph.title) {
      lj_vis.select("text.title")
          .attr("x", lj_size.width/2)
          .attr("dy","-1em");
    }
    
    if (lj_graph.xlabel) {
      lj_vis.select("text.xlabel")
          .attr("x", lj_size.width/2)
          .attr("y", lj_size.height);
    }
    
    if (lj_graph.ylabel) {
      lj_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + lj_size.height/2+") rotate(-90)");
    }

    lj_vis.selectAll("g.x").remove();
    lj_vis.selectAll("g.y").remove();

  } else {

    lj_vis = d3.select(lj_potential_chart).append("svg:svg")
      .attr("width", lj_cx)
      .attr("height", lj_cy)
      .append("svg:g")
        .attr("transform", "translate(" + lj_padding.left + "," + lj_padding.top + ")");

    lj_plot = lj_vis.append("svg:rect")
      .attr("class", "plot")
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .style("fill", "#EEEEEE")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().x(lj_x).y(lj_y).scaleExtent([1, 8]).on("zoom", layout.lj_redraw))
      .on("mousedown", function() {
        if (d3.event.altKey) {
            lj_points.push(lj_selected = lj_dragged = d3.svg.mouse(lj_vis.node()));
            lj_update();
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
      });

    lj_vis.append("svg:svg")
      .attr("class", "linebox")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height)
      .append("svg:path")
          .attr("class", "line")
          .attr("d", lj_line(lennard_jones_potential))

    // add Chart Title
    if (lj_graph.title) {
      lj_vis.append("svg:text")
          .attr("class", "title")
          .text(lj_graph.title)
          .attr("x", lj_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (lj_graph.xlabel) {
      lj_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(lj_graph.xlabel)
          .attr("x", lj_size.width/2)
          .attr("y", lj_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (lj_graph.ylabel) {
      lj_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text( lj_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + lj_size.height/2+") rotate(-90)");
    }
    
    lj_vis.on("mousemove", lj_mousemove)
          .on("mouseup", lj_mouseup);

  }
  layout.lj_redraw()
}

layout.lj_redraw = function() {

  var lj_fx = lj_x.tickFormat(10),
      lj_fy = lj_y.tickFormat(10);

  // Regenerate x-ticks…
  var lj_gx = lj_vis.selectAll("g.x")
      .data(lj_x.ticks(10), String)
      .attr("transform", lj_tx);

  lj_gx.select("text")
      .text(lj_fx);

  var lj_gxe = lj_gx.enter().insert("svg:g", "a")
      .attr("class", "x")
      .attr("transform", lj_tx);

  lj_gxe.append("svg:line")
      .attr("stroke", lj_stroke)
      .attr("y1", 0)
      .attr("y2", lj_size.height);

   lj_gxe.append("svg:text")
       .attr("y", lj_size.height)
       .attr("dy", "1em")
       .attr("text-anchor", "middle")
       .style("cursor", "ew-resize")
       .text(lj_fx)
       .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
       .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
       .on("mousedown", function(d) {
            var p = d3.svg.mouse(lj_vis[0][0]);
            lj_downx = lj_x.invert(p[0]);
            // d3.behavior.zoom().off("zoom", redraw);
       });


  lj_gx.exit().remove();

  // Regenerate y-ticks…
  var lj_gy = lj_vis.selectAll("g.y")
      .data(lj_y.ticks(10), String)
      .attr("transform", lj_ty);

  lj_gy.select("text")
      .text(lj_fy);

  var lj_gye = lj_gy.enter().insert("svg:g", "a")
      .attr("class", "y")
      .attr("transform", lj_ty)
      .attr("background-fill", "#FFEEB6");

  lj_gye.append("svg:line")
      .attr("stroke", lj_stroke)
      .attr("x1", 0)
      .attr("x2", lj_size.width);

  lj_gye.append("svg:text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .style("cursor", "ns-resize")
      .text(lj_fy)
      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
      .on("mousedown", function(d) {
           var p = d3.svg.mouse(lj_vis[0][0]);
           lj_downy = lj_y.invert(p[1]);
           // d3.behavior.zoom().off("zoom", redraw);
      });

  lj_gy.exit().remove();
  lj_update();

}

// ------------------------------------------------------------
//
// Draw the Lennard-Jones function
//
// ------------------------------------------------------------

function lj_update() {
  var epsilon_circle = lj_vis.selectAll("circle")
      .data(lj_data.variables, function(d) { return d });

  var lj_lines = lj_vis.select("path").attr("d", lj_line(lennard_jones_potential)),
      lj_x_extent = lj_x.domain()[1] - lj_x.domain()[0];
      
  epsilon_circle.enter().append("svg:circle")
      .attr("class", function(d) { return d === coefficient_dragged ? "selected" : null; })
      .attr("cx",    function(d) { return lj_x(d.x); })
      .attr("cy",    function(d) { return lj_y(d.y); })
      .attr("r", 8.0)
      .on("mousedown", function(d) {
        if (d.coefficient == "epsilon") {
          d.x = lj_data.coefficients.rmin;
        } else {
          d.y = 0
        }
        coefficient_selected = coefficient_dragged = d;
        lj_update();
      });

  epsilon_circle
      .attr("class", function(d) { return d === coefficient_selected ? "selected" : null; })
      .attr("cx",    function(d) { return lj_x(d.x); })
      .attr("cy",    function(d) { return lj_y(d.y); });

  epsilon_circle.exit().remove();

  if (d3.event && d3.event.keyCode) {
    d3.event.preventDefault();
    d3.event.stopPropagation();
  }
}

function lj_mousemove() {
  if (!coefficient_dragged) return;
  lj_potential_chart.onselectstart = function(){ return false; }
  var m = d3.svg.mouse(lj_vis.node()),
    newx, newy;
  if (coefficient_dragged.coefficient == "epsilon") {
    newx = lj_data.coefficients.rmin;
    newy = lj_y.invert(Math.max(0, Math.min(lj_size.height, m[1])));
    if (newy > lj_epsilon_max) { newy = lj_epsilon_max };
    if (newy < lj_epsilon_min) { newy = lj_epsilon_min };
    update_epsilon(newy);
  } else {
    newy = 0;
    newx = lj_x.invert(Math.max(0, Math.min(lj_size.width, m[0])));
    if (newx < lj_sigma_min) { newx = lj_sigma_min };
    if (newx > lj_sigma_max) { newx = lj_sigma_max };
    update_sigma(newx);
  }
  layout.update_molecule_radius();
  // model.resolve_collisions(molecules);
  model.tick();
  coefficient_dragged.x = newx;
  coefficient_dragged.y = newy;
  lj_update();
}

function lj_mouseup() {
    if (!isNaN(lj_downx)) {
        lj_potential_chart.onselectstart = function(){ return true; }
        layout.lj_redraw();
        lj_downx = Math.NaN;
        d3.event.preventDefault();
        d3.event.stopPropagation();
    }
    if (!isNaN(lj_downy)) {
        layout.lj_redraw();
        lj_downy = Math.NaN;
        d3.event.preventDefault();
        d3.event.stopPropagation();
    }
    coefficient_dragged = null;
}

// ------------------------------------------------------------
//
// Potential Chart axis scaling
//
// attach the mousemove and mouseup to the body
// in case one wanders off the axis line
//
// ------------------------------------------------------------

d3.select(lj_potential_chart)
  .on("mousemove", function(d) {
    var p = d3.svg.mouse(lj_vis[0][0]);
    if (!isNaN(lj_downx)) {
      var rupx = lj_x.invert(p[0]),
        xaxis1 = lj_x.domain()[0],
        xaxis2 = lj_x.domain()[1],
        xextent = xaxis2 - xaxis1;
      if (rupx !== 0) {
          var changex, dragx_factor, new_domain;
          dragx_factor = xextent/lj_downx;
          changex = 1 + (lj_downx / rupx - 1) * (xextent/(lj_downx-xaxis1))/dragx_factor;
          new_domain = [xaxis1, xaxis1 + (xextent * changex)];
          lj_x.domain(new_domain);
          layout.lj_redraw();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
    if (!isNaN(lj_downy)) {
        var rupy = lj_y.invert(p[1]),
        yaxis1 = lj_y.domain()[1],
        yaxis2 = lj_y.domain()[0],
        yextent = yaxis2 - yaxis1;
      if (rupy !== 0) {
          var changey, dragy_factor, new_range;
          dragy_factor = yextent/lj_downy;
          changey = 1 - (rupy / lj_downy - 1) * (yextent/(lj_downy-yaxis1))/dragy_factor;
          new_range = [yaxis1 + (yextent * changey), yaxis1];
          lj_y.domain(new_range);
          layout.lj_redraw();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  })
  .on("mouseup", function(d) {
      if (!isNaN(lj_downx)) {
          layout.lj_redraw();
          lj_downx = Math.NaN;
          d3.event.preventDefault();
          d3.event.stopPropagation();
      }
      if (!isNaN(lj_downy)) {
          layout.lj_redraw();
          lj_downy = Math.NaN;
          d3.event.preventDefault();
          d3.event.stopPropagation();
      }
  });
// ------------------------------------------------------------
//
//   Speed Distribution Histogram
//
// ------------------------------------------------------------

speed_distribution_chart = document.getElementById("speed-distribution-chart");

var speed_cx, speed_cy, speed_padding, speed_size,
    speed_mw, speed_mh, speed_tx, speed_ty, speed_stroke,
    speed_x, speed_y, speed_bar_width, speed_quantile, speed_line_step, speed_y_max,
    speed_vis, speed_plot, speed_bars, speed_line, speed_data, speed_fit;

function generate_speed_data() {
  speed_data = model.get_speed();
  speed_graph.xmax = d3.max(speed_data);
  speed_graph.xmin = d3.min(speed_data);
  speed_graph.quantile = d3.quantile(speed_data, 0.1);
  speed_y_max = speed_graph.ymax;
  // x-scale
  speed_x = d3.scale.linear()
    .domain([speed_graph.xmin, speed_graph.xmax])
    .range([0, speed_mw]);
  // y-scale
  speed_y = d3.scale.linear()
      .domain([speed_graph.ymax, speed_graph.ymin])
      .nice()
      .range([0, speed_mh]);
}

function update_speed_bins() {
  speed_bins = d3.layout.histogram().frequency(false).bins(speed_x.ticks(60))(speed_data);
  speed_bar_width = (speed_size.width - speed_bins.length)/speed_bins.length;
  speed_line_step = (speed_graph.xmax - speed_graph.xmin)/speed_bins.length;
  speed_max  = d3.max(speed_bins, function(d) { return d.y });
}

layout.finishSetupSpeedDistributionChart = function() {
  speed_cx = speed_distribution_chart.clientWidth,
  speed_cy = speed_distribution_chart.clientHeight,
  speed_padding = {
     "top":    speed_graph.title  ? 36 : 20, 
     "right":                     30,
     "bottom": speed_graph.xlabel ? 46 : 20,
     "left":   speed_graph.ylabel ? 60 : 45
  },
  speed_size = { 
    "width":  speed_cx - speed_padding.left - speed_padding.right, 
    "height": speed_cy - speed_padding.top  - speed_padding.bottom 
  },
  speed_mw = speed_size.width,
  speed_mh = speed_size.height,
  speed_tx = function(d) { return "translate(" + speed_x(d) + ",0)"; },
  speed_ty = function(d) { return "translate(0," + speed_y(d) + ")"; },
  speed_stroke = function(d) { return d ? "#ccc" : "#666"; };

  generate_speed_data();

  update_speed_bins();

  if (undefined !== speed_vis) {
    
    d3.select(speed_distribution_chart).select("svg")
      .attr("width", speed_cx)
      .attr("height", speed_cy);

    speed_vis.select("rect.plot")
      .attr("width", speed_size.width)
      .attr("height", speed_size.height);

    if (speed_graph.title) {
      speed_vis.select("text.title")
          .attr("x", speed_size.width/2)
          .attr("dy","-1em");
    }
    
    if (speed_graph.xlabel) {
      speed_vis.select("text.xlabel")
          .attr("x", speed_size.width/2)
          .attr("y", speed_size.height);
    }
    
    if (speed_graph.ylabel) {
      speed_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + speed_size.height/2+") rotate(-90)");
    }
    
    speed_vis.selectAll("g.x").remove();
    speed_vis.selectAll("g.y").remove();

  } else {

    speed_vis = d3.select(speed_distribution_chart).append("svg:svg")
      .attr("width", speed_cx)
      .attr("height", speed_cy)
      .append("svg:g")
        .attr("transform", "translate(" + speed_padding.left + "," + speed_padding.top + ")");

    speed_plot = speed_vis.append("svg:rect")
      .attr("class", "plot")
      .attr("width", speed_size.width)
      .attr("height", speed_size.height)
      .style("fill", "#EEEEEE")

    // add Chart Title
    if (speed_graph.title) {
      speed_vis.append("svg:text")
          .attr("class", "title")
          .text(speed_graph.title)
          .attr("x", speed_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (speed_graph.xlabel) {
      speed_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(speed_graph.xlabel)
          .attr("x", speed_size.width/2)
          .attr("y", speed_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (speed_graph.ylabel) {
      speed_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text( speed_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + speed_size.height/2+") rotate(-90)");
    }
  }
  layout.speed_redraw()
}

layout.speed_redraw = function() {
  if (d3.event && d3.event.transform && isNaN(speed_downx) && isNaN(speed_downy)) {
      d3.event.transform(speed_x, speed_y);
  };
  
  var speed_fx = speed_x.tickFormat(5),
      speed_fy = speed_y.tickFormat(5);

  // Regenerate x-ticks…
  // var speed_gx = speed_vis.selectAll("g.x")
  //     .data(speed_x.ticks(5), String)
  //     .attr("transform", speed_tx);
  // 
  // speed_gx.select("text")
  //     .text(speed_fx);
  // 
  // var speed_gxe = speed_gx.enter().insert("svg:g", "a")
  //     .attr("class", "x")
  //     .attr("transform", speed_tx);
  // 
  // speed_gxe.append("svg:line")
  //     .attr("stroke", speed_stroke)
  //     .attr("y1", 0)
  //     .attr("y2", speed_size.height);
  // 
  //  speed_gxe.append("svg:text")
  //      .attr("y", speed_size.height)
  //      .attr("dy", "1em")
  //      .attr("text-anchor", "middle")
  //      .text(speed_fx)
  //      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
  //      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
  //      .on("mousedown", function(d) {
  //           var p = d3.svg.mouse(speed_vis[0][0]);
  //           speed_downx = speed_x.invert(p[0]);
  //           speed_downscalex = null;
  //           speed_downscalex = speed_x.copy();
  //           // d3.behavior.zoom().off("zoom", redraw);
  //      });
  // 
  // speed_gx.exit().remove();
  
  // Regenerate y-ticks…
  var speed_gy = speed_vis.selectAll("g.y")
      .data(speed_y.ticks(5), String)
      .attr("transform", speed_ty);
  
  speed_gy.select("text")
      .text(speed_fy);
  
  var speed_gye = speed_gy.enter().insert("svg:g", "a")
      .attr("class", "y")
      .attr("transform", speed_ty)
      .attr("background-fill", "#FFEEB6");
  
  speed_gye.append("svg:line")
      .attr("stroke", speed_stroke)
      .attr("x1", 0)
      .attr("x2", speed_size.width);
  
  speed_gye.append("svg:text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(speed_fy)
      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
      .on("mousedown", function(d) {
           var p = d3.svg.mouse(speed_vis[0][0]);
           speed_downy = speed_y.invert(p[1]);
           speed_downscaley = speed_y.copy();
           // d3.behavior.zoom().off("zoom", redraw);
      });
  
  speed_gy.exit().remove();
  layout.speed_update();

}

// ------------------------------------------------------------
//
// Draw the Speed Distribution
//
// ------------------------------------------------------------
layout.speed_update = function() {
  generate_speed_data();
  if (speed_data.length > 2) {
    speed_kde = science.stats.kde().sample(speed_data);
    speed_x.domain([speed_graph.xmin, speed_graph.xmax]);
    speed_bins = d3.layout.histogram().frequency(true).bins(speed_x.ticks(60))(speed_data);

    speed_bar_width = (speed_size.width - speed_bins.length)/speed_bins.length;
    speed_line_step = (speed_graph.xmax - speed_graph.xmin)/speed_bins.length;
    speed_max  = d3.max(speed_bins, function(d) { return d.y });

    speed_vis.selectAll("g.bar").remove();

    speed_bars = speed_vis.selectAll("g.bar")
        .data(speed_bins);

    speed_bars.enter().append("svg:g")
        .attr("class", "bar")
        .attr("transform", function(d, i) {
          return "translate(" + speed_x(d.x) + "," + (speed_mh - speed_y(speed_y_max - d.y)) + ")";
        })
        .append("svg:rect")
          .attr("class", "bar")
          .attr("fill", "steelblue")
          .attr("width", speed_bar_width)
          .attr("height", function(d) { 
              return speed_y(speed_y_max - d.y); 
            }); 
  }
}
// ------------------------------------------------------------
//
// Benchmarks
//
// ------------------------------------------------------------

var start_benchmarks = document.getElementById("start-benchmarks");
var benchmarks_table = document.getElementById("benchmarks-table");

var benchmarks_to_run = [
  {
    name: "molecules",
    run: function() {
      return mol_number
    }
  },
  {
    name: "temperature",
    run: function() {
      return temperature
    }
  },
  {
    name: "100 Steps (steps/s)",
    run: function() {
      modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  },
  {
    name: "100 Steps w/graphics",
    run: function() {
      modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
        model_listener();
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  }
];

if (start_benchmarks) {
  start_benchmarks.onclick = function() {
    benchmark.run(benchmarks_table, benchmarks_to_run)
  };
}

// ------------------------------------------------------------
//
// Data Table
//
// ------------------------------------------------------------

layout.datatable_visible = false;

var toggle_datatable = document.getElementById("toggle-datatable");
var datatable_table = document.getElementById("datatable-table");

layout.hide_datatable = function() {
  if (datatable_table) {
    datatable_table.style.display = "none";
  }
}

layout.render_datatable = function(reset) {
  datatable_table.style.display = "";
  var i,
      titlerows = datatable_table.getElementsByClassName("title"),
      datarows = datatable_table.getElementsByClassName("data"),
      column_titles = ['PX', 'PY', 'X', 'Y', 'VX', 'VY', 'AX', 'AY', 'SPEED', 'RADIUS', 'HALFMASS', 'CHARGE'],
      i_formatter = d3.format(" 2d"),
      f_formatter = d3.format(" 3.4f"),
      formatters = [i_formatter, f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, f_formatter, f_formatter, 
                    i_formatter];

  reset = reset || false;

  function empty_table() {
    return datatable_table.getElementsByTagName("tr").length == 0;
  }

  function add_row(kind) {
    kind = kind || "data";
    var row = datatable_table.appendChild(document.createElement("tr"));
    row.className = kind;
    return row
  }

  function add_data(row, content, el, colspan) {
    el = el || "td";
    colspan = colspan || 1;
    var d = row.appendChild(document.createElement(el));
    d.textContent = content;
    if (colspan > 1) { d.colSpan = colspan };
  }

  function add_data_row(row, data, el) {
    el = el || "td";
    var i;
    i = -1; while (++i < data.length) {
      add_data(row, data[i]);
    }
  }

  function add_molecule_data(row, index, el) {
    el = el || "td";
    var cells = row.getElementsByTagName(el),
        i = 0;
    if (cells.length > 0) {
      cells[0].textContent = index;
      while (++i < cells.length) {
        cells[i].textContent = formatters[i](nodes[model.INDICES[column_titles[i]]][index])
      }
    }
    i--;
    while (++i < column_titles.length) {
      add_data(row, formatters[i](nodes[model.INDICES[column_titles[i]]][index]));
    }
  }

  function add_column(title, data) {
    if (empty_table()) { add_data(add_row("title"), title, "th") };
    add_data(results_row, data)
  }

  function add_column_headings(title_row, titles, colspan) {
    colspan = colspan || 1;
    var i;
    i = -1; while (++i < titles.length) {
      add_data(title_row, titles[i], "th", colspan);
    }
  }

  function add_data_rows(n) {
    var i = -1, j = datarows.length;
    while (++i < n) {
      if (i >= datarows.length) { add_row() }
    }
    while (--j >= i) {
      datatable_table.removeChild(datarows[i])
    }
    return datatable_table.getElementsByClassName("data")
  }

  function add_data_elements(row, data) {
    var i = -1; while (++i < data.length) { add_data(row, data[i]) }
  }

  function add_column_data(title_rows, data_rows, title, data) {
    var i;
    i = -1; while (++i < data.length) {
      add_data_elements(data_rows[i], data[i])
    }
  }

  if (titlerows.length == 0) {
    var title_row = add_row("title");
    add_column_headings(title_row, column_titles)
    datarows = add_data_rows(atoms.length);
  }
  if (reset) { datarows = add_data_rows(atoms.length); }
  i = -1; while (++i < atoms.length) {
    add_molecule_data(datarows[i], i);
  }
}

if (toggle_datatable) {
  toggle_datatable.onclick = function() {
    if (layout.datatable_visible) {
      layout.datatable_visible = false;
      toggle_datatable.textContent = "Show Data Table";
      datatable_table.style.display = "none";
    } else {
      layout.datatable_visible = true;
      toggle_datatable.textContent = "Hide Data Table";
      layout.render_datatable();
      datatable_table.style.display = "";
    }
  }
};
// ------------------------------------------------------------
//
// Temperature Selector
//
// ------------------------------------------------------------


var select_temperature = document.getElementById("select-temperature");
var select_temperature_display = document.createElement("span");
if (select_temperature == null) {
  layout.setupTemperature = function() {};
}
else {
  layout.setupTemperature = function() {
    if (Modernizr['inputtypes']['range']) {
      var temp_range = document.createElement("input");
      temp_range.type = "range";
      temp_range.min = "0";
      temp_range.max = "10";
      temp_range.step = "0.5";
      temp_range.value = +select_temperature.value;
      select_temperature.parentNode.replaceChild(temp_range, select_temperature);
      temp_range.id = "select-temperature";
      select_temperature = temp_range;
      select_temperature_display.id = "select-temperature-display"
      select_temperature_display.innerText = temperature;
      select_temperature.parentNode.appendChild(select_temperature_display);
      select_temperature = document.getElementById("select-temperature");
    }
    select_temperature.onchange = selectTemperatureChange;
  }

  function selectTemperatureChange() {
    temperature = +select_temperature.value;
    if (select_temperature.type === "range") {
      select_temperature_display.innerText = d3.format("4.1f")(temperature);
    }
    model.temperature(temperature);
  }

  if (select_temperature.type === "range") {
    select_temperature.value = temperature;
    select_temperature_display.innerText = d3.format("4.1f")(temperature);
  }

  // ------------------------------------------------------------
  //
  // Temperature Control
  //
  // ------------------------------------------------------------

  layout.temperature_control_checkbox = document.getElementById("temperature-control-checkbox");

  function temperatureControlHandler() {
      if (layout.temperature_control_checkbox.checked) {
        model.set_temperature_control(true);
      } else {
        model.set_temperature_control(false);
      };
  };

  layout.temperature_control_checkbox.onchange = temperatureControlHandler;
}
// ------------------------------------------------------------
//
// Force Interaction Controls
//
// ------------------------------------------------------------

layout.lennard_jones_forces_checkbox = document.getElementById("lennard-jones-forces-checkbox");

function lennardJonesInteractionHandler() {
    if (layout.lennard_jones_forces_checkbox.checked) {
      model.set_lennard_jones_forces(true);
    } else {
      model.set_lennard_jones_forces(false);
    };
};

if (layout.lennard_jones_forces_checkbox) {
  layout.lennard_jones_forces_checkbox.onchange = lennardJonesInteractionHandler;
}

layout.coulomb_forces_checkbox = document.getElementById("coulomb-forces-checkbox");

function coulombForcesInteractionHandler() {
    if (layout.coulomb_forces_checkbox.checked) {
      model.set_coulomb_forces(true);
    } else {
      model.set_coulomb_forces(false);
    };
    layout.setup_particles()
};

if (layout.coulomb_forces_checkbox) {
  layout.coulomb_forces_checkbox.onchange = coulombForcesInteractionHandler;
}
// ------------------------------------------------------------
//
// Display Model Statistics
//
// ------------------------------------------------------------

var stats = document.getElementById("stats");

layout.displayStats = function() {
  var ke = model.ke(),
      pe = model.pe(),
      te = ke + pe;

  if (stats) {
    stats.textContent =
      "Time: "     + d3.format("5.3f")(model.stepCounter() * sample_time) + " (ns), " +
      "KE: "       + d3.format("1.4f")(ke) + ", " +
      // "PE: "       + d3.format("1.6f")(pe) + ", " +
      "TE: "       + d3.format("1.4f")(te) + ", " +
      "Pressure: " + d3.format("6.3f")(model.pressure()) + ", " +
      "Rate: " + d3.format("5.1f")(model.get_rate()) + " (steps/s)";
  }
}

// ------------------------------------------------------------
//
// Fullscreen API
//
// ------------------------------------------------------------

/** do we have the querySelectorAll method? **/
if (document.querySelectorAll) {
  var fullScreenImage = document.querySelector ('#fullscreen');
  if (fullScreenImage) {
    fullScreenImage.style.cursor = "pointer";
    fullScreenImage.addEventListener ('click', function () {
      var el = document.documentElement;
      var request = el.requestFullScreen ||
                    el.webkitRequestFullScreen ||
                    el.mozRequestFullScreen;

      var fullscreen = document.fullScreen ||
                       document.webkitIsFullScreen ||
                       document.mozFullScreen;

      var cancel = document.cancelFullScreen ||
                   document.webkitCancelFullScreen ||
                   document.mozCancelFullScreen;

      if (request) {
        if (fullscreen) {
          layout.cancelFullScreen = true;
          cancel.call(document);
        } else {
          layout.cancelFullScreen = false;
          request.call(el);
        }
      } else {
        alert("You'll need to use a newer browser to use the\n" +
              "full-screen API.\n\n" +
              "Chrome v15 (beta)\n" +
              "http://www.google.com/landing/chrome/beta/\n\n" +
              "Chrome v17 Canary:\n" +
              "http://tools.google.com/dlpage/chromesxs\n\n" +
              "Safari v5.1.1:\n\n" +
              "FireFox v9 Aurora:\n" +
              "https://www.mozilla.org/en-US/firefox/channel/\n\n" +
              "FireFox v10 Nightly\n" +
              "http://nightly.mozilla.org/\n" +
              "Open 'about:config' and set: full-screen-api-enabled");
      }
    }, false);
  }
}
layout.heatCoolButtons = function(heat_elem_id, cool_elem_id, min, max) {
  var heat_button = new ButtonComponent(heat_elem_id, 'circlesmall-plus');
  var cool_button = new ButtonComponent(cool_elem_id, 'circlesmall-minus');

  heat_button.add_action(function() {
    var t = model.temperature();
    if (t < max) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 + 0.5;
      model.temperature(t);
    } else {
      $(heat_elem_id).addClass('inactive');
    }
  });

  cool_button.add_action(function() {
    var t = model.temperature();
    if (t > min) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 - 0.5;
      model.temperature(t);
    } else {
      $(cool_elem_id).addClass('inactive');
    }
  });

}
})();
(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

/*global 
  window, document, navigator, 
  requestAnimFrame, cancelRequestAnimFrame, myRequire,
  avalanche2d, grapher, d3,
  graph
*/
graphx = { version: "0.0.1" };

graphx.graph = function(options) {

  graph = {};
  
  graph.container = options.container || document.getElementById("chart");

  graph.dataset = options.dataset || [0];

  graph.xmax    = options.xmax    || 10;
  graph.xmin    = options.xmin    || 0;
  graph.sample  = options.sample  || 1;
  
  graph.ymax    = options.ymax    || 10;
  graph.ymin    = options.ymin    || 0;

  graph.title   = options.title;
  graph.xlabel  = options.xlabel;
  graph.ylabel  = options.ylabel;
  
  graph.selectable_points = options.selectable_points || false;


  graph.setup_graph = function(p) {
    setupGraph();
  };

  graph.new_data = function(points) {
    new_data(points);
    update();
  };

  graph.change_xaxis = function(xmax) {
    x = d3.scale.linear()
        .domain([0, xmax])
        .range([0, mw]);
    graph.xmax = xmax;
    x_tics_scale = d3.scale.linear()
        .domain([graph.xmin*graph.sample, graph.xmax*graph.sample])
        .range([0, mw]);
    update();
    update_canvas();
    redraw();
  };

  graph.change_yaxis = function(ymax) {
    y = d3.scale.linear()
        .domain([ymax, 0])
        .range([0, mh]);
    graph.ymax = ymax;
    update();
    update_canvas();
    redraw();
  };

  graph.add_point = function(p) {
    add_point(p);
  };
  
  graph.update = function() {
    update();
  };

  graph.add_canvas_point = function(p) {
    add_canvas_point(p);
  };
  
  graph.initialize_canvas = function() {
    initialize_canvas();
  };
  
  graph.show_canvas = function() {
    show_canvas();
  };

  graph.hide_canvas = function() {
    hide_canvas();
  };
  
  graph.clear_canvas = function() {
    clear_canvas();
  };

  graph.update_canvas = function() {
    update_canvas();
  };

  var gcanvas, gctx,
      chart, cx, cy, 
      padding = {}, size = {},
      mw, mh, tx, ty, stroke,
      x, downx, x_tics_scale, tx_tics,
      y, downy,
      line, dragged, selected,
      line_path, line_seglist, vis_node, vis, cpoint;
  
  var points = indexedData(graph.dataset, 0);
  chart = graph.container;
  setupGraph();

  function setupGraph() {
    cx = chart.clientWidth;
    cy = chart.clientHeight;
    padding = {
       "top":    graph.title  ? 40 : 20, 
       "right":                 30, 
       "bottom": graph.xlabel ? 50 : 10, 
       "left":   graph.ylabel ? 70 : 45
    };
    size = { 
      "width":  cx - padding.left - padding.right, 
      "height": cy - padding.top  - padding.bottom 
    };
    mw = size.width;
    mh = size.height;
    tx = function(d) { return "translate(" + x(d) + ",0)"; };
    ty = function(d) { return "translate(0," + y(d) + ")"; };
    stroke = function(d) { return d ? "#ccc" : "#666"; };

    // x-scale
    x = d3.scale.linear()
          .domain([graph.xmin, graph.xmax])
          .range([0, mw]);

    x_tics_scale = d3.scale.linear()
        .domain([graph.xmin*graph.sample, graph.xmax*graph.sample])
        .range([0, mw]);
    tx_tics = function(d) { return "translate(" + x_tics_scale(d) + ",0)"; };

    // drag x-axis logic
    downx = Math.NaN;
    
    // y-scale (inverted domain)
    y = d3.scale.linear()
            .domain([graph.ymax, graph.ymin])
            .range([0, mh]),
        line = d3.svg.line()
            .x(function(d, i) { return x(points[i].x ); })
            .y(function(d, i) { return y(points[i].y); }),
        // drag y-axis logic
        downy = Math.NaN,
        dragged = null,
        selected = points[0];

    if (undefined !== vis) {
      
      var fullscreen = document.fullScreen ||
                       document.webkitIsFullScreen ||
                       document.mozFullScreen;
      //
      // Something very strange happens only when shifting to full-screen to
      // cause me to have to reverse the order of the Y-axis range() arguments.
      //
      if (fullscreen) {
        y = d3.scale.linear()
                .domain([graph.ymax, graph.ymin])
                .range([mh, 0]);
      }

      d3.select(chart).select("svg")
          .attr("width", cx)
          .attr("height", cy);

      vis.select("rect.plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

      vis.select("svg.viewbox")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height);

      if (graph.title) {
        vis.select("text.title")
            .attr("x", size.width/2)
            .attr("dy","-1em");
      }

      if (graph.xlabel) {
        vis.select("text.xlabel")
            .attr("x", size.width/2)
            .attr("y", size.height);
      }

      if (graph.ylabel) {
        vis.select("text.ylabel")
            .attr("transform","translate(" + -50 + " " + size.height/2+") rotate(-90)");
      }

      vis.selectAll("g.x").remove();
      vis.selectAll("g.y").remove();
      
      resize_canvas();
      
    } else {

      vis = d3.select(chart).append("svg:svg")
        .attr("width", cx)
        .attr("height", cy)
        .append("svg:g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      vis.append("svg:rect")
          .attr("class", "plot")
          .attr("width", size.width)
          .attr("height", size.height)
          .style("fill", "#EEEEEE")
          .attr("pointer-events", "all")
          // .call(d3.behavior.zoom().x(x).y(y).scaleExtent([1, 8]).on("zoom", redraw))
          .on("mousedown", function() {
            if (d3.event.altKey) {
                points.push(selected = dragged = d3.svg.mouse(vis.node()));
                update();
                d3.event.preventDefault();
                d3.event.stopPropagation();
            }
          });

      vis.append("svg:svg")
          .attr("class", "viewbox")
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height)
          .append("svg:path")
              .attr("class", "line")
              .attr("d", line(points))
  
      // variables for speeding up dynamic plotting
      line_path = vis.select("path")[0][0];
      line_seglist = line_path.pathSegList;
      vis_node = vis.node();
      cpoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      cpoint.setAttribute("cx", 1);
      cpoint.setAttribute("cy", 1);
      cpoint.setAttribute("r",  1);

      // add Chart Title
      if (graph.title) {
        vis.append("svg:text")
            .attr("class", "title")
            .text(graph.title)
            .attr("x", size.width/2)
            .attr("dy","-1em")
            .style("text-anchor","middle");
      }

      // Add the x-axis label
      if (graph.xlabel) {
        vis.append("svg:text")
            .attr("class", "xlabel")
            .text(graph.xlabel)
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy","2.4em")
            .style("text-anchor","middle");
      }

      // add y-axis label
      if (graph.ylabel) {
        vis.append("svg:g")
            .append("svg:text")
                .attr("class", "ylabel")
                .text(graph.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -50 + " " + size.height/2+") rotate(-90)");
      }
      initialize_canvas();
    }
    redraw();
  }

  d3.select(chart)
      .on("mousemove", mousemove)
      .on("mouseup", mouseup)
      .on("keydown", keydown);

  function new_data(d) {
    points = indexedData(d, 0);
    update();
  }
  
  // ------------------------------------------------------------
  //
  // Custom generation of line path 'd' attribute string
  // using memoized attr_str ... not much faster than d3
  //
  // ------------------------------------------------------------

  var generate_path_attribute = (function () {
    var attr_str = '';
    var gen = function(pts, x, y) {
      var result = attr_str, 
          i = -1, 
          n = pts.length, 
          path = [],
          value;
      if (result.length === 0) {
        path.push("M",
          x.call(self, pts[0].x, 0), ",", 
          y.call(self, pts[0].y, 0));
        i++;
      }
      while (++i < n) { 
        path.push("L", x.call(self, pts[i].x, i), ",", y.call(self, pts[i].y, i));
      } 
      return (attr_str += path.join(""));
    };
    return gen;
  }());
  
  function add_point(p) {
    var len = points.length;
    if (len === 0) {
      line_seglist
    } else {
      var point = { x: len, y: p };
      points.push(point);
      var newx = x.call(self, len, len);
      var newy = y.call(self, p, len);
      line_seglist.appendItem(line_path.createSVGPathSegLinetoAbs(newx, newy));
    }
  }
  
  function add_canvas_point(p) {
    if (points.length == 0) { return };
    var len = points.length;
    var oldx = x.call(self, len-1, len-1);
    var oldy = y.call(self, points[len-1].y, len-1);
    var point = { x: len, y: p };
    points.push(point);
    var newx = x.call(self, len, len);
    var newy = y.call(self, p, len);
    gctx.beginPath();
    gctx.moveTo(oldx, oldy);
    gctx.lineTo(newx, newy);
    gctx.stroke();
    // FIXME: FireFox bug
  }

  function clear_canvas() {
    gcanvas.width = gcanvas.width;
    gctx.fillStyle = "rgba(0,255,0, 0.05)";
    gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
    gctx.strokeStyle = "rgba(255,65,0, 1.0)";
  }
  
  function show_canvas() {
    line_seglist.clear();
    // vis.select("path.line").attr("d", line(points));
    // vis.select("path.line").attr("d", line([{}]));
    gcanvas.style.zIndex = 100;
  }

  function hide_canvas() {
    gcanvas.style.zIndex = -100;
    vis.select("path.line").attr("d", line(points));
  }

  // update real-time canvas line graph
  function update_canvas() {
    if (points.length == 0) { return };
    var px = x.call(self, 0, 0),
        py = y.call(self, points[0].y, 0),
        i;
    clear_canvas();
    gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
    gctx.beginPath();
    gctx.moveTo(px, py);
    for (i=0; i < points.length-1; i++) {
      px = x.call(self, i, i);
      py = y.call(self, points[i].y, i);
      gctx.lineTo(px, py);
    }
    gctx.stroke();
  };

  function initialize_canvas() {
    gcanvas = document.createElement('canvas');
    chart.appendChild(gcanvas);
    gcanvas.style.zIndex = -100;
    setupCanvasProperties(gcanvas);
  }
  
  function resize_canvas() {
    setupCanvasProperties(gcanvas);
    update_canvas();
  }

  function setupCanvasProperties(canvas) {
    var cplot = {};
    cplot.rect = chart.children[0].getElementsByTagName("rect")[0];
    cplot.width = cplot.rect.width['baseVal'].value;
    cplot.height = cplot.rect.height['baseVal'].value;
    cplot.left = cplot.rect.getCTM().e;
    cplot.top = cplot.rect.getCTM().f;
    canvas.style.position = 'absolute';
    canvas.width = cplot.width;
    canvas.height = cplot.height;
    canvas.style.width = cplot.width  + 'px';
    canvas.style.height = cplot.height  + 'px';
    canvas.offsetLeft = cplot.left;
    canvas.offsetTop = cplot.top;
    canvas.style.left = cplot.left + 'px';
    canvas.style.top = cplot.top + 'px';
    canvas.style.border = 'solid 1px red';
    gctx = gcanvas.getContext( '2d' );
    gctx.globalCompositeOperation = "source-over";
    gctx.lineWidth = 1;
    gctx.fillStyle = "rgba(0,255,0, 0.05)";
    gctx.fillRect(0, 0, canvas.width, gcanvas.height);
    gctx.strokeStyle = "rgba(255,65,0, 1.0)";
    gcanvas.style.border = 'solid 1px red';
  }

  // ------------------------------------------------------------
  //
  // Draw the data
  //
  // ------------------------------------------------------------

  function update() {
    var oldx, oldy, newx, newy, i;
    
    var gplot = chart.children[0].getElementsByTagName("rect")[0];

    if (gcanvas.style.zIndex == -100) {
      var lines = vis.select("path").attr("d", line(points));
    }

    update_canvas();

    if (graph.selectable_points) {
      var circle = vis.selectAll("circle")
          .data(points, function(d) { return d; });
       
      circle.enter().append("svg:circle")
          .attr("class", function(d) { return d === selected ? "selected" : null; })
          .attr("cx",    function(d) { return x(d.x); })
          .attr("cy",    function(d) { return y(d.y); })
          .attr("r", 1.0)
          .on("mousedown", function(d) {
            selected = dragged = d;
            update();
          });
       
      circle
          .attr("class", function(d) { return d === selected ? "selected" : null; })
          .attr("cx",    function(d) { return x(d.x); })
          .attr("cy",    function(d) { return y(d.y); });
       
      circle.exit().remove();
    }

    if (d3.event && d3.event.keyCode) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  }

  function mousemove() {
    if (!dragged) { return; }
    chart.onselectstart = function(){ return false; }
    var m = d3.svg.mouse(vis.node());
    dragged.x = x.invert(Math.max(0, Math.min(size.width, m[0])));
    dragged.y = y.invert(Math.max(0, Math.min(size.height, m[1])));
    update();
  }

  function mouseup() {
    if (!dragged) { return; }
    chart.onselectstart = function(){ return true; }
    mousemove();
    dragged = null;
  }

  function keydown() {
    if (!selected) { return; }
    switch (d3.event.keyCode) {
      case 8: // backspace
      case 46: { // delete
        var i = points.indexOf(selected);
        points.splice(i, 1);
        selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
        update();
        break;
      }
    }
  }

  // ------------------------------------------------------------
  //
  // Redraw the plot canvas when it is translated or axes are re-scaled
  //
  // ------------------------------------------------------------

  function redraw() {
    if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
        d3.event.transform(x, y);
    }
    
    graph.xmin = x.domain()[0];
    graph.xmax = x.domain()[1];
    graph.ymin = y.domain()[0];
    graph.ymax = y.domain()[1];

    var fx = x_tics_scale.tickFormat(10),
        fy = y.tickFormat(10);

    // Regenerate x-ticks
    var gx = vis.selectAll("g.x")
        .data(x_tics_scale.ticks(10), String)
        .attr("transform", tx_tics);

    gx.select("text")
        .text(fx);

    var gxe = gx.enter().insert("svg:g", "a")
        .attr("class", "x")
        .attr("transform", tx_tics);

    gxe.append("svg:line")
        .attr("stroke", stroke)
        .attr("y1", 0)
        .attr("y2", size.height);

    gxe.append("svg:text")
        .attr("y", size.height)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .style("cursor", "ew-resize")
        .text(fx)
        .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
        .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
        .on("mousedown", function(d) {
             var p = d3.svg.mouse(vis[0][0]);
             downx = x_tics_scale.invert(p[0]);
        });

    gx.exit().remove();

    // Regenerate y-ticks
    var gy = vis.selectAll("g.y")
        .data(y.ticks(10), String)
        .attr("transform", ty);

    gy.select("text")
        .text(fy);

    var gye = gy.enter().insert("svg:g", "a")
        .attr("class", "y")
        .attr("transform", ty)
        .attr("background-fill", "#FFEEB6");

    gye.append("svg:line")
        .attr("stroke", stroke)
        .attr("x1", 0)
        .attr("x2", size.width);

    gye.append("svg:text")
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
        });

    gy.exit().remove();

    update();
  }
  
  function indexedData(dataset, initial_index) {
    var i = 0,
        start_index = initial_index || 0,
        n = dataset.length,
        points = [];
    for (i = 0; i < n;  i++) {
      points.push({ x: i+start_index, y: dataset[i] });
    }
    return points;
  }

  // ------------------------------------------------------------
  //
  // Axis scaling
  //
  // attach the mousemove and mouseup to the body
  // in case one wanders off the axis line
  // ------------------------------------------------------------

  d3.select('body')
    .on("mousemove", function(d) {
      var p = d3.svg.mouse(vis[0][0]);
      if (!isNaN(downx)) {
        var rupx = x_tics_scale.invert(p[0]),
          xaxis1 = x_tics_scale.domain()[0],
          xaxis2 = x_tics_scale.domain()[1],
          xextent = xaxis2 - xaxis1;
        if (rupx !== 0) {
            var changex, dragx_factor, new_domain;
            dragx_factor = xextent/downx;
            changex = 1 + (downx / rupx - 1) * (xextent/(downx-xaxis1))/dragx_factor;
            new_domain = [xaxis1, xaxis1 + (xextent * changex)];
            x_tics_scale.domain(new_domain);
            if (graph.sample !== 1) {
              x.domain([new_domain[0]/graph.sample, new_domain[1]/graph.sample])
            }
            redraw();
        }
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
      if (!isNaN(downy)) {
          var rupy = y.invert(p[1]),
          yaxis1 = y.domain()[1],
          yaxis2 = y.domain()[0],
          yextent = yaxis2 - yaxis1;
        if (rupy !== 0) {
            var changey, dragy_factor, new_range;
            dragy_factor = yextent/downy;
            changey = ((rupy-yaxis1)/(downy-yaxis1)) * (yextent/(downy-yaxis1))/dragy_factor;
            new_range = [yaxis1 + (yextent * 1/changey), yaxis1];
            if (yaxis1 > 0) {
              new_range[0] += yaxis1;
            }
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

  return graph;
};
})();
(function() {
  var ButtonBarComponent, ButtonComponent, Component, JSliderComponent, ModelPlayer, PlayOnlyComponentSVG, PlaybackBarComponent, PlaybackComponent, PlaybackComponentSVG, SliderComponent, Thermometer, ToggleButtonComponent, root,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  Component = (function() {

    function Component(dom_id) {
      this.dom_id = dom_id;
      if (this.dom_id) {
        this.dom_element = $(this.dom_id);
      } else {
        this.dom_element = $('<div>');
      }
      this.dom_element.addClass('component');
    }

    return Component;

  })();

  ButtonComponent = (function(_super) {

    __extends(ButtonComponent, _super);

    function ButtonComponent(dom_id, name, actions) {
      this.dom_id = dom_id;
      this.name = name != null ? name : 'play';
      this.actions = actions != null ? actions : [];
      ButtonComponent.__super__.constructor.call(this, this.dom_id);
      this.dom_element.addClass('button').addClass(this.name).addClass('up');
      this.state = 'up';
      this.init_mouse_handlers();
    }

    ButtonComponent.prototype.set_state = function(newstate) {
      this.dom_element.removeClass(this.state);
      this.state = newstate;
      return this.dom_element.addClass(this.state);
    };

    ButtonComponent.prototype.init_mouse_handlers = function() {
      var self,
        _this = this;
      self = this;
      this.dom_element.mousedown(function(e) {
        return self.set_state("down");
      });
      this.dom_element.mouseup(function() {
        self.set_state("up");
        return self.do_action();
      });
      return this.dom_element.mouseleave(function() {
        return self.set_state("up");
      });
    };

    ButtonComponent.prototype.add_action = function(action) {
      return this.actions.push(action);
    };

    ButtonComponent.prototype.do_action = function() {
      var action, _i, _len, _ref, _results;
      _ref = this.actions;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        action = _ref[_i];
        _results.push(action());
      }
      return _results;
    };

    return ButtonComponent;

  })(Component);

  root.ButtonComponent = ButtonComponent;

  ToggleButtonComponent = (function(_super) {

    __extends(ToggleButtonComponent, _super);

    function ToggleButtonComponent(dom_id, _buttons) {
      var button, _i, _len;
      this.dom_id = dom_id;
      if (_buttons == null) _buttons = [];
      ToggleButtonComponent.__super__.constructor.call(this, this.dom_id, 'toggle');
      this.buttons = [];
      for (_i = 0, _len = _buttons.length; _i < _len; _i++) {
        button = _buttons[_i];
        this.add_button(button);
      }
      this.button_index = 0;
      this.enable_button(0);
    }

    ToggleButtonComponent.prototype.add_button = function(button) {
      var index, self;
      button.dom_element.remove();
      button.dom_element.css('margin', '0px');
      this.dom_element.append(button.dom_element);
      this.buttons.push(button);
      this.add_width(button.dom_element);
      this.add_height(button.dom_element);
      self = this;
      index = this.buttons.length - 1;
      if (index !== this.button_index) return this.disable_button(index);
    };

    ToggleButtonComponent.prototype.add_width = function(element) {
      var elem_width, width;
      width = this.dom_element.width();
      elem_width = element.outerWidth(true);
      if (width < elem_width) {
        return this.dom_element.width("" + elem_width + "px");
      }
    };

    ToggleButtonComponent.prototype.add_height = function(element) {
      var elem_height, height;
      height = this.dom_element.height();
      elem_height = element.outerHeight(true);
      if (height < elem_height) {
        return this.dom_element.height("" + elem_height + "px");
      }
    };

    ToggleButtonComponent.prototype.disable_button = function(index) {
      var button;
      button = this.buttons[index];
      if (button) return button.dom_element.addClass('hidden');
    };

    ToggleButtonComponent.prototype.enable_button = function(index) {
      var button;
      button = this.buttons[index];
      if (button) return button.dom_element.removeClass('hidden');
    };

    ToggleButtonComponent.prototype.set_active = function(index) {
      this.disable_button(this.button_index);
      this.button_index = index;
      this.button_index = this.button_index % this.buttons.length;
      return this.enable_button(this.button_index);
    };

    ToggleButtonComponent.prototype.enable_next_button = function() {
      return this.set_active(this.button_index + 1);
    };

    ToggleButtonComponent.prototype.current_button = function() {
      if (this.button_index < this.buttons.length) {
        return this.buttons[this.button_index];
      }
      return null;
    };

    ToggleButtonComponent.prototype.do_action = function() {
      if (this.current_button()) {
        this.current_button().do_action();
        return this.enable_next_button();
      }
    };

    return ToggleButtonComponent;

  })(ButtonComponent);

  root.ToggleButtonComponent = ToggleButtonComponent;

  ButtonBarComponent = (function(_super) {

    __extends(ButtonBarComponent, _super);

    function ButtonBarComponent(dom_id, _buttons) {
      var button, _i, _len;
      this.dom_id = dom_id;
      if (_buttons == null) _buttons = [];
      ButtonBarComponent.__super__.constructor.call(this, this.dom_id);
      this.dom_element.addClass('button_bar');
      this.buttons = [];
      this.dom_element.width('1px');
      this.dom_element.height('1px');
      for (_i = 0, _len = _buttons.length; _i < _len; _i++) {
        button = _buttons[_i];
        this.add_button(button);
      }
    }

    ButtonBarComponent.prototype.add_button = function(button) {
      var elem;
      elem = button.dom_element;
      this.dom_element.append(elem);
      this.add_width(elem);
      this.add_height(elem);
      return this.buttons.push(button);
    };

    ButtonBarComponent.prototype.add_width = function(element) {
      var width;
      width = this.dom_element.width();
      width = width + element.outerWidth(true);
      return this.dom_element.width("" + width + "px");
    };

    ButtonBarComponent.prototype.add_height = function(element) {
      var elem_height, height;
      height = this.dom_element.height();
      elem_height = element.outerHeight(true);
      if (height < elem_height) {
        return this.dom_element.height("" + elem_height + "px");
      }
    };

    return ButtonBarComponent;

  })(Component);

  root.ButtonBarComponent = ButtonBarComponent;

  PlaybackBarComponent = (function(_super) {

    __extends(PlaybackBarComponent, _super);

    function PlaybackBarComponent(dom_id, playable, simplified) {
      var back, forward, pause, play, reset,
        _this = this;
      this.dom_id = dom_id;
      this.playable = playable;
      if (simplified == null) simplified = true;
      PlaybackBarComponent.__super__.constructor.call(this, this.dom_id);
      play = new ButtonComponent(null, 'play');
      play.add_action(function() {
        return _this.playable.play();
      });
      pause = new ButtonComponent(null, 'pause');
      pause.add_action(function() {
        return _this.playable.stop();
      });
      this.toggle = new ToggleButtonComponent(null, [play, pause]);
      this.play_index = 0;
      this.stop_index = 1;
      reset = new ButtonComponent(null, 'reset');
      reset.add_action(function() {
        _this.playable.seek(1);
        return _this.play();
      });
      this.add_button(reset);
      if (!simplified) {
        forward = new ButtonComponent(null, 'forward');
        forward.add_action(function() {
          _this.playable.forward();
          return _this.stop();
        });
        this.add_button(forward);
      }
      this.add_button(this.toggle);
      if (!simplified) {
        back = new ButtonComponent(null, 'back');
        back.add_action(function() {
          _this.playable.back();
          return _this.stop();
        });
        this.add_button(back);
      }
      this.play();
    }

    PlaybackBarComponent.prototype.stop = function() {
      return this.toggle.set_active(this.play_index);
    };

    PlaybackBarComponent.prototype.play = function() {
      return this.toggle.set_active(this.stop_index);
    };

    return PlaybackBarComponent;

  })(ButtonBarComponent);

  root.PlaybackBarComponent = PlaybackBarComponent;

  JSliderComponent = (function() {

    function JSliderComponent(dom_id, value_changed_function) {
      var _this = this;
      this.dom_id = dom_id != null ? dom_id : "#slider";
      this.value_changed_function = value_changed_function;
      this.dom_element = $(this.dom_id);
      this.precision = this.dom_element.attr('data-precision') || 3;
      this.min = this.dom_element.attr('data-min') || 0;
      this.max = this.dom_element.attr('data-max') || 1;
      this.step = this.dom_element.attr('data-stop') || 0.01;
      this.value = this.dom_element.attr('data-value') || 0.5;
      this.label = this.dom_element.attr('data-label');
      this.label_id = this.dom_element.attr('data-label-id');
      this.orientation = this.dom_element.attr('data-orientation') || "horizontal";
      this.dom_element.slider();
      this.update_options();
      this.dom_element.bind("slide", function(event, ui) {
        console.log("slider value: " + ui.value);
        _this.update_label(ui.value);
        if (_this.value_changed_function) {
          return _this.value_changed_function(ui.value);
        }
      });
      this.update_label(this.value);
    }

    JSliderComponent.prototype.set_max = function(max) {
      this.max = max;
      return this.update_options();
    };

    JSliderComponent.prototype.set_min = function(min) {
      this.min = min;
      return this.update_options();
    };

    JSliderComponent.prototype.update_options = function() {
      var opts;
      opts = {
        orientation: this.orientation,
        min: this.min,
        max: this.max,
        value: this.value,
        step: this.step,
        range: "min"
      };
      return this.dom_element.slider('option', opts);
    };

    JSliderComponent.prototype.update_label = function(value) {
      if (this.label_id) {
        return $(this.label_id).text("" + this.label + " " + value);
      }
    };

    return JSliderComponent;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.JSliderComponent = JSliderComponent;

  PlayOnlyComponentSVG = (function() {

    function PlayOnlyComponentSVG(svg_element, playable, xpos, ypos, scale) {
      this.svg_element = svg_element;
      this.playable = playable != null ? playable : null;
      this.offsets = {
        'play': 1,
        'stop': 1
      };
      this.width = 200;
      this.height = 34;
      this.xpos = xpos;
      this.ypos = ypos;
      this.scale = scale || 1;
      this.unit_width = this.width / 9;
      this.vertical_padding = (this.height - this.unit_width) / 2;
      this.stroke_width = this.unit_width / 10;
      this.init_view();
    }

    PlayOnlyComponentSVG.prototype.offset = function(key) {
      return this.offsets[key] * (this.unit_width * 2) + this.unit_width;
    };

    PlayOnlyComponentSVG.prototype.make_button = function(button_name, type, point_set) {
      var art, button_group, point, points, points_string, x, y, _i, _j, _len, _len2,
        _this = this;
      button_group = this.group.append('svg:g');
      x = this.offset(button_name);
      button_group.attr('x', x).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width);
      for (_i = 0, _len = point_set.length; _i < _len; _i++) {
        points = point_set[_i];
        art = button_group.append(type);
        art.attr('class', "" + button_name + " button-art");
        points_string = "";
        for (_j = 0, _len2 = points.length; _j < _len2; _j++) {
          point = points[_j];
          x = this.offset(button_name) + point['x'] * this.unit_width;
          y = this.vertical_padding + point['y'] * this.unit_width;
          points_string = points_string + (" " + x + "," + y);
          art.attr('points', points_string);
        }
      }
      button_group.on('click', function() {
        return _this.action(button_name);
      });
      return button_group;
    };

    PlayOnlyComponentSVG.prototype.action = function(action) {
      console.log("running " + action + " ");
      if (this.playable) {
        switch (action) {
          case 'play':
            this.playable.play();
            break;
          case 'stop':
            this.playable.stop();
            break;
          case 'forward':
            this.playable.forward();
            break;
          case 'back':
            this.playable.back();
            break;
          case 'reset':
            this.playable.seek(1);
            break;
          default:
            console.log("cant find action for " + action);
        }
      } else {
        console.log("no @playable defined");
      }
      return this.update_ui();
    };

    PlayOnlyComponentSVG.prototype.init_play_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.play = this.make_button('play', 'svg:polygon', points);
    };

    PlayOnlyComponentSVG.prototype.init_stop_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0
          }, {
            x: 1,
            y: 1
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: 0
          }
        ]
      ];
      return this.stop = this.make_button('stop', 'svg:polygon', points);
    };

    PlayOnlyComponentSVG.prototype.init_view = function() {
      this.svg = this.svg_element.append("svg:svg").attr("class", "component playbacksvg").attr("x", this.xpos).attr("y", this.ypos);
      this.group = this.svg.append("g").attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
      this.init_play_button();
      this.init_stop_button();
      return this.hide(this.play);
    };

    PlayOnlyComponentSVG.prototype.position = function(xpos, ypos, scale) {
      this.xpos = xpos;
      this.ypos = ypos;
      this.scale = scale || 1;
      this.svg.attr("x", this.xpos).attr("y", this.ypos);
      return this.group.attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
    };

    PlayOnlyComponentSVG.prototype.update_ui = function() {
      if (this.playable) {
        if (this.playable.playing) {
          this.hide(this.play);
          return this.show(this.stop);
        } else {
          this.hide(this.stop);
          return this.show(this.play);
        }
      }
    };

    PlayOnlyComponentSVG.prototype.hide = function(thing) {
      return thing.style('visibility', 'hidden');
    };

    PlayOnlyComponentSVG.prototype.show = function(thing) {
      return thing.style('visibility', 'visible');
    };

    return PlayOnlyComponentSVG;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.PlayOnlyComponentSVG = PlayOnlyComponentSVG;

  root.ModelPlayer = ModelPlayer;

  ModelPlayer = (function() {

    function ModelPlayer(model) {
      this.model = model;
      this.playing = true;
    }

    ModelPlayer.prototype.play = function() {
      this.model.resume();
      return this.playing = true;
    };

    ModelPlayer.prototype.stop = function() {
      this.model.stop();
      return this.playing = false;
    };

    ModelPlayer.prototype.forward = function() {
      this.stop();
      return this.model.stepForward();
    };

    ModelPlayer.prototype.back = function() {
      this.stop();
      return this.model.stepBack();
    };

    ModelPlayer.prototype.seek = function(float_index) {
      this.stop();
      this.model.seek(float_index);
      return this.play();
    };

    return ModelPlayer;

  })();

  PlaybackComponent = (function() {

    function PlaybackComponent(dom_id, playable) {
      this.dom_id = dom_id != null ? dom_id : "#playback";
      this.playable = playable != null ? playable : null;
      this.dom_element = d3.select(this.dom_id).attr('class', 'component playback');
      this.offsets = {
        'reset': 0,
        'back': 1,
        'play': 2,
        'stop': 2,
        'forward': 3
      };
      this.width = parseInt(this.dom_element.style("width"));
      this.height = parseInt(this.dom_element.style("height"));
      this.unit_width = this.width / 9;
      if (this.height < this.unit_width) {
        this.height = this.unit_width + 2;
        this.dom_element.style("height", this.height + "px");
      }
      this.vertical_padding = (this.height - this.unit_width) / 2;
      this.stroke_width = this.unit_width / 10;
      this.init_view();
    }

    PlaybackComponent.prototype.offset = function(key) {
      return this.offsets[key] * (this.unit_width * 2) + this.unit_width;
    };

    PlaybackComponent.prototype.make_button = function(button_name, type, point_set) {
      var art, button_group, point, points, points_string, x, y, _i, _j, _len, _len2,
        _this = this;
      button_group = this.svg.append('svg:g');
      x = this.offset(button_name);
      button_group.attr('x', x).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width);
      for (_i = 0, _len = point_set.length; _i < _len; _i++) {
        points = point_set[_i];
        art = button_group.append(type);
        art.attr('class', "" + button_name + " button-art");
        points_string = "";
        for (_j = 0, _len2 = points.length; _j < _len2; _j++) {
          point = points[_j];
          x = this.offset(button_name) + point['x'] * this.unit_width;
          y = this.vertical_padding + point['y'] * this.unit_width;
          points_string = points_string + (" " + x + "," + y);
          art.attr('points', points_string);
        }
      }
      button_group.on('click', function() {
        return _this.action(button_name);
      });
      return button_group;
    };

    PlaybackComponent.prototype.action = function(action) {
      console.log("running " + action + " ");
      if (this.playable) {
        switch (action) {
          case 'play':
            this.playable.play();
            break;
          case 'stop':
            this.playable.stop();
            break;
          case 'forward':
            this.playable.forward();
            break;
          case 'back':
            this.playable.back();
            break;
          case 'reset':
            this.playable.seek(1);
            break;
          default:
            console.log("cant find action for " + action);
        }
      } else {
        console.log("no @playable defined");
      }
      return this.update_ui();
    };

    PlaybackComponent.prototype.init_reset_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 0,
            y: 1
          }, {
            x: 1,
            y: 1
          }, {
            x: 1,
            y: 0
          }, {
            x: 0.25,
            y: 0
          }, {
            x: 0.5,
            y: 0.25
          }
        ]
      ];
      return this.reset = this.make_button('reset', 'svg:polyline', points);
    };

    PlaybackComponent.prototype.init_play_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.play = this.make_button('play', 'svg:polygon', points);
    };

    PlaybackComponent.prototype.init_stop_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0
          }, {
            x: 1,
            y: 1
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: 0
          }
        ]
      ];
      return this.stop = this.make_button('stop', 'svg:polygon', points);
    };

    PlaybackComponent.prototype.init_back_button = function() {
      var points;
      points = [
        [
          {
            x: 0.5,
            y: 0
          }, {
            x: 0,
            y: 0.5
          }, {
            x: 0.5,
            y: 1
          }
        ], [
          {
            x: 1,
            y: 0
          }, {
            x: 0.5,
            y: 0.5
          }, {
            x: 1,
            y: 1
          }
        ]
      ];
      return this.back = this.make_button('back', 'svg:polyline', points);
    };

    PlaybackComponent.prototype.init_forward_button = function() {
      var points;
      points = [
        [
          {
            x: 0.5,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0.5,
            y: 1
          }
        ], [
          {
            x: 0,
            y: 0
          }, {
            x: 0.5,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.forward = this.make_button('forward', 'svg:polyline', points);
    };

    PlaybackComponent.prototype.init_view = function() {
      this.svg = this.dom_element.append("svg:svg").attr("width", this.width).attr("height", this.height);
      this.init_reset_button();
      this.init_play_button();
      this.init_stop_button();
      this.init_forward_button();
      this.init_back_button();
      return this.hide(this.play);
    };

    PlaybackComponent.prototype.update_ui = function() {
      if (this.playable) {
        if (this.playable.playing) {
          this.hide(this.play);
          return this.show(this.stop);
        } else {
          this.hide(this.stop);
          return this.show(this.play);
        }
      }
    };

    PlaybackComponent.prototype.hide = function(thing) {
      return thing.style('visibility', 'hidden');
    };

    PlaybackComponent.prototype.show = function(thing) {
      return thing.style('visibility', 'visible');
    };

    return PlaybackComponent;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.PlaybackComponent = PlaybackComponent;

  root.ModelPlayer = ModelPlayer;

  PlaybackComponentSVG = (function() {

    function PlaybackComponentSVG(svg_element, playable, xpos, ypos, scale) {
      this.svg_element = svg_element;
      this.playable = playable != null ? playable : null;
      this.offsets = {
        'reset': 0,
        'back': 1,
        'play': 2,
        'stop': 2,
        'forward': 3
      };
      this.width = 200;
      this.height = 34;
      this.xpos = xpos;
      this.ypos = ypos;
      this.scale = scale || 1;
      this.unit_width = this.width / 9;
      this.vertical_padding = (this.height - this.unit_width) / 2;
      this.stroke_width = this.unit_width / 10;
      this.init_view();
    }

    PlaybackComponentSVG.prototype.offset = function(key) {
      return this.offsets[key] * (this.unit_width * 2) + this.unit_width;
    };

    PlaybackComponentSVG.prototype.make_button = function(button_name, type, point_set) {
      var art, button_group, point, points, points_string, x, y, _i, _j, _len, _len2,
        _this = this;
      button_group = this.group.append('svg:g');
      x = this.offset(button_name);
      button_group.attr('x', x).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width);
      for (_i = 0, _len = point_set.length; _i < _len; _i++) {
        points = point_set[_i];
        art = button_group.append(type);
        art.attr('class', "" + button_name + " button-art");
        points_string = "";
        for (_j = 0, _len2 = points.length; _j < _len2; _j++) {
          point = points[_j];
          x = this.offset(button_name) + point['x'] * this.unit_width;
          y = this.vertical_padding + point['y'] * this.unit_width;
          points_string = points_string + (" " + x + "," + y);
          art.attr('points', points_string);
        }
      }
      button_group.on('click', function() {
        return _this.action(button_name);
      });
      return button_group;
    };

    PlaybackComponentSVG.prototype.action = function(action) {
      console.log("running " + action + " ");
      if (this.playable) {
        switch (action) {
          case 'play':
            this.playable.play();
            break;
          case 'stop':
            this.playable.stop();
            break;
          case 'forward':
            this.playable.forward();
            break;
          case 'back':
            this.playable.back();
            break;
          case 'reset':
            this.playable.seek(1);
            break;
          default:
            console.log("cant find action for " + action);
        }
      } else {
        console.log("no @playable defined");
      }
      return this.update_ui();
    };

    PlaybackComponentSVG.prototype.init_reset_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 0,
            y: 1
          }, {
            x: 1,
            y: 1
          }, {
            x: 1,
            y: 0
          }, {
            x: 0.25,
            y: 0
          }, {
            x: 0.5,
            y: 0.25
          }
        ]
      ];
      return this.reset = this.make_button('reset', 'svg:polyline', points);
    };

    PlaybackComponentSVG.prototype.init_play_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.play = this.make_button('play', 'svg:polygon', points);
    };

    PlaybackComponentSVG.prototype.init_stop_button = function() {
      var points;
      points = [
        [
          {
            x: 0,
            y: 0
          }, {
            x: 1,
            y: 0
          }, {
            x: 1,
            y: 1
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: 0
          }
        ]
      ];
      return this.stop = this.make_button('stop', 'svg:polygon', points);
    };

    PlaybackComponentSVG.prototype.init_back_button = function() {
      var points;
      points = [
        [
          {
            x: 0.5,
            y: 0
          }, {
            x: 0,
            y: 0.5
          }, {
            x: 0.5,
            y: 1
          }
        ], [
          {
            x: 1,
            y: 0
          }, {
            x: 0.5,
            y: 0.5
          }, {
            x: 1,
            y: 1
          }
        ]
      ];
      return this.back = this.make_button('back', 'svg:polyline', points);
    };

    PlaybackComponentSVG.prototype.init_forward_button = function() {
      var points;
      points = [
        [
          {
            x: 0.5,
            y: 0
          }, {
            x: 1,
            y: 0.5
          }, {
            x: 0.5,
            y: 1
          }
        ], [
          {
            x: 0,
            y: 0
          }, {
            x: 0.5,
            y: 0.5
          }, {
            x: 0,
            y: 1
          }
        ]
      ];
      return this.forward = this.make_button('forward', 'svg:polyline', points);
    };

    PlaybackComponentSVG.prototype.init_view = function() {
      this.svg = this.svg_element.append("svg:svg").attr("class", "component playbacksvg").attr("x", this.xpos).attr("y", this.ypos);
      this.group = this.svg.append("g").attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
      this.init_reset_button();
      this.init_play_button();
      this.init_stop_button();
      this.init_forward_button();
      this.init_back_button();
      return this.hide(this.play);
    };

    PlaybackComponentSVG.prototype.position = function(xpos, ypos, scale) {
      this.xpos = xpos;
      this.ypos = ypos;
      this.scale = scale || 1;
      this.svg.attr("x", this.xpos).attr("y", this.ypos);
      return this.group.attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
    };

    PlaybackComponentSVG.prototype.update_ui = function() {
      if (this.playable) {
        if (this.playable.playing) {
          this.hide(this.play);
          return this.show(this.stop);
        } else {
          this.hide(this.stop);
          return this.show(this.play);
        }
      }
    };

    PlaybackComponentSVG.prototype.hide = function(thing) {
      return thing.style('visibility', 'hidden');
    };

    PlaybackComponentSVG.prototype.show = function(thing) {
      return thing.style('visibility', 'visible');
    };

    return PlaybackComponentSVG;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.PlaybackComponentSVG = PlaybackComponentSVG;

  root.ModelPlayer = ModelPlayer;

  SliderComponent = (function() {

    function SliderComponent(dom_id, value_changed_function) {
      this.dom_id = dom_id != null ? dom_id : "#slider";
      this.value_changed_function = value_changed_function;
      this.dom_element = $(this.dom_id);
      this.dom_element.addClass('component').addClass('slider');
      this.precision = this.dom_element.attr('data-precision') || 3;
      this.min = this.dom_element.attr('data-min') || 0;
      this.max = this.dom_element.attr('data-max') || 1;
      this.value = this.dom_element.attr('data-value') || 0.5;
      this.label = this.dom_element.attr('data-label');
      this.mouse_down = false;
      this.width = this.dom_element.width();
      this.height = this.dom_element.height();
      this.init_view();
      this.init_mouse_handlers();
    }

    SliderComponent.prototype.horizontal_orientation = function() {
      if (this.width > this.height) return true;
    };

    SliderComponent.prototype.init_view = function() {
      var midpoint;
      this.slider_well = $('<div>').addClass('slider_well');
      this.dom_element.append(this.slider_well);
      midpoint = this.width / 2;
      this.y1 = this.height;
      this.y2 = 0;
      this.x1 = this.x2 = midpoint;
      if (this.horizontal_orientation()) {
        midpoint = this.height / 4;
        this.y1 = this.y2 = midpoint;
        this.x1 = 0;
        this.x2 = this.width;
      }
      this.handle_y = (this.y1 + this.y2) / 2;
      this.handle_x = (this.x1 + this.x2) / 2;
      this.init_slider_fill();
      this.slider_well_height = this.slider_well.height();
      this.slider_well_width = this.slider_well.width();
      this.init_handle();
      return this.init_label();
    };

    SliderComponent.prototype.init_slider_fill = function() {
      this.slider_fill = $('<div>').addClass('slider_fill');
      this.slider_well.append(this.slider_fill);
      if (this.horizontal_orientation()) {
        this.slider_fill.addClass('horizontal');
      } else {
        this.slider_fill.addClass('vertical');
      }
      return this.update_slider_filled();
    };

    SliderComponent.prototype.update_slider_filled = function() {
      if (this.horizontal_orientation()) {
        return this.slider_fill.width("" + this.handle_x + "px");
      } else {
        return this.slider_fill.height("" + this.handle_y + "px");
      }
    };

    SliderComponent.prototype.init_handle = function() {
      this.handle = $('<div>').addClass('handle');
      this.slider_well.append(this.handle);
      this.handle_width = parseInt(this.handle.width());
      this.handle_height = parseInt(this.handle.height());
      this.handle_width_offset = (this.handle_width / 2) - (this.handle_width - this.slider_well_width) / 2;
      this.handle_height_offset = (this.handle_height / 2) - (this.handle_height - this.slider_well_height) / 2;
      return this.update_handle();
    };

    SliderComponent.prototype.update_handle = function() {
      return this.handle.css('left', "" + (this.handle_x - (this.handle_width / 2)) + "px").css('top', "" + (this.handle_y - this.handle_height_offset) + "px");
    };

    SliderComponent.prototype.init_label = function() {
      this.text_label = $('<div/>').addClass('label');
      this.dom_element.append(this.text_label);
      return this.update_label();
    };

    SliderComponent.prototype.scaled_value = function() {
      var results;
      results = this.value;
      results = results * (this.max - this.min);
      results = results + this.min;
      return results;
    };

    SliderComponent.prototype.update_label = function() {
      var fomatted_value;
      if (this.label) {
        fomatted_value = this.scaled_value().toFixed(this.precision);
        return this.text_label.text("" + this.label + ": " + fomatted_value);
      } else {
        return this.text_label.hide();
      }
    };

    SliderComponent.prototype.handle_mousedown = function(e) {
      var _this = this;
      this.dragging = true;
      $(document).bind("mouseup.drag", this.documentMouseUpDelegate = function(e) {
        return _this.handle_mouseup(e);
      });
      $(document).bind("mousemove.drag", this.documentMouseMoveDelegate = function(e) {
        return _this.handle_drag(e);
      });
      return this.handle_drag(e);
    };

    SliderComponent.prototype.handle_drag = function(e) {
      var max_x, min_x, x, y;
      if (this.dragging) {
        document.onselectstart = function() {
          return false;
        };
        x = e.pageX - this.slider_well.position().left;
        y = e.pageY - this.slider_well.position().top;
        if (this.horizontal_orientation()) {
          max_x = this.width - (this.handle_width / 4);
          min_x = this.handle_width / 4;
          this.handle_x = x;
          if (this.handle_x < min_x) this.handle_x = min_x;
          if (this.handle_x > max_x) this.handle_x = max_x;
          this.value = this.handle_x / this.width;
        } else {
          this.handle_y = e.y;
          this.handle.attr('cy', this.handle_y);
          this.slider_fill.attr("y", this.handle_y).attr("height", this.height - this.handle_y);
          this.value = this.handle_y / this.height;
        }
        if (typeof this.value_changed_function === 'function') {
          this.value_changed_function(this.scaled_value());
        }
        this.update_handle();
        this.update_slider_filled();
        return this.update_label();
      } else {
        return false;
      }
    };

    SliderComponent.prototype.handle_mouseup = function() {
      document.onselectstart = function() {
        return true;
      };
      if (this.dragging) {
        $(document).unbind("mousemove", this.documentMouseMoveDelegate);
        $(document).unbind("mouseup", this.documentMouseUpDelegate);
        this.dragging = false;
      }
      return true;
    };

    SliderComponent.prototype.init_mouse_handlers = function() {
      var _this = this;
      return this.slider_well.bind("mousedown", this.documentMouseUpDelegate = function(e) {
        return _this.handle_mousedown(e);
      });
    };

    return SliderComponent;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.SliderComponent = SliderComponent;

  Thermometer = (function() {

    function Thermometer(dom_id) {
      this.dom_id = dom_id != null ? dom_id : "#thermometer";
      this.dom_element = d3.select(this.dom_id).attr('class', 'thermometer');
      this.width = 1;
      this.height = 12;
      this.max = 0.7;
      this.samples = [];
      this.last_draw_time = new Date().getTime();
      this.sample_interval_ms = 250;
      this.last_draw_time -= this.sample_interval_ms;
      this.init_svg();
    }

    Thermometer.prototype.init_svg = function() {
      this.dom_element.style("border", "1px solid black");
      this.svg = this.dom_element.append("svg:svg").attr("width", this.width + "em").attr("height", this.height + "em").append("svg:g");
      this.thermometer = this.svg.append('svg:rect');
      this.thermometer.attr("width", this.width + "em");
      this.thermometer.attr("height", this.height + "em");
      this.thermometer.style("fill", "#f4b626");
      return d3.select('#therm_text').attr('class', 'therm_text');
    };

    Thermometer.prototype.time_to_redraw = function() {
      var timestamp;
      timestamp = new Date().getTime();
      return timestamp > this.last_draw_time + this.sample_interval_ms;
    };

    Thermometer.prototype.add_value = function(new_value) {
      this.samples.push(new_value);
      if (this.time_to_redraw()) {
        this.redraw();
        return this.samples = [];
      }
    };

    Thermometer.prototype.get_avg = function() {
      var sample, total, _i, _len, _ref;
      total = 0;
      _ref = this.samples;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        sample = _ref[_i];
        total = total + sample;
      }
      return total / this.samples.length;
    };

    Thermometer.prototype.scaled_display_value = function() {
      return (this.get_avg() / this.max) * this.height;
    };

    Thermometer.prototype.redraw = function() {
      var avg, value;
      avg = this.get_avg().toFixed(4);
      value = this.scaled_display_value();
      this.thermometer.attr("y", this.height - value + "em");
      this.thermometer.attr("height", value + "em");
      this.last_draw_time = new Date().getTime();
      return d3.select('#therm_text').text("Temperature");
    };

    return Thermometer;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.Thermometer = Thermometer;

}).call(this);
