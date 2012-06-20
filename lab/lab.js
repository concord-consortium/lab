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
grapher.axis = {
  axisProcessDrag: function(dragstart, currentdrag, domain) {
    var originExtent, maxDragIn,
        newdomain = domain,
        origin = 0,
        axis1 = domain[0],
        axis2 = domain[1],
        extent = axis2 - axis1;
    if (currentdrag !== 0) {
      if  ((axis1 >= 0) && (axis2 > axis1)) {                 // example: (20, 10, [0, 40]) => [0, 80]
        origin = axis1;
        originExtent = dragstart-origin;
        maxDragIn = originExtent * 0.2 + origin;
        if (currentdrag > maxDragIn) {
          change = originExtent / (currentdrag-origin);
          extent = axis2 - origin;
          newdomain = [axis1, axis1 + (extent * change)];
        }
      } else if ((axis1 < 0) && (axis2 > 0)) {                // example: (20, 10, [-40, 40])       => [-80, 80]
        origin = 0;                                           //          (-0.4, -0.2, [-1.0, 0.4]) => [-1.0, 0.4]
        originExtent = dragstart-origin;
        maxDragIn = originExtent * 0.2 + origin;
        if ((dragstart >= 0 && currentdrag > maxDragIn) || (dragstart  < 0  && currentdrag < maxDragIn)) {
          change = originExtent / (currentdrag-origin);
          newdomain = [axis1 * change, axis2 * change];
        }
      } else if ((axis1 < 0) && (axis2 < 0)) {                // example: (-60, -50, [-80, -40]) => [-120, -40]
        origin = axis2;
        originExtent = dragstart-origin;
        maxDragIn = originExtent * 0.2 + origin;
        if (currentdrag < maxDragIn) {
          change = originExtent / (currentdrag-origin);
          extent = axis1 - origin;
          newdomain = [axis2 + (extent * change), axis2];
        }
      }
    }
    return newdomain;
  }
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
grapher.graph = function(elem, options, message) {
  var cx = 600, cy = 300, 
      node;

  if (arguments.length) {
    elem = d3.select(elem);
    node = elem.node();
    cx = elem.property("clientWidth");
    cy = elem.property("clientHeight");
  }

  var svg, vis, plot, viewbox,
      title, xlabel, ylabel, xtic, ytic,
      notification,
      padding, size,
      xScale, yScale, xValue, yValue, line,
      circleCursorStyle,
      displayProperties,
      emsize, strokeWidth,
      scaleFactor,
      sizeType = {
        category: "medium",
        value: 3,
        icon: 120,
        tiny: 240,
        small: 480,
        medium: 960,
        large: 1920
      },
      downx = Math.NaN,
      downy = Math.NaN,
      dragged = null,
      selected = null,
      titles = [],
      default_options = {
        "xmax":            60,
        "xmin":             0,
        "ymax":            40,
        "ymin":             0, 
        "title":          "Simple Graph1",
        "xlabel":         "X Axis",
        "ylabel":         "Y Axis",
        "circleRadius":    10.0,
        "strokeWidth":      2.0,
        "dataChange":      true,
        "addData":         true,
        "points":          false,
        "notification":    false
      };

  initialize(options);

  function setupOptions(options) {
    if (options) {
      for(var p in default_options) {
        if (options[p] === undefined) {
          options[p] = default_options[p];
        }
      }
    } else {
      options = default_options;
    }
    return options;
  }

  function calculateSizeType() {
    if(cx <= sizeType.icon) {
      sizeType.category = 'icon';
      sizeType.value = 0;
    } else if (cx <= sizeType.tiny) {
      sizeType.category = 'tiny';
      sizeType.value = 1;
    } else if (cx <= sizeType.small) {
      sizeType.category = 'small';
      sizeType.value = 2;
    } else if (cx <= sizeType.medium) {
      sizeType.category = 'medium';
      sizeType.value = 3;
    } else if (cx <= sizeType.large) {
      sizeType.category = 'large';
      sizeType.value = 4;
    } else {
      sizeType.category = 'extralarge';
      sizeType.value = 5;
    }
  }

  function scale(w, h) {
    if (!arguments.length) {
      cx = elem.property("clientWidth");
      cy = elem.property("clientHeight");
    } else {
      cx = w;
      cy = h;
      node.style.width =  cx +"px";
      node.style.height = cy +"px";
    }
    calculateSizeType();
    displayProperties = layout.getDisplayProperties();
    emsize = displayProperties.emsize;
  }

  function initialize(newOptions, mesg) {
    if (newOptions || !options) {
      options = setupOptions(newOptions);
    }

    if (svg !== undefined) {
      svg.remove();
      svg = undefined;
    }

    if (mesg) {
      message = mesg;
    }

    if (options.dataChange) {
      circleCursorStyle = "ns-resize";
    } else {
      circleCursorStyle = "crosshair";
    }

    scale();

    options.xrange = options.xmax - options.xmin;
    options.yrange = options.ymax - options.ymin;

    options.datacount = 2;

    strokeWidth = options.strokeWidth;

    switch(sizeType.value) {
      case 0:
      padding = {
       "top":    4,
       "right":  4,
       "bottom": 4,
       "left":   4
      };
      break;

      case 1:
      padding = {
       "top":    8,
       "right":  8,
       "bottom": 8,
       "left":   8
      };
      break;

      case 2:
      padding = {
       "top":    options.title  ? 25 : 15,
       "right":  15,
       "bottom": 20,
       "left":   20
      };
      break;

      case 3:
      padding = {
       "top":    options.title  ? 30 : 20,
       "right":                   30,
       "bottom": options.xlabel ? 60 : 10,
       "left":   options.ylabel ? 70 : 45
      };
      break;

      default:
      padding = {
       "top":    options.title  ? 40 : 20,
       "right":                   30,
       "bottom": options.xlabel ? 60 : 10,
       "left":   options.ylabel ? 70 : 45
      };
      break;
    }

    if (Object.prototype.toString.call(options.title) === "[object Array]") {
      titles = options.title;
    } else {
      titles = [options.title];
    }
    titles.reverse();

    if (sizeType.value > 2 ) {
      padding.top += (titles.length-1) * sizeType.value/3 * sizeType.value/3 * emsize * 22;
    } else {
      titles = [titles[0]];
    }

    size = {
      "width":  cx - padding.left - padding.right,
      "height": cy - padding.top  - padding.bottom
    };

    xValue = function(d) { return d[0]; };
    yValue = function(d) { return d[1]; };

    xScale = d3.scale.linear()
      .domain([options.xmin, options.xmax])
      .range([0, size.width]);

    yScale = d3.scale.linear()
      .domain([options.ymax, options.ymin]).nice()
      .range([0, size.height]).nice();

    line = d3.svg.line()
        .x(function(d, i) { return xScale(points[i][0]); })
        .y(function(d, i) { return yScale(points[i][1]); });
  }

  function graph(selection) {
    if (!selection) { selection = elem; }
    selection.each(function() {

      elem = d3.select(this);

      if (this.clientWidth && this.clientHeight) {
        cx = this.clientWidth;
        cy = this.clientHeight;
        size.width  = cx - padding.left - padding.right;
        size.height = cy - padding.top  - padding.bottom;
      }

      points = options.points || fakeDataPoints();
      updateXScale();
      updateYScale();

      if (svg === undefined) {

        svg = elem.append("svg")
            .attr("width",  cx)
            .attr("height", cy);

        vis = svg.append("g")
              .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

        plot = vis.append("rect")
            .attr("class", "plot")
            .attr("width", size.width)
            .attr("height", size.height)
            .style("fill", "#EEEEEE")
            .attr("pointer-events", "all")
            .on("mousedown.drag", plot_drag)
            .on("touchstart.drag", plot_drag)
            .call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));

        viewbox = vis.append("svg")
            .attr("class", "viewbox")
            .attr("top", 0)
            .attr("left", 0)
            .attr("width", size.width)
            .attr("height", size.height)
            .attr("viewBox", "0 0 "+size.width+" "+size.height)
            .attr("class", "line");

        viewbox.append("path")
            .attr("class", "line")
            .style("stroke-width", strokeWidth)
            .attr("d", line(points));

        // add Chart Title
        if (options.title && sizeType.value > 1) {
          title = vis.selectAll("text")
            .data(titles, function(d) { return d; });
          title.enter().append("text")
              .attr("class", "title")
              .style("font-size", sizeType.value/2.4 * 100 + "%")
              .text(function(d) { return d; })
              .attr("x", size.width/2)
              .attr("dy", function(d, i) { return -0.5 + -1 * sizeType.value/2.8 * i * emsize + "em"; })
              .style("text-anchor","middle");
        }

        // Add the x-axis label
        if (options.xlabel && sizeType.value > 2) {
          xlabel = vis.append("text")
              .attr("class", "axis")
              .style("font-size", sizeType.value/2.6 * 100 + "%")
              .text(options.xlabel)
              .attr("x", size.width/2)
              .attr("y", size.height)
              .attr("dy","2.4em")
              .style("text-anchor","middle");
        }

        // add y-axis label
        if (options.ylabel && sizeType.value > 2) {
          ylabel = vis.append("g").append("text")
              .attr("class", "axis")
              .style("font-size", sizeType.value/2.6 * 100 + "%")
              .text(options.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
        }

        d3.select(node)
            .on("mousemove.drag", mousemove)
            .on("touchmove.drag", mousemove)
            .on("mouseup.drag",   mouseup)
            .on("touchend.drag",  mouseup);

        notification = vis.append("text")
            .attr("class", "graph-notification")
            .text(message)
            .attr("x", size.width/2)
            .attr("y", size.height/2)
            .style("text-anchor","middle");

      } else {

        vis
          .attr("width",  cx)
          .attr("height", cy);

        plot
          .attr("width", size.width)
          .attr("height", size.height);

        viewbox
            .attr("top", 0)
            .attr("left", 0)
            .attr("width", size.width)
            .attr("height", size.height)
            .attr("viewBox", "0 0 "+size.width+" "+size.height);

        if (options.title && sizeType.value > 1) {
            title.each(function(d, i) {
              d3.select(this).attr("x", size.width/2);
              d3.select(this).attr("dy", function(d, i) { return 1.4 * i - titles.length + "em"; });
            });
        }

        if (options.xlabel && sizeType.value > 1) {
          xlabel
              .attr("x", size.width/2)
              .attr("y", size.height);
        }

        if (options.ylabel && sizeType.value > 1) {
          ylabel
              .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
        }

        notification
          .attr("x", size.width/2)
          .attr("y", size.height/2);
      }
      redraw();
    });

    function notify(mesg) {
      // add Chart Notification
      if (mesg) {
        notification.text(mesg);
      } else {
        notification.text('');
      }
    }

    function fakeDataPoints() {
      var yrange2 = options.yrange / 2,
          yrange4 = yrange2 / 2,
          pnts;

      options.datacount = size.width/30;
      options.xtic = options.xrange / options.datacount;
      options.ytic = options.yrange / options.datacount;

      pnts = d3.range(options.datacount).map(function(i) {
        return [i * options.xtic + options.xmin, options.ymin + yrange4 + Math.random() * yrange2 ];
      });
      return pnts;
    }

    function keydown() {
      if (!selected) return;
      switch (d3.event.keyCode) {
        case 8:   // backspace
        case 46:  // delete
        if (options.dataChange) {
          var i = points.indexOf(selected);
          points.splice(i, 1);
          selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
          update();
        }
        if (d3.event && d3.event.keyCode) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
        }
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

      fx = xScale.tickFormat(d3.format(".3r")),
      fy = xScale.tickFormat(d3.format(".3r"));

      // Regenerate x-ticks…
      var gx = vis.selectAll("g.x")
          .data(xScale.ticks(10), String)
          .attr("transform", tx);

      gx.select("text").text(fx);

      var gxe = gx.enter().insert("g", "a")
          .attr("class", "x")
          .attr("transform", tx);

      gxe.append("line")
          .attr("stroke", stroke)
          .attr("y1", 0)
          .attr("y2", size.height);

      if (sizeType.value > 1) {
        gxe.append("text")
            .attr("class", "axis")
            .style("font-size", sizeType.value/2.7 * 100 + "%")
            .attr("y", size.height)
            .attr("dy", "1em")
            .attr("text-anchor", "middle")
            .text(fx)
            .style("cursor", "ew-resize")
            .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
            .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
            .on("mousedown.drag",  xaxis_drag)
            .on("touchstart.drag", xaxis_drag);
      }

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

      if (sizeType.value > 1) {
        gye.append("text")
            .attr("class", "axis")
            .style("font-size", sizeType.value/2.7 * 100 + "%")
            .attr("x", -3)
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .text(fy)
            .style("cursor", "ns-resize")
            .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
            .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
            .on("mousedown.drag",  yaxis_drag)
            .on("touchstart.drag", yaxis_drag);
      }

      gy.exit().remove();
      plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));
      update();
    }

    function update() {
      var lines = vis.select("path").attr("d", line(points));

      var circle = vis.select("svg").selectAll("circle")
          .data(points, function(d) { return d; });

      if (options.circleRadius && sizeType.value > 1) {
        if (!(options.circleRadius <= 4 && sizeType.value < 3)) {
          circle.enter().append("circle")
              .attr("class", function(d) { return d === selected ? "selected" : null; })
              .attr("cx",    function(d) { return xScale(d[0]); })
              .attr("cy",    function(d) { return yScale(d[1]); })
              .attr("r", options.circleRadius * (1 + sizeType.value) / 4)
              .style("stroke-width", options.circleRadius/6 * (sizeType.value - 1.5))
              .style("cursor", circleCursorStyle)
              .on("mousedown.drag",  datapoint_drag)
              .on("touchstart.drag", datapoint_drag);

          circle
              .attr("class", function(d) { return d === selected ? "selected" : null; })
              .attr("cx",    function(d) { return xScale(d[0]); })
              .attr("cy",    function(d) { return yScale(d[1]); })
              .attr("r", options.circleRadius * (1 + sizeType.value) / 4)
              .style("stroke-width", options.circleRadius/6 * (sizeType.value - 1.5));
        }
      }

      circle.exit().remove();

      if (d3.event && d3.event.keyCode) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    function plot_drag() {
      d3.event.preventDefault();
      grapher.registerKeyboardHandler(keydown);
      d3.select('body').style("cursor", "move");
      if (d3.event.altKey) {
        if (d3.event.shiftKey && options.addData) {
          var p = d3.svg.mouse(vis.node());
          var newpoint = [];
          newpoint[0] = xScale.invert(Math.max(0, Math.min(size.width,  p[0])));
          newpoint[1] = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
          points.push(newpoint);
          points.sort(function(a, b) {
            if (a[0] < b[0]) { return -1; }
            if (a[0] > b[0]) { return  1; }
            return 0;
          });
          selected = newpoint;
          update();
        } else {
          var p = d3.svg.mouse(vis[0][0]);
          downx = xScale.invert(p[0]);
          downy = yScale.invert(p[1]);
          dragged = false;
          d3.event.stopPropagation();
        }
        // d3.event.stopPropagation();
      }
    }

    function xaxis_drag(d) {
      document.onselectstart = function() { return false; };
      d3.event.preventDefault();
      var p = d3.svg.mouse(vis[0][0]);
      downx = xScale.invert(p[0]);
    }

    function yaxis_drag(d) {
      document.onselectstart = function() { return false; };
      d3.event.preventDefault();
      var p = d3.svg.mouse(vis[0][0]);
      downy = yScale.invert(p[1]);
    }

    function datapoint_drag(d) {
      grapher.registerKeyboardHandler(keydown);
      document.onselectstart = function() { return false; };
      selected = dragged = d;
      update();
    }

    function mousemove() {
      var p = d3.svg.mouse(vis[0][0]),
          changex, changey, new_domain,
          t = d3.event.changedTouches;

      d3.event.preventDefault();
      if (dragged && options.dataChange) {
        dragged[1] = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
        update();
      }

      if (!isNaN(downx)) {
        d3.select('body').style("cursor", "ew-resize");
        xScale.domain(grapher.axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
        redraw();
        d3.event.stopPropagation();
      }

      if (!isNaN(downy)) {
        d3.select('body').style("cursor", "ns-resize");
        yScale.domain(grapher.axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
        redraw();
        d3.event.stopPropagation();
      }
    }

    function mouseup() {
      document.onselectstart = function() { return true; };
      d3.select('body').style("cursor", "auto");
      if (!isNaN(downx)) {
        downx = Math.NaN;
        redraw();
      }
      if (!isNaN(downy)) {
        downy = Math.NaN;
        redraw();
      }
      dragged = null;
    }

    // make these private variables and functions available
    graph.elem = elem;
    graph.redraw = redraw;
    graph.update = update;
    graph.notify = notify;
    graph.initialize = initialize;
    graph.updateXScale = updateXScale;
    graph.updateYScale = updateYScale;
    graph.scale = scale;

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

  graph.margin = function(_) {
    if (!arguments.length) return margin;
    margin = _;
    return graph;
  };

  graph.xmin = function(_) {
    if (!arguments.length) return options.xmin;
    options.xmin = _;
    options.xrange = options.xmax - options.xmin;
    if (graph.updateXScale) {
      graph.updateXScale();
      graph.redraw();
    }
    return graph;
  };

  graph.xmax = function(_) {
    if (!arguments.length) return options.xmax;
    options.xmax = _;
    options.xrange = options.xmax - options.xmin;
    if (graph.updateXScale) {
      graph.updateXScale();
      graph.redraw();
    }
    return graph;
  };

  graph.ymin = function(_) {
    if (!arguments.length) return options.ymin;
    options.ymin = _;
    options.yrange = options.ymax - options.ymin;
    if (graph.updateYScale) {
      graph.updateYScale();
      graph.redraw();
    }
    return graph;
  };

  graph.ymax = function(_) {
    if (!arguments.length) return options.ymax;
    options.ymax = _;
    options.yrange = options.ymax - options.ymin;
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

  graph.elem = function(_) {
    if (!arguments.length) return elem;
    elem = d3.select(_);
    elem.call(graph);
    return graph;
  };

  graph.data = function(_) {
    if (!arguments.length) return points;
    var domain = xScale.domain(),
        xextent = domain[1] - domain[0],
        shift = xextent * 0.8;
    points = _;
    if (points.length > domain[1]) {
      domain[0] += shift;
      domain[1] += shift;
      xScale.domain(domain);
      graph.redraw();
    } else {
      graph.update();
    }
    return graph;
  };

  graph.add_data = function(newdata) {
    if (!arguments.length) return points;
    var domain = xScale.domain(),
        xextent = domain[1] - domain[0],
        shift = xextent * 0.8,
        i;
    if (newdata instanceof Array && newdata.length > 0) {
      if (newdata[0] instanceof Array) {
        for(i = 0; i < newdata.length; i++) {
          points.push(newdata[i]);
        }
      } else {
        if (newdata.length === 2) {
          points.push(newdata);
        } else {
          throw new Error("invalid argument to graph.add_data() " + newdata + " length should === 2.");
        }
      }
    }
    if (points[points.length-1][0] > domain[1]) {
      domain[0] += shift;
      domain[1] += shift;
      xScale.domain(domain);
      graph.redraw();
    } else {
      graph.update();
    }
    return graph;
  };

  graph.reset = function(options, message) {
    if (arguments.length) {
      graph.initialize(options, message);
    } else {
      graph.initialize();
    }
    graph();
    return graph;
  };

  graph.resize = function(w, h) {
    graph.scale(w, h);
    graph.initialize();
    graph();
    return graph;
  };

  if (elem) {
    elem.call(graph);
  }

  return graph;
};
grapher.realTimeGraph = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      padding, size,
      mw, mh, 
      stroke = function(d) { return d ? "#ccc" : "#666"; },
      xScale = d3.scale.linear(), downx,
      tx = function(d) { return "translate(" + xScale(d) + ",0)"; },
      yScale = d3.scale.linear(), downy,
      ty = function(d) { return "translate(0," + yScale(d) + ")"; },
      line = d3.svg.line()
            .x(function(d, i) { return xScale(points[i].x ); })
            .y(function(d, i) { return yScale(points[i].y); }),
      dragged, selected,
      emsize = layout.getDisplayProperties().emsize,
      titles = [],
      line_path, line_seglist,
      vis, plot, viewbox,
      points, pointArray,
      markedPoint, marker,
      sample,
      default_options = {
        title   : "graph",
        xlabel  : "x-axis",
        ylabel  : "y-axis",
        xmax:       10,
        xmin:       0,
        ymax:       10,
        ymin:       0,
        dataset:    [0],
        selectable_points: true,
        circleRadius: false,
        dataChange: false,
        points: false,
        sample: 1
      };

  if (options) {
    for(var p in default_options) {
      if (options[p] === undefined) {
        options[p] = default_options[p];
      }
    }
  } else {
    options = default_options;
  }

  // use local variable for access speed in add_point()
  sample = options.sample;

  if (options.dataChange) {
    circleCursorStyle = "ns-resize";
  } else {
    circleCursorStyle = "crosshair";
  }

  options.xrange = options.xmax - options.xmin;
  options.yrange = options.ymax - options.ymin;

  scale(cx, cy);

  pointArray = [];

  if (Object.prototype.toString.call(options.dataset[0]) === "[object Array]") {
    for (var i = 0; i < options.dataset.length; i++) {
      pointArray.push(indexedData(options.dataset[i], 0, sample));
    }
    points = pointArray[0];
  } else {
    points = indexedData(options.dataset, 0);
    pointArray = [points];
  }

  function indexedData(dataset, initial_index, sample) {
    var i = 0,
        start_index = initial_index || 0,
        n = dataset.length,
        points = [];
    sample = sample || 1;
    for (i = 0; i < n;  i++) {
      points.push({ x: (i + start_index) * sample, y: dataset[i] });
    }
    return points;
  }

  function number_of_points() {
    if (points) {
      return points.length;
    } else {
      return false;
    }
  }

  function scale(w, h) {
    cx = w;
    cy = h;
    node.style.width = cx +"px";
    node.style.height = cy +"px";

    padding = {
     "top":    options.title  ? 40 : 20,
     "right":                   30,
     "bottom": options.xlabel ? 60 : 10,
     "left":   options.ylabel ? 70 : 45
    };

    emsize = layout.getDisplayProperties().emsize;

    if(Object.prototype.toString.call(options.title) === "[object Array]") {
      titles = options.title;
    } else {
      titles = [options.title];
    }

    padding.top += (titles.length-1) * emsize * 20;

    width =  cx - padding.left - padding.right;
    height = cy - padding.top  - padding.bottom;

    size = {
      "width":  width,
      "height": height
    };

    mw = size.width;
    mh = size.height;

    // x-scale
    xScale.domain([options.xmin, options.xmax]).range([0, size.width]);

    // y-scale (inverted domain)
    yScale.domain([options.ymin, options.ymax]).nice().range([size.height, 0]).nice();

    // drag x-axis logic
    downx = Math.NaN;

    // drag y-axis logic
    downy = Math.NaN;

    dragged = null;
  }

  function graph() {
    scale(cx, cy);
    if (vis === undefined) {
      vis = d3.select(node).append("svg")
        .attr("width", cx)
        .attr("height", cy)
        .append("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
        .attr("class", "plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE")
        // .attr("fill-opacity", 0.0)
        .attr("pointer-events", "all")
        .on("mousedown", plot_drag)
        .on("touchstart", plot_drag);

      plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));

      viewbox = vis.append("svg")
        .attr("class", "viewbox")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height)
        .append("path")
            .attr("class", "line")
            .attr("d", line(points));

      marker = viewbox.append("path")
          .attr("class", "marker")
          .attr("d", []);

      // add Chart Title
      if (options.title) {
        title = vis.selectAll("text")
          .data(titles, function(d) { return d; });
        title.enter().append("text")
            .attr("class", "title")
            .text(function(d) { return d; })
            .attr("x", size.width/2)
            .attr("dy", function(d, i) { return 1.4 * i - titles.length + "em"; })
            .style("text-anchor","middle");
      }

      // Add the x-axis label
      if (options.xlabel) {
        vis.append("text")
            .attr("class", "xlabel")
            .text(options.xlabel)
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy","2.4em")
            .style("text-anchor","middle");
      }

      // add y-axis label
      if (options.ylabel) {
        vis.append("g")
            .append("text")
                .attr("class", "ylabel")
                .text( options.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      d3.select(node)
          .on("mousemove.drag", mousemove)
          .on("touchmove.drag", mousemove)
          .on("mouseup.drag",   mouseup)
          .on("touchend.drag",  mouseup);

      // variables for speeding up dynamic plotting
      // line_path = vis.select("path")[0][0];
      // line_seglist = line_path.pathSegList;
      initialize_canvas();

    } else {

      d3.select(node).select("svg")
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

      if (options.title) {
        vis.select("text.title")
            .attr("x", size.width/2)
            .attr("dy","-1em");
      }

      if (options.xlabel) {
        vis.select("text.xlabel")
            .attr("x", size.width/2)
            .attr("y", size.height);
      }

      if (options.ylabel) {
        vis.select("text.ylabel")
            .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      vis.selectAll("g.x").remove();
      vis.selectAll("g.y").remove();

      resize_canvas();
    }

    redraw();

    // ------------------------------------------------------------
    //
    // Redraw the plot canvas when it is translated or axes are re-scaled
    //
    // ------------------------------------------------------------

    function redraw() {
      var fx = xScale.tickFormat(10),
          fy = yScale.tickFormat(8);

      // Regenerate x-ticks
      var gx = vis.selectAll("g.x")
          .data(xScale.ticks(8), String)
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
          .on("mousedown.drag",  xaxis_drag)
          .on("touchstart.drag", xaxis_drag);

      gx.exit().remove();

      // Regenerate y-ticks
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
          .attr("x", -3)
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .style("cursor", "ns-resize")
          .text(fy)
          .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
          .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
          .on("mousedown.drag",  yaxis_drag)
          .on("touchstart.drag", yaxis_drag);

      gy.exit().remove();
      plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));
      update();
    }

    // ------------------------------------------------------------
    //
    // Draw the data
    //
    // ------------------------------------------------------------

    function update(currentSample) {
      var i;

      var gplot = node.children[0].getElementsByTagName("rect")[0];

      update_canvas(currentSample);

      if (graph.selectable_points) {
        var circle = vis.selectAll("circle")
            .data(points, function(d) { return d; });

        circle.enter().append("circle")
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

    function plot_drag() {
      d3.event.preventDefault();
      plot.style("cursor", "move");
      if (d3.event.altKey) {
        var p = d3.svg.mouse(vis[0][0]);
        downx = xScale.invert(p[0]);
        downy = yScale.invert(p[1]);
        dragged = false;
        d3.event.stopPropagation();
      }
    }

    function xaxis_drag(d) {
      document.onselectstart = function() { return false; };
      d3.event.preventDefault();
      var p = d3.svg.mouse(vis[0][0]);
      downx = xScale.invert(p[0]);
    }

    function yaxis_drag(d) {
      document.onselectstart = function() { return false; };
      d3.event.preventDefault();
      var p = d3.svg.mouse(vis[0][0]);
      downy = yScale.invert(p[1]);
    }

    // ------------------------------------------------------------
    //
    // Axis scaling
    //
    // attach the mousemove and mouseup to the body
    // in case one wanders off the axis line
    // ------------------------------------------------------------

    function mousemove() {
      var p = d3.svg.mouse(vis[0][0]),
          changex, changey, new_domain,
          t = d3.event.changedTouches;

      document.onselectstart = function() { return true; };
      d3.event.preventDefault();
      if (!isNaN(downx)) {
        d3.select('body').style("cursor", "ew-resize");
        xScale.domain(grapher.axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
        redraw();
        d3.event.stopPropagation();
      }
      if (!isNaN(downy)) {
        d3.select('body').style("cursor", "ns-resize");
        yScale.domain(grapher.axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
        redraw();
        d3.event.stopPropagation();
      }
    }

    function mouseup() {
      d3.select('body').style("cursor", "auto");
      document.onselectstart = function() { return true; };
      if (!isNaN(downx)) {
        redraw();
        downx = Math.NaN;
      }
      if (!isNaN(downy)) {
        redraw();
        downy = Math.NaN;
      }
      dragged = null;
    }

    function showMarker(index) {
      markedPoint = { x: points[index].x, y: points[index].y };
    }

    function updateOrRescale() {
      var i,
          domain = xScale.domain(),
          xextent = domain[1] - domain[0],
          maxExtent = (points.length) * sample,
          shift = xextent * 0.9;

      if (maxExtent > domain[1]) {
        domain[0] += shift;
        domain[1] += shift;
        xScale.domain(domain);
        redraw();
      } else {
        update();
      }
    }

    function _add_point(p) {
      if (points.length === 0) { return; }
      markedPoint = false;
      var index = points.length,
          lengthX = index * sample,
          point = { x: lengthX, y: p },
          newx, newy;
      points.push(point);
      updateOrRescale();
    }

    function add_point(p) {
      if (points.length === 0) { return; }
      _add_point(p);
      updateOrRescale();
    }

    function add_canvas_point(p) {
      if (points.length === 0) { return; }
      markedPoint = false;
      var index = points.length,
          lengthX = index * sample,
          previousX = lengthX - sample,
          point = { x: lengthX, y: p },
          oldx = xScale.call(self, previousX, previousX),
          oldy = yScale.call(self, points[index-1].y, index-1),
          newx, newy;

      points.push(point);
      newx = xScale.call(self, lengthX, lengthX);
      newy = yScale.call(self, p, lengthX);
      gctx.beginPath();
      gctx.moveTo(oldx, oldy);
      gctx.lineTo(newx, newy);
      gctx.stroke();
    }

    function add_points(pnts) {
      for (var i = 0; i < pointArray.length; i++) {
        points = pointArray[i];
        _add_point(pnts[i]);
      }
      updateOrRescale();
    }


    function add_canvas_points(pnts) {
      for (var i = 0; i < pointArray.length; i++) {
        points = pointArray[i];
        setPointStrokeColor(i);
        add_canvas_point(pnts[i]);
      }
    }

    function setPointStrokeColor(i, afterSamplePoint) {
      var opacity = afterSamplePoint ? 0.4 : 1.0;
      switch(i) {
        case 0:
          gctx.strokeStyle = "rgba(160,00,0," + opacity + ")";
          break;
        case 1:
          gctx.strokeStyle = "rgba(44,160,0," + opacity + ")";
          break;
        case 2:
          gctx.strokeStyle = "rgba(44,0,160," + opacity + ")";
          break;
      }
    }

    function new_data(d) {
      var i;
      pointArray = [];
      if (Object.prototype.toString.call(d) === "[object Array]") {
        for (i = 0; i < d.length; i++) {
          points = indexedData(d[i], 0, sample);
          pointArray.push(points);
        }
      } else {
        points = indexedData(options.dataset, 0, sample);
        pointArray = [points];
      }
      updateOrRescale();
    }

    function change_xaxis(xmax) {
      x = d3.scale.linear()
          .domain([0, xmax])
          .range([0, mw]);
      graph.xmax = xmax;
      x_tics_scale = d3.scale.linear()
          .domain([graph.xmin*graph.sample, graph.xmax*graph.sample])
          .range([0, mw]);
      update();
      redraw();
    }

    function change_yaxis(ymax) {
      y = d3.scale.linear()
          .domain([ymax, 0])
          .range([0, mh]);
      graph.ymax = ymax;
      update();
      redraw();
    }

    function clear_canvas() {
      gcanvas.width = gcanvas.width;
      gctx.fillStyle = "rgba(0,255,0, 0.05)";
      gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
      gctx.strokeStyle = "rgba(255,65,0, 1.0)";
    }

    function show_canvas() {
      vis.select("path.line").attr("d", []);
      gcanvas.style.zIndex = 100;
    }

    function hide_canvas() {
      gcanvas.style.zIndex = -100;
      update();
    }

    // update real-time canvas line graph
    function update_canvas(currentSample) {
      var i, index, pc, py, samplePoint, pointStop;
      if (typeof currentSample === 'undefined') {
        samplePoint = pointArray[0].length;
      } else {
        samplePoint = currentSample;
      }
      if (points.length === 0) { return; }
      clear_canvas();
      gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
      for (i = 0; i < pointArray.length; i++) {
        points = pointArray[i];
        px = xScale.call(self, 0, 0);
        py = yScale.call(self, points[0].y, 0);
        index = 0;
        lengthX = 0;
        setPointStrokeColor(i);
        gctx.beginPath();
        gctx.moveTo(px, py);
        pointStop = samplePoint - 1;
        for (index=0; index < pointStop; index++) {
          lengthX += sample;
          px = xScale.call(self, lengthX, lengthX);
          py = yScale.call(self, points[index].y, lengthX);
          gctx.lineTo(px, py);
        }
        gctx.stroke();
        pointStop = points.length-1;
        if (index < pointStop) {
          setPointStrokeColor(i, true);
          for (;index < pointStop; index++) {
            lengthX += sample;
            px = xScale.call(self, lengthX, lengthX);
            py = yScale.call(self, points[index].y, lengthX);
            gctx.lineTo(px, py);
          }
          gctx.stroke();
        }
      }
    }

    function initialize_canvas() {
      gcanvas = document.createElement('canvas');
      node.appendChild(gcanvas);
      gcanvas.style.zIndex = -100;
      setupCanvasProperties(gcanvas);
    }

    function resize_canvas() {
      setupCanvasProperties(gcanvas);
      update_canvas();
    }

    function setupCanvasProperties(canvas) {
      var cplot = {};
      cplot.rect = node.children[0].getElementsByTagName("rect")[0];
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
      canvas.style.pointerEvents = "none";
      canvas.className += "canvas-overlay";
      gctx = gcanvas.getContext( '2d' );
      gctx.globalCompositeOperation = "source-over";
      gctx.lineWidth = 1;
      gctx.fillStyle = "rgba(0,255,0, 0.05)";
      gctx.fillRect(0, 0, canvas.width, gcanvas.height);
      gctx.strokeStyle = "rgba(255,65,0, 1.0)";
      gcanvas.style.border = 'solid 1px red';
    }

    // make these private variables and functions available
    graph.node = node;
    graph.scale = scale;
    graph.update = update;
    graph.redraw = redraw;

    graph.number_of_points = number_of_points;
    graph.new_data = new_data;
    graph.add_point = add_point;
    graph.add_points = add_points;
    graph.add_canvas_point = add_canvas_point;
    graph.add_canvas_points = add_canvas_points;
    graph.initialize_canvas = initialize_canvas;
    graph.show_canvas = show_canvas;
    graph.hide_canvas = hide_canvas;
    graph.clear_canvas = clear_canvas;
    graph.update_canvas = update_canvas;
    graph.showMarker = showMarker;

    graph.change_xaxis = change_xaxis;
    graph.change_yaxis = change_yaxis;
  }

  graph.resize = function(width, height) {
    graph.scale(width, height);
    graph();
  };

  graph.add_data = function(newdata) {
    if (!arguments.length) return points;
    var domain = xScale.domain(),
        xextent = domain[1] - domain[0],
        shift = xextent * 0.8,
        i;
    if (newdata instanceof Array && newdata.length > 0) {
      if (newdata[0] instanceof Array) {
        for(i = 0; i < newdata.length; i++) {
          points.push(newdata[i]);
        }
      } else {
        if (newdata.length === 2) {
          points.push(newdata);
        } else {
          throw new Error("invalid argument to graph.add_data() " + newdata + " length should === 2.");
        }
      }
    }
    if (points[points.length-1][0] > domain[1]) {
      domain[0] += shift;
      domain[1] += shift;
      xScale.domain(domain);
      graph.redraw();
    } else {
      graph.update();
    }
    return graph;
  };


 if (node) { graph(); }

  return graph;
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

grapher.registerKeyboardHandler = function(callback) {
  d3.select(window).on("keydown", callback);
};

})();
(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

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

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

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
  if (arrays.constructor_function(dest) === Array) dest.length = len;
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

require.define("/constants/index.js", function (require, module, exports, __dirname, __filename) {
/*jslint loopfunc: true */

/** A list of physical constants. To access any given constant, require() this module
    and call the 'as' method of the desired constant to get the constant in the desired unit.

    This module also provides a few helper functions for unit conversion.

    Usage:
      var constants = require('./constants'),

          ATOMIC_MASS_IN_GRAMS = constants.ATOMIC_MASS.as(constants.unit.GRAM),

          GRAMS_PER_KILOGRAM = constants.ratio(constants.unit.GRAM, { per: constants.unit.KILOGRAM }),

          // this works for illustration purposes, although the preferred method would be to pass
          // constants.unit.KILOGRAM to the 'as' method:

          ATOMIC_MASS_IN_KILOGRAMS = constants.convert(ATOMIC_MASS_IN_GRAMS, {
            from: constants.unit.GRAM,
            to:   constants.unit.KILOGRAM
          });
*/

var units = require('./units'),
    unit  = units.unit,
    ratio = units.ratio,
    convert = units.convert,

    constants = {

      ELEMENTARY_CHARGE: {
        value: 1,
        unit: unit.ELEMENTARY_CHARGE
      },

      ATOMIC_MASS: {
        value: 1,
        unit: unit.DALTON
      },

      BOLTZMANN_CONSTANT: {
        value: 1.380658e-23,
        unit: unit.JOULES_PER_KELVIN
      },

      AVAGADRO_CONSTANT: {
        // N_A is numerically equal to Dalton per gram
        value: ratio( unit.DALTON, { per: unit.GRAM }),
        unit: unit.INVERSE_MOLE
      },

      PERMITTIVITY_OF_FREE_SPACE: {
        value: 8.854187e-12,
        unit: unit.FARADS_PER_METER
      }
    },

    constantName, constant;


// Derived units
constants.COULOMB_CONSTANT = {
  value: 1 / (4 * Math.PI * constants.PERMITTIVITY_OF_FREE_SPACE.value),
  unit: unit.METERS_PER_FARAD
};

// Exports

exports.unit = unit;
exports.ratio = ratio;
exports.convert = convert;

// Require explicitness about units by publishing constants as a set of objects with only an 'as' property,
// which will return the constant in the specified unit.

for (constantName in constants) {
  if (constants.hasOwnProperty(constantName)) {
    constant = constants[constantName];

    exports[constantName] = (function(constant) {
      return {
        as: function(toUnit) {
          return units.convert(constant.value, { from: constant.unit, to: toUnit });
        }
      };
    }(constant));
  }
}

});

require.define("/constants/units.js", function (require, module, exports, __dirname, __filename) {
/** Provides a few simple helper functions for converting related unit types.

    This sub-module doesn't do unit conversion between compound unit types (e.g., knowing that kg*m/s^2 = N)
    only simple scaling between units measuring the same type of quantity.
*/

// Prefer the "per" formulation to the "in" formulation.
//
// If KILOGRAMS_PER_AMU is 1.660540e-27 we know the math is:
// "1 amu * 1.660540e-27 kg/amu = 1.660540e-27 kg"
// (Whereas the "in" forumulation might be slighty more error prone:
// given 1 amu and 6.022e-26 kg in an amu, how do you get kg again?)

    // These you might have to look up...
var KILOGRAMS_PER_DALTON  = 1.660540e-27,
    COULOMBS_PER_ELEMENTARY_CHARGE = 1.602177e-19,

    // 1 eV = 1 e * 1 V = (COULOMBS_PER_ELEMENTARY_CHARGE) C * 1 J/C
    JOULES_PER_EV = COULOMBS_PER_ELEMENTARY_CHARGE,

    // though these are equally important!
    SECONDS_PER_FEMTOSECOND = 1e-15,
    METERS_PER_NANOMETER    = 1e-9,
    ANGSTROMS_PER_NANOMETER = 10,
    GRAMS_PER_KILOGRAM      = 1000,

    types = {
      TIME: "time",
      LENGTH: "length",
      MASS: "mass",
      ENERGY: "energy",
      ENTROPY: "entropy",
      CHARGE: "charge",
      INVERSE_QUANTITY: "inverse quantity",

      FARADS_PER_METER: "farads per meter",
      METERS_PER_FARAD: "meters per farad",

      FORCE: "force",
      VELOCITY: "velocity",

      // unused as of yet
      AREA: "area",
      PRESSURE: "pressure"
    },

  unit,
  ratio,
  convert;

/**
  In each of these units, the reference type we actually use has value 1, and conversion
  ratios for the others are listed.
*/
exports.unit = unit = {

  FEMTOSECOND: { name: "femtosecond", value: 1,                       type: types.TIME },
  SECOND:      { name: "second",      value: SECONDS_PER_FEMTOSECOND, type: types.TIME },

  NANOMETER:   { name: "nanometer", value: 1,                           type: types.LENGTH },
  ANGSTROM:    { name: "Angstrom",  value: 1 * ANGSTROMS_PER_NANOMETER, type: types.LENGTH },
  METER:       { name: "meter",     value: 1 * METERS_PER_NANOMETER,    type: types.LENGTH },

  DALTON:   { name: "Dalton",   value: 1,                                             type: types.MASS },
  GRAM:     { name: "gram",     value: 1 * KILOGRAMS_PER_DALTON * GRAMS_PER_KILOGRAM, type: types.MASS },
  KILOGRAM: { name: "kilogram", value: 1 * KILOGRAMS_PER_DALTON,                      type: types.MASS },

  MW_ENERGY_UNIT: {
    name: "MW Energy Unit (Dalton * nm^2 / fs^2)",
    value: 1,
    type: types.ENERGY
  },

  JOULE: {
    name: "Joule",
    value: KILOGRAMS_PER_DALTON *
           METERS_PER_NANOMETER * METERS_PER_NANOMETER *
           (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND),
    type: types.ENERGY
  },

  EV: {
    name: "electron volt",
    value: KILOGRAMS_PER_DALTON *
            METERS_PER_NANOMETER * METERS_PER_NANOMETER *
            (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND) *
            (1/JOULES_PER_EV),
    type: types.ENERGY
  },

  EV_PER_KELVIN:     { name: "electron volts per Kelvin", value: 1,                 type: types.ENTROPY },
  JOULES_PER_KELVIN: { name: "Joules per Kelvin",         value: 1 * JOULES_PER_EV, type: types.ENTROPY },

  ELEMENTARY_CHARGE: { name: "elementary charge", value: 1,                             type: types.CHARGE },
  COULOMB:           { name: "Coulomb",           value: COULOMBS_PER_ELEMENTARY_CHARGE, type: types.CHARGE },

  INVERSE_MOLE: { name: "inverse moles", value: 1, type: types.INVERSE_QUANTITY },

  FARADS_PER_METER: { name: "Farads per meter", value: 1, type: types.FARADS_PER_METER },

  METERS_PER_FARAD: { name: "meters per Farad", value: 1, type: types.METERS_PER_FARAD },

  MW_FORCE_UNIT: {
    name: "MW force units (Dalton * nm / fs^2)",
    value: 1,
    type: types.FORCE
  },

  NEWTON: {
    name: "Newton",
    value: 1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND),
    type: types.FORCE
  },

  EV_PER_NM: {
    name: "electron volts per nanometer",
    value: 1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * METERS_PER_NANOMETER *
           (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND) *
           (1/JOULES_PER_EV),
    type: types.FORCE
  },

  MW_VELOCITY_UNIT: {
    name: "MW velocity units (nm / fs)",
    value: 1,
    type: types.VELOCITY
  },

  METERS_PER_SECOND: {
    name: "meters per second",
    value: 1 * METERS_PER_NANOMETER * (1 / SECONDS_PER_FEMTOSECOND),
    type: types.VELOCITY
  }

};


/** Provide ratios for conversion of one unit to an equivalent unit type.

   Usage: ratio(units.GRAM, { per: units.KILOGRAM }) === 1000
          ratio(units.GRAM, { as: units.KILOGRAM }) === 0.001
*/
exports.ratio = ratio = function(from, to) {
  var checkCompatibility = function(fromUnit, toUnit) {
    if (fromUnit.type !== toUnit.type) {
      throw new Error("Attempt to convert incompatible type '" + fromUnit.name + "'' to '" + toUnit.name + "'");
    }
  };

  if (to.per) {
    checkCompatibility(from, to.per);
    return from.value / to.per.value;
  } else if (to.as) {
    checkCompatibility(from, to.as);
    return to.as.value / from.value;
  } else {
    throw new Error("units.ratio() received arguments it couldn't understand.");
  }
};

/** Scale 'val' to a different unit of the same type.

  Usage: convert(1, { from: unit.KILOGRAM, to: unit.GRAM }) === 1000
*/
exports.convert = convert = function(val, fromTo) {
  var from = fromTo && fromTo.from,
      to   = fromTo && fromTo.to;

  if (!from) {
    throw new Error("units.convert() did not receive a \"from\" argument");
  }
  if (!to) {
    throw new Error("units.convert() did not receive a \"to\" argument");
  }

  return val * ratio(to, { per: from });
};

});

require.define("/math/index.js", function (require, module, exports, __dirname, __filename) {
exports.normal              = require('./distributions').normal;
exports.getWindowedAverager = require('./utils').getWindowedAverager;
exports.minimize            = require('./minimizer').minimize;

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

require.define("/math/minimizer.js", function (require, module, exports, __dirname, __filename) {
/*jshint eqnull:true */
/**
  Simple, good-enough minimization via gradient descent.
*/
exports.minimize = function(f, x0, opts) {
  opts = opts || {};

  if (opts.precision == null) opts.precision = 0.01;

  var // stop when the absolute difference between successive values of f is this much or less
      precision = opts.precision,

      // array of [min, max] boundaries for each component of x
      bounds    = opts.bounds,

      // maximum number of iterations
      maxiter   = opts.maxiter   || 1000,

      // optionally, stop when f is less than or equal to this value
      stopval   = opts.stopval   || -Infinity,

      // maximum distance to move x between steps
      maxstep   = opts.maxstep   || 0.01,

      // multiplied by the gradient
      eps       = opts.eps       || 0.01,
      dim       = x0.length,
      x,
      res,
      f_cur,
      f_prev,
      grad,
      maxstepsq,
      gradnormsq,
      iter,
      i,
      a;

  maxstepsq = maxstep*maxstep;

  // copy x0 into x (which we will mutate)
  x = [];
  for (i = 0; i < dim; i++) {
    x[i] = x0[i];
  }

  // evaluate f and get the gradient
  res = f.apply(null, x);
  f_cur = res[0];
  grad = res[1];

  iter = 0;
  do {
    if (f_cur <= stopval) {
      break;
    }

    if (iter > maxiter) {
      console.log("maxiter reached");
      // don't throw on error, but return some diagnostic information
      return { error: "maxiter reached", f: f_cur, iter: maxiter, x: x };
    }

    // Limit gradient descent step size to maxstep
    gradnormsq = 0;
    for (i = 0; i < dim; i++) {
      gradnormsq += grad[i]*grad[i];
    }
    if (eps*eps*gradnormsq > maxstepsq) {
      a = Math.sqrt(maxstepsq / gradnormsq) / eps;
      for (i = 0; i < dim; i++) {
        grad[i] = a * grad[i];
      }
    }

    // Take a step in the direction opposite the gradient
    for (i = 0; i < dim; i++) {
      x[i] -= eps * grad[i];

      // check bounds
      if (bounds && x[i] < bounds[i][0]) {
        x[i] = bounds[i][0];
      }
      if (bounds && x[i] > bounds[i][1]) {
        x[i] = bounds[i][1];
      }
    }

    f_prev = f_cur;

    res = f.apply(null, x);
    f_cur = res[0];
    grad = res[1];

    iter++;
  } while ( Math.abs(f_cur-f_prev) > precision );

  return [f_cur, x];
};

});

require.define("/potentials/index.js", function (require, module, exports, __dirname, __filename) {
var potentials = exports.potentials = {};

exports.coulomb = require('./coulomb');
exports.lennardJones = require('./lennard-jones');

});

require.define("/potentials/coulomb.js", function (require, module, exports, __dirname, __filename) {
var
constants = require('../constants'),
unit      = constants.unit,

COULOMB_CONSTANT_IN_METERS_PER_FARAD = constants.COULOMB_CONSTANT.as( constants.unit.METERS_PER_FARAD ),

NANOMETERS_PER_METER = constants.ratio(unit.NANOMETER, { per: unit.METER }),
COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ = Math.pow( constants.ratio(unit.COULOMB, { per: unit.ELEMENTARY_CHARGE }), 2),

EV_PER_JOULE = constants.ratio(unit.EV, { per: unit.JOULE }),
MW_FORCE_UNITS_PER_NEWTON = constants.ratio(unit.MW_FORCE_UNIT, { per: unit.NEWTON }),

// Coulomb constant for expressing potential in eV given elementary charges, nanometers
k_ePotential = COULOMB_CONSTANT_IN_METERS_PER_FARAD *
               COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ *
               NANOMETERS_PER_METER *
               EV_PER_JOULE,

// Coulomb constant for expressing force in Dalton*nm/fs^2 given elementary charges, nanometers
k_eForce = COULOMB_CONSTANT_IN_METERS_PER_FARAD *
           COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ *
           NANOMETERS_PER_METER *
           NANOMETERS_PER_METER *
           MW_FORCE_UNITS_PER_NEWTON,


// Exports

/** Input units:
     r: nanometers,
     q1, q2: elementary charges

    Output units: eV
*/
potential = exports.potential = function(r, q1, q2) {
  return k_ePotential * ((q1 * q2) / r);
},


/** Input units:
    r_sq: nanometers^2
    q1, q2: elementary charges

    Output units: "MW Force Units" (Dalton * nm / fs^2)
*/
forceFromSquaredDistance = exports.forceFromSquaredDistance = function(r_sq, q1, q2) {
  return -k_eForce * ((q1 * q2) / r_sq);
},


forceOverDistanceFromSquaredDistance = exports.forceOverDistanceFromSquaredDistance = function(r_sq, q1, q2) {
  return forceFromSquaredDistance(r_sq, q1, q2) / Math.sqrt(r_sq);
},

/** Input units:
     r: nanometers,
     q1, q2: elementary charges

    Output units: "MW Force Units" (Dalton * nm / fs^2)
*/
force = exports.force = function(r, q1, q2) {
  return forceFromSquaredDistance(r*r, q1, q2);
};

});

require.define("/potentials/lennard-jones.js", function (require, module, exports, __dirname, __filename) {
/*jshint eqnull:true boss:true */
var constants = require('../constants'),
    unit      = constants.unit,

    NANOMETERS_PER_METER = constants.ratio( unit.NANOMETER, { per: unit.METER }),
    MW_FORCE_UNITS_PER_NEWTON = constants.ratio( unit.MW_FORCE_UNIT, { per: unit.NEWTON });

/**
  Helper function that returns the correct pairwise epsilon value to be used
  when elements each have epsilon values epsilon1, epsilon2
*/
exports.pairwiseEpsilon = function(epsilon1, epsilon2) {
  return 0.5 * (epsilon1 + epsilon2);
},

/**
  Helper function that returns the correct pairwise sigma value to be used
  when elements each have sigma values sigma1, sigma2
*/
exports.pairwiseSigma = function(sigma1, sigma2) {
  return Math.sqrt(sigma1 * sigma2);
},

/**
  Helper function that returns the correct rmin value for a given sigma
*/
exports.rmin = function(sigma) {
  return Math.pow(2, 1/6) * sigma;
};

/**
  Helper function that returns the correct atomic radius for a given sigma
*/
exports.radius = function(sigma) {
  return 0.5 * exports.rmin(sigma);
}

/**
  Returns a new object with methods for calculating the force and potential for a Lennard-Jones
  potential with particular values of its parameters epsilon and sigma. These can be adjusted.

  To avoid the needing to take square roots during calculation of pairwise forces, there are
  also methods which calculate the inter-particle potential directly from a squared distance, and
  which calculate the quantity (force/distance) directly from a squared distance.

  This function also accepts a callback function which will be called with a hash representing
  the new coefficients, whenever the LJ coefficients are changed for the returned calculator.
*/
exports.newLJCalculator = function(params, cb) {

  var epsilon,          // parameter; depth of the potential well, in eV
      sigma,            // parameter: characteristic distance from particle, in nm

      rmin,             // distance from particle at which the potential is at its minimum
      alpha_Potential,  // precalculated; units are eV * nm^12
      beta_Potential,   // precalculated; units are eV * nm^6
      alpha_Force,      // units are "MW Force Units" * nm^13
      beta_Force,       // units are "MW Force Units" * nm^7

      setCoefficients = function(e, s) {
        // Input units:
        //  epsilon: eV
        //  sigma:   nm

        epsilon = e;
        sigma   = s;
        rmin    = exports.rmin(sigma);

        if (epsilon != null && sigma != null) {
          alpha_Potential = 4 * epsilon * Math.pow(sigma, 12);
          beta_Potential  = 4 * epsilon * Math.pow(sigma, 6);

          // (1 J * nm^12) = (1 N * m * nm^12)
          // (1 N * m * nm^12) * (b nm / m) * (c MWUnits / N) = (abc MWUnits nm^13)
          alpha_Force = 12 * constants.convert(alpha_Potential, { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
          beta_Force =  6 * constants.convert(beta_Potential,  { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
        }

        if (typeof cb === 'function') cb(getCoefficients(), this);
      },

      getCoefficients = function() {
        return {
          epsilon: epsilon,
          sigma  : sigma,
          rmin   : rmin
        };
      },

      validateEpsilon = function(e) {
        if (e == null || parseFloat(e) !== e) {
          throw new Error("lennardJones: epsilon value " + e + " is invalid");
        }
      },

      validateSigma = function(s) {
        if (s == null || parseFloat(s) !== s || s <= 0) {
          throw new Error("lennardJones: sigma value " + s + " is invalid");
        }
      },

      // this object
      calculator;

      // At creation time, there must be a valid epsilon and sigma ... we're not gonna check during
      // inner-loop force calculations!
      validateEpsilon(params.epsilon);
      validateSigma(params.sigma);

      // Initialize coefficients to passed-in values
      setCoefficients(params.epsilon, params.sigma);

  return calculator = {

    coefficients: getCoefficients,

    setEpsilon: function(e) {
      validateEpsilon(e);
      setCoefficients(e, sigma);
    },

    setSigma: function(s) {
      validateSigma(s);
      setCoefficients(epsilon, s);
    },

    /**
      Input units: r_sq: nm^2
      Output units: eV

      minimum is at r=rmin, V(rmin) = 0
    */
    potentialFromSquaredDistance: function(r_sq) {
       return alpha_Potential*Math.pow(r_sq, -6) - beta_Potential*Math.pow(r_sq, -3);
    },

    /**
      Input units: r: nm
      Output units: eV
    */
    potential: function(r) {
      return calculator.potentialFromSquaredDistance(r*r);
    },

    /**
      Input units: r_sq: nm^2
      Output units: MW Force Units / nm (= Dalton / fs^2)
    */
    forceOverDistanceFromSquaredDistance: function(r_sq) {
      // optimizing divisions actually does appear to be *slightly* faster
      var r_minus2nd  = 1 / r_sq,
          r_minus6th  = r_minus2nd * r_minus2nd * r_minus2nd,
          r_minus8th  = r_minus6th * r_minus2nd,
          r_minus14th = r_minus8th * r_minus6th;

      return alpha_Force*r_minus14th - beta_Force*r_minus8th;
    },

    /**
      Input units: r: nm
      Output units: MW Force Units (= Dalton * nm / fs^2)
    */
    force: function(r) {
      return r * calculator.forceOverDistanceFromSquaredDistance(r*r);
    }
  };
};

});

require.define("/md2d.js", function (require, module, exports, __dirname, __filename) {
     /*globals Float32Array window:true */
/*jslint eqnull: true, boss: true */

if (typeof window === 'undefined') window = {};

var arrays       = require('./arrays/arrays').arrays,
    constants    = require('./constants'),
    unit         = constants.unit,
    math         = require('./math'),
    coulomb      = require('./potentials').coulomb,
    lennardJones = require('./potentials').lennardJones,

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

    // make at least 2 atoms
    N_MIN = 2,

    // make no more than this many atoms:
    N_MAX = 1000,

    // from A. Rahman "Correlations in the Motion of Atoms in Liquid Argon", Physical Review 136 pp. A405–A411 (1964)
    ARGON_LJ_EPSILON_IN_EV = -120 * constants.BOLTZMANN_CONSTANT.as(unit.EV_PER_KELVIN),
    ARGON_LJ_SIGMA_IN_NM   = 0.34,

    ARGON_MASS_IN_DALTON = 39.95,
    ARGON_MASS_IN_KG = constants.convert(ARGON_MASS_IN_DALTON, { from: unit.DALTON, to: unit.KILOGRAM }),

    BOLTZMANN_CONSTANT_IN_JOULES = constants.BOLTZMANN_CONSTANT.as( unit.JOULES_PER_KELVIN ),

    INDICES,
    ELEMENT_INDICES,
    SAVEABLE_INDICES,

    cross = function(a0, a1, b0, b1) {
      return a0*b1 - a1*b0;
    },

    sumSquare = function(a,b) {
      return a*a + b*b;
    },

    /**
      Convert total kinetic energy in the container of N atoms to a temperature in Kelvin.

      Input units:
        KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
      Output units:
        T: K
    */
    KE_to_T = function(totalKEinMWUnits, N) {
      // In 2 dimensions, kT = (2/N_df) * KE

      var N_df = 2 * N,
          averageKEinMWUnits = (2 / N_df) * totalKEinMWUnits,
          averageKEinJoules = constants.convert(averageKEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.JOULE });

      return averageKEinJoules / BOLTZMANN_CONSTANT_IN_JOULES;
    },

    /**
      Convert a temperature in Kelvin to the total kinetic energy in the container of N atoms.

      Input units:
        T: K
      Output units:
        KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
    */
    T_to_KE = function(T, N) {
      var N_df = 2 * N,
          averageKEinJoules  = T * BOLTZMANN_CONSTANT_IN_JOULES,
          averageKEinMWUnits = constants.convert(averageKEinJoules, { from: unit.JOULE, to: unit.MW_ENERGY_UNIT }),
          totalKEinMWUnits = averageKEinMWUnits * N_df / 2;

      return totalKEinMWUnits;
    },

    validateTemperature = function(t) {
      var temperature = parseFloat(t);

      if (isNaN(temperature)) {
        throw new Error("md2d: requested temperature " + t + " could not be understood.");
      }
      if (temperature < 0) {
        throw new Error("md2d: requested temperature " + temperature + " was less than zero");
      }
      if (temperature === Infinity) {
        throw new Error("md2d: requested temperature was Infinity!");
      }
    },

    copyTypedArray = function(arr) {
      var copy = [];
      for (var i=0,ii=arr.length; i<ii; i++){
        copy[i] = arr[i];
      }
      return copy;
    };

exports.ELEMENT_INDICES = ELEMENT_INDICES = {
  MASS: 0,
  EPSILON: 1,
  SIGMA: 2,
  RADIUS: 3
},

exports.INDICES = INDICES = {
  RADIUS :  0,
  PX     :  1,
  PY     :  2,
  X      :  3,
  Y      :  4,
  VX     :  5,
  VY     :  6,
  SPEED  :  7,
  AX     :  8,
  AY     :  9,
  CHARGE : 10,
  ELEMENT: 11
};

exports.SAVEABLE_INDICES = SAVEABLE_INDICES = ["X", "Y","VX","VY", "CHARGE", "ELEMENT"];

exports.makeModel = function() {

  var // the object to be returned
      model,

      // Whether system dimensions have been set. This is only allowed to happen once.
      sizeHasBeenInitialized = false,

      // Whether "atoms" (particles) have been created & initialized. This is only allowed to happen once.
      atomsHaveBeenCreated = false,

      // Whether to simulate Coulomb forces between particles.
      useCoulombInteraction = false,

      // Whether to simulate Lennard Jones forces between particles.
      useLennardJonesInteraction = true,

      // Whether to use the thermostat to maintain the system temperature near T_target.
      useThermostat = false,

      // Whether a transient temperature change is in progress.
      temperatureChangeInProgress = false,

      // Desired system temperature, in Kelvin.
      T_target,

      // Tolerance for (T_actual - T_target) relative to T_target
      tempTolerance = 0.001,

      // System dimensions as [x, y] in nanometers. Default value can be changed until particles are created.
      size = [10, 10],

      // Wall locations in nm
      topwall, rightwall, bottomwall, leftwall,

      // The current model time, in femtoseconds.
      time = 0,

      // The current integration time step, in femtoseconds.
      dt,

      // Square of integration time step, in fs^2.
      dt_sq,

      // The number of molecules in the system.
      N,

      // Total mass of all particles in the system, in Dalton (atomic mass units).
      totalMass,

      // Element properties
      // elements is an array of elements, each one an array of properties
      // For now properties are just defined by index, with no additional lookup for
      // the index (e.g. elements[0][ELEM_MASS_INDEX] for the mass of elem 0). We
      // have few enough properties that we currently don't need this additional lookup.
      // element definition: [ MASS_IN_DALTONS, EPSILON, SIGMA ]
      elements,

      // Individual property arrays for the atoms, indexed by atom number
      radius, px, py, x, y, vx, vy, speed, ax, ay, charge, element,

      // An array of length max(INDICES)+1 which contains the above property arrays
      atoms,

      // Individual property arrays for the "radial" bonds, indexed by bond number
      radialBondAtom1Index,
      radialBondAtom2Index,
      radialBondLength,
      radialBondStrength,

      // An array of length 4 which contains the above 4 property arrays.
      // Left undefined if no radial bonds are defined.
      radialBonds,

      // Number of actual radial bonds (may be smaller than the length of the property arrays)
      N_radialBonds = 0,

      // The location of the center of mass, in nanometers.
      x_CM, y_CM,

      // Linear momentum of the system, in Dalton * nm / fs.
      px_CM, py_CM,

      // Velocity of the center of mass, in nm / fs.
      vx_CM, vy_CM,

      // Angular momentum of the system wrt its center of mass
      L_CM,

      // (Instantaneous) moment of inertia of the system wrt its center of mass
      I_CM,

      // Angular velocity of the system about the center of mass, in radians / fs.
      // (= angular momentum about CM / instantaneous moment of inertia about CM)
      omega_CM,

      // instantaneous system temperature, in Kelvin
      T,

      // Object containing observations of the sytem (temperature, etc)
      outputState = window.state = {},

      // The following are the pairwise values for elements i and j, indexed
      // like [i][j]
      epsilon = [],
      sigma = [],

      // cutoff for force calculations, as a factor of sigma
      cutoff = 5.0,
      cutoffDistance_LJ_sq = [],

      // Each object at ljCalculator[i,j] can calculate the magnitude of the Lennard-Jones force and
      // potential between elements i and j
      ljCalculator = [],

      // Callback that recalculates element radii  and cutoffDistance_LJ_sq when the Lennard-Jones
      // sigma parameter changes.
      ljCoefficientsChanged = function(el1, el2, coefficients) {
        cutoffDistance_LJ_sq[el1][el2] =
          cutoffDistance_LJ_sq[el2][el1] =
          cutoff * cutoff * coefficients.sigma * coefficients.sigma;

        if (el1 === el2) updateElementRadius(el1, coefficients);
      },

      // Update radius of element # 'el'. Also, if 'element' and 'radius' arrays are defined, update
      // all atom's radii to match the new radii of their corresponding elements.
      updateElementRadius = function(el, coefficients) {
        elements[el][ELEMENT_INDICES.RADIUS] = lennardJones.radius( coefficients.sigma );

        if (!radius || !element) return;
        for (var i = 0, len = radius.length; i < len; i++) {
          radius[i] = elements[element[i]][ELEMENT_INDICES.RADIUS];
        }
      },

      // Make the 'atoms' array bigger
      extendAtomsArray = function(num) {
        var savedArrays = [],
            savedTotalMass,
            i;

        for (i = 0; i < atoms.length; i++) {
          savedArrays[i] = atoms[i];
        }

        savedTotalMass = totalMass;
        atomsHaveBeenCreated = false;
        model.createAtoms({ num: num });

        for (i = 0; i < atoms.length; i++) {
          arrays.copy(savedArrays[i], atoms[i]);
        }

        // restore N and totalMass
        N = savedArrays[0].length;        // atoms[0].length is now > N!
        totalMass = savedTotalMass;
      },

      createRadialBondsArray = function(num) {
      var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
          uint16  = (hasTypedArrays && notSafari) ? 'Uint16Array' : 'regular';

        radialBonds = [];

        radialBonds[0] = radialBondAtom1Index = arrays.create(num, 0, uint16);
        radialBonds[1] = radialBondAtom2Index = arrays.create(num, 0, uint16);
        radialBonds[2] = radialBondLength     = arrays.create(num, 0, float32);
        radialBonds[3] = radialBondStrength   = arrays.create(num, 0, float32);
      },


      // Make the 'radialBonds' array bigger. FIXME: needs to be factored
      // into a common pattern with 'extendAtomsArray'
      extendRadialBondsArray = function(num) {
        var savedArrays = [],
            i;

        for (i = 0; i < radialBonds.length; i++) {
          savedArrays[i] = radialBonds[i];
        }

        createRadialBondsArray(num);

        for (i = 0; i < radialBonds.length; i++) {
          arrays.copy(savedArrays[i], radialBonds[i]);
        }
      },

      // Function that accepts a value T and returns an average of the last n values of T (for some n).
      T_windowed,

      // Dynamically determine an appropriate window size for use when measuring a windowed average of the temperature.
      getWindowSize = function() {
        return useCoulombInteraction ? 1000 : 1000;
      },

      // Whether or not the thermostat is not being used, begins transiently adjusting the system temperature; this
      // causes the adjustTemperature portion of the integration loop to rescale velocities until a windowed average of
      // the temperature comes within `tempTolerance` of `T_target`.
      beginTransientTemperatureChange = function()  {
        temperatureChangeInProgress = true;
        T_windowed = math.getWindowedAverager( getWindowSize() );
      },

      // Calculates & returns instantaneous temperature of the system.
      computeTemperature = function() {
        var twoKE = 0,
            i;

        for (i = 0; i < N; i++) {
          twoKE += elements[element[i]][0] * (vx[i] * vx[i] + vy[i] * vy[i]);
        }
        return KE_to_T( twoKE/2, N );
      },

      // Scales the velocity vector of particle i by `factor`.
      scaleVelocity = function(i, factor) {
        vx[i] *= factor;
        vy[i] *= factor;

        // scale momentum too
        px[i] *= factor;
        py[i] *= factor;
      },

      // Adds the velocity vector (vx_t, vy_t) to the velocity vector of particle i
      addVelocity = function(i, vx_t, vy_t) {
        vx[i] += vx_t;
        vy[i] += vy_t;

        px[i] = vx[i]*elements[element[i]][0];
        py[i] = vy[i]*elements[element[i]][0];
      },

      // Adds effect of angular velocity omega, relative to (x_CM, y_CM), to the velocity vector of particle i
      addAngularVelocity = function(i, omega) {
        vx[i] -= omega * (y[i] - y_CM);
        vy[i] += omega * (x[i] - x_CM);

        px[i] = vx[i]*elements[element[i]][0];
        py[i] = vy[i]*elements[element[i]][0];
      },

      // Subtracts the center-of-mass linear velocity and the system angular velocity from the velocity vectors
      removeTranslationAndRotationFromVelocities = function() {
        for (var i = 0; i < N; i++) {
          addVelocity(i, -vx_CM, -vy_CM);
          addAngularVelocity(i, -omega_CM);
        }
      },

      // Adds the center-of-mass linear velocity and the system angular velocity back into the velocity vectors
      addTranslationAndRotationToVelocities = function() {
        for (var i = 0; i < N; i++) {
          addVelocity(i, vx_CM, vy_CM);
          addAngularVelocity(i, omega_CM);
        }
      },

      // Subroutine that calculates the position and velocity of the center of mass, leaving these in x_CM, y_CM,
      // vx_CM, and vy_CM, and that then computes the system angular velocity around the center of mass, leaving it
      // in omega_CM.
      computeSystemTranslation = function() {
        var x_sum = 0,
            y_sum = 0,
            px_sum = 0,
            py_sum = 0,
            i;

        for (i = 0; i < N; i++) {
          x_sum += x[i];
          y_sum += y[i];
          px_sum += px[i];
          py_sum += py[i];
        }

        x_CM = x_sum / N;
        y_CM = y_sum / N;
        px_CM = px_sum;
        py_CM = py_sum;
        vx_CM = px_sum / totalMass;
        vy_CM = py_sum / totalMass;
      },

      // Subroutine that calculates the angular momentum and moment of inertia around the center of mass, and then
      // uses these to calculate the weighted angular velocity around the center of mass.
      // Updates I_CM, L_CM, and omega_CM.
      // Requires x_CM, y_CM, vx_CM, vy_CM to have been calculated.
      computeSystemRotation = function() {
        var L = 0,
            I = 0,
            mass,
            i;

        for (i = 0; i < N; i++) {
          mass = elements[element[i]][0];
          // L_CM = sum over N of of mr_i x p_i (where r_i and p_i are position & momentum vectors relative to the CM)
          L += mass * cross( x[i]-x_CM, y[i]-y_CM, vx[i]-vx_CM, vy[i]-vy_CM);
          I += mass * sumSquare( x[i]-x_CM, y[i]-y_CM );
        }

        L_CM = L;
        I_CM = I;
        omega_CM = L_CM / I_CM;
      },

      computeCMMotion = function() {
        computeSystemTranslation();
        computeSystemRotation();
      },

      // Calculate x(t+dt, i) from v(t) and a(t)
      updatePosition = function(i) {
        x[i] += vx[i]*dt + 0.5*ax[i]*dt_sq;
        y[i] += vy[i]*dt + 0.5*ay[i]*dt_sq;
      },

      // Constrain particle i to the area between the walls by simulating perfectly elastic collisions with the walls.
      // Note this may change the linear and angular momentum.
      bounceOffWalls = function(i) {
        // Bounce off vertical walls.
        if (x[i] < leftwall) {
          x[i]  = leftwall + (leftwall - x[i]);
          vx[i] *= -1;
          px[i] *= -1;
        } else if (x[i] > rightwall) {
          x[i]  = rightwall - (x[i] - rightwall);
          vx[i] *= -1;
          px[i] *= -1;
        }

        // Bounce off horizontal walls
        if (y[i] < bottomwall) {
          y[i]  = bottomwall + (bottomwall - y[i]);
          vy[i] *= -1;
          py[i] *= -1;
        } else if (y[i] > topwall) {
          y[i]  = topwall - (y[i] - topwall);
          vy[i] *= -1;
          py[i] *= -1;
        }
      },

      // Half of the update of v(t+dt, i) and p(t+dt, i) using a; during a single integration loop,
      // call once when a = a(t) and once when a = a(t+dt)
      halfUpdateVelocity = function(i) {
        var mass = elements[element[i]][0];
        vx[i] += 0.5*ax[i]*dt;
        px[i] = mass * vx[i];
        vy[i] += 0.5*ay[i]*dt;
        py[i] = mass * vy[i];
      },

      // Accumulate accelerations into a(t+dt, i) and a(t+dt, j) for all pairwise interactions between particles i and j
      // where j < i. Note a(t, i) and a(t, j) (accelerations from the previous time step) should be cleared from arrays
      // ax and ay before calling this function.
      updatePairwiseAccelerations = function(i) {
        var j, dx, dy, r_sq, f_over_r, fx, fy,
            el_i = element[i],
            el_j,
            mass_inv = 1/elements[el_i][0], mass_j_inv, q_i = charge[i];

        for (j = 0; j < i; j++) {
          el_j = element[j];

          mass_j_inv = 1/elements[el_j][0];

          dx = x[j] - x[i];
          dy = y[j] - y[i];
          r_sq = dx*dx + dy*dy;

          f_over_r = 0;

          if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq[el_i][el_j]) {
            f_over_r += ljCalculator[el_i][el_j].forceOverDistanceFromSquaredDistance(r_sq);
          }

          if (useCoulombInteraction) {
            f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, q_i, charge[j]);
          }

          if (f_over_r) {
            fx = f_over_r * dx;
            fy = f_over_r * dy;
            ax[i] += fx * mass_inv;
            ay[i] += fy * mass_inv;
            ax[j] -= fx * mass_j_inv;
            ay[j] -= fy * mass_j_inv;
          }
        }
      },

      updateBondAccelerations = function() {
        // fast path if no radial bonds have been defined
        if (N_radialBonds < 1) return;

        var i,
            len,
            i1,
            i2,
            el1,
            el2,
            dx,
            dy,
            r_sq,
            r,
            k,
            r0,
            f_over_r,
            fx,
            fy,
            mass1_inv,
            mass2_inv;

        for (i = 0, len = radialBonds[0].length; i < len; i++) {
          i1 = radialBondAtom1Index[i];
          i2 = radialBondAtom2Index[i];
          el1 = element[i1];
          el2 = element[i2];

          mass1_inv = 1/elements[el1][0];
          mass2_inv = 1/elements[el2][0];

          dx = x[i2] - x[i1];
          dy = y[i2] - y[i1];
          r_sq = dx*dx + dy*dy;
          r = Math.sqrt(r_sq);

          // eV/nm^2
          k = radialBondStrength[i];

          // nm
          r0 = radialBondLength[i];

          // "natural" Next Gen MW force units / nm
          f_over_r = constants.convert(k*(r-r0), { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / r;

          // Subtract out the Lennard-Jones force between bonded pairs.
          //
          // (optimization assumption: the penalty for calculating the force twice for bonded pairs
          // will be much less than the overhead and possible loop deoptimization incurred by
          // checking against a list of bonded pairs each time through
          // updatePairwiseAccelerations()'s inner loop.)

          if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq[el1][el2]) {
            f_over_r -= ljCalculator[el1][el2].forceOverDistanceFromSquaredDistance(r_sq);
          }

          fx = f_over_r * dx;
          fy = f_over_r * dy;

          ax[i1] += fx * mass1_inv;
          ay[i1] += fy * mass1_inv;
          ax[i2] -= fx * mass2_inv;
          ay[i2] -= fy * mass2_inv;
        }
      },

      adjustTemperature = function(target, forceAdjustment) {
        var rescalingFactor,
            i;

        if (target == null) target = T_target;

        T = computeTemperature();

        if (temperatureChangeInProgress && Math.abs(T_windowed(T) - target) <= target * tempTolerance) {
          temperatureChangeInProgress = false;
        }

        if (forceAdjustment || useThermostat || temperatureChangeInProgress && T > 0) {
          rescalingFactor = Math.sqrt(target / T);
          for (i = 0; i < N; i++) {
            scaleVelocity(i, rescalingFactor);
          }
          T = target;
        }
      };


  return model = {

    outputState: outputState,

    useCoulombInteraction: function(v) {
      useCoulombInteraction = !!v;
    },

    useLennardJonesInteraction: function(v) {
      useLennardJonesInteraction = !!v;
    },

    useThermostat: function(v) {
      useThermostat = !!v;
    },

    setTargetTemperature: function(v) {
      validateTemperature(v);
      T_target = v;
    },

    // Our timekeeping is really a convenience for users of this lib, so let them reset time at will
    setTime: function(t) {
      outputState.time = time = t;
    },

    setSize: function(v) {
      // NB. We may want to create a simple state diagram for the md engine (as well as for the 'modeler' defined in
      // lab.molecules.js)
      if (sizeHasBeenInitialized) {
        throw new Error("The molecular model's size has already been set, and cannot be reset.");
      }
      var width  = (v[0] && v[0] > 0) ? v[0] : 10,
          height = (v[1] && v[1] > 0) ? v[1] : 10;
      size = [width, height];
    },

    getSize: function() {
      return [size[0], size[1]];
    },

    getLJCalculator: function() {
      return ljCalculator;
    },

    /*
      Expects an array of element properties such as
      [
        [ mass_of_elem_0 ],
        [ mass_of_elem_1 ]
      ]
    */
    setElements: function(elems) {
      var i, j, epsilon_i, epsilon_j, sigma_i, sigma_j;

      if (atomsHaveBeenCreated) {
        throw new Error("md2d: setElements cannot be called after atoms have been created");
      }
      elements = elems;

      for (i = 0; i < elements.length; i++) {
        epsilon[i] = [];
        sigma[i] = [];
        ljCalculator[i] = [];
        cutoffDistance_LJ_sq[i] = [];
      }

      for (i = 0; i < elements.length; i++) {
        epsilon_i = elements[i][ELEMENT_INDICES.EPSILON];
        sigma_i   = elements[i][ELEMENT_INDICES.SIGMA];

        // the radius is derived from sigma
        elements[i][ELEMENT_INDICES.RADIUS] = lennardJones.radius(sigma_i);

        for (j = i; j < elements.length; j++) {
          epsilon_j = elements[j][ELEMENT_INDICES.EPSILON];
          sigma_j   = elements[j][ELEMENT_INDICES.SIGMA];

          epsilon[i][j] = epsilon[j][i] = lennardJones.pairwiseEpsilon(epsilon_i, epsilon_j);
          sigma[i][j]   = sigma[j][i]   = lennardJones.pairwiseSigma(sigma_i, sigma_j);

          // bind i and j to the callback made below
          (function(i, j) {
            ljCalculator[i][j] = ljCalculator[j][i] = lennardJones.newLJCalculator({
              epsilon: epsilon[i][j],
              sigma:   sigma[i][j]
            }, function(coefficients) {
              ljCoefficientsChanged(i, j, coefficients);
            });
          }(i,j));
        }
      }
    },

    /**
      Allocates 'atoms' array of arrays, sets number of atoms.

      options:
        num: the number of atoms to create
    */
    createAtoms: function(options) {
      var float32 = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular',
          uint8 = (hasTypedArrays && notSafari) ? 'Uint8Array' : 'regular',
          numIndices,
          num;

      if (atomsHaveBeenCreated) {
        throw new Error("md2d: createAtoms was called even though the particles have already been created for this model instance.");
      }
      atomsHaveBeenCreated = true;
      sizeHasBeenInitialized = true;

      if (typeof options === 'undefined') {
        throw new Error("md2d: createAtoms was called without options specifying the atoms to create.");
      }

      num = options.num;

      if (typeof num === 'undefined') {
        throw new Error("md2d: createAtoms was called without the required 'num' option specifying the number of atoms to create.");
      }
      if (num !== Math.floor(num)) {
        throw new Error("md2d: createAtoms was passed a non-integral 'num' option.");
      }
      if (num < N_MIN) {
        throw new Error("md2d: create Atoms was passed an 'num' option equal to: " + num + " which is less than the minimum allowable value: N_MIN = " + N_MIN + ".");
      }
      if (num > N_MAX) {
        throw new Error("md2d: create Atoms was passed an 'N' option equal to: " + num + " which is greater than the minimum allowable value: N_MAX = " + N_MAX + ".");
      }

      numIndices = (function() {
        var n = 0, index;
        for (index in INDICES) {
          if (INDICES.hasOwnProperty(index)) n++;
        }
        return n;
      }());

      atoms  = model.atoms  = arrays.create(numIndices, null, 'regular');

      radius  = model.radius  = atoms[INDICES.RADIUS]  = arrays.create(num, 0, float32);
      px      = model.px      = atoms[INDICES.PX]      = arrays.create(num, 0, float32);
      py      = model.py      = atoms[INDICES.PY]      = arrays.create(num, 0, float32);
      x       = model.x       = atoms[INDICES.X]       = arrays.create(num, 0, float32);
      y       = model.y       = atoms[INDICES.Y]       = arrays.create(num, 0, float32);
      vx      = model.vx      = atoms[INDICES.VX]      = arrays.create(num, 0, float32);
      vy      = model.vy      = atoms[INDICES.VY]      = arrays.create(num, 0, float32);
      speed   = model.speed   = atoms[INDICES.SPEED]   = arrays.create(num, 0, float32);
      ax      = model.ax      = atoms[INDICES.AX]      = arrays.create(num, 0, float32);
      ay      = model.ay      = atoms[INDICES.AY]      = arrays.create(num, 0, float32);
      charge  = model.charge  = atoms[INDICES.CHARGE]  = arrays.create(num, 0, float32);
      element = model.element = atoms[INDICES.ELEMENT] = arrays.create(num, 0, uint8);

      N = 0;
      totalMass = 0;
    },

    /**
      The canonical method for adding an atom to the collections of atoms.

      If there isn't enough room in the 'atoms' array, it (somewhat inefficiently)
      extends the length of the typed arrays by one to contain one more atom with listed properties.
    */
    addAtom: function(atom_element, atom_x, atom_y, atom_vx, atom_vy, atom_charge) {
      var el, mass;

      if (N+1 > atoms[0].length) {
        extendAtomsArray(N+1);
      }

      el = elements[atom_element];
      mass = el[ELEMENT_INDICES.MASS];

      element[N] = atom_element;
      radius[N]  = elements[atom_element][ELEMENT_INDICES.RADIUS];
      x[N]       = atom_x;
      y[N]       = atom_y;
      vx[N]      = atom_vx;
      vy[N]      = atom_vy;
      px[N]      = atom_vx * mass;
      py[N]      = atom_vy * mass;
      ax[N]      = 0;
      ay[N]      = 0;
      speed[N]   = Math.sqrt(atom_vx*atom_vx + atom_vy*atom_vy);
      charge[N]  = atom_charge;

      totalMass += mass;
      N++;
    },

    /**
      The canonical method for adding a radial bond to the collection of radial bonds.

      If there isn't enough room in the 'radialBonds' array, it (somewhat inefficiently)
      extends the length of the typed arrays by one to contain one more atom with listed properties.
    */
    addRadialBond: function(atomIndex1, atomIndex2, bondLength, bondStrength) {

      if (N_radialBonds+1 > radialBondAtom1Index.length) {
        extendRadialBondsArray(N+1);
      }

      radialBondAtom1Index[N_radialBonds] = atomIndex1;
      radialBondAtom2Index[N_radialBonds] = atomIndex2;
      radialBondLength[N_radialBonds]     = bondLength;
      radialBondStrength[N_radialBonds]   = bondStrength;

      N_radialBonds++;
    },

    // Sets the X, Y, VX, VY and ELEMENT properties of the atoms
    initializeAtomsFromProperties: function(props) {
      var x, y, vx, vy, charge, element,
          i, ii;

      if (!(props.X && props.Y)) {
        throw new Error("md2d: initializeAtomsFromProperties must specify at minimum X and Y locations.");
      }

      if (!(props.VX && props.VY)) {
        // We may way to support authored locations with random velocities in the future
        throw new Error("md2d: For now, velocities must be set when locations are set.");
      }

      for (i=0, ii=props.X.length; i<ii; i++){
        element = props.ELEMENT ? props.ELEMENT[i] : 0;
        x = props.X[i];
        y = props.Y[i];
        vx = props.VX[i];
        vy = props.VY[i];
        charge = props.CHARGE ? props.CHARGE[i] : 0;

        model.addAtom(element, x, y, vx, vy, charge);
      }

      // Publish the current state
      T = computeTemperature();
      model.computeOutputState();
    },

    initializeAtomsRandomly: function(options) {

      var // if a temperature is not explicitly requested, we just need any nonzero number
          temperature = options.temperature || 100,

          // fill up the entire 'atoms' array if not otherwise requested
          num         = options.num         || atoms[0].length,

          nrows = Math.floor(Math.sqrt(num)),
          ncols = Math.ceil(num/nrows),

          i, r, c, rowSpacing, colSpacing,
          vMagnitude, vDirection,
          x, y, vx, vy, charge, element;

      validateTemperature(temperature);

      colSpacing = size[0] / (1+ncols);
      rowSpacing = size[1] / (1+nrows);

      // Arrange molecules in a lattice. Not guaranteed to have CM exactly on center, and is an artificially low-energy
      // configuration. But it works OK for now.
      i = -1;

      for (r = 1; r <= nrows; r++) {
        for (c = 1; c <= ncols; c++) {
          i++;
          if (i === num) break;

          element    = Math.floor(Math.random() * elements.length);     // random element
          vMagnitude = math.normal(1, 1/4);
          vDirection = 2 * Math.random() * Math.PI;

          x = c*colSpacing;
          y = r*rowSpacing;
          vx = vMagnitude * Math.cos(vDirection);
          vy = vMagnitude * Math.sin(vDirection);

          charge = 2*(i%2)-1;      // alternate negative and positive charges

          model.addAtom(element, x, y, vx, vy, charge);
        }
      }

      // now, remove all translation of the center of mass and rotation about the center of mass
      computeCMMotion();
      removeTranslationAndRotationFromVelocities();

      // Scale randomized velocities to match the desired initial temperature.
      //
      // Note that although the instantaneous temperature will be 'temperature' exactly, the temperature will quickly
      // settle to a lower value because we are initializing the atoms spaced far apart, in an artificially low-energy
      // configuration.
      //
      adjustTemperature(temperature, true);

      // Publish the current state
      T = computeTemperature();
      model.computeOutputState();
    },

    initializeRadialBonds: function(props) {
      var num = props.atom1Index.length,
          i;

      createRadialBondsArray(props.atom1Index.length);

      for (i = 0; i < num; i++) {
        model.addRadialBond(
          props.atom1Index[i],
          props.atom2Index[i],
          props.bondLength[i],
          props.bondStrength[i]
        );
      }
    },

    relaxToTemperature: function(T) {

      // FIXME this method needs to be modified. It should rescale velocities only periodically
      // and stop when the temperature approaches a steady state between rescalings.

      if (T != null) T_target = T;

      validateTemperature(T_target);

      beginTransientTemperatureChange();
      while (temperatureChangeInProgress) {
        model.integrate();
      }
    },

    integrate: function(duration, opt_dt) {

      var radius;

      if (!atomsHaveBeenCreated) {
        throw new Error("md2d: integrate called before atoms created.");
      }

      if (duration == null)  duration = 100;  // how much time to integrate over, in fs

      dt = opt_dt || 1;
      dt_sq = dt*dt;                      // time step, squared

      // FIXME we still need to make bounceOffWalls respect each atom's actual radius, rather than
      // assuming just one radius as below
      radius = elements[element[0]][ELEMENT_INDICES.RADIUS];
      leftwall   = radius;
      bottomwall = radius;
      rightwall  = size[0] - radius;
      topwall    = size[1] - radius;

      var t_start = time,
          n_steps = Math.floor(duration/dt),  // number of steps
          iloop,
          i;

      for (iloop = 1; iloop <= n_steps; iloop++) {
        time = t_start + iloop*dt;

        for (i = 0; i < N; i++) {
          // Update r(t+dt) using v(t) and a(t)
          updatePosition(i);
          bounceOffWalls(i);

          // First half of update of v(t+dt, i), using v(t, i) and a(t, i)
          halfUpdateVelocity(i);

          // Zero out a(t, i) for accumulation of a(t+dt, i)
          ax[i] = ay[i] = 0;

          // Accumulate accelerations for time t+dt into a(t+dt, k) for k <= i. Note that a(t+dt, i) won't be
          // usable until this loop completes; it won't have contributions from a(t+dt, k) for k > i
          updatePairwiseAccelerations(i);
        }

        // Accumulate accelerations from bonded interactions into a(t+dt)
        updateBondAccelerations();

        for (i = 0; i < N; i++) {
          // Second half of update of v(t+dt, i) using first half of update and a(t+dt, i)
          halfUpdateVelocity(i);

          // Now that we have velocity, update speed
          speed[i] = Math.sqrt(vx[i]*vx[i] + vy[i]*vy[i]);
        }

        adjustTemperature();
      } // end of integration loop

      model.computeOutputState();
    },

    getTotalMass: function() {
      return totalMass;
    },

    getRadiusOfElement: function(el) {
      return elements[el][ELEMENT_INDICES.RADIUS];
    },

    computeOutputState: function() {
      var i, j,
          i1, i2,
          el1, el2,
          dx, dy,
          r_sq,
          k,
          dr,
          KEinMWUnits,       // total kinetic energy, in MW units
          PE;                // potential energy, in eV

      // Calculate potentials in eV. Note that we only want to do this once per call to integrate(), not once per
      // integration loop!
      PE = 0;
      KEinMWUnits = 0;

      for (i = 0; i < N; i++) {
        KEinMWUnits += 0.5 * elements[element[i]][0] * (vx[i] * vx[i] + vy[i] * vy[i]);

        // pairwise interactions
        for (j = i+1; j < N; j++) {
          dx = x[j] - x[i];
          dy = y[j] - y[i];

          r_sq = dx*dx + dy*dy;

          // report total potentials as POSITIVE, i.e., - the value returned by potential calculators
          if (useLennardJonesInteraction) {
            PE += -ljCalculator[element[i]][element[j]].potentialFromSquaredDistance(r_sq);
          }
          if (useCoulombInteraction) {
            PE += -coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j]);
          }
        }
      }

      // radial bonds
      for (i = 0; i < N_radialBonds; i++) {
        i1 = radialBondAtom1Index[i];
        i2 = radialBondAtom2Index[i];
        el1 = element[i1];
        el2 = element[i2];

        dx = x[i2] - x[i1];
        dy = y[i2] - y[i1];
        r_sq = dx*dx + dy*dy;

        // eV/nm^2
        k = radialBondStrength[i];

        // nm
        dr = Math.sqrt(r_sq) - radialBondLength[i];

        PE += 0.5*k*dr*dr;

        // Remove the Lennard Jones potential for the bonded pair
        if (useLennardJonesInteraction) {
          PE += ljCalculator[el1][el2].potentialFromSquaredDistance(r_sq);
        }
      }

      // State to be read by the rest of the system:
      outputState.time     = time;
      outputState.pressure = 0;// (time - t_start > 0) ? pressure / (time - t_start) : 0;
      outputState.PE       = PE;
      outputState.KE       = constants.convert(KEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
      outputState.T        = T;
      outputState.pCM      = [px_CM, py_CM];
      outputState.CM       = [x_CM, y_CM];
      outputState.vCM      = [vx_CM, vy_CM];
      outputState.omega_CM = omega_CM;
    },

    /**
      Given a test element and charge, returns a function that returns for a location (x, y) in nm:
       * the potential energy, in eV, of an atom of that element and charge at location (x, y)
       * optionally, if calculateGradient is true, the gradient of the potential as an
         array [gradX, gradY]. (units: eV/nm)
    */
    newPotentialCalculator: function(testElement, testCharge, calculateGradient) {

      return function(testX, testY) {
        var PE = 0,
            fx = 0,
            fy = 0,
            gradX,
            gradY,
            ljTest = ljCalculator[testElement],
            i,
            dx,
            dy,
            r_sq,
            r,
            f_over_r,
            lj;

        for (i = 0; i < N; i++) {
          dx = testX - x[i];
          dy = testY - y[i];
          r_sq = dx*dx + dy*dy;
          f_over_r = 0;

          if (useLennardJonesInteraction) {
            lj = ljTest[element[i]];
            PE += -lj.potentialFromSquaredDistance(r_sq, testElement, element[i]);
            if (calculateGradient) {
              f_over_r += lj.forceOverDistanceFromSquaredDistance(r_sq);
            }
          }

          if (useCoulombInteraction && testCharge) {
            r = Math.sqrt(r_sq);
            PE += -coulomb.potential(r, testCharge, charge[i]);
            if (calculateGradient) {
              f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, testCharge, charge[i]);
            }
          }

          if (f_over_r) {
            fx += f_over_r * dx;
            fy += f_over_r * dy;
          }
        }

        if (calculateGradient) {
          gradX = constants.convert(fx, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
          gradY = constants.convert(fy, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
          return [PE, [gradX, gradY]];
        }

        return PE;
      };
    },

    /**
      Starting at (x,y), try to find a position which minimizes the potential energy change caused
      by adding at atom of element el.
    */
    findMinimumPELocation: function(el, x, y, charge) {
      var pot    = model.newPotentialCalculator(el, charge, true),
          radius = elements[el][ELEMENT_INDICES.RADIUS],

          res =  math.minimize(pot, [x, y], {
            bounds: [ [radius, size[0]-radius], [radius, size[1]-radius] ]
          });

      if (res.error) return false;
      return res[1];
    },

    /**
      Starting at (x,y), try to find a position which minimizes the square of the potential energy
      change caused by adding at atom of element el, i.e., find a "farthest from everything"
      position.
    */
    findMinimumPESquaredLocation: function(el, x, y, charge) {
      var pot = model.newPotentialCalculator(el, charge, true),

          // squared potential energy, with gradient
          potsq = function(x,y) {
            var res, f, grad;

            res = pot(x,y);
            f = res[0];
            grad = res[1];

            // chain rule
            grad[0] *= (2*f);
            grad[1] *= (2*f);

            return [f*f, grad];
          },

          radius = elements[el][ELEMENT_INDICES.RADIUS],

          res = math.minimize(potsq, [x, y], {
            bounds: [ [radius, size[0]-radius], [radius, size[1]-radius] ],
            stopval: 1e-4,
            precision: 1e-6
          });

      if (res.error) return false;
      return res[1];
    },

    serialize: function() {
      var serializedData = {},
          prop,
          array,
          i, ii;
      for (i=0, ii=SAVEABLE_INDICES.length; i<ii; i++) {
        prop = SAVEABLE_INDICES[i];
        array = atoms[INDICES[prop]];
        serializedData[prop] = array.slice ? array.slice() : copyTypedArray(array);
      }
      return serializedData;
    }
  };
};
});
require("/md2d.js");
/*globals $ modeler:true, require, d3, benchmark, molecule_container */
/*jslint onevar: true devel:true eqnull: true */

// modeler.js
//

var md2d = require('/md2d'),
    arrays = require('/arrays/arrays').arrays,
    coreModel;

modeler = {};
modeler.VERSION = '0.2.0';

modeler.model = function(initialProperties) {
  var model = {},
      elements = initialProperties.elements || [{id: 0, mass: 39.95, epsilon: -0.1, sigma: 0.34}],
      dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack", "seek"),
      temperature_control,
      lennard_jones_forces, coulomb_forces,
      stopped = true,
      tick_history_list = [],
      tick_history_list_index = 0,
      tick_counter = 0,
      new_step = false,
      pressure, pressures = [0],
      sample_time, sample_times = [],

      // N.B. this is the thermostat (temperature control) setting
      temperature,

      // current model time, in fs
      time,

      // potential energy
      pe,

      // kinetic energy
      ke,

      modelOutputState,
      model_listener,

      width = initialProperties.width,
      height = initialProperties.height,

      //
      // A two dimensional array consisting of arrays of node property values
      //
      nodes,

      listeners = {},

      properties = {
        temperature           : 300,
        coulomb_forces        : false,
        lennard_jones_forces  : true,
        temperature_control   : true,

        set_temperature: function(t) {
          this.temperature = t;
          if (coreModel) {
            coreModel.setTargetTemperature(t);
          }
        },

        set_temperature_control: function(tc) {
          this.temperature_control = tc;
          if (coreModel) {
            coreModel.useThermostat(tc);
          }
        },

        set_coulomb_forces: function(cf) {
          this.coulomb_forces = cf;
          if (coreModel) {
            coreModel.useCoulombInteraction(cf);
          }
        },

        set_epsilon: function(e) {
          console.log("set_epsilon: This method is temporarily deprecated");
        },

        set_sigma: function(s) {
          console.log("set_sigma: This method is temporarily deprecated");
        }
      };

  //
  // Indexes into the nodes array for the individual node property arrays
  // (re-export these from coreModel for convenience)
  //
  model.INDICES = {
    RADIUS   : md2d.INDICES.RADIUS,
    PX       : md2d.INDICES.PX,
    PY       : md2d.INDICES.PY,
    X        : md2d.INDICES.X,
    Y        : md2d.INDICES.Y,
    VX       : md2d.INDICES.VX,
    VY       : md2d.INDICES.VY,
    SPEED    : md2d.INDICES.SPEED,
    AX       : md2d.INDICES.AX,
    AY       : md2d.INDICES.AY,
    CHARGE   : md2d.INDICES.CHARGE,
    ELEMENT  : md2d.INDICES.ELEMENT
  };

  function notifyListeners(listeners) {
    $.unique(listeners);
    for (var i=0, ii=listeners.length; i<ii; i++){
      listeners[i]();
    }
  }

  function notifyListenersOfEvents(events) {
    var evt,
        evts,
        waitingToBeNotified = [],
        i, ii;

    if (typeof events === "string") {
      evts = [events];
    } else {
      evts = events;
    }
    for (i=0, ii=evts.length; i<ii; i++){
      evt = evts[i];
      if (listeners[evt]) {
        waitingToBeNotified = waitingToBeNotified.concat(listeners[evt]);
      }
    }
    if (listeners["all"]){      // listeners that want to be notified on any change
      waitingToBeNotified = waitingToBeNotified.concat(listeners["all"]);
    }
    notifyListeners(waitingToBeNotified);
  }

  function average_speed() {
    var i, s = 0, n = model.get_num_atoms();
    i = -1; while (++i < n) { s += coreModel.speed[i]; }
    return s/n;
  }

  function tick(elapsedTime, dontDispatchTickEvent) {
    var t;

    coreModel.integrate();

    pressure = modelOutputState.pressure;
    pe       = modelOutputState.PE;
    ke       = modelOutputState.KE;
    time     = modelOutputState.time;

    pressures.push(pressure);
    pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

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
    }

    if (!dontDispatchTickEvent) dispatch.tick();
    return stopped;
  }

  function tick_history_list_is_empty() {
    return tick_history_list_index === 0;
  }

  function tick_history_list_push() {
    var i,
        newnodes = [],
        n = nodes.length;

    i = -1; while (++i < n) {
      newnodes[i] = arrays.clone(nodes[i]);
    }
    tick_history_list.length = tick_history_list_index;
    tick_history_list_index++;
    tick_counter++;
    new_step = true;
    tick_history_list.push({
      nodes:   newnodes,
      pressure: modelOutputState.pressure,
      pe:       modelOutputState.PE,
      ke:       modelOutputState.KE,
      time:     modelOutputState.time
    });
    if (tick_history_list_index > 1000) {
      tick_history_list.splice(0,1);
      tick_history_list_index = 1000;
    }
  }

  function reset_tick_history_list() {
    tick_history_list = [];
    tick_history_list_index = 0;
    tick_counter = 0;
  }

  function tick_history_list_reset_to_ptr() {
    tick_history_list.length = tick_history_list_index + 1;
  }

  function tick_history_list_extract(index) {
    var i, n=nodes.length;
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
    time = tick_history_list[index].time;
    coreModel.setTime(time);
  }

  function container_pressure() {
    return pressures.reduce(function(j,k) { return j+k; })/pressures.length;
  }

  function average_rate() {
    var i, ave, s = 0, n = sample_times.length;
    i = -1; while (++i < n) { s += sample_times[i]; }
    ave = s/n;
    return (ave ? 1/ave*1000: 0);
  }

  function set_temperature(t) {
    temperature = t;
    coreModel.setTargetTemperature(t);
  }

  function set_properties(hash) {
    var property, propsChanged = [];
    for (property in hash) {
      if (hash.hasOwnProperty(property) && hash[property] !== undefined && hash[property] !== null) {
        // look for set method first, otherwise just set the property
        if (properties["set_"+property]) {
          properties["set_"+property](hash[property]);
        } else if (properties[property]) {
          properties[property] = hash[property];
        }
        propsChanged.push(property);
      }
    }
    notifyListenersOfEvents(propsChanged);
  }

  function readModelState() {
    coreModel.computeOutputState();

    pressure = modelOutputState.pressure;
    pe       = modelOutputState.PE;
    ke       = modelOutputState.KE;
    time     = modelOutputState.time;
  }

  // ------------------------------
  // finish setting up the model
  // ------------------------------

  // who is listening to model tick completions
  model_listener = initialProperties.model_listener;

  // set the rest of the regular properties
  set_properties(initialProperties);

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

  // A convenience for interactively getting energy averages
  model.getStatsHistory = function() {
    var i, len,
        tick,
        ret = [];

    ret.push("time (fs)\ttotal PE (eV)\ttotal KE (eV)\ttotal energy (eV)");

    for (i = 0, len = tick_history_list.length; i < len; i++) {
      tick = tick_history_list[i];
      ret.push(tick.time + "\t" + tick.pe + "\t" + tick.ke + "\t" + (tick.pe+tick.ke));
    }
    return ret.join('\n');
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
    dispatch.seek();
    notifyListenersOfEvents("seek");
    if (model_listener) { model_listener(); }
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
      }
    }
    return tick_counter;
  };

  /**
    Creates a new md2d model with a new set of atoms and leaves it in 'coreModel'

    @config: either the number of atoms (for a random setup) or
             a hash specifying the x,y,vx,vy properties of the atoms
    When random setup is used, the option 'relax' determines whether the model is requested to
    relax to a steady-state temperature (and in effect gets thermalized). If false, the atoms are
    left in whatever grid the coreModel's initialization leaves them in.
  */
  model.createNewAtoms = function(config) {
    var elemsArray, element, i, ii, num;

    if (typeof config === 'number') {
      num = config;
    } else if (config.num != null) {
      num = config.num;
    } else if (config.X) {
      num = config.X.length;
    }

    // convert from easily-readble json format to simplified array format
    elemsArray = [];
    for (i=0, ii=elements.length; i<ii; i++){
      element = elements[i];
      elemsArray[element.id] = [element.mass, element.epsilon, element.sigma];
    }

    // get a fresh model
    coreModel = md2d.makeModel();
    coreModel.setSize([width,height]);
    coreModel.setElements(elemsArray);
    coreModel.createAtoms({
      num: num
    });

    nodes = coreModel.atoms;
    modelOutputState = coreModel.outputState;

    // Initialize properties
    temperature_control = properties.temperature_control;
    temperature         = properties.temperature;

    coreModel.useLennardJonesInteraction(properties.lennard_jones_forces);
    coreModel.useCoulombInteraction(properties.coulomb_forces);
    coreModel.useThermostat(temperature_control);

    coreModel.setTargetTemperature(temperature);

    if (config.X && config.Y) {
      coreModel.initializeAtomsFromProperties(config);
    } else {
      coreModel.initializeAtomsRandomly({
        temperature: temperature
      });
      if (config.relax) coreModel.relaxToTemperature();
    }

    readModelState();

    // tick history stuff
    reset_tick_history_list();
    tick_history_list_push();
    tick_counter = 0;
    new_step = true;

    // return model, for chaining (if used)
    return model;
  };

  model.createRadialBonds = function(radialBonds) {
    coreModel.initializeRadialBonds(radialBonds);
    readModelState();
    return model;
  };

  // The next four functions assume we're are doing this for
  // all the atoms will need to be changed when different atoms
  // can have different LJ sigma values

  /** Accepts an epsilon value in eV.

      Example value for argon is 0.013 (positive)
  */
  model.setEpsilon = function(e) {
    coreModel.setLJEpsilon(e);
  };

  /** Accepts a sigma value in nm

    Example value for argon is 3.4 nm
  */
  model.setSigma = function(s) {
    coreModel.setLJSigma(s);
  };

  model.getEpsilon = function() {
    return coreModel.getLJEpsilon();
  };

  model.getSigma = function() {
    return coreModel.getLJSigma();
  };

  model.getLJCalculator = function() {
    return coreModel.getLJCalculator();
  };

  model.getPotentialFunction = function(element, charge, calculateGradient) {
    if (charge == null) charge = 0;
    calculateGradient = !!calculateGradient;

    return coreModel.newPotentialCalculator(element, charge, calculateGradient);
  },

  model.resetTime = function() {
    coreModel.setTime(0);
  };

  model.getTime = function() {
    return modelOutputState ? modelOutputState.time : undefined;
  };

  model.getTotalMass = function() {
    return coreModel.getTotalMass();
  };

  /**
    Attempts to add an 0-velocity atom to a random location. Returns false if after 10 tries it
    can't find a location. (Intended to be exposed as a script API method.)

    Optionally allows specifying the element (default is to randomly select from all elements) and
    charge (default is neutral).
  */
  model.addRandomAtom = function(el, charge) {
    if (el == null) el = Math.floor( Math.random() * elements.length );
    if (charge == null) charge = 0;

    var size   = model.size(),
        radius = coreModel.getRadiusOfElement(el),
        x,
        y,
        loc,
        numTries = 0,
        // try at most ten times.
        maxTries = 10;

    do {
      x = Math.random() * size[0] - 2*radius;
      y = Math.random() * size[1] - 2*radius;

      // findMinimimuPELocation will return false if minimization doesn't converge, in which case
      // try again from a different x, y
      loc = coreModel.findMinimumPELocation(el, x, y, 0, 0, charge);
      if (loc && model.addAtom(el, loc[0], loc[1], 0, 0, charge)) return true;
    } while (++numTries < maxTries);

    return false;
  },

  /**
    Adds a new atom with element 'el', charge 'charge', and velocity '[vx, vy]' to the model
    at position [x, y]. (Intended to be exposed as a script API method.)

    Adjusts (x,y) if needed so that the whole atom is within the walls of the container.

    Returns false and does not add the atom if the potential energy change of adding an *uncharged*
    atom of the specified element to the specified location would be positive (i.e, if the atom
    intrudes into the repulsive region of another atom.)

    Otherwise, returns true.
  */
  model.addAtom = function(el, x, y, vx, vy, charge) {
    var size      = model.size(),
        radius    = coreModel.getRadiusOfElement(el);

    // As a convenience to script authors, bump the atom within bounds
    if (x < radius) x = radius;
    if (x > size[0]-radius) x = size[0]-radius;
    if (y < radius) y = radius;
    if (y > size[1]-radius) y = size[1]-radius;

    // check the potential energy change caused by adding an *uncharged* atom at (x,y)
    if (model.getPotentialFunction(el, 0, false)(x, y) <= 0) {
      coreModel.addAtom(el, x, y, vx, vy, charge);

      // reassign nodes to possibly-reallocated atoms array
      nodes = coreModel.atoms;
      coreModel.computeOutputState();
      if (model_listener) model_listener();

      return true;
    }
    // return false on failure
    return false;
  },

  // return a copy of the array of speeds
  model.get_speed = function() {
    return arrays.copy(coreModel.speed, []);
  };

  model.get_rate = function() {
    return average_rate();
  };

  model.is_stopped = function() {
    return stopped;
  };

  model.set_lennard_jones_forces = function(lj) {
   lennard_jones_forces = lj;
   coreModel.useLennardJonesInteraction(lj);
  };

  model.set_coulomb_forces = function(cf) {
   coulomb_forces = cf;
   coreModel.useCoulombInteraction(cf);
  };

  model.get_nodes = function() {
    return nodes;
  };

  model.get_num_atoms = function() {
    return nodes[0].length;
  };

  model.on = function(type, listener) {
    dispatch.on(type, listener);
    return model;
  };

  model.tickInPlace = function() {
    dispatch.tick();
    return model;
  };

  model.tick = function(num, opts) {
    if (!arguments.length) num = 1;

    var dontDispatchTickEvent = opts && opts.dontDispatchTickEvent || false,
        i = -1;

    while(++i < num) {
      tick(null, dontDispatchTickEvent);
    }
    return model;
  };

  model.relax = function() {
    coreModel.relaxToTemperature();
    return model;
  };

  model.start = function() {
    return model.resume();
  };

  model.resume = function() {
    stopped = false;
    d3.timer(tick);
    dispatch.play();
    notifyListenersOfEvents("play");
    return model;
  };

  model.stop = function() {
    stopped = true;
    dispatch.stop();
    return model;
  };

  model.ke = function() {
    return modelOutputState ? modelOutputState.KE : undefined;
  };

  model.ave_ke = function() {
    return modelOutputState? modelOutputState.KE / model.get_num_atoms() : undefined;
  };

  model.pe = function() {
    return modelOutputState ? modelOutputState.PE : undefined;
  };

  model.ave_pe = function() {
    return modelOutputState? modelOutputState.PE / model.get_num_atoms() : undefined;
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
    if (!arguments.length) return coreModel.getSize();
    coreModel.setSize(x);
    return model;
  };

  model.set = function(hash) {
    set_properties(hash);
  };

  model.get = function(property) {
    return properties[property];
  };

  /**
    Set the 'model_listener' function, which is called on tick events.
  */
  model.setModelListener = function(listener) {
    model_listener = listener;
    model.on('tick', model_listener);
    return model;
  };

  // Add a listener that will be notified any time any of the properties
  // in the passed-in array of properties is changed.
  // This is a simple way for views to update themselves in response to
  // properties being set on the model object.
  // Observer all properties with addPropertiesListener(["all"], callback);
  model.addPropertiesListener = function(properties, callback) {
    var i, ii, prop;
    for (i=0, ii=properties.length; i<ii; i++){
      prop = properties[i];
      if (!listeners[prop]) {
        listeners[prop] = [];
      }
      listeners[prop].push(callback);
    }
  };

  model.serialize = function(includeAtoms) {
    var propCopy = $.extend({}, properties);
    if (includeAtoms) {
      propCopy.atoms = coreModel.serialize();
    }
    if (elements) {
      propCopy.elements = elements;
    }
    propCopy.width = width;
    propCopy.height = height;
    return propCopy;
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

/*jslint indent: 2 */
//
// energy2d-module.js
//

// Module definition and namespace helper function.

energy2d = { VERSION: "0.1.0" };

energy2d.namespace = function (ns_string) {
  'use strict';
  var
    parts = ns_string.split('.'),
    parent = energy2d,
    i;
  // Strip redundant leading global.
  if (parts[0] === "energy2d") {
    parts = parts.slice(1);
  }
  for (i = 0; i < parts.length; i += 1) {
    // Create a property if it doesn't exist.
    if (typeof parent[parts[i]] === "undefined") {
      parent[parts[i]] = {};
    }
    parent = parent[parts[i]];
  }
  return parent;
};
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

if (!process.env) process.env = {};
if (!process.argv) process.argv = [];

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
  // fill = fill || 0; -> this doesn't handle NaN value
  if (fill === undefined)
    fill = 0;
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
  if (arrays.constructor_function(dest) === Array) dest.length = len;
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

require.define("/physics-solvers/heat-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK
// TODO: fix loops (nx vs ny)
//
// lab/models/energy2d/engines/heat-solver.js
//

var
  arrays = require('../arrays/arrays.js').arrays,

  RELAXATION_STEPS = 5;

exports.makeHeatSolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options = model.getModelOptions(),
    timeStep = model_options.timestep,
    boundary = model_options.boundary,

    deltaX = model_options.model_width / model.getGridWidth(),
    deltaY = model_options.model_height / model.getGridHeight(),

    relaxationSteps = RELAXATION_STEPS,

    // Simulation arrays provided by model.
    conductivity = model.getConductivityArray(),
    capacity     = model.getCapacityArray(),
    density      = model.getDensityArray(),
    u            = model.getUVelocityArray(),
    v            = model.getVVelocityArray(),
    tb           = model.getBoundaryTemperatureArray(),
    fluidity     = model.getFluidityArray(),

    // Internal array that stores the previous temperature results.
    t0 = arrays.create(nx * ny, 0, model.getArrayType()),

    // Convenience variables.  
    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    //
    // Private methods
    //
    applyBoundary  = function (t) {
      var
        vN, vS, vW, vE,
        i, j, inx, inx_ny1;

      if (boundary.temperature_at_border) {
        vN = boundary.temperature_at_border.upper;
        vS = boundary.temperature_at_border.lower;
        vW = boundary.temperature_at_border.left;
        vE = boundary.temperature_at_border.right;
        for (i = 0; i < nx; i += 1) {
          inx = i * nx;
          t[inx] = vN;
          t[inx + ny1] = vS;
        }
        for (j = 0; j <  ny; j += 1) {
          t[j] = vW;
          t[nx1 * nx + j] = vE;
        }
      } else if (boundary.flux_at_border) {
        vN = boundary.flux_at_border.upper;
        vS = boundary.flux_at_border.lower;
        vW = boundary.flux_at_border.left;
        vE = boundary.flux_at_border.right;
        for (i = 0; i < nx; i += 1) {
          inx = i * nx;
          inx_ny1 = inx + ny1;
          t[inx] = t[inx + 1] + vN * deltaY / conductivity[inx];
          t[inx_ny1] = t[inx + ny2] - vS * deltaY / conductivity[inx_ny1];
        }
        for (j = 0; j < ny; j += 1) {
          t[j] = t[nx + j] - vW * deltaX / conductivity[j];
          t[nx1 * nx + j] = t[nx2 * nx + j] + vE * deltaX / conductivity[nx1 * nx + j];
        }
      } else {
        throw new Error("Heat solver: wrong boundary settings definition.");
      }
    },

    macCormack  = function (t) {
      var
        tx = 0.5 * timeStep / deltaX,
        ty = 0.5 * timeStep / deltaY,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          jinx_minus_nx = jinx - nx;
          jinx_plus_nx = jinx + nx;
          jinx_minus_1 = jinx - 1;
          jinx_plus_1 = jinx + 1;
          if (fluidity[jinx]) {
            t0[jinx] = t[jinx]
              - tx * (u[jinx_plus_nx] * t[jinx_plus_nx] - u[jinx_minus_nx] * t[jinx_minus_nx])
              - ty * (v[jinx_plus_1] * t[jinx_plus_1] - v[jinx_minus_1] * t[jinx_minus_1]);
          }
        }
      }
      applyBoundary(t0);

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            t[jinx] = 0.5 * (t[jinx] + t0[jinx]) - 0.5 * tx * u[jinx]
              * (t0[jinx_plus_nx] - t0[jinx_minus_nx]) - 0.5 * ty * v[jinx]
              * (t0[jinx_plus_1] - t0[jinx_minus_1]);
          }
        }
      }
      applyBoundary(t);
    };

  return {
    solve: function (convective, t, q) {
      var
        hx = 0.5 / (deltaX * deltaX),
        hy = 0.5 / (deltaY * deltaY),
        invTimeStep = 1.0 / timeStep,
        rij, sij, axij, bxij, ayij, byij,
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      arrays.copy(t, t0);

      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (isNaN(tb[jinx])) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              sij = capacity[jinx] * density[jinx] * invTimeStep;
              rij = conductivity[jinx];
              axij = hx * (rij + conductivity[jinx_minus_nx]);
              bxij = hx * (rij + conductivity[jinx_plus_nx]);
              ayij = hy * (rij + conductivity[jinx_minus_1]);
              byij = hy * (rij + conductivity[jinx_plus_1]);
              t[jinx] = (t0[jinx] * sij + q[jinx] + axij * t[jinx_minus_nx] + bxij
                        * t[jinx_plus_nx] + ayij * t[jinx_minus_1] + byij * t[jinx_plus_1])
                        / (sij + axij + bxij + ayij + byij);
            } else {
              t[jinx] = tb[jinx];
            }
          }
        }
        applyBoundary(t);
      }
      if (convective) {
        // advect(t)
        macCormack(t);
      }
    }
  };
};

});

require.define("/physics-solvers/fluid-solver.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK
//
// lab/models/energy2d/engines/fluid-solver.js
//
var
  arrays = require('../arrays/arrays.js').arrays,

  RELAXATION_STEPS = 5,
  GRAVITY = 0,

  BUOYANCY_AVERAGE_ALL = 0,
  BUOYANCY_AVERAGE_COLUMN = 1;

exports.makeFluidSolver = function (model) {
  'use strict';
  var
    nx = model.getGridWidth(),
    ny = model.getGridHeight(),

    // Basic simulation parameters.
    model_options         = model.getModelOptions(),
    timeStep              = model_options.timestep,
    thermalBuoyancy       = model_options.thermal_buoyancy,
    buoyancyApproximation = model_options.buoyancy_approximation,
    viscosity             = model_options.background_viscosity,

    deltaX = model_options.model_width / model.getGridWidth(),
    deltaY = model_options.model_height / model.getGridHeight(),

    relaxationSteps = RELAXATION_STEPS,
    gravity = GRAVITY,

    // Simulation arrays provided by model.
    t        = model.getTemperatureArray(),
    fluidity = model.getFluidityArray(),
    uWind    = model.getUWindArray(),
    vWind    = model.getVWindArray(),

    // Internal simulation arrays.
    array_type = model.getArrayType(),
    u0         = arrays.create(nx * ny, 0, array_type),
    v0         = arrays.create(nx * ny, 0, array_type),

    // Convenience variables.   
    i2dx  = 0.5 / deltaX,
    i2dy  = 0.5 / deltaY,
    idxsq = 1.0 / (deltaX * deltaX),
    idysq = 1.0 / (deltaY * deltaY),

    nx1 = nx - 1,
    ny1 = ny - 1,
    nx2 = nx - 2,
    ny2 = ny - 2,

    // 
    // Private methods
    //

    // b = 1 horizontal; b = 2 vertical 
    applyBoundary = function (b, f) {
      var
        horizontal = b === 1,
        vertical   = b === 2,
        nx1nx = nx1 * nx,
        nx2nx = nx2 * nx,
        i, j, inx, inx_plus1, inx_plus_ny1, inx_plus_ny2, nx_plusj;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        inx_plus1 = inx + 1;
        inx_plus_ny1 = inx + ny1;
        inx_plus_ny2 = inx + ny2;
        // upper side
        f[inx] = vertical ? -f[inx_plus1] : f[inx_plus1];
        // lower side
        f[inx_plus_ny1] = vertical ? -f[inx_plus_ny2] : f[inx_plus_ny2];
      }
      for (j = 1; j < ny1; j += 1) {
        // left side
        nx_plusj = nx + j;
        f[j] = horizontal ? -f[nx_plusj] : f[nx_plusj];
        // right side
        f[nx1nx + j] = horizontal ? -f[nx2nx + j] : f[nx2nx + j];
      }

      // upper-left corner
      f[0] = 0.5 * (f[nx] + f[1]);
      // upper-right corner
      f[nx1nx] = 0.5 * (f[nx2nx] + f[nx1nx + 1]);
      // lower-left corner
      f[ny1] = 0.5 * (f[nx + ny1] + f[ny2]);
      // lower-right corner
      f[nx1nx + ny1] = 0.5 * (f[nx2nx + ny1] + f[nx1nx + ny2]);
    },

    setObstacleVelocity = function (u, v) {
      var
        count = 0,
        uw, vw,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          jinx_minus_nx = jinx - nx;
          jinx_plus_nx = jinx + nx;
          jinx_minus_1 = jinx - 1;
          jinx_plus_1 = jinx + 1;

          if (!fluidity[jinx]) {
            uw = uWind[jinx];
            vw = vWind[jinx];
            count = 0;
            if (fluidity[jinx_minus_nx]) {
              count += 1;
              u[jinx] = uw - u[jinx_minus_nx];
              v[jinx] = vw + v[jinx_minus_nx];
            } else if (fluidity[jinx_plus_nx]) {
              count += 1;
              u[jinx] = uw - u[jinx_plus_nx];
              v[jinx] = vw + v[jinx_plus_nx];
            }
            if (fluidity[jinx_minus_1]) {
              count += 1;
              u[jinx] = uw + u[jinx_minus_1];
              v[jinx] = vw - v[jinx_minus_1];
            } else if (fluidity[jinx_plus_1]) {
              count += 1;
              u[jinx] = uw + u[jinx_plus_1];
              v[jinx] = vw - v[jinx_plus_1];
            }
            if (count === 0) {
              u[jinx] = uw;
              v[jinx] = vw;
            }
          }
        }
      }
    },

    // ensure dx/dn = 0 at the boundary (the Neumann boundary condition)
    // float[][] x
    setObstacleBoundary = function (x) {
      var i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (!fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            if (fluidity[jinx_minus_nx]) {
              x[jinx] = x[jinx_minus_nx];
            } else if (fluidity[jinx_plus_nx]) {
              x[jinx] = x[jinx_plus_nx];
            }
            if (fluidity[jinx_minus_1]) {
              x[jinx] = x[jinx_minus_1];
            } else if (fluidity[jinx_plus_1]) {
              x[jinx] = x[jinx_plus_1];
            }
          }
        }
      }
    },

    getMeanTemperature = function (i, j) {
      var
        lowerBound = 0,
        upperBound = ny,
        t0 = 0,
        k, inx_plus_k;

        // search for the upper bound
      for (k = j - 1; k > 0; k -= 1) {
        inx_plus_k = i * nx + k;
        if (!fluidity[inx_plus_k]) {
          lowerBound = k;
          break;
        }
      }

      for (k = j + 1; k < ny; k += 1) {
        inx_plus_k = i * nx + k;
        if (!fluidity[inx_plus_k]) {
          upperBound = k;
          break;
        }
      }

      for (k = lowerBound; k < upperBound; k += 1) {
        inx_plus_k = i * nx + k;
        t0 += t[inx_plus_k];
      }
      return t0 / (upperBound - lowerBound);
    },

    applyBuoyancy = function (f) {
      var
        g = gravity * timeStep,
        b = thermalBuoyancy * timeStep,
        t0,
        i, j, inx, jinx;

      switch (buoyancyApproximation) {
      case BUOYANCY_AVERAGE_ALL:
        t0 = (function (array) {
          // Returns average value of an array.
          var
            acc = 0,
            length = array.length,
            i;
          for (i = 0; i < length; i += 1) {
            acc += array[i];
          }
          return acc / length;
        }(t)); // Call with the temperature array.
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              f[jinx] += (g - b) * t[jinx] + b * t0;
            }
          }
        }
        break;
      case BUOYANCY_AVERAGE_COLUMN:
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              t0 = getMeanTemperature(i, j);
              f[jinx] += (g - b) * t[jinx] + b * t0;
            }
          }
        }
        break;
      }
    },

    conserve = function (u, v, phi, div) {
      var
        s = 0.5 / (idxsq + idysq),
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            div[jinx] = (u[jinx_plus_nx] - u[jinx_minus_nx]) * i2dx + (v[jinx_plus_1] - v[jinx_minus_1]) * i2dy;
            phi[jinx] = 0;
          }
        }
      }
      applyBoundary(0, div);
      applyBoundary(0, phi);
      setObstacleBoundary(div);
      setObstacleBoundary(phi);

      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              phi[jinx] = s
                  * ((phi[jinx_minus_nx] + phi[jinx_plus_nx]) * idxsq
                  + (phi[jinx_minus_1] + phi[jinx_plus_1]) * idysq - div[jinx]);
            }
          }
        }
      }

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            u[jinx] -= (phi[jinx_plus_nx] - phi[jinx_minus_nx]) * i2dx;
            v[jinx] -= (phi[jinx_plus_1] - phi[jinx_minus_1]) * i2dy;
          }
        }
      }
      applyBoundary(1, u);
      applyBoundary(2, v);
    },

    diffuse = function (b, f0, f) {
      var
        hx = timeStep * viscosity * idxsq,
        hy = timeStep * viscosity * idysq,
        dn = 1.0 / (1 + 2 * (hx + hy)),
        k, i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      arrays.copy(f, f0);
      for (k = 0; k < relaxationSteps; k += 1) {
        for (i = 1; i < nx1; i += 1) {
          inx = i * nx;
          for (j = 1; j < ny1; j += 1) {
            jinx = inx + j;
            if (fluidity[jinx]) {
              jinx_minus_nx = jinx - nx;
              jinx_plus_nx = jinx + nx;
              jinx_minus_1 = jinx - 1;
              jinx_plus_1 = jinx + 1;

              f[jinx] = (f0[jinx] + hx * (f[jinx_minus_nx] + f[jinx_plus_nx]) + hy
                      * (f[jinx_minus_1] + f[jinx_plus_1]))
                      * dn;
            }
          }
        }
        applyBoundary(b, f);
      }
    },

    // MacCormack
    macCormack = function (b, f0, f) {
      var
        tx = 0.5 * timeStep / deltaX,
        ty = 0.5 * timeStep / deltaY,
        i, j, inx, jinx, jinx_plus_nx, jinx_minus_nx, jinx_plus_1, jinx_minus_1;

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            f[jinx] = f0[jinx]
                    - tx
                    * (u0[jinx_plus_nx] * f0[jinx_plus_nx] - u0[jinx_minus_nx]
                            * f0[jinx_minus_nx])
                    - ty
                    * (v0[jinx_plus_1] * f0[jinx_plus_1] - v0[jinx_minus_1]
                            * f0[jinx_minus_1]);
          }
        }
      }

      applyBoundary(b, f);

      for (i = 1; i < nx1; i += 1) {
        inx = i * nx;
        for (j = 1; j < ny1; j += 1) {
          jinx = inx + j;
          if (fluidity[jinx]) {
            jinx_minus_nx = jinx - nx;
            jinx_plus_nx = jinx + nx;
            jinx_minus_1 = jinx - 1;
            jinx_plus_1 = jinx + 1;

            f0[jinx] = 0.5 * (f0[jinx] + f[jinx]) - 0.5 * tx
                    * u0[jinx] * (f[jinx_plus_nx] - f[jinx_minus_nx]) - 0.5
                    * ty * v0[jinx] * (f[jinx_plus_1] - f[jinx_minus_1]);
          }
        }
      }

      arrays.copy(f0, f);

      applyBoundary(b, f);
    },

    advect = function (b, f0, f) {
      macCormack(b, f0, f);
    };

  return {
    // TODO: swap the two arrays instead of copying them every time?
    solve: function (u, v) {
      if (thermalBuoyancy !== 0) {
        applyBuoyancy(v);
      }
      setObstacleVelocity(u, v);
      if (viscosity > 0) {
        // inviscid case
        diffuse(1, u0, u);
        diffuse(2, v0, v);
        conserve(u, v, u0, v0);
        setObstacleVelocity(u, v);
      }
      arrays.copy(u, u0);
      arrays.copy(v, v0);
      advect(1, u0, u);
      advect(2, v0, v);
      conserve(u, v, u0, v0);
      setObstacleVelocity(u, v);
    }
  };
};
});

require.define("/part.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
// JSLint report: OK (complaining only about Array(size) constructor)
//
// lab/models/energy2d/engines/this.js
//

// Based on: http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
// It is optional to repeat the first vertex at the end of list of polygon vertices.
var
  default_config = require('./default-config.js'),

  pointInsidePolygon = function (nvert, vertx, verty, testx, testy) {
    'use strict';
    var c = 0, i, j;
    for (i = 0, j = nvert - 1; i < nvert; j = i += 1) {
      if (((verty[i] > testy) !== (verty[j] > testy)) && (testx < (vertx[j] - vertx[i]) * (testy - verty[i]) / (verty[j] - verty[i]) + vertx[i])) {
        c = !c;
      }
    }
    return c;
  };

exports.Part = function (options) {
  'use strict';
  var count, i;

  options = default_config.fillWithDefaultValues(options, default_config.DEFAULT_VALUES.part);

  // Validate and process options.

  // Check shape
  if (options.rectangle) {
    this.rectangle = options.rectangle;
  } else if (options.ellipse) {
    this.ellipse = options.ellipse;
  } else if (options.ring) {
    this.ring = options.ring;
  } else if (options.polygon) {
    this.polygon = options.polygon;
  } else {
    throw new Error("Part: shape not defined.");
  }

  if (this.polygon && typeof (this.polygon.vertices) === "string") {
    count = this.polygon.count;
    this.polygon.vertices = this.polygon.vertices.split(', ');
    if (count * 2 !== this.polygon.vertices.length) {
      throw new Error("Part: polygon contains different vertices count than declared in the count parameter.");
    }
    for (i = 0; i < count * 2; i += 1) {
      this.polygon.vertices[i] = Number(this.polygon.vertices[i]);
    }
  }

  // source properties
  this.thermal_conductivity = options.thermal_conductivity;
  this.specific_heat = options.specific_heat;
  this.density = options.density;
  this.temperature = options.temperature;
  this.constant_temperature = options.constant_temperature;
  this.power = options.power;
  this.wind_speed = options.wind_speed;
  this.wind_angle = options.wind_angle;

  // visual properties
  this.visible = options.visible;
  this.filled = options.filled;
  this.color = options.color;
  this.texture = options.texture;
  this.label = options.label;
};

exports.Part.prototype.getLabel = function () {
  'use strict';
  var label = this.label, s;

  if (label === "%temperature") {
    s = this.temperature + " \u00b0C";
  } else if (label === "%density") {
    s = this.density + " kg/m\u00b3";
  } else if (label === "%specific_heat") {
    s = this.specific_heat + " J/(kg\u00d7\u00b0C)";
  } else if (label === "%thermal_conductivity") {
    s = this.thermal_conductivity + " W/(m\u00d7\u00b0C)";
  } else if (label === "%power_density") {
    s = this.power + " W/m\u00b3";
  } else if (label === "%area") {
    if (this.rectangle) {
      s = (this.rectangle.width * this.rectangle.height) + " m\u00b2";
    } else if (this.ellipse) {
      s = (this.ellipse.width * this.ellipse.height * 0.25 * Math.PI) + " m\u00b2";
    }
  } else if (label === "%width") {
    if (this.rectangle) {
      s = this.rectangle.width + " m";
    } else if (this.ellipse) {
      s = this.ellipse.width + " m";
    }
  } else if (label === "%height") {
    if (this.rectangle) {
      s = this.rectangle.height + " m";
    } else if (this.ellipse) {
      s = this.ellipse.height + " m";
    }
  } else {
    s = label;
  }
  return s;
};

// Returns cells occupied by part on the given grid
// Grid is described by:
//   nx - grid columns count
//   ny - grid rows count
//   lx - grid width
//   ly - grid height
exports.Part.prototype.getGridCells = function (nx, ny, lx, ly) {
  'use strict';
  var
    nx1 = nx - 1,
    ny1 = ny - 1,
    dx = nx1 / lx,
    dy = ny1 / ly,

    rectangleIndices = function (rect) {
      var i, j, i0, j0, i_max, j_max, idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(rect.x * dx), 0), nx1);
      j0 = Math.min(Math.max(Math.ceil(rect.y * dy), 0), ny1);
      i_max = Math.min(Math.max(Math.floor((rect.x + rect.width) * dx), 0), nx1);
      j_max = Math.min(Math.max(Math.floor((rect.y + rect.height) * dy), 0), ny1);
      indices = new Array((i_max - i0 + 1) * (j_max - j0 + 1));
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        for (j = j0; j <= j_max; j += 1) {
          indices[idx += 1] = i * ny + j;
        }
      }
      return indices;
    },

    ellipseIndices = function (ellipse) {
      var
        px = ellipse.x * dx,
        py = ellipse.y * dy,
        ra = ellipse.a * 0.5 * dx,
        rb = ellipse.b * 0.5 * dy,
        eq, i, i0, i_max, j, j0, j_max,
        idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
      i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);
      indices = [];
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
        // to get range of y (=> j)
        eq = Math.sqrt(1 - (i - px) * (i - px) / (ra * ra));
        j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
        j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);
        for (j = j0; j <= j_max; j += 1) {
          indices[idx += 1] = i * ny + j;
        }
      }
      return indices;
    },

    ringIndices = function (ring) {
      var
        px = ring.x * dx,
        py = ring.y * dy,
        ra = ring.outer * 0.5 * dx,
        rb = ring.outer * 0.5 * dy,
        ra_inner = ring.inner * 0.5 * dx,
        rb_inner = ring.inner * 0.5 * dy,
        i, i0, i_max, j, j0, j1, j2, j_max, eq,
        idx, indices = [];

      i0 = Math.min(Math.max(Math.ceil(px - ra), 0), nx1);
      i_max = Math.min(Math.max(Math.floor(px + ra), 0), nx1);

      for (i = i0; i <= i_max; i += 1) {
        // solve equation x^2/a^2 + y^2/b^2 < 1 for given x (=> i)
        // to get range of y (=> j)
        eq = Math.sqrt(1 - (i - px) * (i - px) / (ra * ra));
        j0 = Math.min(Math.max(Math.ceil(py - rb * eq), 0), ny1);
        j_max = Math.min(Math.max(Math.floor(py + rb * eq), 0), ny1);

        if (Math.abs(i - px) < ra_inner) {
          // also calculate inner ellipse
          eq = Math.sqrt(1 - (i - px) * (i - px) / (ra_inner * ra_inner));
          j1 = Math.min(Math.max(Math.ceil(py - rb_inner * eq), 0), ny1);
          j2 = Math.min(Math.max(Math.floor(py + rb_inner * eq), 0), ny1);
          for (j = j0; j <= j1; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
          for (j = j2; j <= j_max; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
        } else {
          // consider only outer ellipse
          for (j = j0; j <= j_max; j += 1) {
            indices[idx += 1] = i * ny + j;
          }
        }
      }
      return indices;
    },

    polygonIndices = function (polygon) {
      var
        count = polygon.count,
        verts = polygon.vertices,
        x_coords = new Array(count),
        y_coords = new Array(count),
        x_min = Number.MAX_VALUE, x_max = Number.MIN_VALUE,
        y_min = Number.MAX_VALUE, y_max = Number.MIN_VALUE,
        i, i0, i_max, j, j0, j_max,
        idx, indices = [];

      for (i = 0; i < count; i += 1) {
        x_coords[i] = verts[i * 2] * dx;
        y_coords[i] = verts[i * 2 + 1] * dy;
        if (x_coords[i] < x_min) {
          x_min = x_coords[i];
        }
        if (x_coords[i] > x_max) {
          x_max = x_coords[i];
        }
        if (y_coords[i] < y_min) {
          y_min = y_coords[i];
        }
        if (y_coords[i] > y_max) {
          y_max = y_coords[i];
        }
      }

      i0 = Math.min(Math.max(Math.round(x_min), 0), nx1);
      j0 = Math.min(Math.max(Math.round(y_min), 0), ny1);
      i_max = Math.min(Math.max(Math.round(x_max), 0), nx1);
      j_max = Math.min(Math.max(Math.round(y_max), 0), ny1);
      indices = [];
      idx = 0;
      for (i = i0; i <= i_max; i += 1) {
        for (j = j0; j <= j_max; j += 1) {
          if (pointInsidePolygon(count, x_coords, y_coords, i, j)) {
            indices[idx += 1] = i * ny + j;
          }
        }
      }
      return indices;
    };

  if (this.rectangle) {
    return rectangleIndices(this.rectangle);
  }
  if (this.ellipse) {
    return ellipseIndices(this.ellipse);
  }
  if (this.ring) {
    return ringIndices(this.ring);
  }
  if (this.polygon) {
    return polygonIndices(this.polygon);
  }
  throw new Error("Part: unknown shape.");
};

});

require.define("/default-config.js", function (require, module, exports, __dirname, __filename) {
/*jslint indent: 2 */
//
// lab/models/energy2d/engines/default-config.js
//

var constants = require('./constants.js');

// This object defines default values for different configuration objects.
//
// It's used to provide a default value of property if it isn't defined.
// Object contains some undefined values to show that they are available, but optional.
exports.DEFAULT_VALUES = {
  // Default model properties.
  "model": {
    "model_width": 10,
    "model_height": 10,
    "timestep": 0.1,
    "convective": true,

    "background_conductivity": 10 * constants.AIR_THERMAL_CONDUCTIVITY,
    "background_specific_heat": constants.AIR_SPECIFIC_HEAT,
    "background_density": constants.AIR_DENSITY,
    "background_temperature": 0,
    "background_viscosity": 10 * constants.AIR_VISCOSITY,

    "thermal_buoyancy": 0.00025,
    "buoyancy_approximation": 1,

    "boundary": {
      "temperature_at_border": {
        "upper": 0,
        "lower": 0,
        "left": 0,
        "right": 0
      }
    },

    "measurement_interval": 100,        // unnecessary
    "viewupdate_interval": 20,          // unnecessary
    "stoptime": undefined,              // unnecessary
    "sunny": true,                      // unnecessary (ray solver not implemented)
    "sun_angle": 1.5707964,             // unnecessary (ray solver not implemented)
    "solar_power_density": 20000,       // unnecessary (ray solver not implemented)
    "solar_ray_count": 24,              // unnecessary (ray solver not implemented)
    "solar_ray_speed": 0.001,           // unnecessary (ray solver not implemented)
    "photon_emission_interval": 5,      // unnecessary (ray solver not implemented)

    "structure": undefined
    // Structure can be undefined.
    // However, its desired form is:
    // "structure": {
    //   "part": [ 
    //     {
    //       ... part definition (see part fallback values below)
    //     },
    //     {
    //       ... second part definition
    //     },
    //   ]
    // }
  },

  // Default part properties.
  "part": {
    "thermal_conductivity": 1,
    "specific_heat": 1300,
    "density": 25,
    "transmission": 0,  // unnecessary, optical properties (not implemented)    
    "reflection": 0,    // unnecessary, optical properties (not implemented)
    "absorption": 1,    // unnecessary, optical properties (not implemented)
    "emissivity": 0,    // unnecessary, optical properties (not implemented)
    "temperature": 0,
    "constant_temperature": false,
    "power": 0,
    "wind_speed": 0,
    "wind_angle": 0,
    "visible": true,
    "filled": true,
    "color": "gray",
    "label": undefined,
    "texture": undefined,
    // Texture can be undefined.
    // However, its desired form is (contains example values):
    // {
    //   "texture_fg": -0x1000000,
    //   "texture_bg": -0x7f7f80,
    //   "texture_style": 12,
    //   "texture_width": 12,
    //   "texture_height": 12
    // },
    "uid": undefined,       // unnecessary (not yet implemented)    
    "draggable": true       // unnecessary (not yet implemented)

    // Part should declare also *ONE* of available shapes:
    // 
    // "rectangle": {
    //   "x": 5,
    //   "y": 5,
    //   "width": 2,
    //   "height": 2
    // },
    // "ellipse": {
    //   "x": 5,
    //   "y": 5,
    //   "a": 3,
    //   "b": 3
    // },
    // "ring": {
    //   "x": 5,
    //   "y": 5,
    //   "inner": 1,
    //   "outer": 2
    // },
    // "polygon": {
    //   "count": 3,                    // Vertices count.
    //   "vertices": "1, 1, 2, 2, 3, 3" // String with coordinates.   
    // },
  }
};


// Returns configuration with default properties if the given configuration is not declaring them.
// Existing properties are copied into result.
exports.fillWithDefaultValues = function (config, default_config) {
  'use strict';
  var
    name,
    result,
    clone = function (obj) {
      // Clone to avoid situation when modification of the configuration
      // alters global default configuration.
      if (obj === undefined) {
        return undefined;
      }
      // a way of deep-cloning objects
      return JSON.parse(JSON.stringify(obj));
    };

  if (config === undefined) {
    // Return just default properties.
    return clone(default_config);
  }

  // Keep existing properties
  result = clone(config);
  // and add defaults.
  for (name in default_config) {
    if (default_config.hasOwnProperty(name) && config[name] === undefined) {
      result[name] = clone(default_config[name]);
    }
  }
  return result;
};

});

require.define("/constants.js", function (require, module, exports, __dirname, __filename) {
//
// lab/models/energy2d/engines/constants.js
//

// Basic constants used by Energy2D module
// TODO: follow convention of MD2D constants module


exports.AIR_THERMAL_CONDUCTIVITY = 0.025;       // Air's thermal conductivity = 0.025 W/(m*K)
exports.AIR_SPECIFIC_HEAT = 1012;               // Air's specific heat = 1012 J/(kg*K)
exports.AIR_DENSITY = 1.204;                    // Air's density = 1.204 kg/m^3 at 25 C

// By default, air's kinematic viscosity = 1.568 x 10^-5 m^2/s at 27 C is
// used. It can be set to zero for inviscid fluid.
exports.AIR_VISCOSITY = 0.00001568;
});

require.define("/core-model.js", function (require, module, exports, __dirname, __filename) {
    /*globals Float64Array */
/*jslint indent: 2 */
// JSLint report: OK (complains about 'new' for side effect and Array(size) constructor)
//
// lab/models/energy2d/engines/core-model.js
//

var
  arrays         = require('./arrays/arrays.js').arrays,
  heatsolver     = require('./physics-solvers/heat-solver.js'),
  fluidsolver    = require('./physics-solvers/fluid-solver.js'),
  part           = require('./part.js'),
  default_config = require('./default-config.js'),

  array_type = (function () {
    'use strict';
    try {
      new Float64Array();
    } catch (e) {
      return 'regular';
    }
    return 'Float64Array';
  }()),

  // Local constants 
  NX = 100,
  NY = 100,
  ARRAY_SIZE = NX * NY;

// Core Energy2D model.
// 
// It creates and manages all the data and parameters used for calculations.
exports.makeCoreModel = function (model_options) {
  'use strict';
  var
    // Validate provided options.
    opt = (function () {
      var boundary;

      model_options = default_config.fillWithDefaultValues(model_options, default_config.DEFAULT_VALUES.model);

      // Validation.
      //
      // Check boundary settings, as they have complex structure.
      boundary = model_options.boundary.temperature_at_border || model_options.boundary.flux_at_border;
      if (!boundary) {
        throw new Error("Core model: missing boundary settings.");
      } else if (boundary.upper === undefined ||
                 boundary.right === undefined ||
                 boundary.lower === undefined ||
                 boundary.left  === undefined) {
        throw new Error("Core model: incomplete boundary settings.");
      }

      return model_options;
    }()),

    // Simulation grid dimensions.
    nx = NX,
    ny = NY,

    // Simulation steps counter.
    indexOfStep = 0,

    // Physics solvers 
    // (initialized later, when core model object is built).
    heatSolver,
    fluidSolver,

    //
    // Simulation arrays:
    //
    // - temperature array
    t = arrays.create(ARRAY_SIZE, opt.background_temperature, array_type),
    // - internal temperature boundary array
    tb = arrays.create(ARRAY_SIZE, NaN, array_type),
    // - velocity x-component array (m/s)
    u = arrays.create(ARRAY_SIZE, 0, array_type),
    // - velocity y-component array (m/s)
    v = arrays.create(ARRAY_SIZE, 0, array_type),
    // - internal heat generation array
    q = arrays.create(ARRAY_SIZE, 0, array_type),
    // - wind speed
    uWind = arrays.create(ARRAY_SIZE, 0, array_type),
    vWind = arrays.create(ARRAY_SIZE, 0, array_type),
    // - conductivity array
    conductivity = arrays.create(ARRAY_SIZE, opt.background_conductivity, array_type),
    // - specific heat capacity array
    capacity = arrays.create(ARRAY_SIZE, opt.background_specific_heat, array_type),
    // - density array
    density = arrays.create(ARRAY_SIZE, opt.background_density, array_type),
    // - fluid cell array
    fluidity = arrays.create(ARRAY_SIZE, true, array_type),

    // Generate parts array.
    parts = (function () {
      var
        result = [],
        parts_options,
        i, len;

      if (opt.structure && opt.structure.part) {
        parts_options = opt.structure.part;
        if (parts_options.constructor !== Array) {
          parts_options = [parts_options];
        }

        result = new Array(parts_options.length);
        for (i = 0, len = parts_options.length; i < len; i += 1) {
          result[i] = new part.Part(parts_options[i]);
        }
      }
      return result;
    }()),

    //  
    // Private methods  
    //      
    setupMaterialProperties = function () {
      var
        lx = opt.model_width,
        ly = opt.model_height,
        part, indices, idx,
        i, ii, len;

      if (!parts || parts.length === 0) {
        return;
      }

      // workaround, to treat overlapping parts as original Energy2D
      for (i = parts.length - 1; i >= 0; i -= 1) {
        part = parts[i];
        indices = part.getGridCells(nx, ny, lx, ly);
        for (ii = 0, len = indices.length; ii < len; ii += 1) {
          idx = indices[ii];

          fluidity[idx] = false;
          t[idx] = part.temperature;
          q[idx] = part.power;
          conductivity[idx] = part.thermal_conductivity;
          capacity[idx] = part.specific_heat;
          density[idx] = part.density;

          if (part.wind_speed !== 0) {
            uWind[idx] = part.wind_speed * Math.cos(part.wind_angle);
            vWind[idx] = part.wind_speed * Math.sin(part.wind_angle);
          }

          if (part.constant_temperature) {
            tb[idx] = part.temperature;
          }
        }
      }
    },

    //
    // Public API
    //
    core_model = {
      // Performs next step of a simulation.
      nextStep: function () {
        if (opt.convective) {
          fluidSolver.solve(u, v);
        }
        heatSolver.solve(opt.convective, t, q);
        indexOfStep += 1;
      },
      getIndexOfStep: function () {
        return indexOfStep;
      },
      // Returns loaded options after validation.
      getModelOptions: function () {
        return opt;
      },
      // Simple getters.
      getArrayType: function () {
        // return module variable
        return array_type;
      },
      getGridWidth: function () {
        return nx;
      },
      getGridHeight: function () {
        return ny;
      },
      // Arrays.
      getTemperatureArray: function () {
        return t;
      },
      getUVelocityArray: function () {
        return u;
      },
      getVVelocityArray: function () {
        return v;
      },
      getUWindArray: function () {
        return uWind;
      },
      getVWindArray: function () {
        return vWind;
      },
      getBoundaryTemperatureArray: function () {
        return tb;
      },
      getPowerArray: function () {
        return q;
      },
      getConductivityArray: function () {
        return conductivity;
      },
      getCapacityArray: function () {
        return capacity;
      },
      getDensityArray: function () {
        return density;
      },
      getFluidityArray: function () {
        return fluidity;
      },
      getPartsArray: function () {
        return parts;
      }
    };

  // 
  // One-off initialization.
  //
  heatSolver = heatsolver.makeHeatSolver(core_model);
  fluidSolver = fluidsolver.makeFluidSolver(core_model);

  setupMaterialProperties();

  // Finally, return public API object.
  return core_model;
};

});
require("/core-model.js");
/*globals energy2d */
/*jslint indent: 2 */
// JSLint report: OK
//
// lab/models/energy2d/modeler.js
//

// Why not require('./engine/core-model.js')?
// This file is not browserified, only concatenated with browserified engine.
var coremodel = require('./core-model.js');

// define namespace
energy2d.namespace('energy2d.modeler');

energy2d.modeler.makeModeler = function (options) {
  'use strict';
  var core_model = coremodel.makeCoreModel(options);

  return {
    nextStep: function () {
      core_model.nextStep();
    },
    getWidth: function () {
      return core_model.getModelOptions().model_width;
    },
    getHeight: function () {
      return core_model.getModelOptions().model_height;
    },
    getIndexOfStep: core_model.getIndexOfStep,
    getGridWidth: core_model.getGridWidth,
    getGridHeight: core_model.getGridHeight,
    getTemperatureArray: core_model.getTemperatureArray,
    getUVelocityArray: core_model.getUVelocityArray,
    getVVelocityArray: core_model.getVVelocityArray,
    getPartsArray: core_model.getPartsArray
  };
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/utils-color.js
//

// define namespace
energy2d.namespace('energy2d.views.utils');

// HSV to RGB color conversion.
//
// H runs from 0 to 360 degrees,
// S and V run from 0 to 100.
// 
// Ported from the excellent java algorithm by Eugene Vishnevsky at:
// http://www.cs.rit.edu/~ncs/color/t_convert.html
// http://snipplr.com/view.php?codeview&id=14590
energy2d.views.utils.HSVToRGB = function (h, s, v) {
  'use strict';
  var
    r, g, b,
    i,
    f, p, q, t;

  // Make sure our arguments stay in-range
  h = Math.max(0, Math.min(360, h));
  s = Math.max(0, Math.min(100, s));
  v = Math.max(0, Math.min(100, v));

  // We accept saturation and value arguments from 0 to 100 because that's
  // how Photoshop represents those values. Internally, however, the
  // saturation and value are calculated from a range of 0 to 1. We make
  // That conversion here.
  s /= 100;
  v /= 100;

  if (s === 0) {
    // Achromatic (grey)
    r = g = b = v;
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  h /= 60; // sector 0 to 5
  i = Math.floor(h);
  f = h - i; // factorial part of h
  p = v * (1 - s);
  q = v * (1 - s * f);
  t = v * (1 - s * (1 - f));

  switch (i) {
  case 0:
    r = v;
    g = t;
    b = p;
    break;

  case 1:
    r = q;
    g = v;
    b = p;
    break;

  case 2:
    r = p;
    g = v;
    b = t;
    break;

  case 3:
    r = p;
    g = q;
    b = v;
    break;

  case 4:
    r = t;
    g = p;
    b = v;
    break;

  default: // case 5:
    r = v;
    g = p;
    b = q;
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

energy2d.views.utils.setupRGBTemperatureColorTables = function (red, green, blue) {
  'use strict';
  var
    HSVToRGB = energy2d.views.utils.HSVToRGB,
    rgb = [],
    i;

  for (i = 0; i < 256; i += 1) {
    rgb = energy2d.views.utils.HSVToRGB(i, 100, 90);
    red[i]   = rgb[0];
    blue[i]  = rgb[1];
    green[i] = rgb[2];
  }
};/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/heatmap.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Heatmap view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with the canvas used for rendering.
// Before use, this view should be bound with a heatmap using bindHeapmap(heatmap, grid_width, grid_height).
// To render the heatmap use renderHeatmap() method. 
// Set size of the heatmap using CSS rules. The view fits canvas dimensions to the real 
// size of the HTML element to avoid low quality CSS scaling *ONLY* when HQ rendering is enabled.
// Otherwise, the canvas has the same dimensions as heatmap grid and fast CSS scaling is used.
energy2d.views.makeHeatmapView = function (html_id) {
  'use strict';
  var
    // Dependencies:
    view_utils = energy2d.views.utils,
    // end.
    DEFAULT_ID = 'energy2d-heatmap-view',

    $heatmap_canvas,
    canvas_ctx,
    canvas_width,
    canvas_height,
    hq_rendering,

    red_color_table   = [],
    blue_color_table  = [],
    green_color_table = [],
    max_hue,

    heatmap,
    grid_width,
    grid_height,
    min_temp = 0,
    max_temp = 50,

    // 
    // Private methods.
    //
    initHTMLelement = function () {
      $heatmap_canvas = $('<canvas />');
      $heatmap_canvas.attr('id', html_id || DEFAULT_ID);
      canvas_ctx = $heatmap_canvas[0].getContext('2d');
    },

    //
    // Public API.
    //
    heatmap_view = {
      // Render heat map on the canvas.
      renderHeatmap: function () {
        var
          scale, hue,
          image_data, data,
          i, j, iny, pix_index, pix_stride;

        if (!heatmap) {
          throw new Error("Heatmap: bind heatmap before rendering.");
        }

        canvas_ctx.clearRect(0, 0, grid_width, grid_height);
        // TODO: is it really necessary?
        canvas_ctx.fillStyle = "rgb(0,0,0)";

        scale = max_hue / (max_temp - min_temp);
        image_data = canvas_ctx.getImageData(0, 0, grid_width, grid_height);
        data = image_data.data;

        pix_index = 0;
        pix_stride = 4 * grid_width;
        for (i = 0; i < grid_width; i += 1) {
          iny = i * grid_height;
          pix_index = 4 * i;
          for (j = 0; j < grid_height; j += 1) {
            hue =  max_hue - Math.round(scale * (heatmap[iny + j] - min_temp));
            if (hue < 0) {
              hue = 0;
            } else if (hue > max_hue) {
              hue = max_hue;
            }
            data[pix_index]     = red_color_table[hue];
            data[pix_index + 1] = blue_color_table[hue];
            data[pix_index + 2] = green_color_table[hue];
            data[pix_index + 3] = 255;
            pix_index += pix_stride;
          }
        }
        canvas_ctx.putImageData(image_data, 0, 0);
      },

      // Bind heatmap to the view.
      bindHeatmap: function (new_heatmap, new_grid_width, new_grid_height) {
        if (new_grid_width * new_grid_height !== new_heatmap.length) {
          throw new Error("Heatmap: provided heatmap has wrong dimensions.");
        }
        heatmap = new_heatmap;
        grid_width = new_grid_width;
        grid_height = new_grid_height;
        $heatmap_canvas.attr('width', grid_width);
        $heatmap_canvas.attr('height', grid_height);
      },

      getHTMLElement: function () {
        return $heatmap_canvas;
      },

      updateCanvasSize: function () {
        canvas_width = $heatmap_canvas.width();
        canvas_height = $heatmap_canvas.height();
        if (hq_rendering) {
          $heatmap_canvas.attr('width', canvas_width);
          $heatmap_canvas.attr('height', canvas_height);
        } else {
          $heatmap_canvas.attr('width', grid_width);
          $heatmap_canvas.attr('height', grid_height);
        }
      },

      setHQRenderingEnabled: function (v) {
        hq_rendering = v;
        this.updateCanvasSize();
      },

      setMinTemperature: function (v) {
        min_temp = v;
      },
      setMaxTemperature: function (v) {
        max_temp = v;
      }
    };

  // One-off initialization.
  view_utils.setupRGBTemperatureColorTables(red_color_table, green_color_table, blue_color_table);
  max_hue = red_color_table.length - 1;

  initHTMLelement();

  return heatmap_view;
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/vectormap.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Vector map view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the vector map using bindVectormap(vectormap_u, vectormap_v, width, height, spacing).
// To render vector map use renderVectormap() method.
// Set size of the vectormap using CSS rules. The view fits canvas dimensions to the real 
// size of the HTML element to avoid low quality CSS scaling.
energy2d.views.makeVectormapView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-vectormap-view',
    VECTOR_SCALE = 100,
    VECTOR_BASE_LEN = 8,
    WING_COS = Math.cos(0.523598776),
    WING_SIN = Math.sin(0.523598776),
    WING_LEN = 4,

    $vectormap_canvas,
    canvas_ctx,
    canvas_width,
    canvas_height,

    vectormap_u,
    vectormap_v,
    grid_width,
    grid_height,
    spacing,

    // 
    // Private methods.
    //
    initHTMLelement = function () {
      $vectormap_canvas = $('<canvas />');
      $vectormap_canvas.attr('id', html_id || DEFAULT_ID);
      canvas_ctx = $vectormap_canvas[0].getContext('2d');
    },

    // Helper method for drawing a single vector.
    drawVector = function (x, y, vx, vy) {
      var
        r = 1.0 / Math.sqrt(vx * vx + vy * vy),
        arrowx = vx * r,
        arrowy = vy * r,
        x1 = x + arrowx * VECTOR_BASE_LEN + vx * VECTOR_SCALE,
        y1 = y + arrowy * VECTOR_BASE_LEN + vy * VECTOR_SCALE,
        wingx = WING_LEN * (arrowx * WING_COS + arrowy * WING_SIN),
        wingy = WING_LEN * (arrowy * WING_COS - arrowx * WING_SIN);

      canvas_ctx.beginPath();
      canvas_ctx.moveTo(x, y);
      canvas_ctx.lineTo(x1, y1);

      canvas_ctx.lineTo(x1 - wingx, y1 - wingy);
      canvas_ctx.moveTo(x1, y1);

      wingx = WING_LEN * (arrowx * WING_COS - arrowy * WING_SIN);
      wingy = WING_LEN * (arrowy * WING_COS + arrowx * WING_SIN);
      canvas_ctx.lineTo(x1 - wingx, y1 - wingy);

      canvas_ctx.stroke();
    },

    //
    // Public API.
    //
    vectormap_view = {
      // Render vectormap on the canvas.
      renderVectormap: function () {
        var
          dx, dy, x0, y0, uij, vij,
          i, j, iny, ijny;

        if (!vectormap_u || !vectormap_v) {
          throw new Error("Vectormap: bind vectormap before rendering.");
        }

        // Follow size of the canvas defined by CSS rules.
        if (canvas_width !== $vectormap_canvas.width() || canvas_height !== $vectormap_canvas.height()) {
          this.updateCanvasSize();
        }

        dx = canvas_width / grid_width;
        dy = canvas_height / grid_height;

        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
        canvas_ctx.strokeStyle = "rgb(175,175,175)";
        canvas_ctx.lineWidth = 1;

        for (i = 1; i < grid_width - 1; i += spacing) {
          iny = i * grid_height;
          x0 = (i + 0.5) * dx; // + 0.5 to move arrow into field center
          for (j = 1; j < grid_height - 1; j += spacing) {
            ijny = iny + j;
            y0 = (j + 0.5) * dy; // + 0.5 to move arrow into field center
            uij = vectormap_u[ijny];
            vij = vectormap_v[ijny];
            if (uij * uij + vij * vij > 1e-15) {
              drawVector(x0, y0, uij, vij);
            }
          }
        }
      },

      // Bind vector map to the view.
      bindVectormap: function (new_vectormap_u, new_vectormap_v, new_grid_width, new_grid_height, new_spacing) {
        if (new_grid_width * new_grid_height !== new_vectormap_u.length) {
          throw new Error("Heatmap: provided U component of vectormap has wrong dimensions.");
        }
        if (new_grid_width * new_grid_height !== new_vectormap_v.length) {
          throw new Error("Heatmap: provided V component of vectormap has wrong dimensions.");
        }
        vectormap_u = new_vectormap_u;
        vectormap_v = new_vectormap_v;
        grid_width = new_grid_width;
        grid_height = new_grid_height;
        spacing = new_spacing;
      },

      getHTMLElement: function () {
        return $vectormap_canvas;
      },

      updateCanvasSize: function () {
        canvas_width = $vectormap_canvas.width();
        canvas_height = $vectormap_canvas.height();
        $vectormap_canvas.attr('width', canvas_width);
        $vectormap_canvas.attr('height', canvas_height);
      }
    };

  // One-off initialization.
  initHTMLelement();

  return vectormap_view;
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/description.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Description.
//
// getHTMLElement() method returns JQuery object with DIV that contains description.
// If you want to style its components:
// Default div id = "energy2d-description",
// Title class: "energy2d-description-title", Content class: "energy2d-description-content".
energy2d.views.makeSimulationDescription = function (description) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-description',
    DEFAULT_CLASS = 'energy2d-description',

    simulation_controller,
    $description_div,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      var $title, $tagline, $content, $footnote;

      $description_div = $('<div />');
      $description_div.attr('id', description.id || DEFAULT_ID);
      $description_div.addClass(description.class || DEFAULT_CLASS);
      // title
      $title = $('<div>' + description.title + '</div>');
      $title.attr('class', DEFAULT_ID + '-title');
      $description_div.append($title);
      // tagline
      $tagline = $('<div>' + description.tagline + '</div>');
      $tagline.attr('class', DEFAULT_ID + '-tagline');
      $description_div.append($tagline);
      // content
      $content = $('<div>' + description.content + '</div>');
      $content.attr('class', DEFAULT_ID + '-content');
      $description_div.append($content);
      // footnote
      $footnote = $('<div>' + description.footnote + '</div>');
      $footnote.attr('class', DEFAULT_ID + '-footnote');
      $description_div.append($footnote);
    },

    //
    // Public API.
    //
    simulation_description = {
      bindSimulationController: function (controller) {
        simulation_controller = controller;
      },

      getHTMLElement: function () {
        return $description_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return simulation_description;
};
/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/views/energy2d/views.js
//

// define namespace
energy2d.namespace('energy2d.views');

// Main Energy2D scene.
//
// It combines three views and arranges them into layers:
// - HeatmapView
// - VelocityView
// - PartsView
//
// getHTMLElement() method returns JQuery object with DIV that contains these views.
// Constructor sets only necessary style options.
// If you want to resize Energy2D scene view use CSS rule for wrapping DIV.
// Do not resize manually internal views (heatmap, velocity or parts)!
energy2d.views.makeEnergy2DScene = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-scene-view',
    DEFAULT_CLASS = 'energy2d-scene-view',

    heatmap_view,
    velocity_view,
    parts_view,

    $scene_view_div,

    layers_count = 0,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $scene_view_div = $('<div />');
      $scene_view_div.attr('id', html_id || DEFAULT_ID);
      $scene_view_div.addClass(DEFAULT_CLASS);

      $scene_view_div.css('position', 'relative');

      $scene_view_div.append(heatmap_view.getHTMLElement());
      $scene_view_div.append(velocity_view.getHTMLElement());
      $scene_view_div.append(parts_view.getHTMLElement());
    },

    setAsNextLayer = function (view) {
      var layer = view.getHTMLElement();

      layer.css('width', '100%');
      layer.css('height', '100%');
      layer.css('position', 'absolute');
      layer.css('left', '0');
      layer.css('top', '0');
      layer.css('z-index', layers_count);
      layers_count += 1;
    },

    energy2d_scene_view = {

      getHeatmapView: function () {
        return heatmap_view;
      },

      getVelocityView: function () {
        return velocity_view;
      },

      getPartsView: function () {
        return parts_view;
      },

      getHTMLElement: function () {
        return $scene_view_div;
      }
    };

  heatmap_view = energy2d.views.makeHeatmapView();
  setAsNextLayer(heatmap_view);

  velocity_view = energy2d.views.makeVectormapView();
  setAsNextLayer(velocity_view);

  parts_view = energy2d.views.makePartsView();
  setAsNextLayer(parts_view);

  // Append all views to the scene view DIV.
  initHTMLelement();

  return energy2d_scene_view;
};

// Energy2D parts view.
//
// It uses HTML5 Canvas for rendering.
// getHTMLElement() returns jQuery object with canvas used for rendering.
// Before use, this view should be bound with the parts array using bindPartsArray(parts).
// To render parts use renderParts() method.
// Set size of the parts view using CSS rules. The view fits canvas dimensions to the real
// size of the HTML element to avoid low quality scaling.
energy2d.views.makePartsView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-parts-view',
    DEFAULT_CLASS = 'energy2d-parts-view',

    $parts_canvas,
    canvas_ctx,
    canvas_width,
    canvas_height,

    parts,
    scale_x,
    scale_y,
    scene_width,
    scene_height,

    textures = [],

    //
    // Private methods.
    //
    initHTMLelement = function () {
      $parts_canvas = $('<canvas />');
      $parts_canvas.attr('id', html_id || DEFAULT_ID);
      $parts_canvas.addClass(DEFAULT_CLASS);

      canvas_ctx = $parts_canvas[0].getContext('2d');
      canvas_ctx.strokeStyle = "black";
      canvas_ctx.lineCap = "round";
      canvas_ctx.lineJoin = "round";
      canvas_ctx.lineWidth = 2;
      canvas_ctx.font = "12px sans-serif";
      canvas_ctx.textBaseline = "middle";
    },

    // TODO: add more textures, move it another module?
    initTextures = function () {
      var
        WIDTH  = 8,
        HEIGHT = 8,
        $texture_canvas,
        ctx;

      // Create canvas element.
      $texture_canvas = $('<canvas />');
      $texture_canvas.attr('width', WIDTH);
      $texture_canvas.attr('height', HEIGHT);
      ctx = $texture_canvas[0].getContext("2d");

      // Generate simple pattern.
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(HEIGHT, HEIGHT);
      ctx.stroke();

      textures.push($texture_canvas[0]);
    },

    drawEllipse = function (ellipse) {
      var
        px = ellipse.x * scale_x,
        py = ellipse.y * scale_y,
        pa = ellipse.a * scale_x * 0.5,
        pb = ellipse.b * scale_y * 0.5,
        x_pos, y_pos, t;

      canvas_ctx.beginPath();
      for (t = 0; t < 2 * Math.PI; t += 0.1) {
        x_pos = px + (pa * Math.cos(t));
        y_pos = py + (pb * Math.sin(t));

        if (t === 0) {
          canvas_ctx.moveTo(x_pos, y_pos);
        } else {
          canvas_ctx.lineTo(x_pos, y_pos);
        }
      }
      canvas_ctx.closePath();
    },

    drawRectangle = function (rectangle) {
      var
        px = rectangle.x * scale_x - 1,        // "- 1 / + 2" too keep positions
        py = rectangle.y * scale_y - 1,        // consistent with Energy2d
        pw = rectangle.width * scale_x + 2,
        ph = rectangle.height * scale_y + 2,
        label_x = px + 0.5 * pw,
        label_y = py + 0.5 * ph;

      canvas_ctx.beginPath();
      canvas_ctx.moveTo(px, py);
      canvas_ctx.lineTo(px + pw, py);
      canvas_ctx.lineTo(px + pw, py + ph);
      canvas_ctx.lineTo(px, py + ph);
      canvas_ctx.lineTo(px, py);
      canvas_ctx.closePath();
    },

    drawPolygon = function (polygon) {
      var
        verts = polygon.vertices,
        label_x = 0,
        label_y = 0,
        i, len;

      canvas_ctx.beginPath();
      canvas_ctx.moveTo(verts[0] * scale_x, verts[1] * scale_y);
      for (i = 1, len = polygon.count; i < len; i += 1) {
        canvas_ctx.lineTo(verts[i * 2] * scale_x, verts[i * 2 + 1] * scale_y);
      }
      canvas_ctx.closePath();
    },

    drawLabel = function (part) {
      var
        label, label_x, label_y, label_width,
        verts, i, len;

      if (part.rectangle) {
        label_x = part.rectangle.x + 0.5 * part.rectangle.width;
        label_y = part.rectangle.y + 0.5 * part.rectangle.height;
      } else if (part.ellipse) {
        label_x = part.ellipse.x;
        label_y = part.ellipse.y;
      } else if (part.ring) {
        label_x = part.ring.x;
        label_y = part.ring.y;
      } else if (part.polygon) {
        verts = part.polygon.vertices;
        label_x = label_y = 0;
        for (i = 0, len = part.polygon.count; i < len; i += 1) {
          label_x += verts[i * 2];
          label_y += verts[i * 2 + 1];
        }
        label_x /= len;
        label_y /= len;
      }
      label_x *= scale_x;
      label_y *= scale_y;

      canvas_ctx.fillStyle = "white";
      label = part.getLabel();
      label_width = canvas_ctx.measureText(label).width;
      canvas_ctx.fillText(label, label_x - 0.5 * label_width, label_y);
    },

    getPartColor = function (part) {
      var
        default_fill_color = "gray",
        color;

      if (part.color) {
        if (typeof part.color === 'string') {
          color = part.color;
        } else {
          color = part.color.toString(16);
          while (color.length < 6) {
            color = '0' + color;
          }
        }
      } else if (part.power > 0) {
        color = 'FFFF00';
      } else if (part.power < 0) {
        color = 'B0C4DE';
      } else if (part.constant_temperature) {
        // Transparent color.
        // Part will have color of underlying background.
        color = 'rgba(0, 0, 0, 0.0)';
      } else {
        color = default_fill_color;
      }
      return color;
    },

    //
    // Public API.
    //
    parts_view = {
      // Render vectormap on the canvas.
      renderParts: function () {
        var
          part,
          last_composite_op,
          i, len;

        if (!parts) {
          throw new Error("Parts view: bind parts array before rendering.");
        }

        // Follow size of the canvas defined by CSS rules.
        if (canvas_width !== $parts_canvas.width() || canvas_height !== $parts_canvas.height()) {
          this.updateCanvasSize();
        }

        canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
        for (i = 0, len = parts.length; i < len; i += 1) {
          part = parts[i];
          if (!part.visible) {
            continue;
          }
          // Step 1. Draw path on the canvas.
          if (part.rectangle) {
            drawRectangle(part.rectangle);
          } else if (part.polygon) {
            drawPolygon(part.polygon);
          } else if (part.ellipse) {
            drawEllipse(part.ellipse);
          } else if (part.ring) {
            // Draw a circle, its interior will be deleted later.
            drawEllipse({
              x: part.ring.x,
              y: part.ring.y,
              a: part.ring.outer,
              b: part.ring.outer
            });
          }
          // Step 2. Fill.
          if (part.filled) {
            canvas_ctx.fillStyle = getPartColor(part);
            canvas_ctx.fill();
          }
          // Step 3. Cover with texture.
          if (part.texture) {
            // TODO: Add support of different patterns.
            canvas_ctx.fillStyle = canvas_ctx.createPattern(textures[0], "repeat");
            canvas_ctx.fill();
          }
          canvas_ctx.stroke();

          // Step 4. Special case for rings, remove inner circle.
          if (part.ring) {
            drawEllipse({
              x: part.ring.x,
              y: part.ring.y,
              a: part.ring.inner,
              b: part.ring.inner
            });
            last_composite_op = canvas_ctx.globalCompositeOperation;
            canvas_ctx.globalCompositeOperation = 'destination-out';
            canvas_ctx.fill();
            canvas_ctx.globalCompositeOperation = last_composite_op;
            canvas_ctx.stroke();
          }

          // Step 5. Draw label.
          if (part.label) {
            drawLabel(part);
          }

        }
      },

      // Bind vector map to the view.
      bindPartsArray: function (new_parts, new_scene_width, new_scene_height) {
        parts = new_parts;
        scene_width = new_scene_width;
        scene_height = new_scene_height;
        scale_x = canvas_width / scene_width;
        scale_y = canvas_height / scene_height;
      },

      getHTMLElement: function () {
        return $parts_canvas;
      },

      updateCanvasSize: function () {
        canvas_width = $parts_canvas.width();
        canvas_height = $parts_canvas.height();
        scale_x = canvas_width / scene_width;
        scale_y = canvas_height / scene_height;
        $parts_canvas.attr('width', canvas_width);
        $parts_canvas.attr('height', canvas_height);
      }
    };

  // One-off initialization.
  initHTMLelement();
  initTextures();

  return parts_view;
};

// Simple player.
//
// Should be bound with simulation controller, which has to implement following methods:
// - simulationPlay()
// - simulationStep()
// - simulationStop()
// - simulationReset()
//
// getHTMLElement() method returns JQuery object with DIV that contains all buttons.
// If you want to style its components:
// Default div id = "energy2d-simulation-player",
// Buttons ids: "sim-play", "sim-step", "sim-stop", "sim-reset".
energy2d.views.makeSimulationPlayerView = function (html_id) {
  'use strict';
  var
    DEFAULT_ID = 'energy2d-simulation-player',
    DEFAULT_CLASS = 'energy2d-simulation-player',

    simulation_controller,
    $player_div,

    //
    // Private methods.
    //
    initHTMLelement = function () {
      var $button;

      $player_div = $('<div />');
      $player_div.attr('id', html_id || DEFAULT_ID);
      $player_div.addClass(DEFAULT_CLASS);
      // Stop button.
      $button = $('<button type="button" id="sim-stop">Stop</button>');
      $button.click(function () {
        simulation_controller.simulationStop();
      });
      $player_div.append($button);
      // One step button.
      $button = $('<button type="button" id="sim-step">Step</button>');
      $button.click(function () {
        simulation_controller.simulationStep();
      });
      $player_div.append($button);
      // Play button.
      $button = $('<button type="button" id="sim-play">Play</button>');
      $button.click(function () {
        simulation_controller.simulationPlay();
      });
      $player_div.append($button);
      // Reset button.
      $button = $('<button type="button" id="sim-reset">Reset</button>');
      $button.click(function () {
        simulation_controller.simulationReset();
      });
      $player_div.append($button);
    },

    //
    // Public API.
    //
    simulation_player = {
      bindSimulationController: function (controller) {
        simulation_controller = controller;
      },

      getHTMLElement: function () {
        return $player_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return simulation_player;
};

/*globals energy2d, $ */
/*jslint indent: 2 */
//
// lab/controllers/energy2d/controllers.js
//

// define namespace
energy2d.namespace('energy2d.controllers');

// Basic Energy2D controller.
//
// Call this constructor function with interactive definition and the ID of the DOM container for an application.
// This HTML element is used as a default container for all interactive components that don't define their own containers.
energy2d.controllers.makeInteractiveController = function (interactive, interactive_container_id, description_container_id) {
  'use strict';
  var
    // Dependencies:
    modeler_ns = energy2d.modeler,
    views_ns = energy2d.views,
    // end.

    // Object with public API.
    controller,
    // Energy2D model.
    modeler,

    // Views:
    energy2d_scene,
    heatmap_view,
    velocity_view,
    parts_view,
    simulation_player_view,
    simulation_description_view,

    // Parameters:
    last_options,
    interval_id,
    steps_per_frame = 4,

    //
    // Private methods
    //
    actualRootPath = function(url) {
      if (typeof ACTUAL_ROOT === "undefined" || url.charAt(0) !== "/") {
        return url;
      } else {
        return ACTUAL_ROOT + url;
      }
    },

    createEnergy2DScene = function (component_def) {
      energy2d_scene = views_ns.makeEnergy2DScene(component_def.id);
      heatmap_view = energy2d_scene.getHeatmapView();
      velocity_view = energy2d_scene.getVelocityView();
      parts_view = energy2d_scene.getPartsView();

      return energy2d_scene;
    },

    createSimulationPlayer = function (component_def) {
      simulation_player_view = views_ns.makeSimulationPlayerView(component_def.id);
      // Bind itself (public API).
      simulation_player_view.bindSimulationController(controller);

      return simulation_player_view;
    },

    createSimulationDescription = function (component_def) {
      simulation_description_view = views_ns.makeSimulationDescription(component_def);
      // Bind itself (public API).
      simulation_description_view.bindSimulationController(controller);

      return simulation_description_view;
    },

    createComponent = function (component_def) {
      if (!component_def.type) {
        throw new Error('Interactive controller: missing component "type" property.');
      }
      switch (component_def.type) {
      case 'energy2d-scene-view':
        return createEnergy2DScene(component_def);
      case 'energy2d-simulation-player':
        return createSimulationPlayer(component_def);
      default:
        throw new Error('Interactive controller: unknow type of component.');
      }
    },

    nextStep = function () {
      var i = steps_per_frame;
      while (i > 0) {
        i -= 1;
        modeler.nextStep();
      }
      heatmap_view.renderHeatmap();
      velocity_view.renderVectormap();
    };

  //
  // Public API
  //
  controller = {
    loadInteractive: function (interactive, interactive_container_id, description_container_id) {
      var
        components = interactive.components || [],
        description = interactive.description || {},
        layout = interactive.layout || {},
        component, component_layout, $html_element,
        i, len;

      for (i = 0, len = components.length; i < len; i += 1) {
        component = createComponent(components[i]);

        // Get jQuery object with DOM element.
        $html_element = component.getHTMLElement();
        // Apply style if layout contains CSS definition.
        component_layout = layout[components[i].id] || {};
        if (component_layout.css) {
          $html_element.css(component_layout.css);
        }
        if (component_layout.class) {
          $html_element.addClass(component_layout.class);
        }
        // Append.
        if (component_layout.container) {
          $html_element.appendTo(component_layout.container);
        } else {
          $html_element.appendTo(interactive_container_id);
        }
      }
      if (description) {
        component = createSimulationDescription(description);
        $html_element = component.getHTMLElement();
        $html_element.appendTo(description_container_id);
      }

      // Finally, load scene model.
      controller.loadSceneModelFromURL(interactive.model);
    },

    loadSceneModelFromURL: function (options_url) {
      $.get(actualRootPath(options_url))
        .success(function (data) {
          if (typeof data === "string") { data = JSON.parse(data); }
          controller.loadSceneModel(data);
        })
        .error(function (jqXHR, textStatus, errorThrown) {
          throw new Error("Interactive controller: loading scene options failed - " + textStatus);
        });
    },

    loadSceneModel: function (options) {
      var grid_x, grid_y;
      modeler = modeler_ns.makeModeler(options.model);
      last_options = options;

      grid_x = modeler.getGridWidth();
      grid_y = modeler.getGridHeight();
      heatmap_view.bindHeatmap(modeler.getTemperatureArray(), grid_x, grid_y);
      velocity_view.bindVectormap(modeler.getUVelocityArray(), modeler.getVVelocityArray(), grid_x, grid_y, 4);
      parts_view.bindPartsArray(modeler.getPartsArray(), modeler.getWidth(), modeler.getHeight());

      heatmap_view.renderHeatmap();
      parts_view.renderParts();
    },

    //
    // Simulation controller methods implementation.
    //
    simulationPlay: function () {
      if (!interval_id) {
        interval_id = setInterval(nextStep, 0);
      }
    },

    simulationStep: function () {
      nextStep();
    },

    simulationStop: function () {
      if (interval_id !== undefined) {
        clearInterval(interval_id);
        interval_id = undefined;
      }
    },

    simulationReset: function () {
      controller.simulationStop();
      // TODO: use modeler.reset()
      controller.loadSceneModel(last_options);
    }
  };

  // One-off initialization.
  controller.loadInteractive(interactive, interactive_container_id, description_container_id);

  return controller;
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

windows_platform_token = {
  "Windows NT 6.1":	"Windows 7",
  "Windows NT 6.0":	"Windows Vista",
  "Windows NT 5.2":	"Windows Server 2003; Windows XP x64 Edition",
  "Windows NT 5.1":	"Windows XP",
  "Windows NT 5.01": "Windows 2000, Service Pack 1 (SP1)",
  "Windows NT 5.0":	"Windows 2000",
  "Windows NT 4.0":	"Microsoft Windows NT 4.0"
};

windows_feature_token = {
  "WOW64":       "64/32",
  "Win64; IA64": "64",
  "Win64; x64":  "64"
};

function what_browser() {
  var chromematch  = / (Chrome)\/(.*?) /,
      ffmatch      = / (Firefox)\/([0123456789ab.]+)/,
      safarimatch  = / Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
      iematch      = / (MSIE) ([0123456789.]+);/,
      operamatch   = /^(Opera)\/.+? Version\/([0123456789.]+)$/,
      iphonematch  = /.+?\((iPhone); CPU.+?OS .+?Version\/([0123456789._]+)/,
      ipadmatch    = /.+?\((iPad); CPU.+?OS .+?Version\/([0123456789._]+)/,
      ipodmatch    = /.+?\((iPod); CPU (iPhone.+?) like.+?Version\/([0123456789ab._]+)/,
      androidchromematch = /.+?(Android) ([0123456789.]+).+?; (.+?)\).+? CrMo\/([0123456789.]+)/,
      androidmatch = /.+?(Android) ([0123456789ab.]+).+?; (.+?)\)/,
      match;

  match = navigator.userAgent.match(chromematch);
  if (match && match[1]) {
    return {
      browser: match[1],
      version: match[2],
      oscpu: os_platform()
    };
  }
  match = navigator.userAgent.match(ffmatch);
  if (match && match[1]) {
    return {
      browser: match[1],
      version: match[2],
      oscpu: os_platform()
    };
  }
  match = navigator.userAgent.match(androidchromematch);
  if (match && match[1]) {
    return {
      browser: "Chrome",
      version: match[4],
      oscpu: match[1] + "/" + match[2] + "/" + match[3]
    };
  }
  match = navigator.userAgent.match(androidmatch);
  if (match && match[1]) {
    return {
      browser: "Android",
      version: match[2],
      oscpu: match[1] + "/" + match[2] + "/" + match[3]
    };
  }
  match = navigator.userAgent.match(safarimatch);
  if (match && match[2]) {
    return {
      browser: match[2],
      version: match[1],
      oscpu: os_platform()
    };
  }
  match = navigator.userAgent.match(iematch);
  if (match && match[1]) {
    var platform_match = navigator.userAgent.match(/\(.*?(Windows.+?); (.+?)[;)].*/);
    return {
      browser: match[1],
      version: match[2],
      oscpu: windows_platform_token[platform_match[1]] + "/" + navigator.cpuClass + "/" + navigator.platform
    };
  }
  match = navigator.userAgent.match(operamatch);
  if (match && match[1]) {
    return {
      browser: match[1],
      version: match[2],
      oscpu: os_platform()
    };
  }
  match = navigator.userAgent.match(iphonematch);
  if (match && match[1]) {
    return {
      browser: "Mobile Safari",
      version: match[2],
      oscpu: match[1] + "/" + "iOS" + "/" + match[2]
    };
  }
  match = navigator.userAgent.match(ipadmatch);
  if (match && match[1]) {
    return {
      browser: "Mobile Safari",
      version: match[2],
      oscpu: match[1] + "/" + "iOS" + "/" + match[2]
    };
  }
  match = navigator.userAgent.match(ipodmatch);
  if (match && match[1]) {
    return {
      browser: "Mobile Safari",
      version: match[3],
      oscpu: match[1] + "/" + "iOS" + "/" + match[2]
    };
  }
  return {
    browser: "",
    version: navigator.appVersion,
    oscpu:   ""
  };
}

function os_platform() {
  var match = navigator.userAgent.match(/\((.+?)[;)] (.+?)[;)].*/);
  if (!match) { return "na"; }
  if (match[1] === "Macintosh") {
    return match[2];
  } else if (match[1].match(/^Windows/)) {
    var arch  = windows_feature_token[match[2]] || "32",
        token = navigator.userAgent.match(/\(.*?(Windows NT.+?)[;)]/);
    return windows_platform_token[token[1]] + "/" + arch;
  }
}

function run(benchmarks_table, benchmarks_to_run) {
  var i = 0, b, browser_info, results = [];
  benchmarks_table.style.display = "";

  var empty_table = benchmarks_table.getElementsByTagName("tr").length === 0;
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
    if (empty_table) { add_data(title_row, title, "th"); }
    add_data(results_row, data);
  }

  browser_info = what_browser();
  add_column("browser", browser_info.browser);
  add_column("version", browser_info.version);
  add_column("cpu/os", browser_info.oscpu);

  var formatter = d3.time.format("%Y-%m-%d %H:%M");
  add_column("date", formatter(new Date()));

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
        ", source.buffer.slice: " + (source.buffer ? source.buffer.slice : '') +
        ", source.buffer.__proto__: " + (source.buffer ? source.buffer.__proto__ : '') +
        ", source.buffer.__proto__.constructor: " + (source.buffer ? source.buffer.__proto__.constructor : '')
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
layout.fullScreenRender = false;

layout.canonical.width  = 1280;
layout.canonical.height = 800;

layout.getDisplayProperties = function(obj) {
  if (!arguments.length) {
    var obj = {};
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
  };
  obj.screen_factor_width  = obj.page.width / layout.canonical.width;
  obj.screen_factor_height = obj.page.height / layout.canonical.height;
  obj.emsize = Math.min(obj.screen_factor_width * 1.1, obj.screen_factor_height);
  return obj;
};

layout.screenEqualsPage = function() {
  return ((layout.display.screen.width  === layout.display.page.width) ||
          (layout.display.screen.height === layout.display.page.height))
};

layout.checkForResize = function() {
  if ((layout.display.screen.width  != screen.width) ||
      (layout.display.screen.height != screen.height) ||
      (layout.display.window.width  != document.width) ||
      (layout.display.window.height != document.height)) {
    layout.setupScreen();
  }
};

layout.views = {};

layout.addView = function(type, view) {
  if (!layout.views[type]) {
    layout.views[type] = [];
  }
  layout.views[type].push(view);
};

layout.setView = function(type, viewArray) {
  layout.views[type] = viewArray;
};

layout.setupScreen = function(forceRender) {
  var viewLists  = layout.views,
      fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;

  if (forceRender) {
    layout.not_rendered = true;
  }

  layout.display = layout.getDisplayProperties();

  if (!layout.regular_display) {
    layout.regular_display = layout.getDisplayProperties();
  }


  if(fullscreen || layout.fullScreenRender  || layout.screenEqualsPage()) {
    layout.fullScreenRender = true;
    layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
    layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
    layout.screen_factor = layout.screen_factor_height;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    layout.bodycss.style.fontSize = layout.screen_factor + 'em';
    layout.not_rendered = true;
    switch (layout.selection) {

      // fluid layout
      case "simple-screen":
      if (layout.not_rendered) {
        setupSimpleFullScreenMoleculeContainer();
      }
      break;

      // only fluid on page load (and when resizing on trnasition to and from full-screen)
      case "simple-static-screen":
      if (layout.not_rendered) {
        setupSimpleFullScreenMoleculeContainer();
      }
      break;

      // fluid (but normally the iframe doesn't expose the full-screen action)
      case "simple-iframe":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      // fluid layout
      case "compare-screen":
      var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      compareScreen();
      layout.not_rendered = false;
      break;

      // only fluid on page load (and when resizing on trnasition to and from full-screen)
      default:
      if (layout.not_rendered) {
        setupFullScreen();
      }
      break;
    }
  } else {
    if (layout.cancelFullScreen || layout.fullScreenRender) {
      layout.cancelFullScreen = false;
      layout.fullScreenRender = false;
      layout.not_rendered = true;
      layout.regular_display = layout.previous_display;
    } else {
      layout.regular_display = layout.getDisplayProperties();
    }
    layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
    layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
    layout.screen_factor = layout.screen_factor_height;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    switch (layout.selection) {

      // fluid layout
      case "simple-screen":
      var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      simpleScreen();
      break;

      // only fluid on page load (and when resizing on trnasition to and from full-screen)
      case "simple-static-screen":
      if (layout.not_rendered) {
        var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        layout.bodycss.style.fontSize = emsize + 'em';
        simpleStaticScreen();
        layout.not_rendered = false;
      }
      break;

      // fluid layout
      case "simple-iframe":
      var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      setupSimpleIFrameScreen();
      break;

      // only fluid on page load (and when resizing on trnasition to and from full-screen)
      case "full-static-screen":
      if (layout.not_rendered) {
        var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
        layout.bodycss.style.fontSize = emsize + 'em';
        regularScreen();
        layout.not_rendered = false;
      }
      break;

      // fluid layout
      case "compare-screen":
      var emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
      layout.bodycss.style.fontSize = emsize + 'em';
      compareScreen();
      break;

      // like full-static-screen, but all component position definitions are set from properties
      case "interactive":
      if (layout.not_rendered) {
        var emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
        layout.bodycss.style.fontSize = emsize + 'em';
        setupInteractiveScreen();
        layout.not_rendered = false;
      }
      break;

      default:
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupRegularScreen();
      break;
    }
    layout.regular_display = layout.getDisplayProperties();
  }
  if (layout.transform) {
    $('input[type=checkbox]').css(layout.transform, 'scale(' + layout.checkbox_factor + ',' + layout.checkbox_factor + ')');
  }

  layout.setupTemperature(model);
  if (layout.temperature_control_checkbox) {
    model.addPropertiesListener(["temperature_control"], layout.temperatureControlUpdate);
    layout.temperatureControlUpdate();
  }

  var benchmarks_table = document.getElementById("benchmarks-table");
  if (benchmarks_table) {
    benchmarks_table.style.display = "none";
  }

  //
  // Regular Screen Layout
  //
  function regularScreen() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.46;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight*0.70) {
      height = pageHeight * 0.70;
      width * height * modelAspectRatio;
    }
    // HACK that will normally only work with one moleculeContainer
    // or if all the moleculeContainers end up the same width
    i = -1;  while(++i < viewLists.moleculeContainers.length) {
      viewLists.moleculeContainers[i].resize(width, height);
    }
    rightQuarterWidth = (pageWidth - width) * 0.415;
    rightHeight = height * 0.42;
    i = -1;  while(++i < viewLists.potentialCharts.length) {
      viewLists.potentialCharts[i].resize(rightQuarterWidth, rightHeight);
    }
    i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
      viewLists.speedDistributionCharts[i].resize(rightQuarterWidth, rightHeight);
    }
    rightHalfWidth = (pageWidth - width) * 0.86;
    rightHeight = height * 0.57;
    i = -1;  while(++i < viewLists.energyCharts.length) {
      viewLists.energyCharts[i].resize(rightHalfWidth, rightHeight);
    }
  }

  /**
    At the moment, this just finds every view in viewlist and calls resize()
    on it. Eventually this should work out which div each component wants to
    be in and resize it in some intelligent way
  **/
  function setupInteractiveScreen() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.46;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight*0.70) {
      height = pageHeight * 0.70;
      width * height * modelAspectRatio;
    }

    for (viewType in viewLists) {
      if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
        i = -1;  while(++i < viewLists[viewType].length) {
          viewLists[viewType][i].resize(width, height);
        }
      }
    }
  }

  //
  // Compare Screen Layout
  //
  function compareScreen() {
    var i, width, height, mcsize, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    width = pageWidth * 0.44;
    height = width * 1/modelAspectRatio;
    // HACK that will normally only work with one moleculeContainer
    // or if all the moleculeContainers end up the same width
    i = -1;  while(++i < viewLists.moleculeContainers.length) {
      viewLists.moleculeContainers[i].resize(width, height);
    }
    if (viewLists.appletContainers) {
      i = -1;  while(++i < viewLists.appletContainers.length) {
        viewLists.appletContainers[i].resize(width, height);
      }
    }
  }

  //
  // Full Screen Layout
  //
  function setupFullScreen() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.46;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight*0.70) {
      height = pageHeight * 0.70;
      width * height * modelAspectRatio;
    }
    i = -1;  while(++i < viewLists.moleculeContainers.length) {
      viewLists.moleculeContainers[i].resize(width, height);
    }
    rightQuarterWidth = (pageWidth - width) * 0.41;
    rightHeight = height * 0.42;
    i = -1;  while(++i < viewLists.potentialCharts.length) {
      viewLists.potentialCharts[i].resize(rightQuarterWidth, rightHeight);
    }
    i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
      viewLists.speedDistributionCharts[i].resize(rightQuarterWidth, rightHeight);
    }
    rightHalfWidth = (pageWidth - width) * 0.86;
    rightHeight = height * 0.57;
    i = -1;  while(++i < viewLists.energyCharts.length) {
      viewLists.energyCharts[i].resize(rightHalfWidth, rightHeight);
    }
  }

  //
  // Simple Screen Layout
  //
  function simpleScreen() {
    var i, width, height, mcsize, widthToPageRatio;

    height = Math.min(layout.display.page.height * 0.50, layout.display.page.width * 0.53);
    viewLists.moleculeContainers[0].resize(height, height);
    mcsize = viewLists.moleculeContainers[0].scale();
    widthToPageRatio = mcsize[0] / layout.display.page.width;
    if (widthToPageRatio > 0.53) {
      height *= (0.53 / widthToPageRatio);
      viewLists.moleculeContainers[0].resize(height, height);
    }
    viewLists.thermometers[0].resize();
  }

  //
  // Simple Static Screen Layout
  //
  function simpleStaticScreen() {
    var i, width, height, mcsize, widthToPageRatio,
        description_right = document.getElementById("description-right");

    height = Math.min(layout.display.page.height * 0.70, layout.display.page.width * 0.53);
    viewLists.moleculeContainers[0].resize(height, height);
    mcsize = viewLists.moleculeContainers[0].scale();
    widthToPageRatio = mcsize[0] / layout.display.page.width;
    if (widthToPageRatio > 0.53) {
      height *= (0.53 / widthToPageRatio);
      viewLists.moleculeContainers[0].resize(height, height);
      // if (description_right !== null) {
      //   description_right.style.width = (layout.display.page.width - mcsize[0]) * 0.50 + "px";
      // }
    }
    viewLists.thermometers[0].resize();
  }

  //
  // Simple iframe Screen Layout
  //
  function setupSimpleIFrameScreen() {
    var i, width, height, mcsize,
        rightHeight, rightHalfWidth, rightQuarterWidth,
        widthToPageRatio, modelAspectRatio,
        pageWidth = layout.display.page.width,
        pageHeight = layout.display.page.height;

    mcsize = viewLists.moleculeContainers[0].scale();
    modelAspectRatio = mcsize[0] / mcsize[1];
    widthToPageRatio = mcsize[0] / pageWidth;
    width = pageWidth * 0.80;
    height = width * 1/modelAspectRatio;
    if (height > pageHeight * 0.80) {
      height = pageHeight * 0.80;
      width * height * modelAspectRatio;
    }
    viewLists.moleculeContainers[0].resize(width, height);
    mcsize = viewLists.moleculeContainers[0].scale();
    viewLists.thermometers[0].resize();
  }

  //
  // Simple Full Screen Layout
  //
  function setupSimpleFullScreenMoleculeContainer() {
    var height = layout.display.page.height * 0.70;
    viewLists.moleculeContainers[0].resize(height, height);
  }

  function setupFullScreenDescriptionRight() {
    var description_right = document.getElementById("description-right");
    if (description_right !== null) {
      // description_right.style.width = layout.display.window.width * 0.30 +"px";
    }
  }
};

layout.getStyleForSelector = function(selector) {
  var rules, rule_lists = document.styleSheets;
  for(var i = 0; i < rule_lists.length; i++) {
    if (rule_lists[i]) {
      try {
         rules = rule_lists[i].rules || rule_lists[i].cssRules;
         if (rules) {
           for(var j = 0; j < rules.length; j++) {
             if (rules[j].selectorText == selector) {
               return rules[j];
             }
           }
         }
      }
      catch (e) {
      }
    }
  }
  return false;
};

// Adapted from getPageSize() by quirksmode.com
layout.getPageHeight = function() {
  var windowHeight;
  if (self.innerHeight) { // all except Explorer
    windowHeight = self.innerHeight;
  } else if (document.documentElement && document.documentElement.clientHeight) {
    windowHeight = document.documentElement.clientHeight;
  } else if (document.body) { // other Explorers
    windowHeight = layout.display.window.height;
  }
  return windowHeight;
};

layout.getPageWidth = function() {
  var windowWidth;
  if (self.innerWidth) { // all except Explorer
    windowWidth = self.innerWidth;
  } else if (document.documentElement && document.documentElement.clientWidth) {
    windowWidth = document.documentElement.clientWidth;
  } else if (document.body) { // other Explorers
    windowWidth = window.width;
  }
  return windowWidth;
};

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
    if (element) {
      while (p = properties.shift()) {
          if (typeof element.style[p] != 'undefined') {
              return p;
          }
      }
    }
    return false;
};

var description_right = document.getElementById("description-right");
if (description_right !== null) {
  layout.fontsize = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
}

layout.bodycss = layout.getStyleForSelector("body");
layout.transform = layout.getTransformProperty(document.body);

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
//   View Components
//
// ------------------------------------------------------------

views = { version: "0.0.1" };
// ------------------------------------------------------------
//
//   Applet Container
//
// ------------------------------------------------------------

layout.appletContainer = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      applet, appletString,
      appletWidth, appletHeight, appletAspectRatio,
      width, height,
      scale_factor,
      padding, size,
      mw, mh, tx, ty, stroke,
      default_options = {
        appletID:             "mw-applet",
        codebase:             "/jnlp",
        code:                 "org.concord.modeler.MwApplet",
        width:                "100%",
        height:               "100%",
        archive:              "org/concord/modeler/mw.jar",
        align:                "left",
        hspace:               "5",
        vspace:               "5",
        params: [
          ["script", "page:0:import /imports/legacy-mw-content/potential-tests/two-atoms-two-elements/two-atoms-two-elements.cml"]
        ]
      };

  if (options) {
    for(var p in default_options) {
      if (options[p] === undefined) {
        options[p] = default_options[p];
      }
    }
  } else {
    options = default_options;
  }

  scale(cx, cy);

  function scale(w, h) {
    if (!arguments.length) {
      cy = elem.property("clientHeight");
      cx = elem.property("clientWidth");
    } else {
      cy = h;
      cx = w;
    }
    if(applet) {
      appletWidth  = +applet.runMwScript("mw2d:1:get %width");
      appletHeight = +applet.runMwScript("mw2d:1:get %height");
      appletAspectRatio = appletWidth/appletHeight;
      cy = cx * 1/appletAspectRatio * 1.25;
    }
    node.style.width = cx +"px";
    node.style.height = cy +"px";
    scale_factor = layout.screen_factor;
    if (layout.screen_factor_width && layout.screen_factor_height) {
      scale_factor = Math.min(layout.screen_factor_width, layout.screen_factor_height);
    }
    scale_factor = cx/600;
    padding = {
       "top":    5,
       "right":  5,
       "bottom": 5,
       "left":   5
    };

    height = cy - padding.top  - padding.bottom;
    width  = cx - padding.left  - padding.right;
    size = { "width":  width, "height": height };

    return [cx, cy];
  }

  function container() {
    if (applet === undefined) {
      appletString = generateAppletString();
      node.innerHTML = appletString;
      applet = document.getElementById(options.appletID);
    } else {
      applet.style.width  = size.width;
      applet.style.height = size.height;
      applet.width  = size.width;
      applet.height = size.height;
    }

    function generateAppletString() {
      var i, param, strArray;
      strArray =
        ['<applet id="' + options.appletID + '", codebase="' + options.codebase + '", code="' + options.code + '"',
         '     width="' + options.width + '" height="' + options.height + '" MAYSCRIPT="true"',
         '     archive="' + options.archive + '">',
         '     MAYSCRIPT="true">'];
      for(i = 0; i < options.params.length; i++) {
        param = options.params[i];
        strArray.push('  <param name="' + param[0] + '" value="' + param[1] + '"/>');
      }
      strArray.push('  <param name="MAYSCRIPT" value="true"/>');
      strArray.push('  Your browser is completely ignoring the applet tag!');
      strArray.push('</applet>');
      return strArray.join('\n');
    }

    // make these private variables and functions available
    container.node = node;
    container.scale = scale;
    container.applet = applet;
  }

  container.resize = function(w, h) {
    container.scale(w, h);
  };

  if (node) { container(); }

  return container;
};
// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

layout.moleculeContainer = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      width, height,
      scale_factor,
      vis1, vis, plot,
      playback_component, time_label,
      padding, size,
      mw, mh, tx, ty, stroke,
      x, downscalex, downx,
      y, downscaley, downy,
      dragged,
      pc_xpos, pc_ypos,
      model_time_formatter = d3.format("5.2f"),
      time_prefix = "time: ",
      time_suffix = " (ps)",
      gradient_container,
      red_gradient,
      blue_gradient,
      green_gradient,
      element_gradient_array,
      atom_tooltip_on,
      offset_left, offset_top,
      particle, label, labelEnter, tail,
      molRadius,
      molecule_div, molecule_div_pre,
      atoms,
      get_num_atoms,
      nodes,
      get_nodes,
      default_options = {
        title:                false,
        xlabel:               false,
        ylabel:               false,
        playback_controller:  false,
        play_only_controller: true,
        model_time_label:     false,
        grid_lines:           false,
        xunits:               false,
        yunits:               false,
        atom_mubers:          false,
        xmin:                 0,
        xmax:                 10,
        ymin:                 0,
        ymax:                 10
      };

  if (options) {
    for(var p in default_options) {
      if (options[p] === undefined) {
        options[p] = default_options[p];
      }
    }
  } else {
    options = default_options;
  }

  // The get_nodes option allows us to update 'nodes' array every model tick.
  get_nodes = options.get_nodes;
  nodes = get_nodes();

  get_num_atoms = options.get_num_atoms;
  (atoms=[]).length = get_num_atoms();

  scale(cx, cy);

  tx = function(d, i) { return "translate(" + x(d) + ",0)"; };
  ty = function(d, i) { return "translate(0," + y(d) + ")"; };
  stroke = function(d, i) { return d ? "#ccc" : "#666"; };

  function scale(w, h) {
    var modelSize = model.size(),
        aspectRatio = modelSize[0] / modelSize[1];
    if (!arguments.length) {
      cy = elem.property("clientHeight");
      cx = cy * aspectRatio;
    } else {
      cy = h;
      node.style.height = cy +"px";
      cx = cy * aspectRatio;
    }
    node.style.width = cx +"px";
    scale_factor = layout.screen_factor;
    padding = {
       "top":    options.title  ? 40 * layout.screen_factor : 20,
       "right":                   25,
       "bottom": 10,
       "left":   options.ylabel ? 60  * layout.screen_factor : 25
    };

    if (options.xlabel || options.model_time_label) {
      padding.bottom += (35  * scale_factor);
    }

    if (options.playback_controller || options.play_only_controller) {
      padding.bottom += (40  * scale_factor);
    }

    height = cy - padding.top  - padding.bottom;
    width  = cx - padding.left  - padding.right;

    size = {
      "width":  width,
      "height": height
    };

    offset_left = node.offsetLeft + padding.left;
    offset_top = node.offsetTop + padding.top;
    if (options.playback_controller) {
      pc_xpos = padding.left + (size.width - (230 * scale_factor))/2;
    };
    if (options.play_only_controller) {
      pc_xpos = padding.left + (size.width - (140 * scale_factor))/2;
    }
    pc_ypos = cy - 42 * scale_factor;
    mw = size.width;
    mh = size.height;

    // x-scale
    x = d3.scale.linear()
        .domain([options.xmin, options.xmax])
        .range([0, mw]);

    // drag x-axis logic
    downscalex = x.copy();
    downx = Math.NaN;

    // y-scale (inverted domain)
    y = d3.scale.linear()
        .domain([options.ymax, options.ymin])
        .nice()
        .range([0, mh])
        .nice();

    // drag x-axis logic
    downscaley = y.copy();
    downy = Math.NaN;
    dragged = null;
    return [cx, cy];
  }

  function modelTimeLabel() {
    return time_prefix + model_time_formatter(model.getTime() / 1000) + time_suffix;
  }

  function get_element(i) {
    return nodes[model.INDICES.ELEMENT][i];
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

  function container() {
    // if (node.clientWidth && node.clientHeight) {
    //   cx = node.clientWidth;
    //   cy = node.clientHeight;
    //   size.width  = cx - padding.left - padding.right;
    //   size.height = cy - padding.top  - padding.bottom;
    // }
    scale();
    if (vis === undefined) {
      vis1 = d3.select(node).append("svg")
        .attr("width", cx)
        .attr("height", cy);

      vis = vis1.append("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
        .attr("class", "plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

      // add Chart Title
      if (options.title) {
        vis.append("text")
            .attr("class", "title")
            .text(options.title)
            .attr("x", size.width/2)
            .attr("dy","-1em")
            .style("text-anchor","middle");
      }

      // Add the x-axis label
      if (options.xlabel) {
        vis.append("text")
            .attr("class", "xlabel")
            .text(options.xlabel)
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy","2.4em")
            .style("text-anchor","middle");
      }

      // add y-axis label
      if (options.ylabel) {
        vis.append("g")
            .append("text")
                .attr("class", "ylabel")
                .text(options.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      // add model time display
      if (options.model_time_label) {
        time_label = vis.append("text")
            .attr("class", "model_time_label")
            .text(modelTimeLabel())
            .attr("x", size.width - 100)
            .attr("y", size.height)
            .attr("dy","2.4em")
            .style("text-anchor","start");
      }
      if (options.playback_controller) {
        playback_component = new PlaybackComponentSVG(vis1, model_player, pc_xpos, pc_ypos, scale_factor);
      }
      if (options.play_only_controller) {
        playback_component = new PlayOnlyComponentSVG(vis1, model_player, pc_xpos, pc_ypos, scale_factor);
      }

      molecule_div = d3.select("#viz").append("div")
          .attr("class", "tooltip")
          .style("opacity", 1e-6);

      molecule_div_pre = molecule_div.append("pre");

      d3.select(node)
        .attr("tabindex", 0)
        .on("mousedown", mousedown);

      registerKeyboardHandlers();

      redraw();
      create_gradients();

    } else {

      d3.select(node).select("svg")
          .attr("width", cx)
          .attr("height", cy);

      vis.select("svg")
          .attr("width", cx)
          .attr("height", cy);

      vis.select("rect.plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

      vis.select("svg.container")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height);

      if (options.title) {
        vis.select("text.title")
            .attr("x", size.width/2)
            .attr("dy","-1em");
      }

      if (options.xlabel) {
        vis.select("text.xlabel")
            .attr("x", size.width/2)
            .attr("y", size.height);
      }

      if (options.ylabel) {
        vis.select("text.ylabel")
            .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      if (options.model_time_label) {
        time_label.text(modelTimeLabel())
            .attr("x", size.width - 100)
            .attr("y", size.height);
      }

      vis.selectAll("g.x").remove();
      vis.selectAll("g.y").remove();

      if (particle) {
        updateMoleculeRadius();

        particle.attr("cx", function(d, i) { return x(get_x(i)); })
                .attr("cy", function(d, i) { return y(get_y(i)); })
                .attr("r",  function(d, i) { return x(get_radius(i)); });

        label.attr("transform", function(d, i) {
          return "translate(" + x(get_x(i)) + "," + y(get_y(i)) + ")";
        });
      }

      if (options.playback_controller || options.play_only_controller) {
        playback_component.position(pc_xpos, pc_ypos, scale_factor);
      }
      redraw();

    }

    function redraw() {
      if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
          d3.event.transform(x, y);
      }

      var fx = x.tickFormat(10),
          fy = y.tickFormat(10);

      if (options.xunits) {
        // Regenerate x-ticks…
        var gx = vis.selectAll("g.x")
            .data(x.ticks(10), String)
            .attr("transform", tx);

        gx.select("text")
            .text(fx);

        var gxe = gx.enter().insert("svg:g", "a")
            .attr("class", "x")
            .attr("transform", tx);

        if (options.grid_lines) {
          gxe.append("svg:line")
              .attr("stroke", stroke)
              .attr("y1", 0)
              .attr("y2", size.height);
        }

        gxe.append("svg:text")
            .attr("y", size.height)
            .attr("dy", "1em")
            .attr("text-anchor", "middle")
            .text(fx);

        gx.exit().remove();
      }

      if (options.xunits) {
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

        if (options.grid_lines) {
          gye.append("svg:line")
              .attr("stroke", stroke)
              .attr("x1", 0)
              .attr("x2", size.width);
        }

        gye.append("svg:text")
            .attr("x", -3)
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .text(fy);

        // update model time display
        if (options.model_time_label) {
          time_label.text(modelTimeLabel());
        }

        gy.exit().remove();
      }
    }

    function create_gradients() {
      gradient_container = vis.append("svg")
          .attr("class", "container")
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height);

      create_radial_gradient("neg-grad", "#ffefff", "#fdadad", "#e95e5e", gradient_container);
      create_radial_gradient("pos-grad", "#dfffff", "#9abeff", "#767fbf", gradient_container);
      create_radial_gradient("green-grad", "#dfffef", "#75a643", "#2a7216", gradient_container);
      create_radial_gradient("purple-grad", "#EED3F0", "#D941E0", "#84198A", gradient_container);
      create_radial_gradient("aqua-grad", "#DCF5F4", "#41E0D8", "#12827C", gradient_container);
      create_radial_gradient("orange-grad", "#F0E6D1", "#E0A21B", "#AD7F1C", gradient_container);

      element_gradient_array = ["green-grad", "purple-grad", "aqua-grad", "orange-grad"];
    }

    function create_radial_gradient(id, lightColor, medColor, darkColor, gradient_container) {
      gradient = gradient_container.append("defs")
          .append("radialGradient")
          .attr("id", id)
          .attr("cx", "50%")
          .attr("cy", "47%")
          .attr("r", "53%")
          .attr("fx", "35%")
          .attr("fy", "30%");
      gradient.append("stop")
          .attr("stop-color", lightColor)
          .attr("offset", "0%");
      gradient.append("stop")
          .attr("stop-color", medColor)
          .attr("offset", "40%");
      gradient.append("stop")
          .attr("stop-color", darkColor)
          .attr("offset", "80%");
      gradient.append("stop")
          .attr("stop-color", medColor)
          .attr("offset", "100%");
    }

    function updateMoleculeRadius() {
      vis.selectAll("circle").data(atoms).attr("r",  function(d, i) { return x(get_radius(i)); });
      // vis.selectAll("text").attr("font-size", x(molRadius * 1.3) );
    }

    /**
      Call this wherever a d3 selection is being used to add circles for atoms
    */
    function circlesEnter(particle) {
      particle.enter().append("circle")
          .attr("r",  function(d, i) { return x(get_radius(i)); })
          .attr("cx", function(d, i) { return x(get_x(i)); })
          .attr("cy", function(d, i) { return y(get_y(i)); })
          .style("cursor", "crosshair")
          .style("fill", function(d, i) {
            if (model.get("coulomb_forces")) {
              return (x(get_charge(i)) > 0) ? "url('#pos-grad')" : "url('#neg-grad')";
            } else {
              element = get_element(i) % 4;
              grad = element_gradient_array[element];
              return "url('#"+grad+"')";
            }
          })
          .on("mousedown", molecule_mousedown)
          .on("mouseout", molecule_mouseout);
    }

    function setup_particles() {
      // The get_nodes option allows us to update 'nodes' array every model tick.
      get_nodes = options.get_nodes;
      nodes = get_nodes();

      get_num_atoms = options.get_num_atoms;
      (atoms=[]).length = get_num_atoms();

      if (typeof atoms == "undefined" || !atoms){
        return;
      }

      var ljf = model.getLJCalculator()[0][0].coefficients();
      // // molRadius = ljf.rmin * 0.5;
      // // model.set_radius(molRadius);

      gradient_container.selectAll("circle").remove();
      gradient_container.selectAll("g").remove();

      particle = gradient_container.selectAll("circle").data(atoms);

      circlesEnter(particle);

      var font_size = x(ljf.rmin * 0.5 * 1.5);
      if (model.get('mol_number') > 100) { font_size *= 0.9; }

      label = gradient_container.selectAll("g.label")
          .data(atoms);

      labelEnter = label.enter().append("g")
          .attr("class", "label")
          .attr("transform", function(d, i) {
            return "translate(" + x(get_x(i)) + "," + y(get_y(i)) + ")";
          });

      if (options.atom_mubers) {
        labelEnter.append("text")
            .attr("class", "index")
            .attr("font-size", font_size)
            .attr("style", "font-weight: bold; opacity: .7")
            .attr("x", 0)
            .attr("y", "0.31em")
            .text(function(d) { return d.index; });
      } else {
        labelEnter.append("text")
            .attr("class", "index")
            .attr("font-size", font_size)
            .attr("style", "font-weight: bold; opacity: .7")
            .attr("x", "-0.31em")
            .attr("y", "0.31em")
            .text(function(d, i) {
              if (model.get("coulomb_forces")) {
                return (x(get_charge(i)) > 0) ? "+" : "–";
              } else {
                return;    // ""
              }
            });
      }
    }

    function mousedown() {
      node.focus();
    }

    function molecule_mouseover(d) {
      // molecule_div.transition()
      //       .duration(250)
      //       .style("opacity", 1);
    }

    function molecule_mousedown(d, i) {
      node.focus();
      if (atom_tooltip_on) {
        molecule_div.style("opacity", 1e-6);
        molecule_div.style("display", "none");
        atom_tooltip_on = false;
      } else {
        if (d3.event.shiftKey) {
          atom_tooltip_on = i;
        } else {
          atom_tooltip_on = false;
        }
        render_atom_tooltip(i);
      }
    }

    function render_atom_tooltip(i) {
      molecule_div
            .style("opacity", 1.0)
            .style("display", "inline")
            .style("background", "rgba(100%, 100%, 100%, 0.5)")
            .style("left", x(nodes[model.INDICES.X][i]) + offset_left + 16 + "px")
            .style("top",  y(nodes[model.INDICES.Y][i]) + offset_top - 30 + "px")
            .transition().duration(250);

      molecule_div_pre.text(
          modelTimeLabel() + "\n" +
          "speed: " + d3.format("+6.3e")(get_speed(i)) + "\n" +
          "vx:    " + d3.format("+6.3e")(get_vx(i))    + "\n" +
          "vy:    " + d3.format("+6.3e")(get_vy(i))    + "\n" +
          "ax:    " + d3.format("+6.3e")(get_ax(i))    + "\n" +
          "ay:    " + d3.format("+6.3e")(get_ay(i))    + "\n"
        );
    }

    function molecule_mousemove(d) {
    }

    function molecule_mouseout() {
      if (typeof(atom_tooltip_on) !== "number") {
        molecule_div.style("opacity", 1e-6);
      }
    }

    function update_molecule_positions() {

      (atoms = []).length = get_num_atoms();
      nodes = get_nodes();

      // update model time display
      if (options.model_time_label) {
        time_label.text(modelTimeLabel());
      }

      label = elem.selectAll("g.label").data(atoms);

      label.attr("transform", function(d, i) {
          return "translate(" + x(get_x(i)) + "," + y(get_y(i)) + ")";
        });

      particle = gradient_container.selectAll("circle").data(atoms);
      circlesEnter(particle);

      particle.attr("cx", function(d, i) {
          return x(nodes[model.INDICES.X][i]); })
        .attr("cy", function(d, i) {
          return y(nodes[model.INDICES.Y][i]); })
        .attr("r",  function(d, i) {
          return x(nodes[model.INDICES.RADIUS][i]); });
      if ((typeof(atom_tooltip_on) === "number")) {
        render_atom_tooltip(atom_tooltip_on);
      }
    }

    // ------------------------------------------------------------
    //
    // Handle keyboard shortcuts for model operation
    //
    // ------------------------------------------------------------

    function handleKeyboardForView(evt) {
      evt = (evt) ? evt : ((window.event) ? event : null);
      if (evt) {
        switch (evt.keyCode) {
          case 32:                // spacebar
            if (model.is_stopped()) {
              playback_component.action('play');
            } else {
              playback_component.action('stop');
            }
            evt.preventDefault();
          break;
          case 13:                // return
            playback_component.action('play');
            evt.preventDefault();
          break;
          // case 37:                // left-arrow
          //   if (!model.is_stopped()) {
          //     playback_component.action('stop');
          //   }
          //   modelStepBack();
          //   evt.preventDefault();
          // break;
          // case 39:                // right-arrow
          //   if (!model.is_stopped()) {
          //     playback_component.action('stop');
          //   }
          //   modelStepForward();
          //   evt.preventDefault();
          // break;
        }
      }
    }

    function registerKeyboardHandlers() {
      node.onkeydown = handleKeyboardForView;
    }

    // make these private variables and functions available
    container.node = node;
    container.updateMoleculeRadius = updateMoleculeRadius;
    container.setup_particles = setup_particles;
    container.update_molecule_positions = update_molecule_positions;
    container.scale = scale;
    container.playback_component = playback_component;
  }

  container.resize = function(w, h) {
    container.scale(w, h);
    container();
    container.setup_particles();
  };


 if (node) { container(); }

  return container;
};
// ------------------------------------------------------------
//
//   Lennard-Jones Potential Chart
//
// ------------------------------------------------------------

layout.potentialChart = function(e, model, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      padding, size,
      mw, mh, tx, ty, stroke,
      xScale = d3.scale.linear(), downx,
      yScale = d3.scale.linear(), downy,
      dragged, coefficient_dragged,
      vis, plot,
      ljCalculator,
      ljData = {},
      ljPotentialGraphData = [],
      default_options = {
        title   : "Lennard-Jones potential",
        xlabel  : "Radius",
        ylabel  : "Potential Energy"
      };

  if (options) {
    for(var p in default_options) {
      if (options[p] === undefined) {
        options[p] = default_options[p];
      }
    }
  } else {
    options = default_options;
  }

  ljData.variables = [];
  ljData.variables[0] = { coefficient: "epsilon", cursorStyle: "ns-resize" };
  ljData.variables[1] = { coefficient: "sigma", cursorStyle: "ew-resize" };

  updateLJData();

  // drag coefficients logic
  coefficient_dragged = false;
  coefficient_selected = ljData.variables[0];

  scale(cx, cy);

  tx = function(d, i) { return "translate(" + xScale(d) + ",0)"; };
  ty = function(d, i) { return "translate(0," + yScale(d) + ")"; };
  stroke = function(d, i) { return Math.abs(d) > 0.0001 ? "#ccc" : "#666"; };

  line = d3.svg.line()
      .x(function(d, i) { return xScale(ljPotentialGraphData[i][0]); })
      .y(function(d, i) { return yScale(ljPotentialGraphData[i][1]); });

  function updateLJData() {
    var sigma, epsilon, rmin, y, r, i;

    ljCalculator = model.getLJCalculator()[0][0];
    ljData.coefficients = ljCalculator.coefficients();
    sigma   = ljData.coefficients.sigma;
    epsilon = ljData.coefficients.epsilon;
    rmin    = ljData.coefficients.rmin;
    ljData.xmax    = sigma * 3;
    ljData.xmin    = Math.floor(sigma/2);
    ljData.ymax    = 0.4;
    ljData.ymin    = Math.ceil(epsilon*1) - 1.0;

    // update the positions of the circles for epsilon and sigma on the graph
    ljData.variables[0].x = rmin;
    ljData.variables[0].y = epsilon;
    ljData.variables[1].x = sigma;
    ljData.variables[1].y = 0;

    ljPotentialGraphData.length = 0;
    for(r = sigma * 0.5; r < ljData.xmax * 3;  r += 0.001) {
      y = -ljCalculator.potential(r, 0, 0);
      if (Math.abs(y) < 100) {
        ljPotentialGraphData.push([r, y]);
      }
    }
  }

  function scale(w, h) {
    cx = w;
    cy = h;
    // cx = elem.property("clientWidth");
    // cy = elem.property("clientHeight");
    node.style.width = cx +"px";
    node.style.height = cy +"px";
    // scale_factor = layout.screen_factor;
    // if (layout.screen_factor_width && layout.screen_factor_height) {
    //   scale_factor = Math.min(layout.screen_factor_width, layout.screen_factor_height);
    // }
    // scale_factor = cx/600;
    // padding = {
    //    "top":    options.title  ? 40 * layout.screen_factor : 20,
    //    "right":                   25,
    //    "bottom": options.xlabel ? 56  * layout.screen_factor : 20,
    //    "left":   options.ylabel ? 60  * layout.screen_factor : 25
    // };

    padding = {
       "top":    options.title  ? 40  : 20,
       "right":                   35,
       "bottom": options.xlabel ? 56  : 30,
       "left":   options.ylabel ? 60  : 25
    };

    width =  cx - padding.left - padding.right;
    height = cy - padding.top  - padding.bottom;

    size = {
      "width":  width,
      "height": height
    };

    mw = size.width;
    mh = size.height;

    // x-scale
    xScale = d3.scale.linear()
      .domain([ljData.xmin, ljData.xmax]).range([0, mw]);

    // y-scale (inverted domain)
    yScale = d3.scale.linear()
      .domain([ljData.ymax, ljData.ymin]).range([0, mh]);

    // drag x-axis logic
    downx = Math.NaN;

    // drag y-axis logic
    downy = Math.NaN;
    dragged = null;
  }

  function container() {
    scale(cx, cy);
    if (vis === undefined) {
      vis = d3.select(node).append("svg")
        .attr("width", cx)
        .attr("height", cy)
        .append("svg:g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
        .attr("class", "plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE")
        .attr("pointer-events", "all");

      plot.call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 8]).on("zoom", redraw));

      vis.append("svg")
        .attr("class", "linebox")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height)
        .append("path")
            .attr("class", "line")
            .attr("d", line(ljPotentialGraphData));

      // add Chart Title
      if (options.title) {
        vis.append("text")
            .attr("class", "title")
            .text(options.title)
            .attr("x", size.width/2)
            .attr("dy","-1em")
            .style("text-anchor","middle");
      }

      // Add the x-axis label
      if (options.xlabel) {
        vis.append("text")
            .attr("class", "xlabel")
            .text(options.xlabel)
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy","2.4em")
            .style("text-anchor","middle");
      }

      // add y-axis label
      if (options.ylabel) {
        vis.append("g")
            .append("text")
                .attr("class", "ylabel")
                .text( options.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      vis.on("mousemove", mousemove)
            .on("mouseup", mouseup);

      redraw();

    } else {

      d3.select(node).select("svg")
          .attr("width", cx)
          .attr("height", cy);

      vis.select("svg")
          .attr("width", cx)
          .attr("height", cy);

      vis.select("rect.plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

      vis.select("svg.container")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height);

      vis.select("svg.linebox")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height);

      if (options.title) {
        vis.select("text.title")
            .attr("x", size.width/2)
            .attr("dy","-1em");
      }

      if (options.xlabel) {
        vis.select("text.xlabel")
            .attr("x", size.width/2)
            .attr("y", size.height);
      }

      if (options.ylabel) {
        vis.select("text.ylabel")
            .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      vis.selectAll("g.x").remove();
      vis.selectAll("g.y").remove();

      d3.select(this)
          .on("mousemove.drag", mousemove)
          .on("touchmove.drag", mousemove)
          .on("mouseup.drag",   mouseup)
          .on("touchend.drag",  mouseup);

      redraw();
    }

    function redraw() {
      if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
          d3.event.transform(x, y);
      }

      var fx = xScale.tickFormat(5),
          fy = yScale.tickFormat(5);

      // Regenerate x-ticks…
      var gx = vis.selectAll("g.x")
          .data(xScale.ticks(5), String)
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
              downx = xScale.invert(p[0]);
              // d3.behavior.zoom().off("zoom", redraw);
         });

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
          .attr("x", -3)
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .style("cursor", "ns-resize")
          .text(fy)
          .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
          .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
          .on("mousedown", function(d) {
               var p = d3.svg.mouse(vis[0][0]);
               downy = yScale.invert(p[1]);
               // d3.behavior.zoom().off("zoom", redraw);
          });

      gy.exit().remove();
      plot.call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 8]).on("zoom", redraw));
      update();
    }

    // ------------------------------------------------------------
    //
    // Draw the Lennard-Jones function
    //
    // ------------------------------------------------------------

    function update() {
      var epsilon_circle = vis.selectAll("circle")
          .data(ljData.variables, function(d) { return d; });

      var lines = vis.select("path").attr("d", line(ljPotentialGraphData)),
          x_extent = xScale.domain()[1] - xScale.domain()[0];

      epsilon_circle.enter().append("circle")
          .attr("class", function(d) { return d === coefficient_dragged ? "selected" : null; })
          .attr("cx",    function(d) { return xScale(d.x); })
          .attr("cy",    function(d) { return yScale(d.y); })
          .style("cursor", function(d) { return d.cursorStyle; })
          .attr("r", 8.0)
          .on("mousedown", function(d) {
            if (d.coefficient == "epsilon") {
              d.x = ljData.coefficients.rmin;
            } else {
              d.y = 0;
            }
            coefficient_selected = coefficient_dragged = d;
            update();
          });

      epsilon_circle
          .attr("class", function(d) { return d === coefficient_selected ? "selected" : null; })
          .attr("cx",    function(d) { return xScale(d.x); })
          .attr("cy",    function(d) { return yScale(d.y); });

      epsilon_circle.exit().remove();

      if (d3.event && d3.event.keyCode) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    function plot_drag() {
      elem.style("cursor", "move");
    }

    function mousemove() {
      var p = d3.svg.mouse(vis[0][0]),
          changex, changey, new_domain,
          t = d3.event.changedTouches;
      if (coefficient_dragged) {
        node.onselectstart = function(){ return false; };
        var m = d3.svg.mouse(vis.node()),
          newx, newy;
        if (coefficient_dragged.coefficient == "epsilon") {
          newx = ljData.coefficients.rmin;
          newy = yScale.invert(Math.max(0, Math.min(size.height, m[1])));
          if (newy > options.epsilon_max) { newy = options.epsilon_max; }
          if (newy < options.epsilon_min) { newy = options.epsilon_min; }
          model.set( { epsilon: newy } );
        } else {
          newy = 0;
          newx = xScale.invert(Math.max(0, Math.min(size.width, m[0])));
          if (newx < options.sigma_min) { newx = options.sigma_min; }
          if (newx > options.sigma_max) { newx = options.sigma_max; }
          model.set( { sigma: newx } );
        }
        coefficient_dragged.x = newx;
        coefficient_dragged.y = newy;
        update();
      }
      if (!isNaN(downx)) {
        d3.select('body').style("cursor", "ew-resize");
        xScale.domain(grapher.axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
        redraw();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
      if (!isNaN(downy)) {
        d3.select('body').style("cursor", "ns-resize");
        yScale.domain(grapher.axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
        redraw();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    function mouseup() {
      if (!isNaN(downx)) {
        node.onselectstart = function(){ return true; };
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


    elem.on("mousemove", function(d) {
      document.onselectstart = function() { return true; };
      var p = d3.svg.mouse(vis[0][0]);
      if (!isNaN(downx)) {
        xScale.domain(grapher.axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
        redraw();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
      if (!isNaN(downy)) {
        yScale.domain(grapher.axis.axisProcessDrag(downy, yScale.invert(p[0]), yScale.domain()));
        redraw();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    })
    .on("mouseup", function(d) {
        document.onselectstart = function() { return true; };
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

    // make these private variables and functions available
    container.node = node;
    container.scale = scale;
    container.updateLJData = updateLJData;
    container.update = update;
    container.redraw = redraw;
  }

  container.resize = function(width, height) {
    container.scale(width, height);
    container();
  };

  container.ljUpdate = function() {
    container.updateLJData();
    container.redraw();
  };

 if (node) { container(); }

  return container;
};
// ------------------------------------------------------------
//
//   Speed Distribution Histogram
//
// ------------------------------------------------------------

layout.speedDistributionChart = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      padding, size,
      mw, mh, tx, ty, stroke,
      xScale, downscalex, downx,
      yScale, downscaley, downy,
      barWidth, quantile, lineStep, yMax, speedMax,
      vis, plot, bars, line, speedData, fit, bins,
      default_options = {
        title    : "Distribution of Speeds",
        xlabel   : null,
        ylabel   : "Count",
        xmax     : 2,
        xmin     : 0,
        ymax     : 15,
        ymin     : 0,
        quantile : 0.01
      };

  if (options) {
    for(var p in default_options) {
      if (options[p] === undefined) {
        options[p] = default_options[p];
      }
    }
  } else {
    options = default_options;
  }

  scale(cx, cy);

  tx = function(d, i) { return "translate(" + xScale(d) + ",0)"; };
  ty = function(d, i) { return "translate(0," + yScale(d) + ")"; };
  stroke = function(d, i) { return d ? "#ccc" : "#666"; };

  function generateSpeedData() {
    speedData = model.get_speed();
    options.xmax = d3.max(speedData);
    options.xmin = d3.min(speedData);
    options.quantile = d3.quantile(speedData, 0.1);
    yMax = options.ymax;
    // x-scale
    xScale = d3.scale.linear()
      .domain([options.xmin, options.xmax])
      .range([0, mw]);
    // y-scale
    yScale = d3.scale.linear()
        .domain([options.ymax, options.ymin])
        .nice()
        .range([0, mh]);
  }

  function updateSpeedBins() {
    if (speedData.length > 2) {
      // this is a hack for cases when all speeds are 0
      try {
        bins = d3.layout.histogram().frequency(false).bins(xScale.ticks(60))(speedData);
      } catch(e) {
        return;
      }

      barWidth = (size.width - bins.length)/bins.length;
      lineStep = (options.xmax - options.xmin)/bins.length;
      speedMax  = d3.max(bins, function(d) { return d.y; });
    }
  }

  function scale(w, h) {
    cx = w;
    cy = h;
    // cx = elem.property("clientWidth");
    // cy = elem.property("clientHeight");
    node.style.width = cx +"px";
    node.style.height = cy +"px";
    // scale_factor = layout.screen_factor;
    // if (layout.screen_factor_width && layout.screen_factor_height) {
    //   scale_factor = Math.min(layout.screen_factor_width, layout.screen_factor_height);
    // }
    // scale_factor = cx/600;
    // padding = {
    //    "top":    options.title  ? 40 * layout.screen_factor : 20,
    //    "right":                   25,
    //    "bottom": options.xlabel ? 56  * layout.screen_factor : 20,
    //    "left":   options.ylabel ? 60  * layout.screen_factor : 25
    // };

    padding = {
       "top":    options.title  ? 40  : 20,
       "right":                   35,
       "bottom": options.xlabel ? 56  : 30,
       "left":   options.ylabel ? 60  : 25
    };

    width =  cx - padding.left - padding.right;
    height = cy - padding.top  - padding.bottom;

    size = {
      "width":  width,
      "height": height
    };

    mw = size.width;
    mh = size.height;

    // x-scale
    xScale = d3.scale.linear()
      .domain([options.xmin, options.xmax])
      .range([0, mw]);

    // y-scale (inverted domain)
    yScale = d3.scale.linear()
        .domain([options.ymax, options.ymin])
        .nice()
        .range([0, mh])
        .nice();

  generateSpeedData();
  updateSpeedBins();

  }

  function container() {
    scale(cx, cy);
    if (vis === undefined) {
      vis = d3.select(node).append("svg")
        .attr("width", cx)
        .attr("height", cy)
        .append("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
        .attr("class", "plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

      // add Chart Title
      if (options.title) {
        vis.append("text")
            .attr("class", "title")
            .text(options.title)
            .attr("x", size.width/2)
            .attr("dy","-1em")
            .style("text-anchor","middle");
      }

      // Add the x-axis label
      if (options.xlabel) {
        vis.append("text")
            .attr("class", "xlabel")
            .text(options.xlabel)
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy","2.4em")
            .style("text-anchor","middle");
      }

      // add y-axis label
      if (options.ylabel) {
        vis.append("g")
            .append("text")
                .attr("class", "ylabel")
                .text(options.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      redraw();

    } else {

      d3.select(node).select("svg")
          .attr("width", cx)
          .attr("height", cy);

      vis.select("rect.plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

      if (options.title) {
        vis.select("text.title")
            .attr("x", size.width/2)
            .attr("dy","-1em");
      }

      if (options.xlabel) {
        vis.select("text.xlabel")
            .attr("x", size.width/2)
            .attr("y", size.height);
      }

      if (options.ylabel) {
        vis.select("text.ylabel")
            .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      vis.selectAll("g.x").remove();
      vis.selectAll("g.y").remove();

      redraw();

    }

    function redraw() {
      if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
          d3.event.transform(x, y);
      }

      var fy = yScale.tickFormat(10);

      // Regenerate y-ticks…
      var gy = vis.selectAll("g.y")
          .data(yScale.ticks(5), String)
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
               // d3.behavior.zoom().off("zoom", redraw);
          });

      gy.exit().remove();
      update();
    }

    // ------------------------------------------------------------
    //
    // Draw the Speed Distribution
    //
    // ------------------------------------------------------------

    function update() {
      generateSpeedData();
      if (speedData.length > 2) {
        kde = science.stats.kde().sample(speedData);
        xScale.domain([options.xmin, options.xmax]);
        try {
          bins = d3.layout.histogram().frequency(true).bins(xScale.ticks(60))(speedData);
        } catch (e) {
          return;
        }

        barWidth = (size.width - bins.length)/bins.length;
        lineStep = (options.xmax - options.xmin)/bins.length;
        speedMax  = d3.max(bins, function(d) { return d.y; });

        vis.selectAll("g.bar").remove();

        bars = vis.selectAll("g.bar")
            .data(bins);

        bars.enter().append("g")
            .attr("class", "bar")
            .attr("transform", function(d, i) {
              return "translate(" + xScale(d.x) + "," + (mh - yScale(yMax - d.y)) + ")";
            })
            .append("rect")
              .attr("class", "bar")
              .attr("fill", "steelblue")
              .attr("width", barWidth)
              .attr("height", function(d) {
                  return yScale(yMax - d.y);
                });
      }
    }


    // make these private variables and functions available
    container.node = node;
    container.scale = scale;
    container.update = update;
    container.redraw = redraw;
  }

  container.resize = function(width, height) {
    container.scale(width, height);
    // container.scale();
    container();
  };

  if (node) { container(); }
  return container;
};
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
      return model.get_num_atoms();
    }
  },
  {
    name: "temperature",
    run: function() {
      return model.get("temperature");
    }
  },
  {
    name: "100 Steps (steps/s)",
    run: function() {
      controller.modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        // advance model 1 tick, but don't paint the display
        model.tick(1, { dontDispatchTickEvent: true });
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  },
  {
    name: "100 Steps w/graphics",
    run: function() {
      controller.modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
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
      nodes = model.get_nodes(),
      atoms = [],
      titlerows = datatable_table.getElementsByClassName("title"),
      datarows = datatable_table.getElementsByClassName("data"),
      column_titles = ['PX', 'PY', 'X', 'Y', 'VX', 'VY', 'AX', 'AY', 'SPEED', 'CHARGE', 'RADIUS', 'ELEMENT'],
      i_formatter = d3.format(" 2d"),
      charge_formatter = d3.format(" 1.1f"),
      f_formatter = d3.format(" 3.4f"),
      formatters = [f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, charge_formatter, f_formatter, 
                    i_formatter];

  atoms.length = nodes[0].length;
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
  if (reset) { datarows = add_data_rows(model.get_num_atoms()); }
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

layout.setupTemperature = function(model) {
  if (select_temperature) {
    if (Modernizr['inputtypes']['range']) {
      var temp_range = document.createElement("input");
      temp_range.type = "range";
      temp_range.min = "0";
      temp_range.max = "1000";
      temp_range.step = "20";
      temp_range.value = model.get("temperature");
      select_temperature.parentNode.replaceChild(temp_range, select_temperature);
      temp_range.id = "select-temperature";
      select_temperature = temp_range;
      select_temperature_display.id = "select-temperature-display";
      select_temperature_display.innerText = temp_range.value + " K";
      select_temperature.parentNode.appendChild(select_temperature_display);
      select_temperature = document.getElementById("select-temperature");
    }
    select_temperature.onchange = selectTemperatureChange;
  }
};

function selectTemperatureChange() {
  var temperature = +select_temperature.value;
  if (select_temperature.type === "range") {
    select_temperature_display.innerText = d3.format("4.1f")(temperature) + " K";
  }
  model.set({ "temperature": temperature });
}


// ------------------------------------------------------------
//
// Temperature Control
//
// ------------------------------------------------------------

layout.temperature_control_checkbox = document.getElementById("temperature-control-checkbox");

layout.temperatureControlHandler = function () {
  if (layout.temperature_control_checkbox.checked) {
    model.set({ "temperature_control": true });
  } else {
    model.set({ "temperature_control": false });
  }
};

layout.temperatureControlUpdate = function () {
  var tc = model.get('temperature_control');

  layout.temperature_control_checkbox.checked = tc;
  select_temperature.disabled = !tc;
  select_temperature_display.hidden = !tc;
};

if (layout.temperature_control_checkbox) {
  layout.temperature_control_checkbox.onchange = layout.temperatureControlHandler;
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
      model.set({coulomb_forces: true});
    } else {
      model.set({coulomb_forces: false});
    };
};

if (layout.coulomb_forces_checkbox) {
  layout.coulomb_forces_checkbox.onchange = coulombForcesInteractionHandler;
}// ------------------------------------------------------------
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
      "Time: "     + d3.format("5.2f")(model.getTime() / 1000) + " (ps), " +
      "KE: "       + d3.format("1.4f")(ke) + ", " +
      "PE: "       + d3.format("1.4f")(pe) + ", " +
      "TE: "       + d3.format("1.4f")(te) + ", " +
      "Pressure: " + d3.format("6.3f")(model.pressure()) + ", " +
      "Rate: " + d3.format("5.1f")(model.get_rate()) + " (steps/s)";
  }
}

layout.heatCoolButtons = function(heat_elem_id, cool_elem_id, min, max, model, callback) {
  var heat_button = new ButtonComponent(heat_elem_id, 'circlesmall-plus');
  var cool_button = new ButtonComponent(cool_elem_id, 'circlesmall-minus');

  heat_button.add_action(function() {
    var t = model.get('temperature');
    if (t < max) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 + 100;
      model.set({temperature: t});
      if (typeof callback === 'function') {
        callback(t)
      }
    } else {
      $(heat_elem_id).addClass('inactive');
    }
  });

  cool_button.add_action(function() {
    var t = model.get('temperature');
    if (t > min) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 - 100;
      model.set({temperature: t});
      if (typeof callback === 'function') {
        callback(t)
      }
    } else {
      $(cool_elem_id).addClass('inactive');
    }
  });
}
})();
(function() {
  var ButtonBarComponent, ButtonComponent, Component, JSliderComponent, ModelPlayer, PlayOnlyComponentSVG, PlaybackBarComponent, PlaybackComponent, PlaybackComponentSVG, SliderComponent, Thermometer, ToggleButtonComponent, root,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

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
        self.set_state("down");
        return self.start_down_ticker();
      });
      this.dom_element.mouseup(function() {
        clearInterval(_this.ticker);
        self.set_state("up");
        return self.do_action();
      });
      return this.dom_element.mouseleave(function() {
        clearInterval(_this.ticker);
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

    ButtonComponent.prototype.start_down_ticker = function() {
      var self;
      self = this;
      this.ticker_count = 0;
      return this.ticker = setInterval(function() {
        self.do_action();
        self.ticker_count += 1;
        if (self.ticker_count > 4) self.do_action();
        if (self.ticker_count > 8) {
          self.do_action();
          return self.do_action();
        }
      }, 250);
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
      var art, art2, button_bg, button_group, button_highlight, point, points, points_string, x, y, _i, _j, _len, _len2,
        _this = this;
      button_group = this.group.append('svg:g');
      x = this.offset(button_name);
      button_group.attr("class", "component playbacksvgbutton").attr('x', x).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width * 2).attr('style', 'fill: #cccccc');
      button_bg = button_group.append('rect');
      button_bg.attr('class', 'bg').attr('x', this.offset(button_name) / 1.20).attr('y', this.vertical_padding / 3).attr('width', this.unit_width * 2).attr('height', this.unit_width * 1.5).attr('rx', '0');
      for (_i = 0, _len = point_set.length; _i < _len; _i++) {
        points = point_set[_i];
        art = button_group.append(type);
        art.attr('class', "" + button_name + " button-art");
        points_string = "";
        for (_j = 0, _len2 = points.length; _j < _len2; _j++) {
          point = points[_j];
          x = this.offset(button_name) + point['x'] * this.unit_width;
          y = this.vertical_padding / .75 + point['y'] * this.unit_width;
          points_string = points_string + (" " + x + "," + y);
          art.attr('points', points_string);
        }
        if (button_name === 'stop') {
          art2 = button_group.append('rect');
          art2.attr('class', 'pause-center').attr('x', x + this.unit_width / 3).attr('y', this.vertical_padding / .75 - 1).attr('width', this.unit_width / 3).attr('height', this.unit_width + 2);
        }
      }
      button_highlight = button_group.append('rect');
      button_highlight.attr('class', 'highlight').attr('x', this.offset(button_name) / 1.20 + 1).attr('y', this.vertical_padding / 1.85).attr('width', this.unit_width * 2 - 2).attr('height', this.unit_width / 1.4).attr('rx', '0');
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

    PlayOnlyComponentSVG.prototype.init_pause_button = function() {
      var points;
      points = [
        [
          {
            x: .5,
            y: .5
          }, {
            x: .5,
            y: 0
          }, {
            x: .5,
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
      return this.pause = this.make_button('pause', 'svg:polygon', points);
    };

    PlayOnlyComponentSVG.prototype.init_view = function() {
      this.svg = this.svg_element.append("svg:svg").attr("class", "component playbacksvg").attr("x", this.xpos).attr("y", this.ypos);
      this.group = this.svg.append("g").attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
      this.init_play_button();
      this.init_stop_button();
      if (this.playable.playing) {
        return this.hide(this.play);
      } else {
        return this.hide(this.stop);
      }
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

    function ModelPlayer(model, playing) {
      this.model = model;
      if (arguments.length > 1) {
        this.playing = playing;
      } else {
        this.playing = true;
      }
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
      return this.model.seek(float_index);
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
      var art, art2, button_bg, button_group, button_highlight, point, points, points_string, x, xoffset, y, _i, _j, _len, _len2,
        _this = this;
      button_group = this.group.append('svg:g');
      xoffset = this.offset(button_name);
      button_group.attr("class", "component playbacksvgbutton").attr('x', x).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width * 2).attr('style', 'fill: #cccccc');
      button_bg = button_group.append('rect');
      button_bg.attr('class', 'bg').attr('x', xoffset).attr('y', this.vertical_padding / 3).attr('width', this.unit_width * 2).attr('height', this.unit_width * 1.5).attr('rx', '0');
      for (_i = 0, _len = point_set.length; _i < _len; _i++) {
        points = point_set[_i];
        art = button_group.append(type);
        art.attr('class', "" + button_name + " button-art");
        points_string = "";
        for (_j = 0, _len2 = points.length; _j < _len2; _j++) {
          point = points[_j];
          x = xoffset + 8 + point['x'] * this.unit_width;
          y = this.vertical_padding / .75 + point['y'] * this.unit_width;
          points_string = points_string + (" " + x + "," + y);
          art.attr('points', points_string);
        }
        if (button_name === 'stop') {
          art2 = button_group.append('rect');
          art2.attr('class', 'pause-center').attr('x', x + this.unit_width / 3).attr('y', this.vertical_padding / .75 - 1).attr('width', this.unit_width / 3).attr('height', this.unit_width + 2);
        }
      }
      button_highlight = button_group.append('rect');
      button_highlight.attr('class', 'highlight').attr('x', xoffset + 1).attr('y', this.vertical_padding / 1.85).attr('width', this.unit_width * 2 - 2).attr('height', this.unit_width / 1.4).attr('rx', '0');
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

    PlaybackComponentSVG.prototype.init_pause_button = function() {
      var points;
      points = [
        [
          {
            x: .5,
            y: .5
          }, {
            x: .5,
            y: 0
          }, {
            x: .5,
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
      return this.pause = this.make_button('pause', 'svg:polygon', points);
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
      this.init_back_button();
      this.init_play_button();
      this.init_stop_button();
      this.init_forward_button();
      if (this.playable.playing) {
        return this.hide(this.play);
      } else {
        return this.hide(this.stop);
      }
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

    function SliderComponent(dom_id, value_changed_function, min, max, value) {
      this.dom_id = dom_id != null ? dom_id : "#slider";
      this.value_changed_function = value_changed_function;
      this.min = min;
      this.max = max;
      this.value = value;
      this.dom_element = $(this.dom_id);
      this.dom_element.addClass('component').addClass('slider');
      this.min = this.min || this.dom_element.attr('data-min') || 0;
      this.max = this.max || this.dom_element.attr('data-max') || 1;
      this.value = this.value || this.dom_element.attr('data-value') || 0.5;
      this.precision = this.dom_element.attr('data-precision') || 3;
      this.label = this.dom_element.attr('data-label');
      this.domain = this.max - this.min;
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
      this.handle_y = (this.y1 + this.y2) / 2;
      this.handle_x = (this.x1 + this.x2) / 2;
      if (this.horizontal_orientation()) {
        midpoint = this.height / 4;
        this.y1 = this.y2 = midpoint;
        this.x1 = 0;
        this.x2 = this.width;
        this.handle_y = (this.y1 + this.y2) / 2;
        this.handle_x = this.value / this.domain * this.width;
      }
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
      this.handle_height_offset = (this.handle_height / 2) - (this.handle_height - this.slider_well_height) / 4;
      return this.update_handle();
    };

    SliderComponent.prototype.update = function() {
      this.update_handle();
      this.update_slider_filled();
      return this.update_label();
    };

    SliderComponent.prototype.update_handle = function() {
      return this.handle.css('left', "" + (this.handle_x - (this.handle_width / 2)) + "px").css('top', "" + (this.handle_y - this.handle_height_offset) + "px");
    };

    SliderComponent.prototype.init_label = function() {
      this.text_label = $('<div/>').addClass('label');
      this.dom_element.append(this.text_label);
      return this.update_label();
    };

    SliderComponent.prototype.set_scaled_value = function(v) {
      this.value = (v - this.min) / this.domain;
      this.handle_x = v / this.domain * this.width;
      return this.update();
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
        return this.update();
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

    function Thermometer(dom_id, initial_value, min, max) {
      this.dom_id = dom_id != null ? dom_id : "#thermometer";
      this.min = min;
      this.max = max;
      this.resize = __bind(this.resize, this);
      this.dom_element = typeof this.dom_id === "string" ? $(this.dom_id) : this.dom_id;
      this.dom_element.addClass('thermometer');
      this.samples = [];
      this.samples.push(initial_value);
      this.value = initial_value;
      this.first_sample = true;
      this.last_draw_time = new Date().getTime();
      this.sample_interval_ms = 250;
      this.last_draw_time -= this.sample_interval_ms;
      this.init_view();
    }

    Thermometer.prototype.init_view = function() {
      var midpoint;
      this.width = this.dom_element.width();
      this.height = this.dom_element.height();
      midpoint = this.width / 2;
      this.y1 = this.height;
      this.y2 = 0;
      this.x1 = this.x2 = midpoint;
      this.init_thermometer_fill();
      return d3.select('#therm_text').attr('class', 'therm_text');
    };

    Thermometer.prototype.init_thermometer_fill = function() {
      this.thermometer_fill = $('<div>').addClass('thermometer_fill');
      this.dom_element.append(this.thermometer_fill);
      return this.redraw();
    };

    Thermometer.prototype.resize = function() {
      var midpoint;
      this.width = this.dom_element.width();
      this.height = this.dom_element.height();
      midpoint = this.width / 2;
      this.y1 = this.height;
      this.y2 = 0;
      this.x1 = this.x2 = midpoint;
      return this.redraw();
    };

    Thermometer.prototype.set_scaled_value = function(v) {
      var results;
      results = this.value;
      results = results * (this.max - this.min);
      results = results + this.min;
      return results;
    };

    Thermometer.prototype.scaled_value = function() {
      var results;
      results = this.value;
      results = results * (this.max - this.min);
      results = results + this.min;
      return results;
    };

    Thermometer.prototype.time_to_redraw = function() {
      var timestamp;
      timestamp = new Date().getTime();
      return timestamp > this.last_draw_time + this.sample_interval_ms;
    };

    Thermometer.prototype.add_value = function(new_value) {
      this.samples.push(new_value);
      this.value = new_value;
      if (this.time_to_redraw() || this.first_sample) {
        this.first_sample = false;
        this.redraw();
        return this.samples = [];
      }
    };

    Thermometer.prototype.get_avg = function() {
      var sample, total, _i, _len, _ref;
      if (this.samples.length > 0) {
        total = 0;
        _ref = this.samples;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          sample = _ref[_i];
          total = total + sample;
        }
        return this.value = total / this.samples.length;
      } else {
        return this.value;
      }
    };

    Thermometer.prototype.scaled_display_value = function() {
      return (this.get_avg() / (this.max - this.min)) * this.height;
    };

    Thermometer.prototype.redraw = function() {
      var midpoint, value;
      this.width = this.dom_element.width();
      this.height = this.dom_element.height();
      midpoint = this.width / 2;
      this.y1 = this.height;
      this.y2 = 0;
      this.x1 = this.x2 = midpoint;
      value = this.scaled_display_value();
      this.thermometer_fill.css("bottom", "" + (value - this.height) + "px");
      this.thermometer_fill.height("" + value + "px");
      this.last_draw_time = new Date().getTime();
      return d3.select('#therm_text').text("Temperature");
    };

    return Thermometer;

  })();

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  root.Thermometer = Thermometer;

}).call(this);
(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

// ------------------------------------------------------------
//
//   Controllers
//
// ------------------------------------------------------------

controllers = { version: "0.0.1" };
/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout
  $
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
controllers.simpleModelController = function(molecule_view_id, modelConfig, playerConfig) {

  var layoutStyle,
      autostart,
      maximum_model_steps,
      lj_epsilon_max,
      lj_epsilon_min,

      elements,
      atoms_properties,
      mol_number,
      temperature_control,
      temperature,
      coulomb_forces,
      width,
      height,

      nodes,

      molecule_container,
      model_listener,
      step_counter,
      therm,
      epsilon_slider;

  function controller() {


    function initializeLocalVariables() {
      layoutStyle         = playerConfig.layoutStyle;
      autostart           = playerConfig.autostart;
      maximum_model_steps = playerConfig.maximum_model_steps;
      lj_epsilon_max      = playerConfig.lj_epsilon_max;
      lj_epsilon_min      = playerConfig.lj_epsilon_min;

      elements            = modelConfig.elements;
      atoms_properties    = modelConfig.atoms;
      mol_number          = modelConfig.mol_number;
      temperature_control = modelConfig.temperature_control;
      temperature         = modelConfig.temperature;
      coulomb_forces      = modelConfig.coulomb_forces;
      width               = modelConfig.width;
      height              = modelConfig.height;
    }

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    model_listener = function(e) {
      molecule_container.update_molecule_positions();
      if (step_counter >= model.stepCounter()) { modelStop(); }
    };

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      model = modeler.model({
          elements: elements,
          model_listener: model_listener,
          temperature: temperature,
          lennard_jones_forces: true,
          coulomb_forces: coulomb_forces,
          temperature_control: temperature_control,
          width: width,
          height: height
        });

      if (atoms_properties) {
        model.createNewAtoms(atoms_properties);
      } else if (mol_number) {
        model.createNewAtoms({
          num: mol_number,
          relax: true
        });
      } else {
        throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
      }
    }

    // ------------------------------------------------------------
    //
    // Create Views
    //
    // ------------------------------------------------------------

    function setupViews() {

      // ------------------------------------------------------------
      //
      // Create player and container view for model
      //
      // ------------------------------------------------------------

      layout.selection = layoutStyle;

      model_player = new ModelPlayer(model, autostart);
      molecule_container = layout.moleculeContainer(molecule_view_id,
        {
          xmax:                 width,
          ymax:                 height,
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); }
        }
      );

      molecule_container.updateMoleculeRadius();
      molecule_container.setup_particles();

      // ------------------------------------------------------------
      // Setup therm, epsilon_slider & sigma_slider components ... after fluid layout
      // ------------------------------------------------------------

      therm = new Thermometer('#thermometer', model.temperature(), 200, 4000);

      model.addPropertiesListener(["temperature"], updateTherm);
      therm.resize();
      updateTherm();

      // ------------------------------------------------------------
      // Setup heat and cool buttons
      // ------------------------------------------------------------

      layout.heatCoolButtons("#heat_button", "#cool_button", 0, 3800, model, function (t) { therm.add_value(t); });

      // ------------------------------------------------------------
      // Add listener for coulomb_forces checkbox
      // ------------------------------------------------------------

      // $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));

      model.addPropertiesListener(["coulomb_forces"], updateCoulombCheckbox);
      updateCoulombCheckbox();

      // ------------------------------------------------------------
      //
      // Setup list of views used by layout system
      //
      // ------------------------------------------------------------

      layout.addView('moleculeContainers', molecule_container);
      layout.addView('thermometers', therm);

      layout.setupScreen();

    }

    // ------------------------------------------------------------
    //
    // Model Controller
    //
    // ------------------------------------------------------------

    function updateCoulombCheckbox() {
      $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));
      molecule_container.setup_particles();
    }

    function updateTherm(){
      therm.add_value(model.get("temperature"));
    }

    function modelStop() {
      model.stop();
    }

    function modelGo() {
      model.on("tick", model_listener);
      if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
        model.resume();
      }
    }

    function modelStepBack() {
      modelStop();
      model.stepBack();
    }

    function modelStepForward() {
      if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
        model.stepForward();
      }
    }

    // ------------------------------------------------------------
    //
    //   Molecular Model Setup
    //

    function setupModel() {
      nodes = model.get_nodes();

      model.resetTime();

      modelStop();
      model.on("tick", model_listener);
      step_counter = model.stepCounter();
    }

    // ------------------------------------------------------------
    //
    //  Wire up screen-resize handlers
    //
    // ------------------------------------------------------------

    function onresize() {
      layout.setupScreen();
      therm.resize();
      updateTherm();
    }

    document.onwebkitfullscreenchange = onresize;
    window.onresize = onresize;

    // ------------------------------------------------------------
    //
    // Reset the model after everything else ...
    //
    // ------------------------------------------------------------

    function finishSetup(firstTime) {
      initializeLocalVariables();
      createModel();
      setupModel();
      if (firstTime) {
        setupViews();
      } else {
        updateLayout();
      }
    }

    if (typeof DEVELOPMENT === 'undefined') {
      try {
        finishSetup(true);
      } catch(e) {
        alert(e);
        throw new Error(e);
      }
    } else {
      finishSetup(true);
    }

    function updateLayout() {
      layout.setupScreen(true);
    }

    function reload(newModelConfig, newPlayerConfig) {
       modelConfig = newModelConfig;
       playerConfig = newPlayerConfig;
       finishSetup(false);
    }

    // epsilon_slider = new SliderComponent('#attraction_slider',
    //   function (v) {
    //     model.set({epsilon: v} );
    //   }, lj_epsilon_max, lj_epsilon_min, epsilon);

    // function updateEpsilon(){
    //   epsilon_slider.set_scaled_value(model.get("epsilon"));
    // }

    // model.addPropertiesListener(["epsilon"], updateEpsilon);
    // updateEpsilon();

    // ------------------------------------------------------------
    //
    // Start if autostart is true
    //
    // ------------------------------------------------------------

    if (autostart) {
      modelGo();
    }
    controller.updateLayout = updateLayout;
    controller.reload = reload;
  }
  controller();
  return controller;
};
/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout

  $
  alert

  model: true
  model_player: true
*/
/*jslint onevar: true*/
controllers.compareModelsController = function(molecule_view_id, appletContainerID, modelSelectID, modelConfig, playerConfig) {

  var layoutStyle         = playerConfig.layoutStyle,
      autostart           = playerConfig.autostart,
      maximum_model_steps = playerConfig.maximum_model_steps,
      lj_epsilon_max      = playerConfig.lj_epsilon_max,
      lj_epsilon_min      = playerConfig.lj_epsilon_min,

      elements            = modelConfig.elements,
      atoms_properties    = modelConfig.atoms,
      mol_number          = modelConfig.mol_number,
      temperature_control = modelConfig.temperature_control,
      temperature         = modelConfig.temperature,
      coulomb_forces      = modelConfig.coulomb_forces,
      width               = modelConfig.width,
      height              = modelConfig.height,

      nodes,

      molecule_container,
      modelListener,
      step_counter,
      therm,
      epsilon_slider,
      jsonFullPath, cmlFullPath,
      appletString,
      appletContainer,
      appletOptions = {},
      applet, cmlPath,
      start, stop, reset,
      modelSelect, pathList, hash;

  function controller() {

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    function modelListener(e) {
      molecule_container.update_molecule_positions();
    }

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      model = modeler.model({
          elements: elements,
          model_listener: modelListener,
          temperature: temperature,
          lennard_jones_forces: true,
          coulomb_forces: coulomb_forces,
          temperature_control: temperature_control,
          width: width,
          height: height
        });

      if (atoms_properties) {
        model.createNewAtoms(atoms_properties);
      } else if (mol_number) {
        model.createNewAtoms({
          num: mol_number,
          relax: true
        });
      } else {
        throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
      }
    }

    // ------------------------------------------------------------
    //
    // Create Views
    //
    // ------------------------------------------------------------

    function setupViews() {

      // ------------------------------------------------------------
      //
      // Create player and container view for model
      //
      // ------------------------------------------------------------

      layout.selection = layoutStyle;

      model_player = new ModelPlayer(model, autostart);
      molecule_container = layout.moleculeContainer(molecule_view_id,
        {
          playback_controller:  false,
          play_only_controller: false,
          model_time_label:     true,
          grid_lines:           true,
          xunits:               true,
          yunits:               true,
          xmax:                 width,
          ymax:                 height,
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); }
        }
      );

      molecule_container.updateMoleculeRadius();
      molecule_container.setup_particles();

      // ------------------------------------------------------------
      //
      // Setup Java MW applet
      //
      // ------------------------------------------------------------

      cmlPath = currentCMLPath();
      if (cmlPath) {
        appletOptions = {
          params: [["script", "page:0:import " + "/imports/legacy-mw-content/" + cmlPath]]
        };
      } else {
        appletOptions = {};
      }
      appletContainer = layout.appletContainer(appletContainerID, appletOptions);

      // ------------------------------------------------------------
      //
      // Setup list of views used by layout system
      //
      // ------------------------------------------------------------

      layout.addView('moleculeContainers', molecule_container);
      layout.addView('appletContainers', appletContainer);

      layout.setupScreen();

    }

    // ------------------------------------------------------------
    //
    // Model Controller
    //
    // ------------------------------------------------------------

    function modelStop() {
      model.stop();
    }

    function modelGo() {
      model.on("tick", modelListener);
      model.resume();
    }

    function modelStepBack() {
      model.stop();
      model.stepBack();
    }

    function modelStepForward() {
      model.stop();
      model.stepForward();
    }

    function modelReset() {
      model.stop();
      createModel();
      setupModel();
      modelListener();
    }

    // ------------------------------------------------------------
    //
    //   Molecular Model Setup
    //
    // ------------------------------------------------------------

    function setupModel() {
      nodes = model.get_nodes();

      model.resetTime();

      modelStop();
      model.on("tick", modelListener);
      step_counter = model.stepCounter();
    }

    // ------------------------------------------------------------
    //
    //   Model List Setup
    //
    // ------------------------------------------------------------

    function currentJsonPath() {
      hash = document.location.hash;
      if (hash.length > 0) {
        return hash.substr(1, hash.length);
      } else {
        return false;
      }
    }

    function currentCMLPath() {
      var path = currentJsonPath();
      if (path) {
        return pathList[path.replace("/imports/legacy-mw-content/", "")].cmlPath;
      } else {
        return false;
      }
    }

    modelSelect = document.getElementById(modelSelectID);

    function updateModelSelect() {
      var path = currentJsonPath();
      if (path) {
        modelSelect.value = path.replace("/imports/legacy-mw-content/", "");
      } else {
        modelSelect.value = "two-atoms-two-elements/two-atoms-two-elements$0.json";
      }
    }

    function createPathList() {
      var i, j, item, sectionList, sectionPath;
      pathList = {};
      for(i = 0; i < modelList.length; i++) {
        sectionList = modelList[i];
        sectionPath = sectionList.section;
        for(j = 0; j < sectionList.content.length; j++) {
          item = sectionList.content[j];
          pathList[item.json] = {
            "name": item.name,
            "jsonPath": item.json,
            "cmlPath":  item.cml
          };
        }
      }
    }

    function processModelList() {
      createPathList();
      d3.select(modelSelect).selectAll("optgroup")
          .data(modelList)
        .enter().append("optgroup")
          .attr("label", function(d) { return d.section; })
          .selectAll("option")
              .data(function(d) { return d.content; })
            .enter().append("option")
              .text(function(d) { return d.name; })
              .attr("value", function(d) { return d.json; })
              .attr("data-cml-path", function(d) { return d.cml; });
      updateModelSelect();
    }


    // ------------------------------------------------------------
    //
    //   Java MW Applet Setup
    //
    // ------------------------------------------------------------

    function runMWScript(script) {
      return appletContainer.applet.runMwScript(script);
    }

    start = document.getElementById("start");
    start.onclick = function() {
      runMWScript("mw2d:1:run");
      modelGo();
    };

    stop = document.getElementById("stop");
    stop.onclick = function() {
      runMWScript("mw2d:1:stop");
      modelStop();
    };

    reset = document.getElementById("reset");
    reset.onclick = function() {
      runMWScript("mw2d:1:reset");
      modelReset();
    };

    function modelSelectHandler() {
      var selection = $(modelSelect).find("option:selected"),
          initialPath = "/imports/legacy-mw-content/",
          jsonPath = selection.attr("value");

      jsonFullPath = initialPath + jsonPath;
      document.location.hash = "#" + jsonFullPath;
    }

    modelSelect.onchange = modelSelectHandler;

    function setupMWApplet() {
      if (currentCMLPath()) {
        appletOptions = { params: [["script", "page:0:import " + currentCMLPath()]] };
        appletContainer = layout.appletContainer(appletContainerID, appletOptions);
        runMWScript("page:0:set frank false");
        layout.setView('appletContainers', [appletContainer]);
        layout.setupScreen();
      }
    }

    // ------------------------------------------------------------
    //
    //  Wire up screen-resize handlers
    //
    // ------------------------------------------------------------

    function onresize() {
      layout.setupScreen();
    }

    document.onwebkitfullscreenchange = onresize;
    window.onresize = onresize;

    // ------------------------------------------------------------
    //
    // Reset the model after everything else ...
    //
    // ------------------------------------------------------------

    function finishSetup() {
      processModelList();
      createModel();
      setupModel();
      setupViews();
      updateModelSelect();
    }

    if (typeof DEVELOPMENT === 'undefined') {
      try {
        finishSetup()
      } catch(e) {
        alert(e);
        throw new Error(e);
      }
    } else {
      finishSetup()
    }
    controller.runMWScript = runMWScript;
  }

  controller();
  return controller;
};
/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout

  model: true
  model_player: true
*/
/*jslint onevar: true*/
controllers.complexModelController =
    function(molecule_view_id,
             energy_graph_view_id,
             lj_potential_chart_id,
             speed_distribution_chart_id,
             modelConfig,
             playerConfig) {

  var layoutStyle         = playerConfig.layoutStyle,
      autostart           = playerConfig.autostart,
      maximum_model_steps = playerConfig.maximum_model_steps,
      lj_epsilon_max      = playerConfig.lj_epsilon_max,
      lj_epsilon_min      = playerConfig.lj_epsilon_min,
      lj_sigma_max        = 2.0,
      lj_sigma_min        = 0.1,

      elements            = modelConfig.elements,
      atoms_properties    = modelConfig.atoms,
      radialBonds         = modelConfig.radialBonds,
      mol_number          = modelConfig.mol_number,
      temperature         = modelConfig.temperature,
      temperature_control = modelConfig.temperature_control,
      coulomb_forces      = modelConfig.coulomb_forces,
      width               = modelConfig.width,
      height              = modelConfig.height,

      moleculeContainer,
      model_listener,
      step_counter,
      ljCalculator,
      kechart, energyGraph, energyGraph_options,
      energy_data,
      model_controls,
      model_controls_inputs,
      select_molecule_number,
      mol_number_to_ke_yxais_map,
      mol_number_to_speed_yaxis_map,
      potentialChart,
      speedDistributionChart,
      select_molecule_number,
      radio_randomize_pos_vel,

      nodes;

  function controller() {

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    function modelListener(e) {
      var ke = model.ke(),
          pe = model.pe(),
          te = ke + pe;

      speedDistributionChart.update();

      moleculeContainer.update_molecule_positions();

      if (model.isNewStep()) {
        energy_data[0].push(ke);
        energy_data[1].push(pe);
        energy_data[2].push(te);
        energyGraph.add_points([ke, pe, te]);
      } else {
        energyGraph.update(model.stepCounter());
      }
      if (step_counter >= maximum_model_steps) { modelStop(); }
      layout.displayStats();
      if (layout.datatable_visible) { layout.render_datatable(); }
    }

    function resetEnergyData(index) {
      var modelsteps = model.stepCounter();
      if (index) {
        for (i = 0, len = energy_data.length; i < len; i++) {
          energy_data[i].length = modelsteps
        }
      } else {
        ke = model.ke();
        pe = model.pe();
        te = ke + pe;
        energy_data = [[ke], [pe], [te]];
      }
    }

    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      model = modeler.model({
          elements: elements,
          model_listener: modelListener,
          temperature: temperature,
          lennard_jones_forces: true,
          coulomb_forces: coulomb_forces,
          temperature_control: temperature_control,
          width: width,
          height: height
        });

      if (atoms_properties) {
        model.createNewAtoms(atoms_properties);
        if (radialBonds) model.createRadialBonds(radialBonds);
      } else if (mol_number) {
        model.createNewAtoms({
          num: mol_number,
          relax: true
        });
      } else {
        throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
      }
    }

    // ------------------------------------------------------------
    //
    // Create Views
    //
    // ------------------------------------------------------------

    function setupViews() {
      // ------------------------------------------------------------
      //
      // Create player and container view for model
      //
      // ------------------------------------------------------------

      layout.selection = layoutStyle;

      model_player = new ModelPlayer(model, autostart);
      moleculeContainer = layout.moleculeContainer(molecule_view_id,
        {
          title:               "Simple Molecules",
          xlabel:              "X position (nm)",
          ylabel:              "Y position (nm)",
          playback_controller:  true,
          play_only_controller: false,
          model_time_label:     true,
          grid_lines:           true,
          xunits:               true,
          yunits:               true,
          atom_mubers:          false,
          xmin:                 0,
          xmax:                 width,
          ymin:                 0,
          ymax:                 height,
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); }
        }
      );

      model.addPropertiesListener(["sigma"], moleculeContainer.updateMoleculeRadius);

      // ------------------------------------------------------------
      //
      // Average Kinetic Energy Graph
      //
      // ------------------------------------------------------------

      // FIXME this graph has "magic" knowledge of the sampling period used by the modeler

      resetEnergyData();

      energyGraph = grapher.realTimeGraph(energy_graph_view_id, {
        title:     "Energy of the System (KE:red, PE:green, TE:blue)",
        xlabel:    "Model Time (ps)",
        xmin:      0,
        xmax:     100,
        sample:    0.25,
        ylabel:    null,
        ymin:      -5.0,
        ymax:      5.0,
        dataset:   energy_data
      });

      energyGraph.new_data(energy_data);

      model.on('play', function() {
        var i, len;

        if (energyGraph.number_of_points() && model.stepCounter() < energyGraph.number_of_points()) {
          resetEnergyData(model.stepCounter());
          energyGraph.new_data(energy_data);
        }
        energyGraph.show_canvas();
      });

      model.on('stop', function() {
      });

      // Right now this action is acting as an indication of model reset ...
      // This should be refactoring to distinguish the difference between reset
      // and seek to location in model history.
      model.on('seek', function() {
        modelsteps = model.stepCounter();
        if (modelsteps > 0) {
          resetEnergyData(modelsteps);
          energyGraph.new_data(energy_data);
        } else {
          resetEnergyData();
          energyGraph.new_data(energy_data);
        }
      });

      // ------------------------------------------------------------
      //
      // Speed Distribution Histogram
      //
      // ------------------------------------------------------------

      speedDistributionChart = layout.speedDistributionChart(speed_distribution_chart_id, {
        title    : "Distribution of Speeds",
        xlabel   : null,
        ylabel   : "Count",
        xmax     : 2,
        xmin     : 0,
        ymax     : 15,
        ymin     : 0,
        quantile : 0.01
      });

      // ------------------------------------------------------------
      //
      // Lennard-Jones Chart
      //
      // ------------------------------------------------------------

      // FIXME: The potential chart needs refactoring to handle multiple
      // elements and pairwise potentials
      potentialChart = layout.potentialChart(lj_potential_chart_id, model, {
          title   : "Lennard-Jones potential",
          xlabel  : "Radius",
          ylabel  : "Potential Energy",
          epsilon_max:     lj_epsilon_max,
          epsilon_min:     lj_epsilon_min,
          epsilon:         elements[0].epsilon,
          sigma_max:       lj_sigma_max,
          sigma_min:       lj_sigma_min,
          sigma:           elements[0].sigma
        });

      model.addPropertiesListener(["epsilon"], potentialChart.ljUpdate);
      model.addPropertiesListener(["sigma"], potentialChart.ljUpdate);

      // ------------------------------------------------------------
      //
      // Coulomb Forces Checkbox
      //
      // ------------------------------------------------------------

      function updateCoulombCheckbox() {
        $(layout.coulomb_forces_checkbox).attr('checked', model.get("coulomb_forces"));
        moleculeContainer.setup_particles();
      }

      model.addPropertiesListener(["coulomb_forces"], updateCoulombCheckbox);
      updateCoulombCheckbox();

      // ------------------------------------------------------------
      //
      // Setup list of views used by layout sustem
      //
      // ------------------------------------------------------------

      layout.addView('moleculeContainers', moleculeContainer);
      layout.addView('potentialCharts', potentialChart);
      layout.addView('speedDistributionCharts', speedDistributionChart);
      layout.addView('energyCharts', energyGraph);

      // ------------------------------------------------------------
      //
      // Get a few DOM elements
      //
      // ------------------------------------------------------------

      model_controls = document.getElementById("model-controls");

      if (model_controls) {
        model_controls_inputs = model_controls.getElementsByTagName("input");
        model_controls.onchange = modelController;
      }

      // ------------------------------------------------------------
      //
      // Molecule Number Selector
      //
      // ------------------------------------------------------------

      select_molecule_number = document.getElementById("select-molecule-number");
      radio_randomize_pos_vel = document.getElementById("radio-randomize-pos-vel");
      checkbox_thermalize = document.getElementById("checkbox-thermalize");

      function selectMoleculeNumberChange() {
        mol_number = +select_molecule_number.value;
        modelReset();
        radio_randomize_pos_vel.checked = false
        updateMolNumberViewDependencies();
      }

      mol_number_to_ke_yxais_map = {
        2:   0.02 * 50 * 2,
        5:   0.05 * 50 * 5,
        10:  0.01 * 50 * 10,
        20:  0.01 * 50 * 20,
        50:  120,
        100: 0.05 * 50 * 100,
        200: 0.1 * 50 * 200,
        500: 0.2 * 50 * 500
      };

      mol_number_to_speed_yaxis_map = {
        2: 2,
        5: 2,
        10: 5,
        20: 5,
        50: 10,
        100: 15,
        200: 20,
        500: 40
      };

      function updateMolNumberViewDependencies() {
        energyGraph.change_yaxis(mol_number_to_ke_yxais_map[mol_number]);
        potentialChart.redraw();
        // speedDistributionChart.ymax = mol_number_to_speed_yaxis_map[mol_number];
        speedDistributionChart.redraw();
      }

      select_molecule_number.onchange = selectMoleculeNumberChange;
      radio_randomize_pos_vel.onclick = selectMoleculeNumberChange;

      select_molecule_number.value = mol_number;

    }

    // ------------------------------------------------------------
    //
    //   Molecular Model Setup
    //
    // ------------------------------------------------------------

    function setupModel() {
      nodes = model.get_nodes();

      model.resetTime();
      resetEnergyData();

      moleculeContainer.setup_particles();
      moleculeContainer.updateMoleculeRadius();
      layout.setupScreen();
      step_counter = model.stepCounter();
      select_molecule_number.value = model.get_num_atoms();

      modelStop();
      model.on("tick", modelListener);
    }


    // ------------------------------------------------------------
    //
    // Model Controller
    //
    // ------------------------------------------------------------

    function modelStop() {
      model.stop();
      // energyGraph.hide_canvas();
      moleculeContainer.playback_component.action('stop');
      if (model_controls) {
        model_controls_inputs[0].checked = true;
      }
    }

    function modelStep() {
      model.stop();
      if (model.stepCounter() < maximum_model_steps) {
        model.stepForward();
        // energyGraph.hide_canvas();
        if (model_controls) {
          model_controls_inputs[0].checked = true;
        }
      } else {
        if (model_controls) {
          model_controls_inputs[0].checked = false;
        }
      }
    }

    function modelGo() {
      model.on("tick", modelListener);
      if (model.stepCounter() < maximum_model_steps) {
        energyGraph.show_canvas();
        model.resume();
        if (model_controls) {
          model_controls_inputs[0].checked = true;
        }
      } else {
        if (model_controls) {
          model_controls_inputs[0].checked = false;
        }
      }
    }

    function modelStepBack() {
      modelStop();
      model.stepBack();
      energyGraph.showMarker(model.stepCounter());
    }

    function modelStepForward() {
      if (model.stepCounter() < maximum_model_steps) {
        model.stepForward();
        // energyGraph.showMarker(model.stepCounter());
      } else {
        if (model_controls) {
          model_controls_inputs[0].checked = true;
        }
      }
    }

    function modelReset() {
      var dontRelaxRandom = !checkbox_thermalize.checked;
      mol_number = +select_molecule_number.value;
      model.createNewAtoms(mol_number, dontRelaxRandom);
      setupModel();
      moleculeContainer.update_molecule_positions();
      step_counter = model.stepCounter();
      layout.displayStats();
      if (layout.datatable_visible) {
        layout.render_datatable(true);
      } else {
        layout.hide_datatable();
      }
      resetEnergyData();
      energyGraph.new_data(energy_data);
      if (model_controls) {
        model_controls_inputs[0].checked = true;
      }
    }

    // ------------------------------------------------------------
    //
    //  Wire up screen-resize handlers
    //
    // ------------------------------------------------------------

    function onresize() {
      layout.setupScreen();
    }

    document.onwebkitfullscreenchange = onresize;
    window.onresize = onresize;

    // ------------------------------------------------------------
    //
    // Reset the model after everything else ...
    //
    // ------------------------------------------------------------

    function finishSetup() {
      createModel();
      setupViews();
      setupModel();
    }

    if (typeof DEVELOPMENT === 'undefined') {
      try {
        finishSetup()
      } catch(e) {
        alert(e);
        throw new Error(e);
      }
    } else {
      finishSetup()
    }

    // ------------------------------------------------------------
    //
    // Start if autostart is true after everything else ...
    //
    // ------------------------------------------------------------

    if (autostart) {
      modelGo();
    }

    controller.modelListener = modelListener;
    controller.modelGo = modelGo;
    controller.modelStop = modelStop;
    controller.modelReset = modelReset;
    controller.resetEnergyData = resetEnergyData;
    controller.energyGraph = energyGraph;
    controller.moleculeContainer = moleculeContainer;
  }

  controller();
  return controller;
};/*globals controllers model layout Thermometer $ */

/*jslint onevar: true*/
controllers.interactivesController = function(interactive, interactive_view_id) {

  var controller = {},
      modelController,
      $interactiveContainer,
      propertiesListeners = [],
      actionQueue = [];

  function actualRootPath(url) {
    if (typeof ACTUAL_ROOT === "undefined" || url.charAt(0) !== "/") {
      return url;
    } else {
      return ACTUAL_ROOT + url;
    }
  }

  function loadModel(modelUrl) {
    var playerConfig = {    // to be removed
        layoutStyle        : 'interactive',
        maximum_model_steps: Infinity
      };
    $.get(actualRootPath(modelUrl)).done(function(modelConfig) {
      if (typeof modelConfig === "string") { modelConfig = JSON.parse(modelConfig); }
      if (modelController) {
        modelController.reload(modelConfig, playerConfig);
      } else {
        modelController = controllers.modelController('#molecule-container', modelConfig, playerConfig);
        modelLoaded();
      }
    });
  }

  function createComponent(component) {
    switch (component.type) {
      case "button":
        return createButton(component);
      case "thermometer":
        return createThermometer(component);
    }
  }

  function createButton(component) {
    var $button, scriptStr, script;

    $button = $("<button>").attr('id', component.id).html(component.text);

    if (typeof component.action === "string") {
      scriptStr = component.action;
    } else {
      scriptStr = component.action.join('\n');
    }
    eval("script = function() {"+scriptStr+"}");
    $button.click(script);

    return $button;
  }

  function createThermometer(component) {
    var $therm = $('<div>').attr('id', component.id),
        thermometer = new Thermometer($therm, 0, component.min, component.max),
        $wrapper = $('<div>').css("padding-bottom", "4em")
          .append($therm)
          .append($('<div>').text("Thermometer"));

    function updateTherm() {
      thermometer.add_value(model.get("temperature"));
    }

    queuePropertiesListener(["temperature"], updateTherm);
    queueActionOnModelLoad(function() {
      thermometer.resize();
      updateTherm();
    });

    layout.addView('thermometers', thermometer);
    return $wrapper;
  }

  function queuePropertiesListener(properties, func) {
    if (typeof model !== "undefined") {
      model.addPropertiesListener(properties, func);
    } else {
      propertiesListeners.push([properties, func]);
    }
  }

  function queueActionOnModelLoad(action) {
    if (typeof model !== "undefined") {
      action();
    } else {
      actionQueue.push(action);
    }
  }

  function modelLoaded() {
    var listener,
        action;

    while (propertiesListeners.length > 0) {
      listener = propertiesListeners.pop();
      model.addPropertiesListener(listener[0], listener[1]);
    }
    while (actionQueue.length > 0) {
      action = actionQueue.pop()();
    }
  }

  function loadInteractive(newInteractive, interactive_view_id) {
    var componentJsons,
        components = {},
        component,
        divArray,
        div,
        componentId,
        $top, $right,
        i, ii;

    interactive = newInteractive;
    $interactiveContainer = $(interactive_view_id);
    if ($interactiveContainer.children().length === 0) {
      $top = $('<div class="top" id="top"/>');
      $top.append('<div id="molecule-container"/>');
      $right = $('<div id="right"/>');
      $top.append($right);
      $interactiveContainer.append($top);
      $interactiveContainer.append('<div class="bottom" id="bottom"/>');
    } else {
      $('#bottom').html('');
      $('#right').html('');
      $interactiveContainer.append('<div id="bottom"/>');
    }

    if (interactive.model) {
      loadModel(interactive.model);
    }

    componentJsons = interactive.components;

    for (i = 0, ii=componentJsons.length; i<ii; i++) {
      component = createComponent(componentJsons[i]);
      components[componentJsons[i].id] = component;
    }


    // look at each div defined in layout, and add any components in that
    // array to that div. Then rm the component from components so we can
    // add the remainder to #bottom at the end
    if (interactive.layout) {
      for (div in interactive.layout) {
        if (interactive.layout.hasOwnProperty(div)) {
          divArray = interactive.layout[div];
          for (i = 0, ii = divArray.length; i<ii; i++) {
            componentId = divArray[i];
            if (components[componentId]) {
              $('#'+div).append(components[componentId]);
              delete components[componentId];
            }
          }
        }
      }
    }

    // add the remaining components to #bottom
    for (componentId in components) {
      if (components.hasOwnProperty(componentId)) {
        $('#bottom').append(components[componentId]);
      }
    }


  }

  function updateLayout() {
    layout.setupScreen(true);
  }

  // run this when controller is created
  loadInteractive(interactive, interactive_view_id);

  // make these private variables and functions available
  controller.loadInteractive = loadInteractive;
  controller.updateLayout = updateLayout;

  return controller;
};
/*globals

  controllers

  modeler
  ModelPlayer
  Thermometer
  SliderComponent
  layout
  $
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
controllers.modelController = function(molecule_view_id, modelConfig, playerConfig) {
  var controller          = {},

      layoutStyle         = playerConfig.layoutStyle,
      autostart           = playerConfig.autostart,
      maximum_model_steps = playerConfig.maximum_model_steps,

      elements            = modelConfig.elements,
      atoms_properties    = modelConfig.atoms,
      mol_number          = modelConfig.mol_number,
      temperature_control = modelConfig.temperature_control,
      temperature         = modelConfig.temperature,
      coulomb_forces      = modelConfig.coulomb_forces,
      width               = modelConfig.width,
      height              = modelConfig.height,

      nodes,

      molecule_container,
      step_counter,
      therm,
      epsilon_slider;

    // ------------------------------------------------------------
    //
    // Main callback from model process
    //
    // Pass this function to be called by the model on every model step
    //
    // ------------------------------------------------------------

    function model_listener(e) {
      molecule_container.update_molecule_positions();
      if (step_counter >= model.stepCounter()) { modelStop(); }
    }


    // ------------------------------------------------------------
    //
    // Create model and pass in properties
    //
    // ------------------------------------------------------------

    function createModel() {
      model = modeler.model({
          elements: elements,
          model_listener: model_listener,
          temperature: temperature,
          lennard_jones_forces: true,
          coulomb_forces: coulomb_forces,
          temperature_control: temperature_control,
          width: width,
          height: height
        });


      if (atoms_properties) {
        model.createNewAtoms(atoms_properties);
      } else if (mol_number) {
        model.createNewAtoms(mol_number);
        model.relax();
      } else {
        throw new Error("simpleModelController: tried to create a model without atoms or mol_number.");
      }
    }

    // ------------------------------------------------------------
    //
    // Create Model Player
    //
    // ------------------------------------------------------------

    function setupModelPlayer() {

      // ------------------------------------------------------------
      //
      // Create player and container view for model
      //
      // ------------------------------------------------------------

      layout.selection = layoutStyle;

      model_player = new ModelPlayer(model, autostart);
      molecule_container = layout.moleculeContainer(molecule_view_id,
        {
          xmax:                 width,
          ymax:                 height,
          get_nodes:            function() { return model.get_nodes(); },
          get_num_atoms:        function() { return model.get_num_atoms(); }
        }
      );

      molecule_container.updateMoleculeRadius();
      molecule_container.setup_particles();

      layout.addView('moleculeContainers', molecule_container);

      // FIXME: should not be here
      layout.setupScreen();
    }

    // ------------------------------------------------------------
    //
    // Model Controller
    //
    // ------------------------------------------------------------
    function modelStop() {
      model.stop();
    }

    function modelGo() {
      model.on("tick", model_listener);
      if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
        model.resume();
      }
    }

    function modelStepBack() {
      modelStop();
      model.stepBack();
    }

    function modelStepForward() {
      if (!Number(maximum_model_steps) || (model.stepCounter() < maximum_model_steps)) {
        model.stepForward();
      }
    }

    // ------------------------------------------------------------
    //
    //   Molecular Model Setup
    //

    function setupModel() {
      nodes = model.get_nodes();

      model.resetTime();

      modelStop();
      model.on("tick", model_listener);
      step_counter = model.stepCounter();
    }

    function finishSetup(firstTime) {
      createModel();
      setupModel();
      if (firstTime) {
        setupModelPlayer();
      } else {
        layout.setupScreen(true);
      }
    }

    function reload(newModelConfig, newPlayerConfig) {
       modelConfig = newModelConfig;
       playerConfig = newPlayerConfig;
       finishSetup(false);
    }

    if (typeof DEVELOPMENT === 'undefined') {
      try {
        finishSetup(true);
      } catch(e) {
        alert(e);
        throw new Error(e);
      }
    } else {
      finishSetup(true);
    }

    // ------------------------------------------------------------
    //
    // Start if autostart is true
    //
    // ------------------------------------------------------------

    if (autostart) {
      modelGo();
    }

    controller.reload = reload;

    return controller;
};



})();
