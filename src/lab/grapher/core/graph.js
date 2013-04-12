/*global define, d3, $ self */

define(function (require) {
  // Dependencies.
  var axis = require('grapher/core/axis'),
      tooltips = {
        autoscale: "Show all data (autoscale)"
      };

  return function Graph(idOrElement, options, message, tabindex) {
    var api = {},   // Public API object to be returned.
        elem,
        node,
        $node,
        cx,
        cy,

        stroke = function(d) { return d ? "#ccc" : "#666"; },
        tx = function(d) { return "translate(" + xScale(d) + ",0)"; },
        ty = function(d) { return "translate(0," + yScale(d) + ")"; },
        fx, fy,
        svg, vis, plot, viewbox,
        background,
        gcanvas, gctx,
        canvasFillStyle = "rgba(255,255,255, 0.0)",
        cplot = {},
        buttonLayer,
        title, xlabel, ylabel,
        notification,
        padding, size,
        xScale, yScale, line,
        shiftingX = false,
        cubicEase = d3.ease('cubic'),
        domainShift,
        circleCursorStyle,
        fontSizeInPixels,
        halfFontSizeInPixels,
        quarterFontSizeInPixels,
        titleFontSizeInPixels,
        axisFontSizeInPixels,
        xlabelFontSizeInPixels,
        ylabelFontSizeInPixels,

        xlabelMetrics,
        yLabelMetrics,
        xAxisNumberWidth,
        xAxisNumberHeight,
        yAxisNumberWidth,
        yAxisNumberHeight,
        xAxisLabelHorizontalPadding,

        xAxisVerticalPadding,
        xAxisDraggableHeight,
        xAxisLabelBaseline,

        yAxisHorizontalPadding,
        yAxisDraggableWidth,
        yAxisLabelBaseline,

        xAxisDraggable,
        yAxisDraggable,

        strokeWidth,
        sizeType = {
          category: "medium",
          value: 3,
          icon: 120,
          tiny: 240,
          small: 480,
          medium: 960,
          large: 1920
        },
        downx = NaN,
        downy = NaN,
        dragged = null,
        selected = null,
        selectable = [],
        titles = [],

        points, pointArray,
        currentSample,
        markedPoint, marker,
        sample,

        default_options = {
          // Enables the button layer with: AutoScale ...
          showButtons:    true,

          // Responsive Layout provides pregressive removal of
          // graph elements when size gets smaller
          responsiveLayout: false,

          // Font sizes for graphs are normally specified using ems.
          // When fontScaleRelativeToParent is true
          fontScaleRelativeToParent: true,

          // When the realTime is true data are expected to consist of
          // an array (or arrays) of samples.
          // In this case the sample setting should indicate the constant
          // time interval between sample points
          realTime:       false,
          sample:          1,

          // title can be a string or an array of strings, if an
          // array of strings each element is on a separate line.
          title:          "graph",

          // The labels for the axes, these are separate from the numeric labels.
          xlabel:         "x-axis",
          ylabel:         "y-axis",

          // Initial extent of the X and Y axes.
          xmax:            10,
          xmin:            0,
          ymax:            10,
          ymin:            0,

          // Approximate values for how many gridlines should appear on the axes.
          xTickCount:      10,
          yTickCount:      10,

          // The formatter used to convert numbers into strings.
          // see: https://github.com/mbostock/d3/wiki/Formatting#wiki-d3_format
          xFormatter:      "2s",
          yFormatter:      "2s",

          // Scale type: options are:
          //   linear: https://github.com/mbostock/d3/wiki/Quantitative-Scales#wiki-linear
          //   log:    https://github.com/mbostock/d3/wiki/Quantitative-Scales#wiki-log
          //   pow:    https://github.com/mbostock/d3/wiki/Quantitative-Scales#wiki-pow
          xscale:         'linear',
          yscale:         'linear',
          // Used when scale type is set to "pow"
          xscaleExponent:  0.5,
          yscaleExponent:  0.5,

          // How many samples over which a shift should take place when
          // the data being plotted gets close to the edge of the X axis.
          axisShift:       10,

          dataset:         [0],
          points:          false,

          // selectablePoints: false,

          // if not false should indicate a radius size for circles to
          // drawn around data points
          circleRadius:    10.0,

          // only show circles when hovering near them with the mouse
          circlesVisibleOnlyOnHover: false,

          // number of circles to show on each side of the central point
          extraCirclesVisibleOnHover: 2,

          // width of the line used for plotting
          strokeWidth:      2.0,

          // Enables vales of data points to be changes by selecting
          // and draging.
          dataChange:      true,

          // Enables adding of data to a graph by option/alt clicking in the graph.
          addData:         true,

          // If not false should be a string which is rendered in background of graph.
          notification:    false,

          // if true lines are rendered in the realTime graph
          lines:           true,

          // if true vertical bars are rendered in the realTime graph
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

    function initializeLayout(idOrElement, mesg) {
      if (idOrElement) {
        // d3.select works both for element ID (e.g. "#grapher")
        // and for DOM element.
        elem = d3.select(idOrElement);
        node = elem.node();
        $node = $(node);
        // cx = $node.width();
        // cy = $node.height();
        cx = elem.property("clientWidth");
        cy = elem.property("clientHeight");
      }

      if (mesg) {
        message = mesg;
      }

      if (svg !== undefined) {
        svg.remove();
        svg = undefined;
      }

      if (background !== undefined) {
        background.remove();
        background = undefined;
      }

      if (gcanvas !== undefined) {
        $(gcanvas).remove();
        gcanvas = undefined;
      }

      if (options.dataChange) {
        circleCursorStyle = "ns-resize";
      } else {
        circleCursorStyle = "crosshair";
      }

      scale();

      // drag axis logic
      downx = NaN;
      downy = NaN;
      dragged = null;
    }

    function scale(w, h) {
      if (!w && !h) {
        // cx = Math.max($node.width(), 120);
        // cy = Math.max($node.height(), 62);
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

      fontSizeInPixels = parseFloat($node.css("font-size"));

      if (!options.fontScaleRelativeToParent) {
        $node.css("font-size", 0.5 + sizeType.value/6 + 'em');
      }

      fontSizeInPixels = parseFloat($node.css("font-size"));

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

      if (xScale === undefined) {
        xlabelMetrics = [fontSizeInPixels, fontSizeInPixels];
        ylabelMetrics = [fontSizeInPixels*2, fontSizeInPixels];
      } else {
        xlabelMetrics = axis.numberWidthUsingFormatter(elem, cx, cy, axisFontSizeInPixels,
          longestNumber(xScale.ticks(options.xTickCount), fx));

        ylabelMetrics = axis.numberWidthUsingFormatter(elem, cx, cy, axisFontSizeInPixels,
          longestNumber(yScale.ticks(options.yTickCount), fy));
      }

      xAxisNumberWidth  = xlabelMetrics[0];
      xAxisNumberHeight = xlabelMetrics[1];
      yAxisNumberWidth  = ylabelMetrics[0];
      yAxisNumberHeight = ylabelMetrics[0];

      xAxisLabelHorizontalPadding = xAxisNumberWidth * 0.5;
      xAxisDraggableHeight = xAxisNumberHeight * 1.1;
      xAxisVerticalPadding = xAxisDraggableHeight + xAxisNumberHeight*1.3;
      xAxisLabelBaseline = xAxisVerticalPadding-xAxisNumberHeight/3;

      yAxisDraggableWidth    = yAxisNumberWidth + xAxisNumberHeight/4;
      yAxisHorizontalPadding = yAxisDraggableWidth + yAxisNumberHeight;
      yAxisLabelBaseline     = -(yAxisDraggableWidth+yAxisNumberHeight/4);

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
         "right":  xAxisLabelHorizontalPadding,
         "bottom": axisFontSizeInPixels*1.25,
         "left":   yAxisNumberWidth
        };
        break;

        case 3:         // large
        padding = {
         "top":    options.title  ? titleFontSizeInPixels*1.8 : halfFontSizeInPixels,
         "right":  xAxisLabelHorizontalPadding,
         "bottom": options.xlabel ? xAxisVerticalPadding : axisFontSizeInPixels*1.25,
         "left":   options.ylabel ? yAxisHorizontalPadding : yAxisNumberWidth
        };
        break;

        default:         // extralarge
        padding = {
         "top":    options.title  ? titleFontSizeInPixels*1.8 : halfFontSizeInPixels,
         "right":  xAxisLabelHorizontalPadding,
         "bottom": options.xlabel ? xAxisVerticalPadding : axisFontSizeInPixels*1.25,
         "left":   options.ylabel ? yAxisHorizontalPadding : yAxisNumberWidth
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

    function longestNumber(array, formatter, precision) {
      var longest = 0,
          index = 0,
          str,
          len,
          i;
      precision = precision || 5;
      for (i = 0; i < array.length; i++) {
        str = formatter(+array[i].toPrecision(precision));
        str = str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        len = str.length;
        if (len > longest) {
          longest = len;
          index = i;
        }
      }
      return formatter(array[index]);
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

    function persistScaleChangesToOptions() {
      var xdomain = xScale.domain(),
          ydomain = yScale.domain();
      options.xmax = xdomain[1];
      options.xmin = xdomain[0];
      options.ymax = ydomain[1];
      options.ymin = ydomain[0];
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

    function setCurrentSample(samplePoint) {
      if (typeof samplePoint === "number") {
        currentSample = samplePoint;
      }
      if (typeof currentSample !== "number") {
        currentSample = points.length-1;
      }
      return currentSample;
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

    function numberOfPoints() {
      if (points) {
        return points.length;
      } else {
        return false;
      }
    }

    function createButtonLayer() {
      buttonLayer = elem.append("div");

      buttonLayer
        .attr("class", "button-layer")
        .style("z-index", 3)
        .append('a')
          .attr({
            "class": "autoscale-button",
            "title": tooltips.autoscale
          })
          .on("click", function() {
            autoscale();
          })
          .append("i")
            .attr("class", "icon-picture");

      resizeButtonLayer();
    }

    function resizeButtonLayer() {
      buttonLayer
        .style({
          "width":   fontSizeInPixels*1.75 + "px",
          "height":  fontSizeInPixels*1.25 + "px",
          "top":     padding.top + halfFontSizeInPixels + "px",
          "left":    padding.left + (size.width - fontSizeInPixels*2.0) + "px"
        });
    }

    function renderNewGraph() {
      svg = elem.append("svg")
          .attr("width",  cx)
          .attr("height", cy)
          .attr("class", "graph")
          .style('z-index', 2);
          // .attr("tabindex", tabindex || 0);

      vis = svg.append("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
        .attr("class", "plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("pointer-events", "all")
        .attr("fill", "rgba(255,255,255,0)")
        .on("mousemove", plotMousemove)
        .on("mousedown", plotDrag)
        .on("touchstart", plotDrag);

      plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));

      background = elem.append("div")
          .attr("class", "background")
          .style({
            "width":   size.width + "px",
            "height":  size.height + "px",
            "top":     padding.top + "px",
            "left":    padding.left + "px",
            "z-index": 0
          });

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

      yAxisDraggable = svg.append("rect")
        .attr("class", "draggable-axis")
        .attr("x", padding.left-yAxisDraggableWidth)
        .attr("y", padding.top)
        .attr("rx", yAxisNumberHeight/6)
        .attr("width", yAxisDraggableWidth)
        .attr("height", size.height)
        .attr("pointer-events", "all")
        .style("cursor", "row-resize")
        .on("mousedown", yAxisDrag)
        .on("touchstart", yAxisDrag);

      xAxisDraggable = svg.append("rect")
        .attr("class", "draggable-axis")
        .attr("x", padding.left)
        .attr("y", size.height+padding.top)
        .attr("rx", yAxisNumberHeight/6)
        .attr("width", size.width)
        .attr("height", xAxisDraggableHeight)
        .attr("pointer-events", "all")
        .style("cursor", "col-resize")
        .on("mousedown", xAxisDrag)
        .on("touchstart", xAxisDrag);

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
            .attr("dy", xAxisLabelBaseline + "px")
            .style("text-anchor","middle");
      }

      // add y-axis label
      if (options.ylabel && sizeType.value > 2) {
        ylabel = vis.append("g").append("text")
            .attr("class", "axis")
            .attr("class", "ylabel")
            .text( options.ylabel)
            .style("text-anchor","middle")
            .attr("transform","translate(" + yAxisLabelBaseline + " " + size.height/2+") rotate(-90)");
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

      if (options.realTime) {
        initializeCanvas();
        showCanvas();
      }
    }

    function repaintExistingGraph() {
      vis
        .attr("width",  cx)
        .attr("height", cy)
        .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot
        .attr("width", size.width)
        .attr("height", size.height);

      background
        .style({
          "width":   size.width + "px",
          "height":  size.height + "px",
          "top":     padding.top + "px",
          "left":    padding.left + "px",
          "z-index": 0
        });

      viewbox
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height);

      yAxisDraggable
        .attr("x", padding.left-yAxisDraggableWidth)
        .attr("y", padding.top-yAxisNumberHeight/2)
        .attr("width", yAxisDraggableWidth)
        .attr("height", size.height+yAxisNumberHeight);

      xAxisDraggable
        .attr("x", padding.left)
        .attr("y", size.height+padding.top)
        .attr("width", size.width)
        .attr("height", xAxisDraggableHeight);

      if (options.title && sizeType.value > 1) {
        title
            .attr("x", size.width/2)
            .attr("dy", function(d, i) { return -i * titleFontSizeInPixels - halfFontSizeInPixels + "px"; });
      }

      if (options.xlabel && sizeType.value > 1) {
        xlabel
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy", xAxisLabelBaseline + "px");
      }

      if (options.ylabel && sizeType.value > 1) {
        ylabel
            .attr("transform","translate(" + yAxisLabelBaseline + " " + size.height/2+") rotate(-90)");
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
            .text(fx)
            .on("mouseover", function() { d3.select(this).style("font-weight", "bold");})
            .on("mouseout",  function() { d3.select(this).style("font-weight", "normal");});
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
            .on("mouseover", function() { d3.select(this).style("font-weight", "bold");})
            .on("mouseout",  function() { d3.select(this).style("font-weight", "normal");});
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
    function circleClasses(d) {
      cs = [];
      if (d === selected) {
        cs.push("selected");
      }
      if (!options.circlesVisibleOnlyOnHover || selectable.indexOf(d) !== -1) {
        cs.push("selectable");
      }
      if (cs.length === 0) {
        return null;
      } else {
        return cs.join(" ");
      }
    }

    function update(samplePoint) {
      setCurrentSample(samplePoint);
      if (options.realTime) {
        realTimeUpdate(currentSample);
      } else {
        regularUpdate();
      }
    }

    function realTimeUpdate(samplePoint) {
      setCurrentSample(samplePoint);
      updateCanvas(currentSample);

      var circle = vis.select("svg").selectAll("circle").data(points);

      if (options.circleRadius && sizeType.value > 1) {
        if (!(options.circleRadius <= 4 && sizeType.value < 3)) {
          circle.enter().append("circle")
              .attr("class", circleClasses)
              .attr("cx",    function(d) { return xScale(d.x); })
              .attr("cy",    function(d) { return yScale(d.y); })
              .attr("r", options.circleRadius)
              .style("stroke-width", strokeWidth)
              .style("cursor", circleCursorStyle)
              .on("mousedown.drag",  dataPointDrag)
              .on("touchstart.drag", dataPointDrag);

          circle
              .attr("class", circleClasses)
              .attr("cx",    function(d) { return xScale(d.x); })
              .attr("cy",    function(d) { return yScale(d.y); })
              .attr("r", options.circleRadius)
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
    // Update the slower SVG-based grapher canvas
    //
    // ------------------------------------------------------------

    function regularUpdate() {

      updateBrushElement();

      vis.select("path").attr("d", line(points));

      var circle = vis.select("svg").selectAll("circle")
          .data(points, function(d) { return d; });

      if (options.circleRadius && sizeType.value > 1) {
        if (!(options.circleRadius <= 4 && sizeType.value < 3)) {
          circle.enter().append("circle")
              .attr("class", circleClasses)
              .attr("cx",    function(d) { return xScale(d[0]); })
              .attr("cy",    function(d) { return yScale(d[1]); })
              .attr("r", options.circleRadius * (1 + sizeType.value) / 4)
              .style("stroke-width", strokeWidth)
              .style("cursor", circleCursorStyle)
              .on("mousedown.drag",  dataPointDrag)
              .on("touchstart.drag", dataPointDrag);

          circle
              .attr("class", circleClasses)
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

    // currently unused:

    // function updateSample(currentSample) {
    //   updateCanvas(currentSample);

    //   if (graph.selectablePoints) {
    //     var circle = vis.selectAll("circle")
    //         .data(points, function(d) { return d; });

    //     circle.enter().append("circle")
    //         .attr("class", function(d) { return d === selected ? "selected" : null; })
    //         .attr("cx",    function(d) { return x(d.x); })
    //         .attr("cy",    function(d) { return y(d.y); })
    //         .attr("r", 1.0)
    //         .on("mousedown", function(d) {
    //           selected = dragged = d;
    //           update();
    //         });

    //     circle
    //         .attr("class", function(d) { return d === selected ? "selected" : null; })
    //         .attr("cx",    function(d) { return x(d.x); })
    //         .attr("cy",    function(d) { return y(d.y); });

    //     circle.exit().remove();
    //   }

    //   if (d3.event && d3.event.keyCode) {
    //     d3.event.preventDefault();
    //     d3.event.stopPropagation();
    //   }
    // }

    function plotMousemove() {
      if (options.circlesVisibleOnlyOnHover) {
        var mousePoint = d3.mouse(vis.node()),
            translatedMousePointX = xScale.invert(Math.max(0, Math.min(size.width, mousePoint[0]))),
            p = findClosestPointByX(translatedMousePointX),
            idx, pMin, pMax;
        if (p !== null) {
          // highlight the central point, and also points to the left and right
          idx = points.indexOf(p);
          pMin = idx - (options.extraCirclesVisibleOnHover);
          pMax = idx + (options.extraCirclesVisibleOnHover + 1);
          if (pMin < 0) { pMin = 0; }
          if (pMax > points.length - 1) { pMax = points.length; }
          selectable = points.slice(pMin, pMax);
          update();
        }
      }
    }

    function findClosestPointByX(x) {
      // binary search through points.
      // This assumes points is sorted ascending by x value, which for realTime graphs is true.
      if (points.length === 0) { return null; }
      var min = 0,
          max = points.length - 1,
          mid, diff, p1, p2, p3;
      while (min < max) {
        mid = Math.floor((min + max)/2.0);
        if (points[mid].x < x) {
          min = mid + 1;
        } else {
          max = mid;
        }
      }

      // figure out which point is actually closest.
      // we have to compare 3 points, to account for floating point rounding errors.
      p1 = points[mid - 1];
      p2 = points[mid];
      p3 = points[mid + 1];
      if (typeof(p1) === "object" && Math.abs(p1.x - x) <= Math.abs(p2.x - x)) {
        return p1;
      } else if (typeof(p3) !== "object" || Math.abs(p2.x - x) <= Math.abs(p3.x - x)) {
        return p2;
      } else {
        return p3;
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
        plot.style("cursor", "nesw-resize");
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
      d3.select('body').style("cursor", "move");
      if (d3.event.altKey) {
        plot.style("cursor", "nesw-resize");
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

    function falseFunction() {
      return false;
    }

    function xAxisDrag() {
      document.onselectstart = falseFunction;
      d3.event.preventDefault();
      var p = d3.mouse(vis.node());
      downx = xScale.invert(p[0]);
    }

    function yAxisDrag() {
      d3.event.preventDefault();
      document.onselectstart = falseFunction;
      var p = d3.mouse(vis.node());
      downy = yScale.invert(p[1]);
    }

    function dataPointDrag(d) {
      svg.node().focus();
      d3.event.preventDefault();
      document.onselectstart = falseFunction;
      selected = dragged = d;
      update();
    }

    // ------------------------------------------------------------
    //
    // Mouse handling for Axis scaling and graph canvas translation
    //
    // Attach the mousemove and mouseup to the body
    // in case one wanders off the axis line
    // ------------------------------------------------------------

    function mousemove() {
      var p = d3.mouse(vis.node());
      // t = d3.event.changedTouches;

      document.onselectstart = function() { return true; };
      d3.event.preventDefault();
      if (dragged && options.dataChange) {
        dragged[1] = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
        persistScaleChangesToOptions();
        update();
      }

      if (!isNaN(downx)) {
        d3.select('body').style("cursor", "col-resize");
        plot.style("cursor", "col-resize");
        if (shiftingX) {
          xScale.domain(axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
          persistScaleChangesToOptions();
          redraw();
        } else {
          xScale.domain(axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
          persistScaleChangesToOptions();
          redraw();
        }
        d3.event.stopPropagation();
      }

      if (!isNaN(downy)) {
        d3.select('body').style("cursor", "row-resize");
        plot.style("cursor", "row-resize");
        yScale.domain(axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
        persistScaleChangesToOptions();
        redraw();
        d3.event.stopPropagation();
      }
    }

    function mouseup() {
      d3.select('body').style("cursor", "auto");
      plot.style("cursor", "auto");
      document.onselectstart = function() { return true; };
      if (!isNaN(downx)) {
        redraw();
        downx = NaN;
      }
      if (!isNaN(downy)) {
        redraw();
        downy = NaN;
      }
      dragged = null;
    }

    function showMarker(index) {
      markedPoint = { x: points[index].x, y: points[index].y };
    }

    // ------------------------------------------------------------
    //
    // Update and rescale
    //
    // ------------------------------------------------------------

    // samplePoint is optional argument
    function updateOrRescale(samplePoint) {
      setCurrentSample(samplePoint);
      if (options.realTime) {
        updateOrRescaleRealTime(currentSample);
      } else {
        updateOrRescaleRegular();
      }
    }

    // samplePoint is optional argument
    function updateOrRescaleRealTime(samplePoint) {
      var i,
          domain = xScale.domain(),
          xAxisStart = Math.round(domain[0]/sample),
          xAxisEnd = Math.round(domain[1]/sample),
          start = Math.max(0, xAxisStart),
          xextent = domain[1] - domain[0],
          shiftPoint = xextent * 0.95,
          currentExtent;

      setCurrentSample(samplePoint);
      currentExtent = currentSample * sample;
      if (shiftingX) {
        shiftingX = domainShift();
        if (shiftingX) {
          cancelAxisRescale();
          redraw();
        } else {
          update(currentSample);
        }
      } else {
        if (currentExtent > domain[0] + shiftPoint) {
          domainShift = shiftXDomainRealTime(shiftPoint*0.9, options.axisShift);
          shiftingX = domainShift();
          redraw();
        } else if ( currentExtent < domain[1] - shiftPoint && currentSample < points.length && xAxisStart > 0) {
          domainShift = shiftXDomainRealTime(shiftPoint*0.9, options.axisShift, -1);
          shiftingX = domainShift();
          redraw();
        } else if (currentExtent < domain[0]) {
          domainShift = shiftXDomainRealTime(shiftPoint*0.1, 1, -1);
          shiftingX = domainShift();
          redraw();
        } else {
          update(currentSample);
        }
      }
    }

    function shiftXDomainRealTime(shift, steps, direction) {
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
          persistScaleChangesToOptions();
          return xScale.domain()[0] < (d0 + shift);
        } else {
          xScale.domain([d0 - factor, d1 - factor]);
          persistScaleChangesToOptions();
          return xScale.domain()[0] > (d0 - shift);
        }
      };
    }

    function cancelAxisRescale() {
      if (!isNaN(downx)) {
        downx = NaN;
      }
      if (!isNaN(downy)) {
        downy = NaN;
      }
    }

    function updateOrRescaleRegular() {
      var i,
          domain = xScale.domain(),
          xextent = domain[1] - domain[0],
          shiftPoint = xextent * 0.8;

      if (shiftingX) {
        shiftingX = domainShift();
        if (shiftingX) {
          redraw();
        } else {
          update();
        }
      } else {
        if (points[points.length-1][0] > domain[0] + shiftPoint) {
          domainShift = shiftXDomainRegular(shiftPoint*0.75, options.axisShift);
          shiftingX = domainShift();
          redraw();
        } else {
          update();
        }
      }
    }

    function shiftXDomainRegular(shift, steps) {
      var d0 = xScale.domain()[0],
          d1 = xScale.domain()[1],
          increment = 1/steps,
          index = 0;
      return function() {
        var factor;
        index += increment;
        factor = shift * cubicEase(index);
        xScale.domain([ d0 + factor, d1 + factor]);
        persistScaleChangesToOptions();
        return xScale.domain()[0] < (d0 + shift);
      };
    }

    // ------------------------------------------------------------
    //
    // Graph attribute updaters
    //
    // ------------------------------------------------------------

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

    function addOneXYDataPair(newdata) {
      if (!arguments.length) return points;
      var i;
      if (newdata instanceof Array && newdata.length > 0) {
        if (newdata[0] instanceof Array) {
          for(i = 0; i < newdata.length; i++) {
            points.push(newdata[i]);
          }
        } else {
          if (newdata.length === 2) {
            points.push(newdata);
          } else {
            throw new Error("invalid argument to graph.addData() " + newdata + " length should === 2.");
          }
        }
      }
      updateOrRescale();
      return api;
    }

    //------------------------------------------------------
    //
    // Autoscale
    //
    // ------------------------------------------------------------

    /**
      If there are more than 1 data points, scale the x axis to contain all x values,
      and scale the y axis so that the y values lie in the middle 80% of the visible y range.

      Then nice() the x and y scales (which means that the x and y domains will likely expand
      somewhat).
    */
    function autoscale() {
      var i,
          len,
          point,
          x,
          y,
          xmin = Infinity,
          xmax = -Infinity,
          ymin = Infinity,
          ymax = -Infinity,
          transform,
          pow;

      if (points.length < 2) return;

      for (i = 0, len = points.length; i < len; i++){
        point = points[i];
        x = point.length ? point[0] : point.x;
        y = point.length ? point[1] : point.y;

        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
      }

      // Like Math.pow but returns a value with the same sign as x: pow(-1, 0.5) -> -1
      pow = function(x, exponent) {
        return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
      };

      // convert ymin, ymax to a linear scale, and set 'transform' to the function that
      // converts the new min, max to the relevant scale.
      switch (options.yscale) {
        case 'linear':
          transform = function(x) { return x; };
          break;
        case 'log':
          ymin = Math.log(ymin) / Math.log(10);
          ymax = Math.log(ymax) / Math.log(10);
          transform = function(x) { return Math.pow(10, x); };
          break;
        case 'pow':
          ymin = pow(ymin, options.yscaleExponent);
          ymax = pow(ymax, options.yscaleExponent);
          transform = function(x) { return pow(x, 1/options.yscaleExponent); };
          break;
      }

      xScale.domain([xmin, xmax]).nice();
      yScale.domain([transform(ymin - 0.15*(ymax-ymin)), transform(ymax + 0.15*(ymax-ymin))]).nice();
      persistScaleChangesToOptions();
      redraw();
    }

    // ------------------------------------------------------------
    //
    // Brush Selection
    //
    // ------------------------------------------------------------

    /**
      Set or get the selection domain (i.e., the range of x values that are selected).

      Valid domain specifiers:
        null     no current selection (selection is turned off)
        []       a current selection exists but is empty (has_selection is true)
        [x1, x2] the region between x1 and x2 is selected. Any data points between
                 x1 and x2 (inclusive) would be considered to be selected.

      Default value is null.
    */
    function selectionDomain(a) {

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

      updateBrushElement();

      if (selection_listener) {
        selection_listener(selectionDomain());
      }
      return api;
    }

    /**
      Get whether the graph currently has a selection region. Default value is false.

      If true, it would be valid to filter the data points to return a subset within the selection
      region, although this region may be empty!

      If false the graph is not considered to have a selection region.

      Note that even if has_selection is true, the selection region may not be currently shown,
      and if shown, it may be empty.
    */
    function hasSelection() {
      return has_selection;
    }

    /**
      Set or get the visibility of the selection region. Default value is false.

      Has no effect if the graph does not currently have a selection region
      (selection_domain is null).

      If the selection_enabled property is true, the user will also be able to interact
      with the selection region.
    */
    function selectionVisible(val) {
      if (!arguments.length) {
        return selection_visible;
      }

      // setter
      val = !!val;
      if (selection_visible !== val) {
        selection_visible = val;
        updateBrushElement();
      }
      return api;
    }

    /**
      Set or get whether user manipulation of the selection region should be enabled
      when a selection region exists and is visible. Default value is true.

      Setting the value to true has no effect unless the graph has a selection region
      (selection_domain is non-null) and the region is visible (selection_visible is true).
      However, the selection_enabled setting is honored whenever those properties are
      subsequently updated.

      Setting the value to false does not affect the visibility of the selection region,
      and does not affect the ability to change the region by calling selectionDomain().

      Note that graph panning and zooming are disabled while selection manipulation is enabled.
    */
    function selectionEnabled(val) {
      if (!arguments.length) {
        return selection_enabled;
      }

      // setter
      val = !!val;
      if (selection_enabled !== val) {
        selection_enabled = val;
        updateBrushElement();
      }
      return api;
    }

    /**
      Set or get the listener to be called when the selection_domain changes.

      Both programatic and interactive updates of the selection region result in
      notification of the listener.

      The listener is called with the new selection_domain value in the first argument.
    */
    function selectionListener(cb) {
      if (!arguments.length) {
        return selection_listener;
      }
      // setter
      selection_listener = cb;
      return api;
    }

    function brushListener() {
      var extent;
      if (selection_enabled) {
        // Note there is a brush.empty() method, but it still reports true after the
        // brush extent has been programatically updated.
        extent = brush_control.extent();
        selectionDomain( extent[0] !== extent[1] ? extent : [] );
      }
    }

    function updateBrushElement() {
      if (has_selection && selection_visible) {
        brush_control = brush_control || d3.svg.brush()
          .x(xScale)
          .extent([selection_region.xmin || 0, selection_region.xmax || 0])
          .on("brush", brushListener);

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

    // ------------------------------------------------------------
    //
    // Support for the real-time canvas-based graphing
    //
    // ------------------------------------------------------------

    function _realTimeAddPoint(p) {
      if (points.length === 0) { return; }
      markedPoint = false;
      var index = points.length,
          lengthX = index * sample,
          point = { x: lengthX, y: p };
      points.push(point);
    }

    function addPoint(p) {
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

    function addPoints(pnts) {
      for (var i = 0; i < pointArray.length; i++) {
        points = pointArray[i];
        _realTimeAddPoint(pnts[i]);
      }
      setCurrentSample(points.length-1);
      updateOrRescale();
    }

    function updatePointArray(d) {
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
    }

    function truncateRealTimeData(d) {
      var oldLength = pointArray[0].length;
      updatePointArray(d);
      if (pointArray[0].length === oldLength) {
        return;
      } else {
        shiftingX = false;
        setCurrentSample(points.length);
        updateOrRescale();
      }
    }

    function newRealTimeData(d) {
      updatePointArray(d);
      shiftingX = false;
      setCurrentSample(points.length-1);
      updateOrRescale();
    }

    // function addRealTimePoints(pnts) {
    //   for (var i = 0; i < pointArray.length; i++) {
    //     points = pointArray[i];
    //     setStrokeColor(i);
    //     add_canvas_point(pnts[i]);
    //   }
    // }

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

    function clearCanvas() {
      gcanvas.width = gcanvas.width;
      gctx.fillStyle = canvasFillStyle;
      gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
      gctx.strokeStyle = "rgba(255,65,0, 1.0)";
    }

    function showCanvas() {
      vis.select("path.line").remove();
      gcanvas.style.zIndex = 1;
    }

    function hideCanvas() {
      gcanvas.style.zIndex = -1;
      update();
    }

    // update real-time canvas line graph
    function updateCanvas(samplePoint) {
      var i, index, py, pointStop,
          yOrigin = yScale(0.00001),
          lines = options.lines,
          bars = options.bars,
          twopi = 2 * Math.PI,
          pointsLength = pointArray[0].length,
          numberOfLines = pointArray.length,
          xAxisStart = Math.round(xScale.domain()[0]/sample),
          // xAxisEnd = Math.round(xScale.domain()[1]/sample),
          start = Math.max(0, xAxisStart),
          lengthX,
          px;


      setCurrentSample(samplePoint);
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
      gcanvas.style.zIndex = -1;
      setupCanvasProperties(gcanvas);
    }

    function resizeCanvas() {
      setupCanvasProperties(gcanvas);
      updateCanvas();
    }

    function setupCanvasProperties(canvas) {
      cplot.rect = plot.node();
      cplot.width = cplot.rect.width.baseVal.value;
      cplot.height = cplot.rect.height.baseVal.value;
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
      // canvas.style.border = 'solid 1px red';
      canvas.style.pointerEvents = "none";
      if (canvas.className.search("overlay") < 0) {
         canvas.className += " overlay";
      }
      gctx = gcanvas.getContext( '2d' );
      gctx.globalCompositeOperation = "source-over";
      gctx.lineWidth = 1;
      gctx.fillStyle = canvasFillStyle;
      gctx.fillRect(0, 0, canvas.width, gcanvas.height);
      gctx.strokeStyle = "rgba(255,65,0, 1.0)";
    }

    // ------------------------------------------------------------
    //
    // Keyboard Handling
    //
    // ------------------------------------------------------------

    function registerKeyboardHandler() {
      svg.node().addEventListener("keydown", function (evt) {
        if (!selected) return false;
        if (evt.type == "keydown") {
          switch (evt.keyCode) {
            case 8:   // backspace
            case 46:  // delete
            if (options.dataChange) {
              var i = points.indexOf(selected);
              points.splice(i, 1);
              selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
              update();
            }
            evt.preventDefault();
            evt.stopPropagation();
            break;
          }
          evt.preventDefault();
        }
      });
    }

    // ------------------------------------------------------------
    //
    // Main API functions ...
    //
    // ------------------------------------------------------------

    function renderGraph() {
      calculateLayout();
      if (svg === undefined) {
        renderNewGraph();
      } else {
        repaintExistingGraph();
      }
      if (options.showButtons) {
        if (!buttonLayer) createButtonLayer();
        resizeButtonLayer();
      }
      redraw();
    }

    function reset(idOrElement, options, message) {
      if (arguments.length) {
        initialize(idOrElement, options, message);
      } else {
        initialize();
      }
      renderGraph();
      // and then render again using actual size of SVG text elements are
      renderGraph();
      registerKeyboardHandler();
      return api;
    }

    function resize(w, h) {
      scale(w, h);
      initializeLayout();
      renderGraph();
      return api;
    }

    //
    // Initialize
    //
    function initialize(idOrElement, opts, mesg) {
      if (opts || !options) {
        options = setupOptions(opts);
      }

      initializeLayout(idOrElement, mesg);

      options.xrange = options.xmax - options.xmin;
      options.yrange = options.ymax - options.ymin;

      if (Object.prototype.toString.call(options.title) === "[object Array]") {
        titles = options.title;
      } else {
        titles = [options.title];
      }
      titles.reverse();

      fx = d3.format(options.xFormatter);
      fy = d3.format(options.yFormatter);

      // use local variable for access speed in addPoint()
      sample = options.sample;

      strokeWidth = options.strokeWidth;

      points = options.points;
      if (points === "fake") {
        points = fakeDataPoints();
      }

      // In realTime mode the grapher expects either an array or arrays of dependent data.
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
      setCurrentSample(points.length-1);
    }

    //
    // Public API to instantiated Graph
    //
    api = {
      update:               update,
      repaint:              renderGraph,
      reset:                reset,
      redraw:               redraw,
      resize:               resize,
      notify:               notify,

      // selection brush api
      selectionDomain:      selectionDomain,
      selectionVisible:     selectionVisible,
      selectionListener:    selectionListener,
      selectionEnabled:     selectionEnabled,
      hasSelection:         hasSelection,

      /**
        Read only getter for the d3 selection referencing the DOM elements containing the d3
        brush used to implement selection region manipulation.
      */
      brushElement: function() {
        return brush_element;
      },

      /**
        Read-only getter for the d3 brush control (d3.svg.brush() function) used to implement
        selection region manipulation.
      */
      brushControl: function() {
        return brush_control;
      },

      /**
        Read-only getter for the internal listener to the d3 'brush' event.
      */
      brushListener: function() {
        return brushListener;
      },

      // specific update functions ???
      scale:                scale,
      updateOrRescale:      updateOrRescale,

      xDomain: function(_) {
        if (!arguments.length) return xScale.domain();
        xScale.domain(_);
        if (updateXScale) {
          updateXScale();
          redraw();
        }
        return api;
      },

      yDomain: function(_) {
        if (!arguments.length) return yScale.domain();
        yScale.domain(_);
        if (updateYScale) {
          updateYScale();
          redraw();
        }
        return api;
      },

      xmin: function(_) {
        if (!arguments.length) return options.xmin;
        options.xmin = _;
        options.xrange = options.xmax - options.xmin;
        if (updateXScale) {
          updateXScale();
          redraw();
        }
        return api;
      },

      xmax: function(_) {
        if (!arguments.length) return options.xmax;
        options.xmax = _;
        options.xrange = options.xmax - options.xmin;
        if (updateXScale) {
          updateXScale();
          redraw();
        }
        return api;
      },

      ymin: function(_) {
        if (!arguments.length) return options.ymin;
        options.ymin = _;
        options.yrange = options.ymax - options.ymin;
        if (updateYScale) {
          updateYScale();
          redraw();
        }
        return api;
      },

      ymax: function(_) {
        if (!arguments.length) return options.ymax;
        options.ymax = _;
        options.yrange = options.ymax - options.ymin;
        if (updateYScale) {
          updateYScale();
          redraw();
        }
        return api;
      },

      xLabel: function(_) {
        if (!arguments.length) return options.xlabel;
        options.xlabel = _;
        updateXlabel();
        return api;
      },

      yLabel: function(_) {
        if (!arguments.length) return options.ylabel;
        options.ylabel = _;
        updateYlabel();
        return api;
      },

      title: function(_) {
        if (!arguments.length) return options.title;
        options.title = _;
        updateTitle();
        return api;
      },

      width: function(_) {
        if (!arguments.length) return size.width;
        size.width = _;
        return api;
      },

      height: function(_) {
        if (!arguments.length) return size.height;
        size.height = _;
        return api;
      },

      elem: function(_) {
        if (!arguments.length) return elem;
        elem = d3.select(_);
        graph(elem);
        return api;
      },

      // Adding or truncating real-time data
      // Real-time data consists of an array (or an array or arrays) of samples.
      // The interval between samples is assumed to have already been set
      // by specifying options.sample when creating the graph.
      newRealTimeData:      newRealTimeData,
      truncateRealTimeData: truncateRealTimeData,
      addPoint:             addPoint,
      addPoints:            addPoints,

      // Adding a single X,Y data pair
      addOneXYDataPair:     addOneXYDataPair,

      //
      numberOfPoints:       numberOfPoints,

      data: function(_) {
        if (!arguments.length) return points;
        var domain = xScale.domain();
        options.points = points = _;
        if (points.length > domain[1]) {
          domain[0] += shift;
          domain[1] += shift;
          xScale.domain(domain);
          redraw();
        } else {
          update();
        }
        return api;
      },

      // unimplemented feature
      showMarker:           showMarker

    };

    // Initialization.
    initialize(idOrElement, options, message);

    if (node) {
      renderGraph();
      // Render again using actual size of SVG text elements.
      renderGraph();
    }

    return api;

  };
});
