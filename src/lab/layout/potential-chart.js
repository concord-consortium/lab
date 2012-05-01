// ------------------------------------------------------------
//
//   Lennard-Jones Potential Chart
//
// ------------------------------------------------------------

layout.potentialChart = function(e, data, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      padding, size,
      mw, mh, tx, ty, stroke,
      xScale, downscalex, downx,
      yScale, downscaley, downy,
      dragged, coefficient_dragged,
      vis, plot,
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

  scale(cx, cy);

  tx = function(d, i) { return "translate(" + xScale(d) + ",0)"; };
  ty = function(d, i) { return "translate(0," + yScale(d) + ")"; };
  stroke = function(d, i) { return d ? "#ccc" : "#666"; };

  // x-scale
  xScale = d3.scale.linear()
    .domain([lj_data.xmin, lj_data.xmax])
    .range([0, mw]);

  // drag x-axis logic
  downx = Math.NaN;

  // y-scale (inverted domain)
  yScale = d3.scale.linear()
      .domain([lj_data.ymax, lj_data.ymin])
      .nice()
      .range([0, mh])
      .nice();

  line = d3.svg.line()
      .x(function(d, i) { return xScale(lennard_jones_potential[i][0]); })
      .y(function(d, i) { return yScale(lennard_jones_potential[i][1]); });

  // drag x-axis logic
  downy = Math.NaN;
  dragged = null;
  selected = data.variables[0];

  // drag coefficients logic
  coefficient_dragged = false;
  coefficient_selected = data.variables[0];

  function scale() {
    // cx = elem.property("clientWidth");
    // cy = elem.property("clientHeight");
    // node.style.width = cx +"px";
    // node.style.height = cy +"px";
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

  }

  function container() {
    scale();
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
        .attr("pointer-events", "all")
        .call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 8]).on("zoom", redraw));

      vis.append("svg")
        .attr("class", "linebox")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height)
        .append("path")
            .attr("class", "line")
            .attr("d", line(lennard_jones_potential));

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

      redraw();
    }

    function redraw() {
      if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
          d3.event.transform(x, y);
      }

      var fx = xScale.tickFormat(10),
          fy = yScale.tickFormat(10);

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
         .attr("y", size.height)
         .attr("dy", "1em")
         .attr("text-anchor", "middle")
         .style("cursor", "ew-resize")
         .text(fx)
         .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
         .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
         .on("mousedown", function(d) {
              var p = d3.svg.mouse(vis[0][0]);
              downx = x.invert(p[0]);
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
               downy = y.invert(p[1]);
               // d3.behavior.zoom().off("zoom", redraw);
          });

      gy.exit().remove();
      update();
    }

    // ------------------------------------------------------------
    //
    // Draw the Lennard-Jones function
    //
    // ------------------------------------------------------------

    function update() {
      var epsilon_circle = vis.selectAll("circle")
          .data(data.variables, function(d) { return d; });

      var lines = vis.select("path").attr("d", line(lennard_jones_potential)),
          x_extent = xScale.domain()[1] - xScale.domain()[0];

      epsilon_circle.enter().append("circle")
          .attr("class", function(d) { return d === coefficient_dragged ? "selected" : null; })
          .attr("cx",    function(d) { return xScale(d.x); })
          .attr("cy",    function(d) { return yScale(d.y); })
          .attr("r", 8.0)
          .on("mousedown", function(d) {
            if (d.coefficient == "epsilon") {
              d.x = data.coefficients.rmin;
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

    function mousemove() {
      if (!coefficient_dragged) return;
      node.onselectstart = function(){ return false; };
      var m = d3.svg.mouse(vis.node()),
        newx, newy;
      if (coefficient_dragged.coefficient == "epsilon") {
        newx = data.coefficients.rmin;
        newy = y.invert(Math.max(0, Math.min(size.height, m[1])));
        if (newy > options.epsilon_max) { newy = options.epsilon_max; }
        if (newy < options.epsilon_min) { newy = options.epsilon_min; }
        options.epsilon_callback(newy);
      } else {
        newy = 0;
        newx = x.invert(Math.max(0, Math.min(size.width, m[0])));
        if (newx < sigma_min) { newx = sigma_min; }
        if (newx > sigma_max) { newx = sigma_max; }
        update_sigma(newx);
      }
      // layout.update_molecule_radius();
      // model.resolve_collisions(molecules);
      // model.tick();
      coefficient_dragged.x = newx;
      coefficient_dragged.y = newy;
      update();
    }

    function mouseup() {
      if (!isNaN(downx)) {
        mode.onselectstart = function(){ return true; };
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

    // make these private variables and functions available
    container.node = node;
    container.scale = scale;
  }

  container.resize = function(width, height) {
    // container.scale(width, height);
    container.scale();
    container();
  };

 if (node) { container(); }

  return container;
};
