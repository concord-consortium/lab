/*globals define, d3, $ */

define(function (require) {
  // Dependencies.
  var axis = require('grapher/core/axis'),
      registerKeyboardHandler = require('grapher/core/register-keyboard-handler');


  return function Graph(idOrElement, options, message) {
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
        fontSizeInPixels,
        halfFontSizeInPixels,
        quarterFontSizeInPixels,
        titleFontSizeInPixels,
        axisFontSizeInPixels,
        xlabelFontSizeInPixels,
        ylabelFontSizeInPixels,
        xAxisNumberWidth,
        yAxisNumberWidth,
        strokeWidth,
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
          responsiveLayout: false,
          fontScaleRelativeToParent: true,
          realTime:       false,
          title:          "graph",
          xlabel:         "x-axis",
          ylabel:         "y-axis",
          xscale:         'linear',
          yscale:         'linear',
          xTickCount:      10,
          yTickCount:      10,
          xscaleExponent:  0.5,
          yscaleExponent:  0.5,
          xFormatter:      "3.2r",
          yFormatter:      "3.2r",
          axisShift:       10,
          xmax:            10,
          xmin:            0,
          ymax:            10,
          ymin:            0,
          dataset:         [0],
          selectablePoints: false,
          circleRadius:    10.0,
          strokeWidth:      2.0,
          dataChange:      true,
          addData:         true,
          points:          false,
          notification:    false,
          sample:          1,
          lines:           true,
          bars:            false
        },

        selection_region = {
          xmin: null,
          xmax: null,
          ymin: null,
          ymax: null
        },
        has_selection = false,
        selection_visible = false,
        selection_enabled = true,
        selection_listener,
        brush_element,
        brush_control;

    initialize(idOrElement, options, message);

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
      if (options.responsiveLayout) {
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
      } else {
        sizeType.category = 'large';
        sizeType.value = 4;
      }
    }

    function scale(w, h) {
      if (!w && !h) {
        cx = Math.max(elem.property("clientWidth"), 120);
        cy = Math.max(elem.property("clientHeight"), 62);
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
    }

    function calculateLayout() {
      scale();

      fontSizeInPixels = parseFloat($(node).css("font-size"));

      if (!options.fontScaleRelativeToParent) {
        $(node).css("font-size", 0.5 + sizeType.value/6 + 'em');
      }

      fontSizeInPixels = parseFloat($(node).css("font-size"));

      halfFontSizeInPixels = fontSizeInPixels/2;
      quarterFontSizeInPixels = fontSizeInPixels/4;

      if (svg === undefined) {
        titleFontSizeInPixels =  fontSizeInPixels;
        axisFontSizeInPixels =   fontSizeInPixels;
        xlabelFontSizeInPixels = fontSizeInPixels;
        ylabelFontSizeInPixels = fontSizeInPixels;
      } else {
        titleFontSizeInPixels =  parseFloat($("svg.graph text.title").css("font-size"));
        axisFontSizeInPixels =   parseFloat($("svg.graph text.axis").css("font-size"));
        xlabelFontSizeInPixels = parseFloat($("svg.graph text.xlabel").css("font-size"));
        ylabelFontSizeInPixels = parseFloat($("svg.graph text.ylabel").css("font-size"));
      }

      xAxisNumberWidth = Math.max(axis.numberWidthUsingFormatter(elem, cx, cy, axisFontSizeInPixels, options.xFormatter, options.xmax)*1.5,
                                  axis.numberWidthUsingFormatter(elem, cx, cy, axisFontSizeInPixels, options.xFormatter, options.xmin)*1.5);

      yAxisNumberWidth = Math.max(axis.numberWidthUsingFormatter(elem, cx, cy, axisFontSizeInPixels, options.yFormatter, options.ymax)*1.5,
                                  axis.numberWidthUsingFormatter(elem, cx, cy, axisFontSizeInPixels, options.yFormatter, options.ymin)*1.5);

      switch(sizeType.value) {
        case 0:         // tiny
        padding = {
         "top":    fontSizeInPixels,
         "right":  fontSizeInPixels,
         "bottom": fontSizeInPixels,
         "left":   fontSizeInPixels
        };
        break;

        case 1:         // small
        padding = {
         "top":    fontSizeInPixels,
         "right":  fontSizeInPixels,
         "bottom": fontSizeInPixels,
         "left":   fontSizeInPixels
        };
        break;

        case 2:         // medium
        padding = {
         "top":    options.title  ? titleFontSizeInPixels*1.8 : halfFontSizeInPixels,
         "right":  Math.max(fontSizeInPixels, xAxisNumberWidth*0.5),
         "bottom": axisFontSizeInPixels*1.25,
         "left":   yAxisNumberWidth
        };
        break;

        case 3:         // large
        padding = {
         "top":    options.title  ? titleFontSizeInPixels*1.8 : halfFontSizeInPixels,
         "right":  Math.max(fontSizeInPixels, xAxisNumberWidth*0.5),
         "bottom": options.xlabel ? (xlabelFontSizeInPixels + axisFontSizeInPixels)*1.25 : axisFontSizeInPixels*1.25,
         "left":   options.ylabel ? yAxisNumberWidth + axisFontSizeInPixels*1.2 : yAxisNumberWidth
        };
        break;

        default:         // extralarge
        padding = {
         "top":    options.title  ? titleFontSizeInPixels*1.8 : halfFontSizeInPixels,
         "right":  Math.max(fontSizeInPixels, xAxisNumberWidth*0.5),
         "bottom": options.xlabel ? (xlabelFontSizeInPixels + axisFontSizeInPixels)*1.25 : axisFontSizeInPixels*1.25,
         "left":   options.ylabel ? yAxisNumberWidth + axisFontSizeInPixels*1.2 : yAxisNumberWidth
        };
        break;
      }

      if (sizeType.value > 2 ) {
        padding.top += (titles.length-1) * sizeType.value/3 * sizeType.value/3 * fontSizeInPixels;
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

      updateXScale();
      updateYScale();

      line = d3.svg.line()
          .x(function(d, i) { return xScale(points[i][0]); })
          .y(function(d, i) { return yScale(points[i][1]); });

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

    // ------------------------------------------------------------
    //
    // Imported from graph.js
    //
    // ------------------------------------------------------------

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

    //
    // Initialize
    //
    function initialize(idOrElement, opts, mesg) {
      if (idOrElement) {
        // d3.select works both for element ID (e.g. "#grapher")
        // and for DOM element.
        elem = d3.select(idOrElement);
        node = elem.node();
        cx = elem.property("clientWidth");
        cy = elem.property("clientHeight");
      }

      if (opts || !options) {
        options = setupOptions(opts);
      }

      points = options.points;
      if (points === "fake") {
        points = fakeDataPoints();
      }

      if (mesg) {
        message = mesg;
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
      strokeWidth = options.strokeWidth;

      if (options.dataChange) {
        circleCursorStyle = "ns-resize";
      } else {
        circleCursorStyle = "crosshair";
      }

      scale();

      options.xrange = options.xmax - options.xmin;
      options.yrange = options.ymax - options.ymin;

      // In realTime mode the grapher expects either an array if arrays of dependent data.
      // The sample variable sets the interval spacing between data samples.
      if (options.realTime) {
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
      }

      if (Object.prototype.toString.call(options.title) === "[object Array]") {
        titles = options.title;
      } else {
        titles = [options.title];
      }
      titles.reverse();

      fx = d3.format(options.xFormatter);
      fy = d3.format(options.yFormatter);

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
      calculateLayout();

      if (svg === undefined) {

        svg = elem.append("svg")
            .attr("width",  cx)
            .attr("height", cy)
            .attr("class", "graph");

        vis = svg.append("g")
              .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

        plot = vis.append("rect")
          .attr("class", "plot")
          .attr("width", size.width)
          .attr("height", size.height)
          .style("fill", "#EEEEEE")
          .attr("pointer-events", "all")
          .on("mousedown", plotDrag)
          .on("touchstart", plotDrag);

        plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));

        viewbox = vis.append("svg")
          .attr("class", "viewbox")
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height);

        if (!options.realTime) {
          viewbox.append("path")
                .attr("class", "line")
                .style("stroke-width", strokeWidth)
                .attr("d", line(points));
        }

        marker = viewbox.append("path").attr("class", "marker");
        // path without attributes cause SVG parse problem in IE9
        //     .attr("d", []);


        brush_element = viewbox.append("g")
              .attr("class", "brush");

        // add Chart Title
        if (options.title && sizeType.value > 1) {
          title = vis.selectAll("text")
            .data(titles, function(d) { return d; });
          title.enter().append("text")
              .attr("class", "title")
              .text(function(d) { return d; })
              .attr("x", size.width/2)
              .attr("dy", function(d, i) { return -i * titleFontSizeInPixels - halfFontSizeInPixels + "px"; })
              .style("text-anchor","middle");
        }

        // Add the x-axis label
       if (options.xlabel && sizeType.value > 2) {
          xlabel = vis.append("text")
              .attr("class", "axis")
              .attr("class", "xlabel")
              .text(options.xlabel)
              .attr("x", size.width/2)
              .attr("y", size.height)
              .attr("dy", axisFontSizeInPixels*2 + "px")
              .style("text-anchor","middle");
        }

        // add y-axis label
        if (options.ylabel && sizeType.value > 2) {
          ylabel = vis.append("g").append("text")
              .attr("class", "axis")
              .attr("class", "ylabel")
              .text( options.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -yAxisNumberWidth + " " + size.height/2+") rotate(-90)");
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

        notification = vis.append("text")
            .attr("class", "graph-notification")
            .text(message)
            .attr("x", size.width/2)
            .attr("y", size.height/2)
            .style("text-anchor","middle");

        if (options.realTime) {
          initializeCanvas();
          showCanvas();
        }

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
          title
              .attr("x", size.width/2)
              .attr("dy", function(d, i) { return -i * titleFontSizeInPixels - halfFontSizeInPixels + "px"; });
        }

        if (options.xlabel && sizeType.value > 1) {
          xlabel
              .attr("x", size.width/2)
              .attr("dy", axisFontSizeInPixels*2 + "px")
        }

        if (options.ylabel && sizeType.value > 1) {
          ylabel
              .attr("transform","translate(" + -yAxisNumberWidth + " " + size.height/2+") rotate(-90)");
        }

        notification
          .attr("x", size.width/2)
          .attr("y", size.height/2);

        vis.selectAll("g.x").remove();
        vis.selectAll("g.y").remove();

        if (options.realTime) {
          resizeCanvas();
        }
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
            .data(xScale.ticks(options.xTickCount), String)
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
              .attr("y", size.height)
              .attr("dy", axisFontSizeInPixels + "px")
              .attr("text-anchor", "middle")
              .style("cursor", "ew-resize")
              .text(fx)
              .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
              .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
              .on("mousedown.drag",  xaxisDrag)
              .on("touchstart.drag", xaxisDrag);
        }

        gx.exit().remove();

        // Regenerate y-ticks
        var gy = vis.selectAll("g.y")
            .data(yScale.ticks(options.yTickCount), String)
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
          if (options.yscale === "log") {
            var gye_length = gye[0].length;
            if (gye_length > 100) {
              gye = gye.filter(function(d) { return !!d.toString().match(/(\.[0]*|^)[1]/);});
            } else if (gye_length > 50) {
              gye = gye.filter(function(d) { return !!d.toString().match(/(\.[0]*|^)[12]/);});
            } else {
              gye = gye.filter(function(d) {
                return !!d.toString().match(/(\.[0]*|^)[125]/);});
            }
          }
          gye.append("text")
              .attr("class", "axis")
              .attr("x", -axisFontSizeInPixels/4 + "px")
              .attr("dy", ".35em")
              .attr("text-anchor", "end")
              .style("cursor", "ns-resize")
              .text(fy)
              .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
              .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
              .on("mousedown.drag",  yaxisDrag)
              .on("touchstart.drag", yaxisDrag);
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

      function update() {
        if (options.realTime) {
          realTimeUpdate();
        } else {
          regularUpdate();
        }
      }

      function realTimeUpdate(currentSample) {
        updateCanvas(currentSample);

        if (graph.selectablePoints) {
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


      // ------------------------------------------------------------
      //
      // Update the slower SVG-based grapher canvas
      //
      // ------------------------------------------------------------

      function regularUpdate() {

        update_brush_element();

        vis.select("path").attr("d", line(points));

        var circle = vis.select("svg").selectAll("circle")
            .data(points, function(d) { return d; });

        if (options.circleRadius && sizeType.value > 1) {
          if (!(options.circleRadius <= 4 && sizeType.value < 3)) {
            circle.enter().append("circle")
                .attr("class", function(d) { return d === selected ? "selected" : null; })
                .attr("cx",    function(d) { return xScale(d[0]); })
                .attr("cy",    function(d) { return yScale(d[1]); })
                .attr("r", options.circleRadius * (1 + sizeType.value) / 4)
                .style("stroke-width", strokeWidth)
                .style("cursor", circleCursorStyle)
                .on("mousedown.drag",  dataPointDrag)
                .on("touchstart.drag", dataPointDrag);

            circle
                .attr("class", function(d) { return d === selected ? "selected" : null; })
                .attr("cx",    function(d) { return xScale(d[0]); })
                .attr("cy",    function(d) { return yScale(d[1]); })
                .attr("r", options.circleRadius * (1 + sizeType.value) / 4)
                .style("stroke-width", strokeWidth);
          }
        }

        circle.exit().remove();

        if (d3.event && d3.event.keyCode) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
        }
      }

      // ------------------------------------------------------------
      //
      // Update the real-time graph canvas
      //
      // ------------------------------------------------------------

      function updateSample(currentSample) {
        updateCanvas(currentSample);

        if (graph.selectablePoints) {
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

      function plotDrag() {
        if (options.realTime) {
          realTimePlotDrag();
        } else {
          regularPlotDrag();
        }
      }

      function realTimePlotDrag() {
        d3.event.preventDefault();
        plot.style("cursor", "move");
        if (d3.event.altKey) {
          var p = d3.mouse(vis.node());
          downx = xScale.invert(p[0]);
          downy = yScale.invert(p[1]);
          dragged = false;
          d3.event.stopPropagation();
        }
      }

      function regularPlotDrag() {
        var p;
        d3.event.preventDefault();
        registerKeyboardHandler(keydown);
        d3.select('body').style("cursor", "move");
        if (d3.event.altKey) {
          if (d3.event.shiftKey && options.addData) {
            p = d3.mouse(vis.node());
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
            p = d3.mouse(vis.node());
            downx = xScale.invert(p[0]);
            downy = yScale.invert(p[1]);
            dragged = false;
            d3.event.stopPropagation();
          }
          // d3.event.stopPropagation();
        }
      }

      function xaxisDrag(d) {
        document.onselectstart = function() { return false; };
        d3.event.preventDefault();
        var p = d3.mouse(vis.node());
        downx = xScale.invert(p[0]);
      }

      function yaxisDrag(d) {
        document.onselectstart = function() { return false; };
        d3.event.preventDefault();
        var p = d3.mouse(vis.node());
        downy = yScale.invert(p[1]);
      }

      function dataPointDrag(d) {
        registerKeyboardHandler(keydown);
        document.onselectstart = function() { return false; };
        selected = dragged = d;
        update();
      }

      // ------------------------------------------------------------
      //
      // Axis scaling
      //
      // attach the mousemove and mouseup to the body
      // in case one wanders off the axis line
      // ------------------------------------------------------------

      function mousemove() {
        var p = d3.mouse(vis.node()),
            changex, changey, new_domain,
            t = d3.event.changedTouches;

        document.onselectstart = function() { return true; };
        d3.event.preventDefault();
        if (dragged && options.dataChange) {
          dragged[1] = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
          update();
        }

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

        if (options.realTime) {
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
        } else {
          if (shiftingX) {
            if (shiftingX = ds()) {
              redraw();
            } else {
              update();
            }
          } else {
            if (points[points.length-1][0] > domain[0] + shiftPoint) {
              ds = shiftXDomain(shiftPoint*0.75, options.axisShift);
              shiftingX = ds();
              redraw();
            } else {
              update();
            }
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
        graph(elem);
        return graph;
      };

      // ------------------------------------------------------------
      //
      // support for slower SVG-based graphing
      //
      // ------------------------------------------------------------

      graph.data = function(_) {
        if (!arguments.length) return points;
        var domain = xScale.domain(),
            xextent = domain[1] - domain[0],
            shift = xextent * 0.8;
        options.points = points = _;
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

      /**
        Set or get the selection domain (i.e., the range of x values that are selected).

        Valid domain specifiers:
          null     no current selection (selection is turned off)
          []       a current selection exists but is empty (has_selection is true)
          [x1, x2] the region between x1 and x2 is selected. Any data points between
                   x1 and x2 (inclusive) would be considered to be selected.

        Default value is null.
      */
      graph.selection_domain = function(a) {

        if (!arguments.length) {
          if (!has_selection) {
            return null;
          }
          if (selection_region.xmax === Infinity && selection_region.xmin === Infinity ) {
            return [];
          }
          return [selection_region.xmin, selection_region.xmax];
        }

        // setter

        if (a === null) {
          has_selection = false;
        }
        else if (a.length === 0) {
          has_selection = true;
          selection_region.xmin = Infinity;
          selection_region.xmax = Infinity;
        }
        else {
          has_selection = true;
          selection_region.xmin = a[0];
          selection_region.xmax = a[1];
        }

        update_brush_element();

        if (selection_listener) {
          selection_listener(graph.selection_domain());
        }
        return graph;
      };

      /**
        Get whether the graph currently has a selection region. Default value is false.

        If true, it would be valid to filter the data points to return a subset within the selection
        region, although this region may be empty!

        If false the graph is not considered to have a selection region.

        Note that even if has_selection is true, the selection region may not be currently shown,
        and if shown, it may be empty.
      */
      graph.has_selection = function() {
        return has_selection;
      };

      /**
        Set or get the visibility of the selection region. Default value is false.

        Has no effect if the graph does not currently have a selection region
        (selection_domain is null).

        If the selection_enabled property is true, the user will also be able to interact
        with the selection region.
      */
      graph.selection_visible = function(val) {
        if (!arguments.length) {
          return selection_visible;
        }

        // setter
        val = !!val;
        if (selection_visible !== val) {
          selection_visible = val;
          update_brush_element();
        }
        return graph;
      };

      /**
        Set or get whether user manipulation of the selection region should be enabled
        when a selection region exists and is visible. Default value is true.

        Setting the value to true has no effect unless the graph has a selection region
        (selection_domain is non-null) and the region is visible (selection_visible is true).
        However, the selection_enabled setting is honored whenever those properties are
        subsequently updated.

        Setting the value to false does not affect the visibility of the selection region,
        and does not affect the ability to change the region by calling selection_domain().

        Note that graph panning and zooming are disabled while selection manipulation is enabled.
      */
      graph.selection_enabled = function(val) {
        if (!arguments.length) {
          return selection_enabled;
        }

        // setter
        val = !!val;
        if (selection_enabled !== val) {
          selection_enabled = val;
          update_brush_element();
        }
        return graph;
      };

      /**
        Set or get the listener to be called when the selection_domain changes.

        Both programatic and interactive updates of the selection region result in
        notification of the listener.

        The listener is called with the new selection_domain value in the first argument.
      */
      graph.selection_listener = function(cb) {
        if (!arguments.length) {
          return selection_listener;
        }
        // setter
        selection_listener = cb;
        return graph;
      };

      function brush_listener() {
        var extent;
        if (selection_enabled) {
          // Note there is a brush.empty() method, but it still reports true after the
          // brush extent has been programatically updated.
          extent = brush_control.extent();
          graph.selection_domain( extent[0] !== extent[1] ? extent : [] );
        }
      }

      function update_brush_element() {
        if (has_selection && selection_visible) {
          brush_control = brush_control || d3.svg.brush()
            .x(xScale)
            .extent([selection_region.xmin || 0, selection_region.xmax || 0])
            .on("brush", brush_listener);

          brush_element
            .call(brush_control.extent([selection_region.xmin || 0, selection_region.xmax || 0]))
            .style('display', 'inline')
            .style('pointer-events', selection_enabled ? 'all' : 'none')
            .selectAll("rect")
              .attr("height", size.height);

        } else {
          brush_element.style('display', 'none');
        }
      }

      function add_data(newdata) {
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


      // ------------------------------------------------------------
      //
      // support for the real-time canvas-based graphing
      //
      // ------------------------------------------------------------

      function _realTimeAddPoint(p) {
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
        _realTimeAddPoint(p);
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
          _realTimeAddPoint(pnts[i]);
        }
        updateOrRescale();
      }


      function addRealTimePoints(pnts) {
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

      function newRealTimeData(d) {
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

      function clearCanvas() {
        gcanvas.width = gcanvas.width;
        gctx.fillStyle = "rgba(0,255,0, 0.05)";
        gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
        gctx.strokeStyle = "rgba(255,65,0, 1.0)";
      }

      function showCanvas() {
        vis.select("path.line").remove();
        gcanvas.style.zIndex = 100;
      }

      function hideCanvas() {
        gcanvas.style.zIndex = -100;
        update();
      }

      // update real-time canvas line graph
      function updateCanvas(currentSample) {
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
        clearCanvas();
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

      function initializeCanvas() {
        if (!gcanvas) {
          gcanvas = gcanvas || document.createElement('canvas');
          node.appendChild(gcanvas);
        }
        gcanvas.style.zIndex = -100;
        setupCanvasProperties(gcanvas);
      }

      function resizeCanvas() {
        setupCanvasProperties(gcanvas);
        updateCanvas();
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
      graph.elem = elem;
      graph.scale = scale;
      graph.update = update;
      graph.updateOrRescale = updateOrRescale;
      graph.redraw = redraw;
      graph.initialize = initialize;
      graph.notify = notify;
      graph.updateXScale = updateXScale;
      graph.updateYScale = updateYScale;

      /**
        Read only getter for the d3 selection referencing the DOM elements containing the d3
        brush used to implement selection region manipulation.
      */
      graph.brush_element = function() {
        return brush_element;
      };

      /**
        Read-only getter for the d3 brush control (d3.svg.brush() function) used to implement
        selection region manipulation.
      */
      graph.brush_control = function() {
        return brush_control;
      };

      /**
        Read-only getter for the internal listener to the d3 'brush' event.
      */
      graph.brush_listener = function() {
        return brush_listener;
      };

      graph.number_of_points = number_of_points;
      graph.newRealTimeData = newRealTimeData;
      graph.add_point = add_point;
      graph.add_points = add_points;
      graph.addRealTimePoints = addRealTimePoints;
      graph.initializeCanvas = initializeCanvas;
      graph.showCanvas = showCanvas;
      graph.hideCanvas = hideCanvas;
      graph.clearCanvas = clearCanvas;
      graph.updateCanvas = updateCanvas;
      graph.showMarker = showMarker;
      
      graph.add_data = add_data;

      graph.change_xaxis = change_xaxis;
      graph.change_yaxis = change_yaxis;
    }

    graph.getXDomain = function () {
      return xScale.domain();
    };

    graph.getYDomain = function () {
      return yScale.domain();
    };

    graph.reset = function(idOrElement, options, message) {
      if (arguments.length) {
        graph.initialize(idOrElement, options, message);
      } else {
        graph.initialize();
      }
      graph();
      // and then render again using actual size of SVG text elements are
      graph();
      return graph;
    };

    graph.resize = function(w, h) {
      graph.scale(w, h);
      graph.initialize();
      graph();
      return graph;
    };

    if (node) {
      graph();
      // and then render again using actual size of SVG text elements are
      graph();
    }

    return graph;
  };
});
