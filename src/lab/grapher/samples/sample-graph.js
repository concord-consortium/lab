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
