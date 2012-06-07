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
      pointArray.push(indexedData(options.dataset[i], 0));
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

      plot.call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 8]).on("zoom", redraw));

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

    d3.select(this)
        .on("mousemove.drag", mousemove)
        .on("touchmove.drag", mousemove)
        .on("mouseup.drag",   mouseup)
        .on("touchend.drag",  mouseup);

    // ------------------------------------------------------------
    //
    // Redraw the plot canvas when it is translated or axes are re-scaled
    //
    // ------------------------------------------------------------

    function redraw() {
      if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
          d3.event.transform(x, y);
      }

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
      plot.call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 8]).on("zoom", redraw));
      update();
    }

    // ------------------------------------------------------------
    //
    // Draw the data
    //
    // ------------------------------------------------------------

    function update() {
      var i;

      var gplot = node.children[0].getElementsByTagName("rect")[0];

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

      // if (markedPoint) {
      //   marker
      //       .attr("stroke", "#F00")
      //       .attr("x1", markedPoint.x)
      //       .attr("y1", 0)
      //       .attr("y2", size.height)
      //       .attr("x2", markedPoint.x);
      // } else {
      //   marker.attr("d", []);
      // }

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
      var p = d3.svg.mouse(vis[0][0]);
      downx = xScale.invert(p[0]);
    }

    function yaxis_drag(d) {
      document.onselectstart = function() { return false; };
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

    function add_point(p) {
      if (points.length === 0) { return; }
      markedPoint = false;
      var index = points.length,
          lengthX = index * sample,
          point = { x: lengthX, y: p },
          newx, newy;

      points.push(point);
      update();
      // newx = xScale.call(self, lengthX, lengthX);
      // newy = yScale.call(self, p, lengthX);
      // line_seglist.appendItem(line_path.createSVGPathSegLinetoAbs(newx, newy));
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
        add_point(pnts[i]);
      }
    }


    function add_canvas_points(pnts) {
      for (var i = 0; i < pointArray.length; i++) {
        points = pointArray[i];
        setPointStrokeColor(i);
        add_canvas_point(pnts[i]);
      }
    }

    function setPointStrokeColor(i) {
      switch(i) {
        case 0:
          gctx.strokeStyle = "rgba(160,00,0, 1.0)";
          break;
        case 1:
          gctx.strokeStyle = "rgba(44,160,0, 1.0)";
          break;
        case 2:
          gctx.strokeStyle = "rgba(44,0,160, 1.0)";
          break;
      }
    }

    function new_data(d) {
      points = indexedData(d, 0, sample);
      update();
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
    function update_canvas() {
      var i, pc, py;
      if (points.length === 0) { return; }
      clear_canvas();
      gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
      for (i = 0; i < pointArray.length; i++) {
        points = pointArray[i];
        setPointStrokeColor(i);
        px = xScale.call(self, 0, 0);
        py = yScale.call(self, points[0].y, 0);
        index = 0;
        lengthX = 0;
        gctx.beginPath();
        gctx.moveTo(px, py);
        for (index=0; index < points.length-1; index++) {
          lengthX += sample;
          px = xScale.call(self, lengthX, lengthX);
          py = yScale.call(self, points[index].y, lengthX);
          gctx.lineTo(px, py);
        }
        gctx.stroke();
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


 if (node) { graph(); }

  return graph;
};
