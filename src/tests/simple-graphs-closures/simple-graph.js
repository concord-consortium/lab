registerKeyboardHandler = function(callback) {
  d3.select(window).on("keydown", callback);
};

function simpleGraph(elemid, options) {
  var cx = 600, cy = 300, elem;

  if (arguments.length) {
    elem = document.getElementById(elemid);
    cx = graph.clientWidth;
    cy = graph.clientHeight;
  }

  var vis, plot, title, xlabel, ylabel, points,
      options = options || {
        "xmax": 60, "xmin": 0,
        "ymax": 40, "ymin": 0, 
        "title": "Simple Graph1",
        "xlabel": "X Axis",
        "ylabel": "Y Axis"
      },
      padding = {
       "top":    options.title  ? 40 : 20,
       "right":                 30,
       "bottom": options.xlabel ? 60 : 10,
       "left":   options.ylabel ? 70 : 45
      },

      size = {
        "width":  cx - padding.left - padding.right,
        "height": cy - padding.top  - padding.bottom
      },

      xValue = function(d) { return d[0]; },
      yValue = function(d) { return d[1]; },

      xScale = d3.scale.linear()
        .domain([options.xmin, options.xmax])
        .range([0, size.width]),

      downx = Math.NaN,

      yScale = d3.scale.linear()
        .domain([options.ymax, options.ymin]).nice()
        .range([0, size.height]).nice(),

      downy = Math.NaN,

      dragged = null,
      selected = null,

      line = d3.svg.line()
          .x(function(d, i) { return xScale(points[i].x); })
          .y(function(d, i) { return yScale(points[i].y); }),

      xAxis = d3.svg.axis().scale(xScale).orient("bottom").tickSize(6, 0);

  function graph(selection) {
    selection.each(function() {

      if (this.clientWidth && this.clientHeight) {
        cx = this.clientWidth;
        cy = this.clientHeight;
        size.width  = cx - padding.left - padding.right;
        size.height = cy - padding.top  - padding.bottom;
      }

      fakeDataPoints();
      updateXScale();
      updateYScale();

      vis = d3.select(this).append("svg")
          .attr("width",  cx)
          .attr("height", cy)
          .append("g")
            .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
          .attr("width", size.width)
          .attr("height", size.height)
          .style("fill", "#EEEEEE")
          .attr("pointer-events", "all")
          .on("mousedown.drag", plot_drag)
          .on("touchstart.drag", plot_drag)
          .call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));

      vis.append("svg")
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height)
          .attr("class", "line")
          .append("path")
              .attr("class", "line")
              .attr("d", line(points));

      // add Chart Title
      if (options.title) {
        title = vis.append("text")
            .attr("class", "axis")
            .text(options.title)
            .attr("x", size.width/2)
            .attr("dy","-0.8em")
            .style("text-anchor","middle");
      }

      // Add the x-axis label
      if (options.xlabel) {
        xlabel = vis.append("text")
            .attr("class", "axis")
            .text(options.xlabel)
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy","2.4em")
            .style("text-anchor","middle");
      }

      // add y-axis label
      if (options.ylabel) {
        ylabel = vis.append("g").append("text")
            .attr("class", "axis")
            .text(options.ylabel)
            .style("text-anchor","middle")
            .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      d3.select(this)
          .on("mousemove.drag", mousemove)
          .on("touchmove.drag", mousemove)
          .on("mouseup.drag",   mouseup)
          .on("touchend.drag",  mouseup);

      redraw();
    });

    function fakeDataPoints() {
      var xrange =  (options.xmax - options.xmin),
          yrange2 = (options.ymax - options.ymin) / 2,
          yrange4 = yrange2 / 2,
          datacount = size.width/30;

      points = d3.range(datacount).map(function(i) {
        return { x: i * xrange / datacount, y: options.ymin + yrange4 + Math.random() * yrange2 };
      })
    }

    function keydown() {
      if (!selected) return;
      switch (d3.event.keyCode) {
        case 8:   // backspace
        case 46:  // delete
          var i = points.indexOf(selected);
          points.splice(i, 1);
          selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
          update();
          break;
      }
    }

    // update the layout
    function updateLayout() {
      padding = {
       "top":    options.title  ? 40 : 20,
       "right":                 30,
       "bottom": options.xlabel ? 60 : 10,
       "left":   options.ylabel ? 70 : 45
      };

      size.width  = cx - padding.left - padding.right;
      size.height = cy - padding.top  - padding.bottom;

      plot.attr("width", size.width)
          .attr("height", size.height);
    }

    // Update the x-scale.
    function updateXScale() {
      xScale.domain([options.xmin, options.xmax])
            .range([0, size.width]);
    }

    // Update the y-scale.
    function updateYScale() {
      yScale.domain([options.ymin, options.ymax])
            .range([size.height, 0]);
    }

    function redraw() {
      var tx = function(d) {
        return "translate(" + xScale(d) + ",0)";
      },
      ty = function(d) {
        return "translate(0," + yScale(d) + ")";
      },
      stroke = function(d) {
        return d ? "#ccc" : "#666";
      },
      fx = xScale.tickFormat(10),
      fy = xScale.tickFormat(10);

      // Regenerate x-ticks…
      var gx = vis.selectAll("g.x")
          .data(xScale.ticks(10), String)
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
          .attr("class", "axis")
          .attr("y", size.height)
          .attr("dy", "1em")
          .attr("text-anchor", "middle")
          .text(fx)
          .style("cursor", "ew-resize")
          .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
          .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
          .on("mousedown.drag",  xaxis_drag)
          .on("touchstart.drag", xaxis_drag);

      gx.exit().remove();

      // Regenerate y-ticks…
      var gy = vis.selectAll("g.y")
          .data(yScale.ticks(10), String)
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
          .attr("class", "axis")
          .attr("x", -3)
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .text(fy)
          .style("cursor", "ns-resize")
          .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
          .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
          .on("mousedown.drag",  yaxis_drag)
          .on("touchstart.drag", yaxis_drag);

      gy.exit().remove();
      plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));
      update();
    }

    function update() {
      var lines = vis.select("path").attr("d", line(points));

      var circle = vis.select("svg").selectAll("circle")
          .data(points, function(d) { return d; });

      circle.enter().append("circle")
          .attr("class", function(d) { return d === selected ? "selected" : null; })
          .attr("cx",    function(d) { return xScale(d.x); })
          .attr("cy",    function(d) { return yScale(d.y); })
          .attr("r", 10.0)
          .style("cursor", "ns-resize")
          .on("mousedown.drag",  datapoint_drag)
          .on("touchstart.drag", datapoint_drag);

      circle
          .attr("class", function(d) { return d === selected ? "selected" : null; })
          .attr("cx",    function(d) { return xScale(d.x); })
          .attr("cy",    function(d) { return yScale(d.y); });

      circle.exit().remove();

      if (d3.event && d3.event.keyCode) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    function plot_drag() {
      registerKeyboardHandler(keydown);
      d3.select('body').style("cursor", "move");
      if (d3.event.altKey) {
        var p = d3.svg.mouse(vis.node());
        var newpoint = {};
        newpoint.x = xScale.invert(Math.max(0, Math.min(size.width,  p[0])));
        newpoint.y = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
        points.push(newpoint);
        points.sort(function(a, b) {
          if (a.x < b.x) { return -1; }
          if (a.x > b.x) { return  1; }
          return 0;
        });
        selected = newpoint;
        update();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    function xaxis_drag(d) {
      document.onselectstart = function() { return false; };
      var p = d3.svg.mouse(vis[0][0]);
      downx = xScale.invert(p[0]);
    }

    function yaxis_drag(d) {
      document.onselectstart = function() { return false; };
      var p = d3.svg.mouse(vis[0][0]);
      downy = yScale.invert(p[1]);
    }

    function datapoint_drag(d) {
      registerKeyboardHandler(keydown);
      document.onselectstart = function() { return false; };
      selected = dragged = d;
      update();
    }

    function mousemove() {
      var p = d3.svg.mouse(vis[0][0]),
          changex, changey, new_domain,
          t = d3.event.changedTouches;

      if (dragged) {
        dragged.y = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
        update();
      }

      if (!isNaN(downx)) {
        d3.select('body').style("cursor", "ew-resize");
        var rupx = xScale.invert(p[0]),
            xaxis1 = xScale.domain()[0],
            xaxis2 = xScale.domain()[1],
            xextent = xaxis2 - xaxis1;
        if (rupx !== 0) {
          changex = downx / rupx;
          new_domain = [xaxis1, xaxis1 + (xextent * changex)];
          xScale.domain(new_domain);
          redraw();
        }
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }

      if (!isNaN(downy)) {
        d3.select('body').style("cursor", "ns-resize");
        var rupy = yScale.invert(p[1]),
            yaxis1 = yScale.domain()[1],
            yaxis2 = yScale.domain()[0],
            yextent = yaxis2 - yaxis1;
        if (rupy !== 0) {
          changey = downy / rupy;
          new_domain = [yaxis2, yaxis2 - yextent * changey];
          yScale.domain(new_domain);
          redraw();
        }
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    function mouseup() {
      document.onselectstart = function() { return true; };
      d3.select('body').style("cursor", "auto");
      d3.select('body').style("cursor", "auto");
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
      if (dragged) {
        dragged = null;
      }
    }

    // make these private function available
    graph.redraw = redraw;
    graph.updateXScale = updateXScale;
    graph.updateYScale = updateYScale;

  }

  // update the title
  function updateTitle() {
    if (options.title && title) {
      title.text(options.title);
    }
  }

  // update the x-axis label
  function updateXlabel() {
    if (options.xlabel && xlabel) {
      xlabel.text(options.xlabel);
    }
  }

  // update the y-axis label
  function updateYlabel() {
    if (options.ylabel && ylabel) {
      ylabel.text(options.ylabel);
    } else {
      ylabel.style("display", "none");
    }
  }

  // The x-accessor for the path generator; xScale âˆ˜ xValue.
  function X(d) {
    return xScale(d[0]);
  }

  // The x-accessor for the path generator; yScale âˆ˜ yValue.
  function Y(d) {
    return yScale(d[1]);
  }

  function gRedraw() {
    redraw();
  }

  graph.options = function(_) {
    if (!arguments.length) return options;
    // options = _;
    return graph;
  };

  graph.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return graph;
  };

  graph.xmin = function(_) {
    if (!arguments.length) return options.xmin;
    options.xmin = _;
    if (graph.updateXScale) {
      graph.updateXScale();
      graph.redraw();
    }
    return graph;
  };

  graph.xmax = function(_) {
    if (!arguments.length) return options.xmax;
    options.xmax = _;
    if (graph.updateXScale) {
      graph.updateXScale();
      graph.redraw();
    }
    return graph;
  };

  graph.ymin = function(_) {
    if (!arguments.length) return options.ymin;
    options.ymin = _;
    if (graph.updateYScale) {
      graph.updateYScale();
      graph.redraw();
    }
    return graph;
  };

  graph.ymax = function(_) {
    if (!arguments.length) return options.ymax;
    options.ymax = _;
    if (graph.updateYScale) {
      graph.updateYScale();
      graph.redraw();
    }
    return graph;
  };

  graph.xLabel = function(_) {
    if (!arguments.length) return options.xlabel;
    options.xlabel = _;
    updateXlabel();
    return graph;
  };

  graph.yLabel = function(_) {
    if (!arguments.length) return options.ylabel;
    options.ylabel = _;
    updateYlabel();
    return graph;
  };

  graph.title = function(_) {
    if (!arguments.length) return options.title;
    options.title = _;
    updateTitle();
    return graph;
  };

  graph.width = function(_) {
    if (!arguments.length) return size.width;
    size.width = _;
    return graph;
  };

  graph.height = function(_) {
    if (!arguments.length) return size.height;
    size.height = _;
    return graph;
  };

  graph.x = function(_) {
    if (!arguments.length) return xValue;
    xValue = _;
    return graph;
  };

  graph.y = function(_) {
    if (!arguments.length) return yValue;
    yValue = _;
    return graph;
  };

  return graph;
}
