//
// lab.js
//

lab = {};

(function(){
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
      mw = size.width,
      mh = size.height,
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
          .x(function(d, i) { return x(surface_temperature[i][0]); })
          .y(function(d, i) { return y(surface_temperature[i][1]); }),

      // drag x-axis logic
      downscaley = y.copy(),
      downy = Math.NaN,
      dragged = null,
      selected = surface_temperature[0];

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
          .attr("d", line(surface_temperature))

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
    var lines = vis.select("path").attr("d", line(surface_temperature)),
        x_extent = x.domain()[1] - x.domain()[0];
        
    var circle = vis.select("svg").selectAll("circle")
        .data(surface_temperature, function(d) { return d; });

    circle.enter().append("svg:circle")
        .attr("class", function(d) { return d === selected ? "selected" : null; })
        .attr("cx",    function(d) { return x(d[0]); })
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
(function(){
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

molecules_coulomb.energy = function(distance, q1, q2) {
  return -ke_constant * ((q1 * q2) / distance);
};
// ------------------------------------------------------------
//
// Lennard-Jones potentional and forces
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
  return molecules_lennard_jones.coefficients(e, sigma)
};

molecules_lennard_jones.sigma = function(s) {
  return molecules_lennard_jones.coefficients(epsilon, s)
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
  return (alpha/Math.pow(distance, 12) - beta/Math.pow(distance, 6)) * -1
};

molecules_lennard_jones.force = function(distance) {
  return (12*alpha/Math.pow(distance, 13) - 6*beta/Math.pow(distance, 7))
};
//
// modeler.js
//
//

modeler = {};
modeler.layout = {};
modeler.VERSION = '0.1.0';

modeler.layout.model = function() {
  var model = {},
      atoms = [],
      mol_number,
      event = d3.dispatch("tick"),
      size = [1, 1],
      temperature_control,
      lennard_jones_forces, coulomb_forces,
      ke, pe,
      ave_speed, speed_goal, speed_factor,
      ave_speed_max, ave_speed_min,
      speed_max_pos, speed_max_neg,
      drag,
      stopped = true,
      friction = .9,
      charge = -0.1,
      gravity = .1,
      theta = .8,
      interval,
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = 0,
      new_step = false,
      forces,
      epsilon, sigma,
      max_ljf_repulsion = -200.0,
      min_ljf_attraction = 0.001,
      max_ljf_distance,
      min_ljf_distance,
      max_coulomb_force = 20.0,
      min_coulomb_force = 0.01,
      max_coulomb_distance,
      min_coulomb_distance,
      integration_steps = 50,
      dt = 1/integration_steps,
      dt2 = dt * dt,
      overlap,
      pressure, pressures = [0],
      sample_time, sample_times = [];

  //
  // Individual property arrays for the nodes
  //
  var radius, px, py, x, y, vx, vy, speed, ax, ay, halfmass, charge;
  
  //
  // Indexes into the nodes array for the individual node property arrays
  //
  // Created as variables for faster access within this module and
  // as object properties for use outside this module.
  // 
  
  var _radius   =  0;
  var _px       =  1;
  var _py       =  2;
  var _x        =  3;
  var _y        =  4;
  var _vx       =  5;
  var _vy       =  6;
  var _speed    =  7;
  var _ax       =  8;
  var _ay       =  9;
  var _halfmass = 10;
  var _charge   = 11;

  model.RADIUS   = 0;
  model.PX       = 1;
  model.PY       = 2;
  model.X        = 3;
  model.Y        = 4;
  model.VX       = 5;
  model.VY       = 6;
  model.SPEED    = 7;
  model.AX       = 8;
  model.AY       = 9;
  model.HALFMASS = 10;
  model.CHARGE   = 11;

  //
  // Number of individual properties for a node
  //
  var node_properties_length = 12;

  //
  // A two dimensional array consisting of arrays of node property values
  //
  var nodes = arrays.create(node_properties_length, null, "regular");

  //
  // Extract one node from the nodes arrays and return as an object
  //
  function generate_atom(i) {
    var o = {};
    o.index  = i,
    o.radius = nodes[_radius  ][i];
    o.px     = nodes[_px      ][i];
    o.py     = nodes[_py      ][i];
    o.x      = nodes[_x       ][i];
    o.y      = nodes[_y       ][i];
    o.vx     = nodes[_vx      ][i];
    o.vy     = nodes[_vy      ][i];
    o.speed  = nodes[_speed   ][i];
    o.ax     = nodes[_ax      ][i];
    o.ay     = nodes[_ay      ][i];
    o.mass   = nodes[_halfmass][i]*2;
    o.charge = nodes[_charge][i];
    return o
  }

  function update_atoms() {
    var i, n = mol_number, results = [];
    i = -1; while (++i < n) {
      atoms[i] = generate_atom(i)
    }
    atoms.length = n;
  }

  //
  // The temperature_to_speed(t) function is used to map temperatures in abstract units
  // within a range of 0..10 to a goal for the average speed per atom for the system of atoms. 
  //
  // Currently all atoms are unit mass. The mass property is saved as 'halfmass' -- mass/2.
  //
  // Increasing the number of atoms while keeping the average speed for an atom 
  // the same will increase the total KE for the system.
  //
  // The constant Math.E/2 used below is just an empirically derived
  // number and has no specific analytic provenance.
  //
  function temperature_to_speed(t) {
    return 0.0050 * Math.pow(Math.E/2, t);
  }
  
  //
  // Calculate the minimum and maximum distances for applying lennard-jones forces
  //
  function setup_ljf_limits() {
    var i, f;
    for (i = 0; i <= 100; i+=0.001) {
      f = molecules_lennard_jones.force(i);
      if (f > max_ljf_repulsion) {
        min_ljf_distance = i;
        break;
      }
    }

    for (;i <= 100; i+=0.001) {
      f = molecules_lennard_jones.force(i);
      if (f > min_ljf_attraction) {
        break;
      }
    }

    for (;i <= 100; i+=0.001) {
      f = molecules_lennard_jones.force(i);
      if (f < min_ljf_attraction) {
        max_ljf_distance = i;
        break;
      }
    }
  }

  //
  // Calculate the minimum and maximum distances for applying coulomb forces
  //
  function setup_coulomb_limits() {
    var i, f;
    for (i = 0.001; i <= 100; i+=0.001) {
      f = molecules_coulomb.force(i, -1, 1);
      if (f < max_coulomb_force) {
        min_coulomb_distance = i;
        break;
      }
    }

    for (;i <= 100; i+=0.001) {
      f = molecules_coulomb.force(i, -1, 1);
      if (f < min_coulomb_force) {
        break;
      }
    }
    max_coulomb_distance = i;
  }

  function run_tick() {
    var n = nodes[0].length,
        q,
        i, // current index
        j, // alternate member of force-pair index
        s, // current source
        t, // current target
        l, // current distance
        k, // current force
        t, // current system time
        r2, r6i,
        ljf, coul, xf, yf,
        dx, dy, mag2,
        initial_x, initial_y,
        iloop,
        leftwall   = radius[0],
        bottomwall = radius[0],
        rightwall  = size[0] - radius[0],
        topwall    = size[1] - radius[0];
  
    //
    // Loop through this inner processing loop 'integration_steps' times:
    //
    pressure = 0;
    iloop = -1; 
    while(++iloop < integration_steps) {

      //
      // Use a Verlet integration to continue particle movement integrating acceleration with 
      // existing position and previous position while managing collision with boundaries.
      //
      // Update positions for first half of verlet integration
      // 
      i = -1; while (++i < n) {
        initial_x = x[i];
        initial_y = y[i];

        x[i]  += vx[i] * dt + 0.5 * dt2 * ax[i];
        y[i]  += vy[i] * dt + 0.5 * dt2 * ay[i];
        vx[i] += 0.5 * dt * ax[i];
        vy[i] += 0.5 * dt * ay[i]

        dx = x[i] - initial_x;
        dy = y[i] - initial_y;
        l = Math.sqrt(dx * dx + dy * dy);
        speed[i] = l;
        if (x[i] < leftwall) {
          x[i] = leftwall + (leftwall - x[i]);
          px[i] = x[i] + dx;
          py[i] = initial_y;
          vx[i] *= -1;
          pressure += speed[i];
        } else if (x[i] > rightwall) {
          x[i] = rightwall + (rightwall - x[i]);
          px[i] = x[i] + dx;
          py[i] = initial_y;
          vx[i] *= -1;
          pressure += speed[i];
        } else if (y[i] < bottomwall) {
          y[i] = bottomwall + (bottomwall - y[i]);
          py[i] = y[i] + dy;
          px[i] = initial_x;
          vy[i] *= -1;
          pressure += speed[i];
        } else if (y[i] > topwall) {
          y[i] = topwall + (topwall - y[i]);
          py[i] = y[i] + dy;
          px[i] = initial_x;
          vy[i] *= -1;
          pressure += speed[i];
        } else {
          px[i] = initial_x;
          py[i] = initial_y;
        }
      }
      
      // zero-out the acceleration
      i = -1; while (++i < n) {
        ax[i] = 0;
        ay[i] = 0;
      }
      
      //
      // Use brute-force technique to calculate lennard-jones and coulomb forces
      //
      if (lennard_jones_forces || coulomb_forces) {
        i = -1; while (++i < n) {
          j = i; while (++j < n) {
            dx = x[j] - x[i]
            dy = y[j] - y[i]
            r2 = dx * dx + dy * dy;
            l = Math.sqrt(r2);
            if (lennard_jones_forces && l < max_ljf_distance) { 
              ljf  = Math.max(max_ljf_repulsion, molecules_lennard_jones.force(l));
              // alternate way to calculate ljf ...
              // http://www.pages.drexel.edu/~cfa22/msim/node28.html
              // http://www.pages.drexel.edu/~cfa22/msim/codes/mdlj.c
              // r6i   = 1.0/(r2*r2);
              // ljf     = 48*(r6i*r6i-0.5*r6i);
              // e    += 4*(r6i*r6i - r6i) - (shift?ecut:0.0);
              // vir += 48*(r6i*r6i-0.5*r6i);
              xf = dx / l * ljf;
              yf = dy / l * ljf;
              ax[i] += xf;
              ay[i] += yf;
              ax[j] -= xf;
              ay[j] -= yf;
            }
            if (coulomb_forces && l < max_coulomb_distance) { 
              coul  = Math.min(max_coulomb_force, molecules_coulomb.force(l, charge[i], charge[j]));
              pe +=  molecules_coulomb.energy(l, charge[i], charge[j]);
              xf = dx / l * coul;
              yf = dy / l * coul;
              ax[i] += xf;
              ay[i] += yf;
              ax[j] -= xf;
              ay[j] -= yf;
            }
          }
        }
      }

      //
      // Dynamically adjust 'temperature' of system.
      //
      if (temperature_control) {
        ave_speed = average_speed();
        ave_speed_max = speed_goal * 1.1;
        ave_speed_min = speed_goal * 0.9;
        speed_max = speed_goal * 2;
        speed_max_one_percent = speed_max * 0.01;
        speed_min = speed_goal * 0.5;
        speed_min_one_percent = speed_min * 0.01;
        i = -1; while (++i < n) {
          if (ave_speed > ave_speed_max) {
            // If the average speed for an atom is greater than 110% of the speed_goal
            // proportionately reduce the acceleration
            ax[i] *= 0.5;
            ay[i] *= 0.5;
      
            // And if the speed for this atom is greater than speed_max reduce the
            // velocity of the atom by creating a new, closer previous position.
            if (speed[i] > speed_max) {
              speed_factor = speed_max/speed[i];
              vx[i] *= speed_factor;
              vy[i] *= speed_factor;
              speed[i] = speed_max - (Math.random() * speed_max_one_percent)
              px[i] = x[i] - vx[i];
              py[i] = y[i] - vy[i];
            }
          } 
      
          else if (ave_speed < ave_speed_min) {
            // If the average speed for an atom is less than 90% of the speed_goal
            // proportionately increase the acceleration.
            ax[i] *= 2.0;
            ay[i] *= 2.0;
      
            // And if the speed for this atom is less than speed_min increase the 
            // velocity of the atom by creating a new previous position further away.
            if (speed[i] < speed_min) {
              speed_factor = speed_min/speed[i];
              vx[i] *= speed_factor;
              vy[i] *= speed_factor;
              speed[i] = speed_min +  (Math.random() * speed_min_one_percent);
              px[i] = x[i] - vx[i];
              py[i] = y[i] - vy[i];
            }
          }
        }
      }

      //
      // Complete second-half of the velocity-verlet integration with updated force values
      i = -1; while (++i < n) {
        vx[i] += 0.5 * dt * ax[i];
        vy[i] += 0.5 * dt * ay[i];
      }
    }
  }

  //
  // Main Model Integration Loop
  //
  function tick() {
    run_tick();
    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    // ave_speed = average_speed();
    calculate_kinetic_and_potential_energy();
    update_atoms();
    tick_history_list_push();
    if (!stopped) { 
      t = Date.now();
      if (sample_time) {
        sample_time  = t - sample_time
        if (sample_time) { sample_times.push(sample_time) };
        sample_time = t;
        sample_times.splice(0, sample_times.length - 128);
      } else {
        sample_time = t;
      }
      event.tick({type: "tick"}); 
    } else {
      
    }
    return stopped
  }
  
  function reset_tick_history_list() {
    tick_history_list = [];
    tick_history_list_index = 0;
    tick_counter = -1;
  }
  
  function tick_history_list_reset_to_ptr() {
    tick_history_list.length = tick_history_list_index + 1
  }
  
  function tick_history_list_push() {
    var i, j, 
        newnode, newnodes = [], 
        n=nodes.length;
    i = -1; while(++i < n) {
      newnodes[i] = arrays.clone(nodes[i])
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({ nodes: newnodes, ke:ke });
    if (tick_history_list_index > 1000) {
      tick_history_list.splice(0,1)
      tick_history_list_index = 1000
    } 
  }
  
  function tick_history_list_extract(index) {
    var i, n=nodes.length;
    if (index < 0) {
      throw new Error("modeler: request for tick_history_list[" + index + "]")
    };
    if (index >= (tick_history_list.length)) {
      throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length)
    };
    i = -1; while(++i < n) {
      arrays.copy(tick_history_list[index].nodes[i], nodes[i])
    }
    ke = tick_history_list[index].ke;
    update_atoms();
  }

  function set_speed(newspeed) {
    var i, change, n = nodes[0].length;
    i = -1; while (++i < n) {
      change = newspeed/speed[i];
      vx[i] = (x[i] - px[i]) * change;
      vy[i] = (y[i] - py[i]) * change;
      px[i] += vx[i];
      py[i] += vy[i];
      speed[i] = newspeed;
    }
  }
  
  function change_speed(factor) {
    var i, n = nodes[0].length;
    i = -1; while (++i < n) {
      vx[i] = (x[i] - px[i]) * factor;
      vy[i] = (y[i] - py[i]) * factor;
      px[i] += vx[i];
      py[i] += vy[i];
      speed[i] *- factor;
    }
  }
  
  function cap_speed(capspeed) {
    var i, change, n = nodes[0].length;
    i = -1; while (++i < n) {
      if (speed[i] > capspeed) {
        change = capspeed/speed[i];
        vx[i] = (x[i] - px[i]) * change;
        vy[i] = (y[i] - py[i]) * change;
        px[i] += vx[i];
        py[i] += vy[i];
        speed[i] = capspeed;
      }
    }
  }
  
  function set_acc(acc) {
    var i, n = nodes[0].length;
    i = -1; while (++i < n) {
      ax[i] = acc;
      ay[i] = acc;
    }
  }
  
  function container_pressure() {
    return pressures.reduce(function(j,k) { return j+k })/pressures.length
  }
  
  function speed_history(speeds) {
    if (arguments.length) {
      speed_history.push(speeds);
      // limit the pressures array to the most recent 16 entries
      speed_history.splice(0, speed_history.length - 100)
    } else {
      return speed_history.reduce(function(j,k) { return j+k })/pressures.length
    }
  }

  function calculate_kinetic_and_potential_energy() {
    var i, s, k, fx, fy, p, n = nodes[0].length;
    ke = 0;
    pe = 0;
    i = -1; while (++i < n) { 
      s = speed[i];
      k =  s * s * halfmass[i];
      ke += k;
      fx = ax[i];
      fy = ay[i];
      p = fx + fx;
      pe += p;
    }
  }
  
  // 
  function potential_energy() {
    var i, fx, fy, p, n = nodes[0].length;
    pe = 0;
    i = -1; while (++i < n) { 
      fx = ax[i];
      fy = ay[i];
      p = Math.sqrt(fx * fx + fy * fy);
      pe += p;
    }
    return pe;
  }
  
  // currently the nodes are all unit mass
  function kinetic_energy() {
    var i, s, k, n = nodes[0].length;
    ke = 0;
    i = -1; while (++i < n) { 
      s = speed[i];
      k =  s * s * halfmass[i];
      ke += k;
    }
    return ke;
  }

  function average_speed() {
    var i, s = 0, n = nodes[0].length;
    i = -1; while (++i < n) { s += speed[i] }
    return s/n;
  }

  function average_rate() {
    var i, ave, s = 0, n = sample_times.length;
    i = -1; while (++i < n) { s += sample_times[i] }
    ave = s/n;
    return (ave ? 1/ave*1000: 0)
  }

  function resolve_collisions(annealing_steps) {
    var i; save_temperature_control = temperature_control;
    temperature_control = true;
    i = -1; while (++i < annealing_steps) {
      run_tick();
    }
    temperature_control = save_temperature_control;
    update_atoms();
  }

  function set_temperature(t) {
    temperature = t;
    speed_goal = temperature_to_speed(temperature);
  }

  // ------------------------------------------------------------
  //
  // Public functions
  //
  // ------------------------------------------------------------
  
  model.getStats = function() {
    var stats;
    stats = { speed: average_speed(),
              ke: ke,
              temperature: temperature,
              pressure: container_pressure(),
              current_step: tick_counter,
              steps: tick_history_list.length-1
            };
    return stats;
  }

  model.stepCounter = function() {
    return tick_counter
  }

  model.steps = function() {
    return tick_history_list.length-1
  }

  model.isNewStep = function() {
    return new_step
  }

  model.stepBack = function(num) {
    if (!arguments.length) { var num = 1 };
    var i = -1;
    stopped = true;
    new_step = false;
    while(++i < num) {    
      if (tick_history_list_index > 1) {
        tick_history_list_index--;
        tick_counter--;
        tick_history_list_extract(tick_history_list_index-1);
        if (model_listener) { model_listener() };
      }
    };
    return tick_counter
  }
  
  model.stepForward = function(num) {
    if (!arguments.length) { var num = 1 };
    var i = -1;
    stopped = true;
    while(++i < num) {    
      if (tick_history_list_index < (tick_history_list.length)) {
        tick_history_list_extract(tick_history_list_index)
        tick_history_list_index++;
        tick_counter++
        if (model_listener) { model_listener() };
      } else {
        tick();
        if (model_listener) { model_listener() };
      }
    }
    return tick_counter
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
    if (!arguments.length) { var num = 1 };
    var i = -1;
    while(++i < num) {
      tick();
    }
    return model;
  };

  model.set_lj_coefficients = function(e, s) {
    // am not using the coefficients beyond setting the ljf limits yet ...
    epsilon = e;
    sigma = s;
    setup_ljf_limits();
    return model;
  };

  model.getEpsilon = function() {
    return epsilon;
  },

  model.getSigma = function() {
    return sigma;
  },

  model.set_radius = function(r) {
    var i, n = nodes[0].length;
    i = -1; while(++i < n) { radius[i] = r };
    update_atoms();
  }

  model.get_speed = function(speed_data) {
    if (!arguments.length) { var speed_data = [] };
    return arrays.copy(speed, speed_data);
  }
  
  model.get_rate = function() {
    return average_rate();
  }

  model.set_temperature_control = function(tc) {
   temperature_control = tc;
  }

  model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
  }

  model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
  }

  model.get_atoms = function() {
    return atoms;
  }

  model.initialize = function(options) {
    var options = options || {},
        i, j, k, o,
        radius, px, py, x, y, vx, vy, speed, ax, ay,
        _radius, _px, _py, _x, _y, _vx, _vy, _speed, _ax, _ay,
        n = nodes[0].length,
        w = size[0], h = size[1],
        temperature = 4,
        annealing_steps = 25,
        speed_goal,
        max_ljf_repulsion, min_ljf_attraction,
        max_ljf_distance, min_ljf_distance;

        // mention the functions so they get into the containing closure:
        generate_atom, update_atoms,
        tick,
        reset_tick_history_list,
        tick_history_list_reset_to_ptr,
        tick_history_list_push,
        tick_history_list_extract,
        set_speed,
        change_speed,
        cap_speed,
        set_acc,
        container_pressure,
        speed_history,
        potential_energy,
        kinetic_energy,
        average_speed,
        resolve_collisions,
        set_temperature;

    lennard_jones_forces = options.lennard_jones_forces || true;
    coulomb_forces = options.coulomb_forces || true;
    model_listener = options.model_listener || false;
    temperature_control = options.temperature_control || false;

    reset_tick_history_list();
    speed_goal = temperature_to_speed(temperature);
    setup_ljf_limits();
    setup_coulomb_limits();
    resolve_collisions(annealing_steps);
    // pressures.push(pressure);
    // pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries
    ave_speed = average_speed();
    ke = kinetic_energy();
    pe = potential_energy();
    tick_history_list_push();
    return model
  };

  model.nodes = function(options) {
    var options = options || {},
        num = options.num || 50, 
        xdomain = options.xdomain || 100, 
        ydomain = options.ydomain || 100, 
        temperature = options.temperature || 3, 
        rmin = options.rmin || 4.4, 
        mol_rmin_radius_factor = options.mol_rmin_radius_factor || 0.38,
        dAngle;

    mol_number = num;

    nodes = arrays.create(node_properties_length, null, "regular");
    
    var webgl = !!window.WebGLRenderingContext;
    var not_safari = benchmark.what_browser.browser != "Safari";
    
    var array_type = (webgl && not_safari) ? "Float32Array" : "regular";

    // model.RADIUS = 0
    nodes[model.RADIUS] = arrays.create(num, rmin * mol_rmin_radius_factor, array_type);
    radius = nodes[model.RADIUS];

    // model.PX     = 1;
    nodes[model.PX] = arrays.create(num, 0, array_type);
    px = nodes[model.PX];

    // model.PY     = 2;
    nodes[model.PY] = arrays.create(num, 0, array_type);
    py = nodes[model.PY];

    // model.X      = 3;
    nodes[model.X] = arrays.create(num, 0, array_type);
    x = nodes[model.X];

    // model.Y      = 4;
    nodes[model.Y] = arrays.create(num, 0, array_type);
    y = nodes[model.Y];

    // model.VX     = 5;
    nodes[model.VX] = arrays.create(num, 0, array_type);
    vx = nodes[model.VX];

    // model.VY     = 6;
    nodes[model.VY] = arrays.create(num, 0, array_type);
    vy = nodes[model.VY];

    // model.SPEED  = 7;
    nodes[model.SPEED] = arrays.create(num, 0, array_type);
    speed = nodes[model.SPEED];

    // model.AX     = 8;
    nodes[model.AX] = arrays.create(num, 0, array_type);
    ax = nodes[model.AX];

    // model.AY     = 9;
    nodes[model.AY] = arrays.create(num, 0, array_type);
    ay = nodes[model.AY];

    // model.MASS     = 10;
    nodes[model.HALFMASS] = arrays.create(num, 0.5, array_type);
    halfmass = nodes[model.HALFMASS];

    // model.CHARGE   = 11;
    nodes[model.CHARGE] = arrays.create(num, 0, array_type);
    charge = nodes[model.CHARGE];

    // initialize particles with 0 net momentum by spacing initial velocities equally around a circle
    dTheta = 2*Math.PI / num;
    v0 = temperature_to_speed(temperature);
    
    i = -1; while (++i < num) {
        px[i] = Math.random() * xdomain * 0.8 + xdomain * 0.1;  // previous x
        py[i] = Math.random() * ydomain * 0.8 + ydomain * 0.1;  // previous y
        vx[i] = v0*Math.cos(dTheta*i);
        vy[i] = v0*Math.sin(dTheta*i);
         x[i] = vx[i] + px[i];
         y[i] = vy[i] + py[i];
     speed[i] = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);  // == v0
        ax[i] = 0;
        ay[i] = 0;
    charge[i] = 2*(i%2)-1;      // alternate negative and positive charges
        // speed_data.push(speed[i]);
    };
    update_atoms();
    return model
  }

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
    ke = ke || kinetic_energy();
    return ke
  };

  model.pe = function() {
    pe = pe || potential_energy();
    return pe
  };

  model.speed = function() {
    return average_speed();
  };

  model.pressure = function() {
    return container_pressure();
  };

  model.temperature = function(x) {
    if (!arguments.length) return temperature;
    set_temperature(x)
    return model;
  };

  model.links = function(x) {
    if (!arguments.length) return links;
    links = x;
    return model;
  };

  model.size = function(x) {
    if (!arguments.length) return size;
    size = x;
    return model;
  };

  model.linkDistance = function(x) {
    if (!arguments.length) return linkDistance;
    linkDistance = d3.functor(x);
    return model;
  };

  model.linkStrength = function(x) {
    if (!arguments.length) return linkStrength;
    linkStrength = d3.functor(x);
    return model;
  };

  model.friction = function(x) {
    if (!arguments.length) return friction;
    friction = x;
    return model;
  };

  model.charge = function(x) {
    if (!arguments.length) return charge;
    charge = typeof x === "function" ? x : +x;
    return model;
  };

  model.gravity = function(x) {
    if (!arguments.length) return gravity;
    gravity = x;
    return model;
  };

  model.theta = function(x) {
    if (!arguments.length) return theta;
    theta = x;
    return model;
  };

  return model;
};
})();
(function(){
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
// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

layout = { version: "0.0.1" };

layout.selection = "";

layout.setupScreen = function(layout_selection) {
  var fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;
  if(fullscreen) {
    switch (layout.selection) {
      case "simple-screen":
      layout.setupSimpleFullScreen();
      break;

      default:
      layout.setupFullScreen();
      break;
    }
  } else {
    switch (layout.selection) {
      case "simple-screen":
      layout.setupSimpleScreen();
      break;

      default:
      layout.setupRegularScreen();
      break;
    }
  }
  layout.setupTemperature();
  if (benchmarks_table) {
    benchmarks_table.style.display = "none";
  }
}

layout.setupFullScreen = function() {
  layout.setupFullScreenMoleculeContainer();
  layout.setupFullScreenPotentialChart();
  layout.setupFullScreenSpeedDistributionChart();
  layout.setupFullScreenKEChart();
}

layout.setupRegularScreen = function() {
  layout.setupRegularScreenMoleculeContainer();
  layout.setupRegularScreenPotentialChart();
  layout.setupRegularSpeedDistributionChart();
  layout.setupRegularScreenKEChart();
}

layout.setupSimpleScreen = function() {
  layout.setupSimpleMoleculeContainer();
  layout.setupDescriptionRight();
}

layout.setupSimpleFullScreen = function() {
  layout.setupSimpleFullScreenMoleculeContainer();
  layout.setupFullScreenDescriptionRight();
}

//
// Regular Screen Layout
//
layout.setupRegularScreenMoleculeContainer = function() {
  moleculecontainer.style.width = document.body.clientWidth * 0.45 +"px";
  moleculecontainer.style.height = document.body.clientWidth * 0.45 + 2 +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupRegularScreenPotentialChart = function() {
  lj_potential_chart.style.width = document.body.clientWidth * 0.25 +"px";
  lj_potential_chart.style.height = document.body.clientWidth * 0.20 +"px";
  finishSetupPotentialChart();
}

layout.setupRegularSpeedDistributionChart = function() {
  speed_distribution_chart.style.width = document.body.clientWidth * 0.25 +"px";
  speed_distribution_chart.style.height = document.body.clientWidth * 0.20 +"px";
  finishSetupSpeedDistributionChart();
}

layout.setupRegularScreenKEChart = function() {
  kechart.style.width = document.body.clientWidth * 0.50  + 5 +"px";
  kechart.style.height = document.body.clientWidth * 0.25 - 3 +"px";
  finishSetupKEChart();
}

// Full Screen Layout

layout.setupFullScreenMoleculeContainer = function() {
  moleculecontainer.style.width = screen.width * 0.48 +"px";
  moleculecontainer.style.height = screen.height * 0.80 + 3 + "px";
  finishSetupMoleculeContainer();
}

layout.setupFullScreenPotentialChart = function() {
  lj_potential_chart.style.width = screen.width * 0.22 +"px";
  lj_potential_chart.style.height = screen.height * 0.35 +"px";
  finishSetupPotentialChart();
}

layout.setupFullScreenSpeedDistributionChart = function() {
  speed_distribution_chart.style.width = screen.width * 0.22 +"px";
  speed_distribution_chart.style.height = screen.height * 0.35 +"px";
  finishSetupSpeedDistributionChart();
}

layout.setupFullScreenKEChart = function() {
  kechart.style.width = screen.width * 0.44 + 5 + "px";
  kechart.style.height = screen.height * 0.45 - 2 +"px";
  finishSetupKEChart();
}

// Simple Screen Layout

layout.setupSimpleMoleculeContainer = function() {
  moleculecontainer.style.width = document.body.clientWidth * 0.45 +"px";
  moleculecontainer.style.height = document.body.clientWidth * 0.45 + 2 +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupDescriptionRight = function() {
  var description_right = document.getElementById("description-right");
  var size = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
  description_right.style.fontSize = size + "px";
  description_right.style.fontSize = "16px";
  description_right.style.width = document.body.clientWidth * 0.35 +"px";
  description_right.style.height = document.body.clientWidth * 0.35 + 2 +"px";
}

// Simple Full Screen Layout

layout.setupSimpleFullScreenMoleculeContainer = function() {
  moleculecontainer.style.width = document.body.clientWidth * 0.55 +"px";
  moleculecontainer.style.height = document.body.clientWidth * 0.55 + 2 +"px";
  layout.finishSetupMoleculeContainer();
}

layout.setupFullScreenDescriptionRight = function() {
  var description_right = document.getElementById("description-right");
  var size = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
  description_right.style.fontSize = size * 1.5 + "px";
  description_right.style.width = document.body.clientWidth * 0.30 +"px";
  description_right.style.height = document.body.clientWidth * 0.30 + 2 +"px";
}

layout.getStyleForSelector = function(selector) {
    var rules = document.styleSheets[0].rules || document.styleSheets[0].cssRules
    for(var i = 0; i < rules.length; i++) {
        if (rules[i].selectorText == selector) {
          return rules[i]
        }
    }
    return false
};
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
    mc_vis, mc_plot;

layout.finishSetupMoleculeContainer = function() {
  mc_cx = moleculecontainer.clientWidth,
  mc_cy = moleculecontainer.clientHeight,
  mc_padding = {
     "top":    mc_graph.title  ? 36 : 20, 
     "right":                    30, 
     "bottom": mc_graph.xlabel ? 46 : 20,
     "left":   mc_graph.ylabel ? 60 : 45
  },
  mc_size = { 
    "width":  mc_cx - mc_padding.left - mc_padding.right, 
    "height": mc_cy - mc_padding.top  - mc_padding.bottom 
  },
  mc_mw = mc_size.width,
  mc_mh = mc_size.height,
  mc_tx = function(d) { return "translate(" + mc_x(d) + ",0)"; },
  mc_ty = function(d) { return "translate(0," + mc_y(d) + ")"; },
  mc_stroke = function(d) { return d ? "#ccc" : "#666"; }
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

    mc_vis.selectAll("g.x").remove();
    mc_vis.selectAll("g.y").remove();
    
    layout.update_molecule_radius();

    particle.attr("cx", function(d) { return mc_x(d.x); })
            .attr("cy", function(d) { return mc_y(d.y); })
            .attr("r",  function(d) { return mc_x(d.radius) });

    label.attr("transform", function(d) {
      return "translate(" + mc_x(d.x) + "," + mc_y(d.y) + ")";
    });

  } else {
    mc_vis = d3.select(moleculecontainer).append("svg:svg")
      .attr("width", mc_cx)
      .attr("height", mc_cy)
      .append("svg:g")
        .attr("transform", "translate(" + mc_padding.left + "," + mc_padding.top + ")");

    mc_plot = mc_vis.append("svg:rect")
      .attr("class", "mc_plot")
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .style("fill", "#EEEEEE");
      
    layout.mc_container = mc_vis.append("svg:svg")
      .attr("class", "mc_container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .attr("viewBox", "0 0 "+mc_size.width+" "+mc_size.height);

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
  }
  layout.mc_redraw()
};

layout.mc_redraw = function() {
  if (d3.event && d3.event.transform && isNaN(mc_downx) && isNaN(mc_downy)) {
      d3.event.transform(x, y);
  };

  var mc_fx = mc_x.tickFormat(10),
      mc_fy = mc_y.tickFormat(10);

  // Regenerate x-ticks…
  var mc_gx = mc_vis.selectAll("g.x")
      .data(mc_x.ticks(10), String)
      .attr("transform", mc_tx);

  mc_gx.select("text")
      .text(mc_fx);

  var mc_gxe = mc_gx.enter().insert("svg:g", "a")
      .attr("class", "x")
      .attr("transform", mc_tx);

  mc_gxe.append("svg:line")
      .attr("stroke", mc_stroke)
      .attr("y1", 0)
      .attr("y2", mc_size.height);

  mc_gxe.append("svg:text")
      .attr("y", mc_size.height)
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
      .text(mc_fx);

  mc_gx.exit().remove();

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

  mc_gye.append("svg:line")
      .attr("stroke", mc_stroke)
      .attr("x1", 0)
      .attr("x2", mc_size.width);

  mc_gye.append("svg:text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(mc_fy);

  mc_gy.exit().remove();
}

layout.update_molecule_radius = function() {
  var r = lj_graph.coefficients.rmin * mol_rmin_radius_factor;
  model.set_radius(r);
  layout.mc_container.selectAll("circle")
      .data(atoms)
    .attr("r",  function(d) { return mc_x(d.radius) });
  layout.mc_container.selectAll("text")
    .attr("font-size", mc_x(r * 1.3) );
}

var particle, label, labelEnter, tail;

var molecule_div = d3.select("#viz").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

var molecule_div_pre = molecule_div.append("pre")

layout.setup_particles = function() {
  var r = lj_graph.coefficients.rmin * mol_rmin_radius_factor;
  model.set_radius(r);
  
  layout.mc_container.selectAll("circle").remove();
  layout.mc_container.selectAll("g").remove();

  var font_size = mc_x(lj_graph.coefficients.rmin * mol_rmin_radius_factor * 1.3);
  if (mol_number > 100) { font_size *= 0.9 };

  label = layout.mc_container.selectAll("g.label")
        .data(atoms);

  labelEnter = label.enter().append("svg:g")
      .attr("class", "label")
      .attr("transform", function(d) {
        return "translate(" + mc_x(d.x) + "," + mc_y(d.y) + ")";
      });
  
  labelEnter.append("svg:text")
      .attr("class", "index")
      .attr("font-size", font_size)
      .attr("x", 0)
      .attr("y", "0.31em")
      .text(function(d) { return d.index; });

  particle = layout.mc_container.selectAll("circle").data(atoms);

  particle.enter().append("svg:circle")
      .attr("r",  function(d) { return mc_x(d.radius); })
      .attr("cx", function(d) { return mc_x(d.x); })
      .attr("cy", function(d) { return mc_y(d.y); })
      .style("fill", function(d, i) {
        if (layout.coulomb_forces_checkbox.checked) {
          return (mc_x(d.charge) > 0) ? "#2ca02c" : "#a02c2c"
        } else {
          return "#2ca02c"
        }
      })
      .on("mousedown", molecule_mousedown)
      .on("mouseout", molecule_mouseout);
}

function molecule_mouseover(d) {
  // molecule_div.transition()
  //       .duration(250)
  //       .style("opacity", 1);
}

function molecule_mousedown(d) {
  molecule_div
        .style("opacity", 1)
        .style("left", (d3.event.pageX + 6) + "px")
        .style("top", (d3.event.pageY - 30) + "px")
        .transition().duration(250);

  molecule_div_pre.text(
      "speed: " + d3.format("6.3f")(d.speed) + "\n" +
      "vx:    " + d3.format("6.3f")(d.vx)    + "\n" +
      "vy:    " + d3.format("6.3f")(d.vy)    + "\n"
    )
}

function molecule_mousemove(d) {
}

function molecule_mouseout() {
  molecule_div.style("opacity", 1e-6);
}

layout.update_molecule_positions = function() {
  label = layout.mc_container.selectAll("g.label").data(atoms);

  label.attr("transform", function(d) {
      return "translate(" + mc_x(d.x) + "," + mc_y(d.y) + ")";
    });

  particle = layout.mc_container.selectAll("circle").data(atoms);

  particle.attr("cx", function(d) { 
            return mc_x(d.x); })
          .attr("cy", function(d) { 
            return mc_y(d.y); })
          .attr("r",  function(d) { 
            return mc_x(d.radius) });
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

function finishSetupPotentialChart() {
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
    .domain([lj_graph.xmin, lj_graph.xmax])
    .range([0, lj_mw]),

  // drag x-axis logic
  lj_downx = Math.NaN,

  // y-scale (inverted domain)
  lj_y = d3.scale.linear()
      .domain([lj_graph.ymax, lj_graph.ymin])
      .nice()
      .range([0, lj_mh])
      .nice(),

  lj_line = d3.svg.line()
      .x(function(d, i) { return lj_x(lennard_jones_potential[i][0]); })
      .y(function(d, i) { return lj_y(lennard_jones_potential[i][1]); }),

  // drag x-axis logic
  lj_downy = Math.NaN,
  lj_dragged = null,
  lj_selected = lj_graph.variables[0],

  // drag coefficients logic
  coefficient_dragged, 
  coefficient_selected = lj_graph.variables[0];
  
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
      .call(d3.behavior.zoom().on("zoom", layout.lj_redraw))
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
  if (d3.event && d3.event.transform && isNaN(lj_downx) && isNaN(lj_downy)) {
      d3.event.transform(lj_x, lj_y);
  };

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
      .data(lj_graph.variables, function(d) { return d });

  var lj_lines = lj_vis.select("path").attr("d", lj_line(lennard_jones_potential)),
      lj_x_extent = lj_x.domain()[1] - lj_x.domain()[0];
      
  epsilon_circle.enter().append("svg:circle")
      .attr("class", function(d) { return d === coefficient_dragged ? "selected" : null; })
      .attr("cx",    function(d) { return lj_x(d.x); })
      .attr("cy",    function(d) { return lj_y(d.y); })
      .attr("r", 8.0)
      .on("mousedown", function(d) {
        if (d.coefficient == "epsilon") {
          d.x = lj_graph.coefficients.rmin;
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
    newx = lj_graph.coefficients.rmin;
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
  speed_data = [];
  model.get_speed(speed_data);
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

function finishSetupSpeedDistributionChart() {
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
      column_titles = ['index', 'px', 'py', 'x', 'y', 'vx', 'vy', 'ax', 'ay', 'speed', 'radius', 'mass', 'charge'],
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

  function add_molecule_data(row, m, el) {
    el = el || "td";
    var cells = row.getElementsByTagName(el);
    var i = -1; while (++i < cells.length) {
      cells[i].textContent = formatters[i](m[column_titles[i]])
    }
    i--; 
    while (++i < column_titles.length) {
      add_data(row, formatters[i](m[column_titles[i]]));
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
    add_molecule_data(datarows[i], atoms[i]);
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

layout.lennard_jones_forces_checkbox.onchange = lennardJonesInteractionHandler;

layout.coulomb_forces_checkbox = document.getElementById("coulomb-forces-checkbox");

function coulombForcesInteractionHandler() {
    if (layout.coulomb_forces_checkbox.checked) {
      model.set_coulomb_forces(true);
    } else {
      model.set_coulomb_forces(false);
    };
    layout.setup_particles()
};

layout.coulomb_forces_checkbox.onchange = coulombForcesInteractionHandler;
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
      "Time: "     + d3.format("5.2f")(model.stepCounter() * sample_time) + " (ns), " +
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
          cancel.call(document);
        } else {
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
})();
(function(){
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
            // graph.call(d3.behavior.zoom().on("zoom", redraw));
        }
        if (!isNaN(downy)) {
            redraw();
            downy = Math.NaN;
            d3.event.preventDefault();
            d3.event.stopPropagation();
            // graph.call(d3.behavior.zoom().on("zoom", redraw));
        }
        // d3.event.preventDefault();
        // d3.event.stopPropagation();
    });

  return graph;
};
})();
