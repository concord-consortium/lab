/*globals define, d3, $ */

define(function (require) {
  // Dependencies.
  var axis = require('grapher/core/axis');

  return function RealTimeGraph(id, options, message) {
    var elem,
        node,
        cx,
        cy,

        stroke = function(d) { return d ? "#ccc" : "#666"; },
        tx = function(d) { return "translate(" + xScale(d) + ",0)"; },
        ty = function(d) { return "translate(0," + yScale(d) + ")"; },
        fx, fy,
        svg, vis, plot, viewbox,
        title, xlabel, ylabel, xtic, ytic,
        notification,
        padding, size,
        xScale, yScale, line,
        shiftingX = false,
        cubicEase = d3.ease('cubic'),
        ds,
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

        points, pointArray,
        markedPoint, marker,
        sample,
        gcanvas, gctx,
        cplot = {},

        default_options = {
          title   : "graph",
          xlabel  : "x-axis",
          ylabel  : "y-axis",
          xscale  : 'linear',
          yscale  : 'linear',
          xTicCount: 10,
          yTicCount: 10,
          xscaleExponent: 0.5,
          yscaleExponent: 0.5,
          xFormatter: "3.2r",
          yFormatter: "3.2r",
          axisShift:  10,
          xmax:       10,
          xmin:       0,
          ymax:       10,
          ymin:       0,
          dataset:    [0],
          selectable_points: true,
          circleRadius: false,
          dataChange: false,
          points: false,
          sample: 1,
          lines: true,
          bars: false
        };

    initialize(id, options, message);

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
      if (options.axisShift < 1) options.axisShift = 1;
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
        node.style.width =  cx +"px";
        if (!h) {
          node.style.height = "100%";
          h = elem.property("clientHeight");
          cy = h;
          node.style.height = cy +"px";
        } else {
          cy = h;
          node.style.height = cy +"px";
        }
      }
      calculateSizeType();
      // displayProperties = layout.getDisplayProperties();
      emsize = parseFloat($('#viz').css('font-size') || $('body').css('font-size'))/10;
      // emsize = displayProperties.emsize;
    }

    function initialize(id, opts, message) {
      if (id) {
        elem = d3.select(id);
        node = elem.node();
        cx = elem.property("clientWidth");
        cy = elem.property("clientHeight");
      }

      if (opts || !options) {
        options = setupOptions(opts);
        newOptions = undefined;
      }

      if (svg !== undefined) {
        svg.remove();
        svg = undefined;
      }

      if (gcanvas !== undefined) {
        $(gcanvas).remove();
        gcanvas = undefined;
      }

      // use local variable for access speed in add_point()
      sample = options.sample;

      if (options.dataChange) {
        circleCursorStyle = "ns-resize";
      } else {
        circleCursorStyle = "crosshair";
      }

      scale();

      options.xrange = options.xmax - options.xmin;
      options.yrange = options.ymax - options.ymin;

      pointArray = [];

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
         "left":   30
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

      if (Object.prototype.toString.call(options.dataset[0]) === "[object Array]") {
        for (var i = 0; i < options.dataset.length; i++) {
          pointArray.push(indexedData(options.dataset[i], 0, sample));
        }
        points = pointArray[0];
      } else {
        points = indexedData(options.dataset, 0);
        pointArray = [points];
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

      xScale = d3.scale[options.xscale]()
        .domain([options.xmin, options.xmax])
        .range([0, size.width]);

      if (options.xscale === "pow") {
        xScale.exponent(options.xscaleExponent);
      }

      yScale = d3.scale[options.yscale]()
        .domain([options.ymin, options.ymax]).nice()
        .range([size.height, 0]).nice();

      if (options.yscale === "pow") {
        yScale.exponent(options.yscaleExponent);
      }

      fx = d3.format(options.xFormatter);
      fy = d3.format(options.yFormatter);

      line = d3.svg.line()
            .x(function(d, i) { return xScale(points[i].x ); })
            .y(function(d, i) { return yScale(points[i].y); });

      // drag axis logic
      downx = Math.NaN;
      downy = Math.NaN;
      dragged = null;
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

    function graph() {
      scale();

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

        marker = viewbox.append("path").attr("class", "marker");
        // path without attributes cause SVG parse problem in IE9
        //     .attr("d", []);

        // add Chart Title
        if (options.title && sizeType.value > 1) {
          title = vis.selectAll("text")
            .data(titles, function(d) { return d; });
          title.enter().append("text")
              .attr("class", "title")
              .style("font-size", sizeType.value/3.2 * 100 + "%")
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
              .attr("class", "xlabel")
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
              .attr("class", "ylabel")
              .text( options.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
        }

        notification = vis.append("text")
            .attr("class", "graph-notification")
            .text(message)
            .attr("x", size.width/2)
            .attr("y", size.height/2)
            .style("text-anchor","middle");

        d3.select(node)
            .on("mousemove.drag", mousemove)
            .on("touchmove.drag", mousemove)
            .on("mouseup.drag",   mouseup)
            .on("touchend.drag",  mouseup);

        initialize_canvas();
        show_canvas();

      } else {

        vis
          .attr("width",  cx)
          .attr("height", cy);

        plot
          .attr("width", size.width)
          .attr("height", size.height)
          .style("fill", "#EEEEEE");

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

        vis.selectAll("g.x").remove();
        vis.selectAll("g.y").remove();

        resize_canvas();
      }

      redraw();

      // ------------------------------------------------------------
      //
      // Chart Notification
      //
      // ------------------------------------------------------------

      function notify(mesg) {
        message = mesg;
        if (mesg) {
          notification.text(mesg);
        } else {
          notification.text('');
        }
      }

      // ------------------------------------------------------------
      //
      // Redraw the plot canvas when it is translated or axes are re-scaled
      //
      // ------------------------------------------------------------

      function redraw() {

        // Regenerate x-ticks
        var gx = vis.selectAll("g.x")
            .data(xScale.ticks(options.xTicCount), String)
            .attr("transform", tx);

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
              .style("cursor", "ew-resize")
              .text(fx)
              .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
              .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
              .on("mousedown.drag",  xaxis_drag)
              .on("touchstart.drag", xaxis_drag);
        }

        gx.exit().remove();

        // Regenerate y-ticks
        var gy = vis.selectAll("g.y")
            .data(yScale.ticks(options.yTicCount), String)
            .attr("transform", ty);

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
              .style("cursor", "ns-resize")
              .text(fy)
              .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
              .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
              .on("mousedown.drag",  yaxis_drag)
              .on("touchstart.drag", yaxis_drag);
        }

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
          xScale.domain(axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
          redraw();
          d3.event.stopPropagation();
        }
        if (!isNaN(downy)) {
          d3.select('body').style("cursor", "ns-resize");
          yScale.domain(axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
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

      function updateOrRescale(currentSample) {
        var i,
            domain = xScale.domain(),
            xAxisStart = Math.round(domain[0]/sample),
            xAxisEnd = Math.round(domain[1]/sample),
            start = Math.max(0, xAxisStart),
            xextent = domain[1] - domain[0],
            shiftPoint = xextent * 0.9,
            currentExtent;

         if (typeof currentSample !== "number") {
           currentSample = points.length;
         }
         currentExtent = currentSample * sample;
         if (shiftingX) {
           shiftingX = ds();
            if (shiftingX) {
            redraw();
          } else {
            update(currentSample);
          }
        } else {
          if (currentExtent > domain[0] + shiftPoint) {
            ds = shiftXDomain(shiftPoint*0.9, options.axisShift);
            shiftingX = ds();
            redraw();
          } else if ( currentExtent < domain[1] - shiftPoint &&
                      currentSample < points.length &&
                      xAxisStart > 0) {
            ds = shiftXDomain(shiftPoint*0.9, options.axisShift, -1);
            shiftingX = ds();
            redraw();
          } else if (currentExtent < domain[0]) {
            ds = shiftXDomain(shiftPoint*0.1, 1, -1);
            shiftingX = ds();
            redraw();

          } else {
            update(currentSample);
          }
        }
      }

      function shiftXDomain(shift, steps, direction) {
        var d0 = xScale.domain()[0],
            d1 = xScale.domain()[1],
            increment = 1/steps,
            index = 0;
        return function() {
          var factor;
          direction = direction || 1;
          index += increment;
          factor = shift * cubicEase(index);
          if (direction > 0) {
            xScale.domain([d0 + factor, d1 + factor]);
            return xScale.domain()[0] < (d0 + shift);
          } else {
            xScale.domain([d0 - factor, d1 - factor]);
            return xScale.domain()[0] > (d0 - shift);
          }
        };
      }

      function _add_point(p) {
        if (points.length === 0) { return; }
        markedPoint = false;
        var index = points.length,
            lengthX = index * sample,
            point = { x: lengthX, y: p },
            newx, newy;
        points.push(point);
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
          setStrokeColor(i);
          add_canvas_point(pnts[i]);
        }
      }

      function setStrokeColor(i, afterSamplePoint) {
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

      function setFillColor(i, afterSamplePoint) {
        var opacity = afterSamplePoint ? 0.4 : 1.0;
        switch(i) {
          case 0:
            gctx.fillStyle = "rgba(160,00,0," + opacity + ")";
            break;
          case 1:
            gctx.fillStyle = "rgba(44,160,0," + opacity + ")";
            break;
          case 2:
            gctx.fillStyle = "rgba(44,0,160," + opacity + ")";
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
        x = d3.scale[options.xscale]()
            .domain([0, xmax])
            .range([0, size.width]);
        graph.xmax = xmax;
        x_tics_scale = d3.scale[options.xscale]()
            .domain([graph.xmin*graph.sample, graph.xmax*graph.sample])
            .range([0, size.width]);
        update();
        redraw();
      }

      function change_yaxis(ymax) {
        y = d3.scale[options.yscale]()
            .domain([ymax, 0])
            .range([0, size.height]);
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
        vis.select("path.line").remove();
        gcanvas.style.zIndex = 100;
      }

      function hide_canvas() {
        gcanvas.style.zIndex = -100;
        update();
      }

      // update real-time canvas line graph
      function update_canvas(currentSample) {
        var i, index, py, samplePoint, pointStop,
            yOrigin = yScale(0.00001),
            lines = options.lines,
            bars = options.bars,
            twopi = 2 * Math.PI,
            pointsLength = pointArray[0].length,
            numberOfLines = pointArray.length,
            xAxisStart = Math.round(xScale.domain()[0]/sample),
            xAxisEnd = Math.round(xScale.domain()[1]/sample),
            start = Math.max(0, xAxisStart);


        if (typeof currentSample === 'undefined') {
          samplePoint = pointsLength;
        } else {
          if (currentSample === pointsLength-1) {
            samplePoint = pointsLength-1;
          } else {
            samplePoint = currentSample;
          }
        }
        clear_canvas();
        gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
        if (points.length === 0 || xAxisStart >= points.length) { return; }
        if (lines) {
          for (i = 0; i < numberOfLines; i++) {
            points = pointArray[i];
            lengthX = start * sample;
            px = xScale(lengthX);
            py = yScale(points[start].y);
            setStrokeColor(i);
            gctx.beginPath();
            gctx.moveTo(px, py);
            pointStop = samplePoint - 1;
            for (index=start+1; index < pointStop; index++) {
              lengthX = index * sample;
              px = xScale(lengthX);
              py = yScale(points[index].y);
              gctx.lineTo(px, py);
            }
            gctx.stroke();
            pointStop = points.length-1;
            if (index < pointStop) {
              setStrokeColor(i, true);
              for (;index < pointStop; index++) {
                lengthX = index * sample;
                px = xScale(lengthX);
                py = yScale(points[index].y);
                gctx.lineTo(px, py);
              }
              gctx.stroke();
            }
          }
        } else if (bars) {
          for (i = 0; i < numberOfLines; i++) {
            points = pointArray[i];
            setStrokeColor(i);
            pointStop = samplePoint - 1;
            for (index=start; index < pointStop; index++) {
              lengthX = index * sample;
              px = xScale(lengthX);
              py = yScale(points[index].y);
              if (py === 0) {
                continue;
              }
              gctx.beginPath();
              gctx.moveTo(px, yOrigin);
              gctx.lineTo(px, py);
              gctx.stroke();
            }
            pointStop = points.length-1;
            if (index < pointStop) {
              setStrokeColor(i, true);
              for (;index < pointStop; index++) {
                lengthX = index * sample;
                px = xScale(lengthX);
                py = yScale(points[index].y);
                gctx.beginPath();
                gctx.moveTo(px, yOrigin);
                gctx.lineTo(px, py);
                gctx.stroke();
              }
            }
          }
        } else {
          for (i = 0; i < numberOfLines; i++) {
            points = pointArray[i];
            lengthX = 0;
            setFillColor(i);
            setStrokeColor(i, true);
            pointStop = samplePoint - 1;
            for (index=0; index < pointStop; index++) {
              px = xScale(lengthX);
              py = yScale(points[index].y);

              // gctx.beginPath();
              // gctx.moveTo(px, py);
              // gctx.lineTo(px, py);
              // gctx.stroke();

              gctx.arc(px, py, 1, 0, twopi, false);
              gctx.fill();

              lengthX += sample;
            }
            pointStop = points.length-1;
            if (index < pointStop) {
              setFillColor(i, true);
              setStrokeColor(i, true);
              for (;index < pointStop; index++) {
                px = xScale(lengthX);
                py = yScale(points[index].y);

                // gctx.beginPath();
                // gctx.moveTo(px, py);
                // gctx.lineTo(px, py);
                // gctx.stroke();

                gctx.arc(px, py, 1, 0, twopi, false);
                gctx.fill();

                lengthX += sample;
              }
            }
          }
        }
      }

      function initialize_canvas() {
        if (!gcanvas) {
          gcanvas = gcanvas || document.createElement('canvas');
          node.appendChild(gcanvas);
        }
        gcanvas.style.zIndex = -100;
        setupCanvasProperties(gcanvas);
      }

      function resize_canvas() {
        setupCanvasProperties(gcanvas);
        update_canvas();
      }

      function setupCanvasProperties(canvas) {
        cplot.rect = plot.node();
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
      graph.updateOrRescale = updateOrRescale;
      graph.redraw = redraw;
      graph.initialize = initialize;
      graph.notify = notify;

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

    graph.add_data = function(newdata) {
      if (!arguments.length) return points;
      var domain = xScale.domain(),
          xextent = domain[1] - domain[0],
          shift = xextent * 0.8,
          ds,
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
      updateOrRescale();
      return graph;
    };

    graph.getXDomain = function () {
      return xScale.domain();
    };

    graph.getYDomain = function () {
      return yScale.domain();
    };

    graph.reset = function(id, options, message) {
      if (arguments.length) {
        graph.initialize(id, options, message);
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

    if (node) { graph(); }

    return graph;
  };
});
