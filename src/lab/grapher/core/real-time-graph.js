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
      xTicsScale = d3.scale.linear(),
      txTics = function(d) { return "translate(" + xTicsScale(d) + ",0)"; },
      yScale = d3.scale.linear(), downy,
      ty = function(d) { return "translate(0," + yScale(d) + ")"; },
      line = d3.svg.line()
            .x(function(d, i) { return xScale(points[i].x ); })
            .y(function(d, i) { return yScale(points[i].y); }),
      dragged, selected,
      line_path, line_seglist, cpoint,
      vis, plot, points,
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
        dataChange: false
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

  if (options.dataChange) {
    circleCursorStyle = "ns-resize";
  } else {
    circleCursorStyle = "crosshair";
  }

  options.xrange = options.xmax - options.xmin;
  options.yrange = options.ymax - options.ymin;

  scale(cx, cy);
  points = indexedData(options.dataset, 0);

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

  function scale(w, h) {
    cx = w;
    cy = h;
    node.style.width = cx +"px";
    node.style.height = cy +"px";

    padding = {
       "top":    options.title  ? 40  : 20,
       "right":                   35,
       "bottom": options.xlabel ? 50  : 30,
       "left":   options.ylabel ? 60  : 35
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
    xScale.domain([options.xmin, options.xmax]).range([0, size.width]);

    xTicsScale.domain([options.xmin*options.sample, options.xmax*options.sample]).range([0, mw]);

    // y-scale (inverted domain)
    yScale.domain([options.ymax, options.ymin]).nice().range([0, size.height]).nice();

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
        .attr("pointer-events", "all");

      plot.call(d3.behavior.zoom().x(xTicsScale).y(yScale).scaleExtent([1, 8]).on("zoom", redraw));

      vis.append("svg")
        .attr("class", "viewbox")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height)
        .append("path")
            .attr("class", "line")
            .attr("d", line(points));

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

      vis.on("mousemove", mousemove).on("mouseup", mouseup);

      // variables for speeding up dynamic plotting
      line_path = vis.select("path")[0][0];
      line_seglist = line_path.pathSegList;
      vis_node = vis.node();
      cpoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      cpoint.setAttribute("cx", 1);
      cpoint.setAttribute("cy", 1);
      cpoint.setAttribute("r",  1);
      initialize_canvas();

      redraw();

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
      redraw();
    }

    function new_data(d) {
      points = indexedData(d, 0);
      update();
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

      // graph.xmin = xScale.domain()[0];
      // graph.xmax = xScale.domain()[1];
      // graph.ymix = yScale.domain()[0];
      // graph.ymax = yScale.domain()[1];

      var fx = xTicsScale.tickFormat(10),
          fy = yScale.tickFormat(10);

      // Regenerate x-ticks
      var gx = vis.selectAll("g.x")
          .data(xTicsScale.ticks(10), String)
          .attr("transform", txTics);

      gx.select("text")
          .text(fx);

      var gxe = gx.enter().insert("g", "a")
          .attr("class", "x")
          .attr("transform", txTics);

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
               downx = xTicsScale.invert(p[0]);
          });

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
          .on("mousedown", function(d) {
               var p = d3.svg.mouse(vis[0][0]);
               downy = yScale.invert(p[1]);
          });

      gy.exit().remove();

      update();
    }

    // ------------------------------------------------------------
    //
    // Draw the data
    //
    // ------------------------------------------------------------

    function update() {
      var oldx, oldy, newx, newy, i;

      var gplot = node.children[0].getElementsByTagName("rect")[0];

      if (gcanvas.style.zIndex == -100) {
        var lines = vis.select("path").attr("d", line(points));
      }

      update_canvas();

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

    function mousemove() {
      if (!dragged) { return; }
      node.onselectstart = function(){ return false; };
      var m = d3.svg.mouse(vis.node());
      dragged.x = xScale.invert(Math.max(0, Math.min(size.width, m[0])));
      dragged.y = yScale.invert(Math.max(0, Math.min(size.height, m[1])));
      update();
    }

    function mouseup() {
      if (!dragged) { return; }
      node.onselectstart = function(){ return true; };
      mousemove();
      dragged = null;
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
            xScale.call(self, pts[0].x, 0), ",",

            yScale.call(self, pts[0].y, 0));
          i++;
        }
        while (++i < n) {

          path.push("L", xScale.call(self, pts[i].x, i), ",", yScale.call(self, pts[i].y, i));
        }

        return (attr_str += path.join(""));
      };
      return gen;
    }());

    function add_point(p) {
      var len = points.length;
      if (len === 0) {
        // line_seglist
      } else {
        var point = { x: len, y: p };
        points.push(point);
        var newx = xScale.call(self, len, len);
        var newy = yScale.call(self, p, len);
        line_seglist.appendItem(line_path.createSVGPathSegLinetoAbs(newx, newy));
      }
    }

    function add_canvas_point(p) {
      if (points.length === 0) { return; }
      var len = points.length;
      var oldx = xScale.call(self, len-1, len-1);
      var oldy = yScale.call(self, points[len-1].y, len-1);
      var point = { x: len, y: p };
      points.push(point);
      var newx = xScale.call(self, len, len);
      var newy = yScale.call(self, p, len);
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
      if (points.length === 0) { return; }
      var px = xScale.call(self, 0, 0),
          py = yScale.call(self, points[0].y, 0),
          i;
      clear_canvas();
      gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
      gctx.beginPath();
      gctx.moveTo(px, py);
      for (i=0; i < points.length-1; i++) {
        px = xScale.call(self, i, i);
        py = yScale.call(self, points[i].y, i);
        gctx.lineTo(px, py);
      }
      gctx.stroke();
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
    // Axis scaling
    //
    // attach the mousemove and mouseup to the body
    // in case one wanders off the axis line
    // ------------------------------------------------------------

    elem.on("mousemove", function(d) {
      document.onselectstart = function() { return true; };
      var p = d3.svg.mouse(vis[0][0]);
      if (!isNaN(downx)) {
        var rupx = xTicsScale.invert(p[0]),
          xaxis1 = xTicsScale.domain()[0],
          xaxis2 = xTicsScale.domain()[1],
          xextent = xaxis2 - xaxis1;
        if (rupx !== 0) {
            var changex, dragx_factor, new_domain;
            dragx_factor = xextent/downx;
            changex = 1 + (downx / rupx - 1) * (xextent/(downx-xaxis1))/dragx_factor;
            new_domain = [xaxis1, xaxis1 + (xextent * changex)];
            xTicsScale.domain(new_domain);
            if (graph.sample !== 1) {
              xScale.domain([new_domain[0]/graph.sample, new_domain[1]/graph.sample]);
            }
            redraw();
        }
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
      if (!isNaN(downy)) {
          var rupy = yScale.invert(p[1]),
          yaxis1 = yScale.domain()[1],
          yaxis2 = yScale.domain()[0],
          yextent = yaxis2 - yaxis1;
        if (rupy !== 0) {
            var changey, dragy_factor, new_range;
            dragy_factor = yextent/downy;
            changey = ((rupy-yaxis1)/(downy-yaxis1)) * (yextent/(downy-yaxis1))/dragy_factor;
            new_range = [yaxis1 + (yextent * 1/changey), yaxis1];
            if (yaxis1 > 0) {
              new_range[0] += yaxis1;
            }
            yScale.domain(new_range);
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


    // make these private variables and functions available
    graph.node = node;
    graph.scale = scale;
    graph.update = update;
    graph.redraw = redraw;

    graph.new_data = new_data;
    graph.add_point = add_point;
    graph.add_canvas_point = add_canvas_point;
    graph.initialize_canvas = initialize_canvas;
    graph.show_canvas = show_canvas;
    graph.hide_canvas = hide_canvas;
    graph.clear_canvas = clear_canvas;
    graph.update_canvas = update_canvas;
  }

  graph.resize = function(width, height) {
    graph.scale(width, height);
    graph();
  };


 if (node) { graph(); }

  return graph;
};
