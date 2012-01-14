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
