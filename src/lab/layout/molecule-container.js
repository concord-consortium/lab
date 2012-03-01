// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

var moleculecontainer = document.getElementById("molecule-container");

var mc_cx, mc_cy, mc_padding, mc_size,
    mc_mw, mc_mh, mc_tx, mc_ty, mc_stroke,
    mc_x, mc_downscalex, mc_downx,
    mc_y, mc_downscaley, mc_downy,
    mc_dragged,
    mc_vis1, playback_component,
    mc_vis, mc_plot, mc_time_label,
    pc_xpos, pc_ypos,
    model_time_formatter = d3.format("5.3f"),
    ns_string_prefix = "time: ",
    ns_string_suffix = " (ns)";

function modelTimeLabel() {
  return ns_string_prefix + model_time_formatter(model.stepCounter() * sample_time) + ns_string_suffix;
}

function get_x(i) {
  return nodes[model.X][i];
}

function get_y(i) {
  return nodes[model.Y][i];
}

function get_radius(i) {
  return nodes[model.RADIUS][i];
}

function get_charge(i) {
  return nodes[model.CHARGE][i];
}

layout.finishSetupMoleculeContainer = function() {
  mc_graph.grid_lines = (mc_graph.grid_lines == undefined) | mc_graph.grid_lines;
  mc_graph.xunits = (mc_graph.xunits == undefined) | mc_graph.xunits;
  mc_graph.yunits = (mc_graph.yunits == undefined) | mc_graph.yunits;
  mc_graph.model_time_label = (mc_graph.model_time_label == undefined) | mc_graph.model_time_label;

  mc_graph.atom_mubers = (mc_graph.atom_mubers == undefined) | mc_graph.atom_mubers;

  mc_graph.playback_controller = (mc_graph.playback_controller == undefined) | mc_graph.playback_controller;

  mc_cx = moleculecontainer.clientWidth,
  mc_cy = moleculecontainer.clientHeight,
  mc_padding = {
     "top":    mc_graph.title  ? 36 : 20,
     "right":                    30,
     "bottom": mc_graph.xlabel ? 46 : 20,
     "left":   mc_graph.ylabel ? 60 : 45
  };
  if (mc_graph.playback_controller) { mc_padding.bottom += 35 }
  mc_size = {
    "width":  mc_cx - mc_padding.left - mc_padding.right,
    "height": mc_cy - mc_padding.top  - mc_padding.bottom
  },
  pc_xpos = mc_size.width / 2 - 50,
  pc_ypos = mc_size.height + (mc_graph.ylabel ? 75 : 30),
  mc_mw = mc_size.width,
  mc_mh = mc_size.height,
  mc_tx = function(d, i) { return "translate(" + mc_x(d) + ",0)"; },
  mc_ty = function(d, i) { return "translate(0," + mc_y(d) + ")"; },
  mc_stroke = function(d, i) { return d ? "#ccc" : "#666"; }
  // mc_x-scale
  mc_x = d3.scale.linear()
      .domain([mc_graph.xmin, mc_graph.xmax])
      .range([0, mc_mw]),

  // drag x-axis logic
  mc_downscalex = mc_x.copy(),
  mc_downx = Math.NaN,

  // mc_y-scale (inverted domain)
  mc_y = d3.scale.linear()
      .domain([mc_graph.ymax, mc_graph.ymin])
      .nice()
      .range([0, mc_mh])
      .nice(),

  // drag mc_x-axis logic
  mc_downscaley = mc_y.copy(),
  mc_downy = Math.NaN,
  mc_dragged = null;

  if (undefined !== mc_vis) {
    d3.select(moleculecontainer).select("svg")
        .attr("width", mc_cx)
        .attr("height", mc_cy);

    mc_vis.select("svg")
        .attr("width", mc_cx)
        .attr("height", mc_cy);

    mc_vis.select("rect.mc_plot")
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .style("fill", "#EEEEEE");

    mc_vis.select("svg.mc_container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .attr("viewBox", "0 0 "+mc_size.width+" "+mc_size.height);

    if (mc_graph.title) {
      mc_vis.select("text.title")
          .attr("x", mc_size.width/2)
          .attr("dy","-1em");
    }

    if (mc_graph.xlabel) {
      mc_vis.select("text.xlabel")
          .attr("x", mc_size.width/2)
          .attr("y", mc_size.height);
    }

    if (mc_graph.ylabel) {
      mc_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + mc_size.height/2+") rotate(-90)");
    }

    if (mc_graph.model_time_label) {
      mc_time_label.text(modelTimeLabel())
          .attr("x", mc_size.width - 100)
          .attr("y", mc_size.height)
    }

    mc_vis.selectAll("g.x").remove();
    mc_vis.selectAll("g.y").remove();

    layout.update_molecule_radius();

    particle.attr("cx", function(d, i) { return mc_x(get_x(i)); })
            .attr("cy", function(d, i) { return mc_y(get_y(i)); })
            .attr("r",  function(d, i) { return mc_x(get_radius(i)) });

    label.attr("transform", function(d, i) {
      return "translate(" + mc_x(get_x(i)) + "," + mc_y(get_y(i)) + ")";
    });

    if (mc_graph.playback_controller) {
      playback_component.position(pc_xpos, pc_ypos);
    }

  } else {
    mc_vis1 = d3.select(moleculecontainer).append("svg:svg")
      .attr("width", mc_cx)
      .attr("height", mc_cy);

    mc_vis = mc_vis1.append("svg:g")
        .attr("transform", "translate(" + mc_padding.left + "," + mc_padding.top + ")");

    mc_plot = mc_vis.append("svg:rect")
      .attr("class", "mc_plot")
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .style("fill", "#EEEEEE");

    layout.mc_container = mc_vis.append("svg:svg")
      .attr("class", "mc_container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", mc_size.width)
      .attr("height", mc_size.height)
      .attr("viewBox", "0 0 "+mc_size.width+" "+mc_size.height);

    // add Chart Title
    if (mc_graph.title) {
      mc_vis.append("svg:text")
          .attr("class", "title")
          .text(mc_graph.title)
          .attr("x", mc_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (mc_graph.xlabel) {
      mc_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(mc_graph.xlabel)
          .attr("x", mc_size.width/2)
          .attr("y", mc_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (mc_graph.ylabel) {
      mc_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text(mc_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + mc_size.height/2+") rotate(-90)");
    }

    // add model time display
    if (mc_graph.model_time_label) {
      mc_time_label = mc_vis.append("svg:text")
          .attr("class", "model_time_label")
          .text(modelTimeLabel())
          .attr("x", mc_size.width - 100)
          .attr("y", mc_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","left");
    }
    if (mc_graph.playback_controller) {
      playback_component = new PlaybackComponentSVG(mc_vis1, model_player, pc_xpos, pc_ypos);
    }
  }

  layout.mc_redraw()
};

layout.mc_redraw = function() {
  if (d3.event && d3.event.transform && isNaN(mc_downx) && isNaN(mc_downy)) {
      d3.event.transform(x, y);
  };

  var mc_fx = mc_x.tickFormat(10),
      mc_fy = mc_y.tickFormat(10);

  if (mc_graph.xunits) {
    // Regenerate x-ticks…
    var mc_gx = mc_vis.selectAll("g.x")
        .data(mc_x.ticks(10), String)
        .attr("transform", mc_tx);

    mc_gx.select("text")
        .text(mc_fx);

    var mc_gxe = mc_gx.enter().insert("svg:g", "a")
        .attr("class", "x")
        .attr("transform", mc_tx);

    if (mc_graph.grid_lines) {
      mc_gxe.append("svg:line")
          .attr("stroke", mc_stroke)
          .attr("y1", 0)
          .attr("y2", mc_size.height);
    }

    mc_gxe.append("svg:text")
        .attr("y", mc_size.height)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .text(mc_fx);

    mc_gx.exit().remove();
  }

  if (mc_graph.xunits) {
    // Regenerate y-ticks…
    var mc_gy = mc_vis.selectAll("g.y")
        .data(mc_y.ticks(10), String)
        .attr("transform", mc_ty);

    mc_gy.select("text")
        .text(mc_fy);

    var mc_gye = mc_gy.enter().insert("svg:g", "a")
        .attr("class", "y")
        .attr("transform", mc_ty)
        .attr("background-fill", "#FFEEB6");

    if (mc_graph.grid_lines) {
      mc_gye.append("svg:line")
          .attr("stroke", mc_stroke)
          .attr("x1", 0)
          .attr("x2", mc_size.width);
    }

    mc_gye.append("svg:text")
        .attr("x", -3)
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .text(mc_fy);

    // update model time display
    if (mc_graph.model_time_label) {
      mc_time_label.text(modelTimeLabel());
    }

    mc_gy.exit().remove();
  }
}

layout.update_molecule_radius = function() {
  var ljf = molecules_lennard_jones.coefficients();
  var r = ljf.rmin * mol_rmin_radius_factor;
  model.set_radius(r);
  layout.mc_container.selectAll("circle")
      .data(atoms)
    .attr("r",  function(d, i) { return mc_x(get_radius(i)) });
  layout.mc_container.selectAll("text")
    .attr("font-size", mc_x(r * 1.3) );
}

var particle, label, labelEnter, tail;

var molecule_div = d3.select("#viz").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

var molecule_div_pre = molecule_div.append("pre")

layout.setup_particles = function() {
  var ljf = molecules_lennard_jones.coefficients();
  var r = ljf.rmin * mol_rmin_radius_factor;
  model.set_radius(r);

  layout.mc_container.selectAll("circle").remove();
  layout.mc_container.selectAll("g").remove();

  var font_size = mc_x(ljf.rmin * mol_rmin_radius_factor * 1.3);
  if (mol_number > 100) { font_size *= 0.9 };

  label = layout.mc_container.selectAll("g.label")
        .data(atoms);

  labelEnter = label.enter().append("svg:g")
      .attr("class", "label")
      .attr("transform", function(d, i) {
        return "translate(" + mc_x(get_x(i)) + "," + mc_y(get_y(i)) + ")";
      });

  if (mc_graph.atom_mubers) {
    labelEnter.append("svg:text")
        .attr("class", "index")
        .attr("font-size", font_size)
        .attr("x", 0)
        .attr("y", "0.31em")
        .text(function(d) { return d.index; })
  } else {
    labelEnter.append("svg:text")
        .attr("class", "index")
        .attr("font-size", font_size * 1.5)
        .attr("x", 0)
        .attr("y", "0.31em")
        .text(function(d, i) {
          if (layout.coulomb_forces_checkbox.checked) {
            return (mc_x(get_charge(i)) > 0) ? "+" : "-"
          } else {
            return ""
          }
        })
  }

  particle = layout.mc_container.selectAll("circle").data(atoms);

  particle.enter().append("svg:circle")
      .attr("r",  function(d, i) { return mc_x(get_radius(i)); })
      .attr("cx", function(d, i) { return mc_x(get_x(i)); })
      .attr("cy", function(d, i) { return mc_y(get_y(i)); })
      .style("fill", function(d, i) {
        if (layout.coulomb_forces_checkbox.checked) {
          return (mc_x(get_charge(i)) > 0) ? "#5A63DB" : "#a02c2c"
        } else {
          return "#2ca02c"
        }
      })
      .on("mousedown", molecule_mousedown)
      .on("mouseout", molecule_mouseout);
}

function molecule_mouseover(d) {
  // molecule_div.transition()
  //       .duration(250)
  //       .style("opacity", 1);
}

function molecule_mousedown(d) {
  molecule_div
        .style("opacity", 1)
        .style("left", (d3.event.pageX + 6) + "px")
        .style("top", (d3.event.pageY - 30) + "px")
        .transition().duration(250);

  molecule_div_pre.text(
      "speed: " + d3.format("6.3f")(d.speed) + "\n" +
      "vx:    " + d3.format("6.3f")(d.vx)    + "\n" +
      "vy:    " + d3.format("6.3f")(d.vy)    + "\n"
    )
}

function molecule_mousemove(d) {
}

function molecule_mouseout() {
  molecule_div.style("opacity", 1e-6);
}

layout.update_molecule_positions = function() {

  // update model time display
  if (mc_graph.model_time_label) {
    mc_time_label.text(modelTimeLabel());
  }

  label = layout.mc_container.selectAll("g.label").data(atoms);

  label.attr("transform", function(d, i) {
      return "translate(" + mc_x(get_x(i)) + "," + mc_y(get_y(i)) + ")";
    });

  particle = layout.mc_container.selectAll("circle").data(atoms);

  particle.attr("cx", function(d, i) {
            return mc_x(nodes[model.X][i]); })
          .attr("cy", function(d, i) {
            return mc_y(nodes[model.Y][i]); })
          .attr("r",  function(d, i) {
            return mc_x(nodes[model.RADIUS][i]) });
}
