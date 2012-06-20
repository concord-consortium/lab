/*globals $ d3 Lab */
/*jshint eqnull: true*/
// ------------------------------------------------------------
//
//   Molecules View
//
// ------------------------------------------------------------

Lab.moleculesView = function(e, model, options) {
  var elem,
      node,
      cx,
      cy,
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
      element_gradient_array,
      atom_tooltip_on,
      offset_left, offset_top,
      particle, label, labelEnter,
      molecule_div, molecule_div_pre,
      atoms,
      nodes,
      default_options = {
        playback_controller:  false,
        play_only_controller: false,
        model_time_label:     false,
        grid_lines:           false,
        xunits:               false,
        yunits:               false,
        atom_mubers:          false,
        xmin:                 0,
        xmax:                 model.size()[0],
        ymin:                 0,
        ymax:                 model.size()[1]
      },

      model_player;

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
  nodes = model.get_nodes();

  // a 'fake' array for d3 methods to iterate over
  (atoms=[]).length = model.get_num_atoms();

  // An object that controls this model
  model_player = options.model_player;

  tx = function(d, i) { return "translate(" + x(d) + ",0)"; };
  ty = function(d, i) { return "translate(0," + y(d) + ")"; };
  stroke = function(d, i) { return d ? "#ccc" : "#666"; };

  function scale() {
    var modelSize = model.size(),
        modelAspectRatio =  modelSize[0] / modelSize[1],
        modelPixelWidth,
        modelPixelHeight;

    // calculate padding for items inside the svg element

    padding = {
      top:    0,
      right:  25,
      bottom: 0,
      left:   0
    };

    if (options.model_time_label) {
      padding.bottom += 35;
    } else if (options.xunits) {
      padding.bottom += 16;
    }

    // TODO: ?
    if (options.playback_controller || options.play_only_controller) {
      padding.bottom += 40;
    }

    if (options.yunits) {
      padding.top += 8;
      padding.left += 25;
    }

    // always scale to 500px width and let viewBox handle the rest
    cx = 500;
    modelPixelWidth = cx - padding.left - padding.right;
    modelPixelHeight = modelPixelWidth / modelAspectRatio;
    cy = padding.top + padding.bottom + modelPixelHeight;

    size = {
      width:  modelPixelWidth,
      height: modelPixelHeight
    };

    offset_left = node.offsetLeft + padding.left;
    offset_top = node.offsetTop + padding.top;
    if (options.playback_controller) {
      pc_xpos = padding.left + (size.width - 230)/2;
    }
    if (options.play_only_controller) {
      pc_xpos = padding.left + (size.width - 140)/2;
    }
    pc_ypos = cy - 42;
    mw = size.width;
    mh = size.height;

    // x-scale
    x = d3.scale.linear()
        .domain([options.xmin, options.xmax])
        .range([0, mw]);

    // drag x-axis logic
    downscalex = x.copy();
    downx = NaN;

    // y-scale (inverted domain)
    y = d3.scale.linear()
        .domain([options.ymax, options.ymin])
        .nice()
        .range([0, mh])
        .nice();

    // drag x-axis logic
    downscaley = y.copy();
    downy = NaN;
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

    if (!node) {
      elem = d3.select(e)
        .append('div').attr('class', 'positioning-container')
        .append('div').attr('class', 'molecules-view-aspect-container')
        .append('div').attr('class', 'molecules-view-svg-container');

      node = elem.node();
    }

    scale();

    if (vis === undefined) {
      d3.select(e + ' .molecules-view-aspect-container')
        .attr('style', 'padding-top: ' + Math.round(cy/cx * 100) + '%');

      vis1 = d3.select(node).append("svg")
        .attr('viewBox', '0 0 ' + cx + ' ' + cy)
        .attr('preserveAspectRatio', 'xMinYMin meet');

      vis = vis1.append("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
        .attr("class", "plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

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
        playback_component = new Lab.PlaybackComponentSVG(vis1, model_player, pc_xpos, pc_ypos, 1);
      }
      if (options.play_only_controller) {
        playback_component = new Lab.PlayOnlyComponentSVG(vis1, model_player, pc_xpos, pc_ypos, 1);
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
        playback_component.position(pc_xpos, pc_ypos, 1);
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
      var gradient = gradient_container.append("defs")
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
      var element, grad;

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
      nodes = model.get_nodes();
      (atoms=[]).length = model.get_num_atoms();

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

    function molecule_mouseout() {
      if (typeof(atom_tooltip_on) !== "number") {
        molecule_div.style("opacity", 1e-6);
      }
    }

    function update_molecule_positions() {

      nodes = model.get_nodes();
      (atoms = []).length = model.get_num_atoms();

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

  if (e) {
    container();
    container.setup_particles();
    model.setModelListener(function () {
      container.update_molecule_positions();
    });
  }

  return container;
};

