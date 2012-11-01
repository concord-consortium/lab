/*globals define, d3 */

define(function (require) {
  // Dependencies.
  var axis                    = require('grapher/core/axis'),
      registerKeyboardHandler = require('grapher/core/register-keyboard-handler'),
      layout                  = require('common/layout/layout');

  return function Graph(elem, options, message) {
    var cx = 600, cy = 300,
        node;

    if (arguments.length) {
      elem = d3.select(elem);
      node = elem.node();
      cx = elem.property("clientWidth");
      cy = elem.property("clientHeight");
    }

    var svg, vis, plot, viewbox,
        title, xlabel, ylabel,
        points,
        notification,
        margin, padding, size,
        xScale, yScale, xValue, yValue, line,
        shiftingX = false,
        cubicEase = d3.ease('cubic'),
        ds,
        stroke, tx, ty, fx, fy,
        circleCursorStyle,
        displayProperties,
        emsize, strokeWidth,
        sizeType = {
          category: "medium",
          value: 3,
          icon: 120,
          tiny: 240,
          small: 480,
          medium: 960,
          large: 1920
        },
        downx, downy, dragged, selected,
        titles = [],
        default_options = {
          "title":          "Graph",
          "xlabel":         "X Axis",
          "ylabel":         "Y Axis",
          "xscale":         "linear",
          "yscale":         "linear",
          "xTicCount":       10,
          "yTicCount":        8,
          "xFormatter":     "3.3r",
          "yFormatter":     "3.3r",
          "xscaleExponent": 0.5,
          "yscaleExponent": 0.5,
          "axisShift":       10,
          "xmax":            60,
          "xmin":             0,
          "ymax":            40,
          "ymin":             0,
          "circleRadius":    10.0,
          "strokeWidth":      2.0,
          "dataChange":      true,
          "addData":         true,
          "points":          false,
          "notification":    false
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
         "left":   60
        };
        break;

        case 3:
        padding = {
         "top":    options.title  ? 30 : 20,
         "right":                   30,
         "bottom": options.xlabel ? 60 : 10,
         "left":   options.ylabel ? 90 : 60
        };
        break;

        default:
        padding = {
         "top":    options.title  ? 40 : 20,
         "right":                   30,
         "bottom": options.xlabel ? 60 : 10,
         "left":   options.ylabel ? 90 : 60
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

      xScale = d3.scale[options.xscale]()
        .domain([options.xmin, options.xmax])
        .range([0, size.width]);

      if (options.xscale === "pow") {
        xScale.exponent(options.xscaleExponent);
      }

      yScale = d3.scale[options.yscale]()
        .domain([options.ymin, options.ymax])
        .range([size.height, 0]);

      if (options.yscale === "pow") {
        yScale.exponent(options.yscaleExponent);
      }

      tx = function(d) {
        return "translate(" + xScale(d) + ",0)";
      };

      ty = function(d) {
        return "translate(0," + yScale(d) + ")";
      };

      stroke = function(d) {
        return d ? "#ccc" : "#666";
      };

      fx = d3.format(options.xFormatter);
      fy = d3.format(options.yFormatter);

      line = d3.svg.line()
          .x(function(d, i) { return xScale(points[i][0]); })
          .y(function(d, i) { return yScale(points[i][1]); });

      // drag axis logic
      downx = NaN;
      downy = NaN;
      dragged = selected = null;
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

        points = options.points;
        if (points === "fake") {
          points = fakeDataPoints();
        }

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
              .attr("viewBox", "0 0 "+size.width+" "+size.height);

              // I *assume* this class is superflous -- RPK 7/29/2012
              //.attr("class", "line");

          viewbox.append("path")
              .attr("class", "line")
              .style("stroke-width", strokeWidth)
              .attr("d", line(points));

          brush_element = viewbox.append("g")
                .attr("class", "brush");

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
                .attr("transform","translate(" + -50 + " " + size.height/2+") rotate(-90)");
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
        message = mesg;
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

      // unused as of commit ef91f20b5abab1f063dc093d41e9dbd4712931f4
      // (7/27/2012):

      // // update the layout
      // function updateLayout() {
      //   padding = {
      //    "top":    options.title  ? 40 : 20,
      //    "right":                 30,
      //    "bottom": options.xlabel ? 60 : 10,
      //    "left":   options.ylabel ? 70 : 45
      //   };

      //   size.width  = cx - padding.left - padding.right;
      //   size.height = cy - padding.top  - padding.bottom;

      //   plot.attr("width", size.width)
      //       .attr("height", size.height);
      // }

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

        // Regenerate x-ticks…
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
        var p;
        d3.event.preventDefault();
        registerKeyboardHandler(keydown);
        d3.select('body').style("cursor", "move");
        if (d3.event.altKey) {
          if (d3.event.shiftKey && options.addData) {
            p = d3.svg.mouse(vis.node());
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
            p = d3.svg.mouse(vis[0][0]);
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
        registerKeyboardHandler(keydown);
        document.onselectstart = function() { return false; };
        selected = dragged = d;
        update();
      }

      function mousemove() {
        var p = d3.svg.mouse(vis[0][0]);

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
        document.onselectstart = function() { return true; };
        d3.select('body').style("cursor", "auto");
        if (!isNaN(downx)) {
          downx = NaN;
          redraw();
        }
        if (!isNaN(downy)) {
          downy = NaN;
          redraw();
        }
        dragged = null;
      }

      function updateOrRescale() {
        var i,
            domain = xScale.domain(),
            xextent = domain[1] - domain[0],
            shiftPoint = xextent * 0.8;

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

      function shiftXDomain(shift, steps) {
        var d0 = xScale.domain()[0],
            d1 = xScale.domain()[1],
            increment = 1/steps,
            index = 0;
        return function() {
          var factor;
          index += increment;
          factor = shift * cubicEase(index);
          xScale.domain([ d0 + factor, d1 + factor]);
          return xScale.domain()[0] < (d0 + shift);
        };
      }

      // make these private variables and functions available
      graph.elem = elem;
      graph.redraw = redraw;
      graph.update = update;
      graph.notify = notify;
      graph.points = points;
      graph.initialize = initialize;
      graph.updateXScale = updateXScale;
      graph.updateYScale = updateYScale;
      graph.scale = scale;
      graph.updateOrRescale = updateOrRescale;

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

    // unused as of commit ef91f20b5abab1f063dc093d41e9dbd4712931f4
    // (7/27/2012)

    // // The x-accessor for the path generator
    // function X(d) {
    //   return xScale(d[0]);
    // }

    // // The y-accessor for the path generator
    // function Y(d) {
    //   return yScale(d[1]);
    // }

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
      graph.updateOrRescale();
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
});
