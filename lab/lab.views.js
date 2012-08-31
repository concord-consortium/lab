(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

// ------------------------------------------------------------
//
//   View Components
//
// ------------------------------------------------------------

views = { version: "0.0.1" };
// ------------------------------------------------------------
//
//   Applet Container
//
// ------------------------------------------------------------

layout.appletContainer = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      applet, appletString,
      appletWidth, appletHeight, appletAspectRatio,
      width, height,
      scale_factor,
      padding, size,
      mw, mh, tx, ty, stroke,
      default_options = {
        appletID:             "mw-applet",
        codebase:             "/jnlp",
        code:                 "org.concord.modeler.MwApplet",
        width:                "100%",
        height:               "100%",
        archive:              "org/concord/modeler/unsigned/mw.jar",
        align:                "left",
        hspace:               "5",
        vspace:               "5",
        params: [
          ["script", "page:0:import /imports/legacy-mw-content/potential-tests/two-atoms-two-elements/two-atoms-two-elements.cml"]
        ]
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

  function scale(w, h) {
    if (!arguments.length) {
      cy = elem.property("clientHeight");
      cx = elem.property("clientWidth");
    } else {
      cy = h;
      cx = w;
    }
    if(applet) {
      appletWidth  = +applet.runMwScript("mw2d:1:get %width");
      appletHeight = +applet.runMwScript("mw2d:1:get %height");
      appletAspectRatio = appletWidth/appletHeight;
      cy = cx * 1/appletAspectRatio * 1.25;
    }
    node.style.width = cx +"px";
    node.style.height = cy +"px";
    scale_factor = layout.screen_factor;
    if (layout.screen_factor_width && layout.screen_factor_height) {
      scale_factor = Math.min(layout.screen_factor_width, layout.screen_factor_height);
    }
    scale_factor = cx/600;
    padding = {
       "top":    5,
       "right":  5,
       "bottom": 5,
       "left":   5
    };

    height = cy - padding.top  - padding.bottom;
    width  = cx - padding.left  - padding.right;
    size = { "width":  width, "height": height };

    return [cx, cy];
  }

  function container() {
    if (applet === undefined) {
      appletString = generateAppletString();
      node.innerHTML = appletString;
      applet = document.getElementById(options.appletID);
    } else {
      applet.style.width  = size.width;
      applet.style.height = size.height;
      applet.width  = size.width;
      applet.height = size.height;
    }

    function generateAppletString() {
      var i, param, strArray;
      strArray =
        ['<applet id="' + options.appletID + '", codebase="' + options.codebase + '", code="' + options.code + '"',
         '     width="' + options.width + '" height="' + options.height + '" MAYSCRIPT="true"',
         '     archive="' + options.archive + '">',
         '     MAYSCRIPT="true">'];
      for(i = 0; i < options.params.length; i++) {
        param = options.params[i];
        strArray.push('  <param name="' + param[0] + '" value="' + param[1] + '"/>');
      }
      strArray.push('  <param name="MAYSCRIPT" value="true"/>');
      strArray.push('  Your browser is completely ignoring the applet tag!');
      strArray.push('</applet>');
      return strArray.join('\n');
    }

    // make these private variables and functions available
    container.node = node;
    container.scale = scale;
    container.applet = applet;
  }

  container.resize = function(w, h) {
    container.scale(w, h);
  };

  if (node) { container(); }

  return container;
};
// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

if (typeof layout === 'undefined') layout = {};
if (typeof Lab === 'undefined') Lab = {};

Lab.moleculeContainer = layout.moleculeContainer = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      width, height,
      scale_factor,
      vis1, vis, plot,
      playback_component, time_label,
      padding, size,
      mw, mh, tx, ty, stroke,
      x, downscalex, downx,
      y, downscaley, downy, y_flip,
      dragged,
      drag_origin,
      pc_xpos, pc_ypos,
      model_time_formatter = d3.format("5.2f"),
      time_prefix = "time: ",
      time_suffix = " (ps)",
      gradient_container,
      VDWLines_container,
      red_gradient,
      blue_gradient,
      green_gradient,
      element_gradient_array,
      atom_tooltip_on,
      offset_left, offset_top,
      particle, label, labelEnter, tail,
      molRadius,
      molecule_div, molecule_div_pre,
      mock_atoms_array = [],
      get_num_atoms,
      nodes,
      get_nodes,
      set_atom_properties,
      is_stopped,
      obstacle,
      get_obstacles,
      mock_obstacles_array = [],
      mock_radial_bond_array = [],
      radialBond,
      getRadialBonds,
      bondColorArray,
      default_options = {
        fit_to_parent:        false,
        title:                false,
        xlabel:               false,
        ylabel:               false,
        control_buttons:      "play",
        model_time_label:     false,
        grid_lines:           false,
        xunits:               false,
        yunits:               false,
        atom_mubers:          false,
        enableAtomTooltips:   false,
        xmin:                 0,
        xmax:                 10,
        ymin:                 0,
        ymax:                 10
      };

  processOptions();

  if ( !options.fit_to_parent ) {
    scale(cx, cy);
  }

  tx = function(d, i) { return "translate(" + x(d) + ",0)"; };
  ty = function(d, i) { return "translate(0," + y(d) + ")"; };
  stroke = function(d, i) { return d ? "#ccc" : "#666"; };

  function processOptions(newOptions) {
    if (newOptions) {
      options = newOptions;
    }
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
    get_nodes = options.get_nodes;
    nodes = get_nodes();

    get_num_atoms = options.get_num_atoms;
    mock_atoms_array.length = get_num_atoms();

    get_obstacles = options.get_obstacles;
    getRadialBonds = options.get_radial_bonds;
    set_atom_properties = options.set_atom_properties;
    is_stopped = options.is_stopped;
  };

  function scale(w, h) {
    var modelSize = model.size(),
        aspectRatio = modelSize[0] / modelSize[1];
    scale_factor = layout.screen_factor;
    padding = {
       "top":    options.title  ? 40 * layout.screen_factor : 20,
       "right":                   25,
       "bottom": 10,
       "left":   options.ylabel ? 60  * layout.screen_factor : 25
    };

    if (options.xlabel || options.model_time_label) {
      padding.bottom += (35  * scale_factor);
    }

    if (options.control_buttons) {
      padding.bottom += (40  * scale_factor);
    } else {
      padding.bottom += (15  * scale_factor);
    }

    if (options.fit_to_parent) {

      // In 'fit-to-parent' mode, we allow the viewBox parameter to fit the svg
      // node into the containing element and allow the containing element to be
      // sized by CSS (or Javascript)
      cx = 500;
      width = cx - padding.left - padding.right;
      height = width / aspectRatio;
      cy = height + padding.top + padding.bottom;
    }
    else if (!arguments.length) {
      cy = elem.property("clientHeight");
      height = cy - padding.top  - padding.bottom;
      width = height * aspectRatio;
      cx = width + padding.left  + padding.right;
      node.style.width = cx +"px";
    } else {
      width  = w;
      height = h;
      cx = width + padding.left  + padding.right;
      cy = height + padding.top  + padding.bottom;
      node.style.height = cy +"px";
      node.style.width = cx +"px";
    }

    size = {
      "width":  width,
      "height": height
    };

    offset_top  = node.offsetTop + padding.top;
    offset_left = node.offsetLeft + padding.left;

    switch (options.control_buttons) {
      case "play":
        pc_xpos = padding.left + (size.width - (75 * scale_factor))/2;
        break;
      case "play_reset":
        pc_xpos = padding.left + (size.width - (140 * scale_factor))/2;
        break;
      case "play_reset_step":
      default:
        pc_xpos = padding.left + (size.width - (230 * scale_factor))/2;
    }

    pc_ypos = cy - 42 * scale_factor;
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
        .range([0, mh]);

    // y-scale for defining heights without inverting the domain
    y_flip = d3.scale.linear()
        .domain([options.ymin, options.ymax])
        .nice()
        .range([0, mh])
        .nice();

    // drag x-axis logic
    downscaley = y.copy();
    downy = Math.NaN;
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

  function set_position(i, x, y, checkPosition, moveMolecule) {
    return set_atom_properties(i, {x: x, y: y}, checkPosition, moveMolecule);
  }

  function set_y(i, y) {
    nodes[model.INDICES.Y][i] = y;
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

  function get_obstacle_x(i) {
    return obstacles[model.OBSTACLE_INDICES.X][i];
  }

  function get_obstacle_y(i) {
    return obstacles[model.OBSTACLE_INDICES.Y][i];
  }

  function get_obstacle_width(i) {
    return obstacles[model.OBSTACLE_INDICES.WIDTH][i];
  }

  function get_obstacle_height(i) {
    return obstacles[model.OBSTACLE_INDICES.HEIGHT][i];
  }

  function get_obstacle_color(i) {
    return "rgb(" +
      obstacles[model.OBSTACLE_INDICES.COLOR_R][i] + "," +
      obstacles[model.OBSTACLE_INDICES.COLOR_G][i] + "," +
      obstacles[model.OBSTACLE_INDICES.COLOR_B][i] + ")";
  }

  function get_obstacle_visible(i) {
    return obstacles[model.OBSTACLE_INDICES.VISIBLE][i];
  }

  function get_radial_bond_atom_1(i) {
    return radialBonds[model.RADIAL_INDICES.ATOM1][i];
  }

  function get_radial_bond_atom_2(i) {
    return radialBonds[model.RADIAL_INDICES.ATOM2][i];
  }

  function get_radial_bond_length(i) {
    return radialBonds[model.RADIAL_INDICES.LENGTH][i];
  }

  function get_radial_bond_strength(i) {
    return radialBonds[model.RADIAL_INDICES.STRENGTH][i];
  }
    function chargeShadingMode() {
        if (model.get("chargeShading")) {
            return true;
        }
        else {
            return false;
        }
    }

  function container() {
    // if (node.clientWidth && node.clientHeight) {
    //   cx = node.clientWidth;
    //   cy = node.clientHeight;
    //   size.width  = cx - padding.left - padding.right;
    //   size.height = cy - padding.top  - padding.bottom;
    // }

    scale();

    // create container, or update properties if it already exists
    if (vis === undefined) {

      if (options.fit_to_parent) {
        elem = d3.select(e)
          .append('div').attr('class', 'positioning-container')
          .append('div').attr('class', 'molecules-view-aspect-container')
            .attr('style', 'padding-top: ' + Math.round(cy/cx * 100) + '%')
          .append('div').attr('class', 'molecules-view-svg-container');

        node = elem.node();

        vis1 = d3.select(node).append("svg")
          .attr('viewBox', '0 0 ' + cx + ' ' + cy)
          .attr('preserveAspectRatio', 'xMinYMin meet');

      } else {
        vis1 = d3.select(node).append("svg")
          .attr("width", cx)
          .attr("height", cy);
      }

      vis = vis1.append("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
        .attr("class", "plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

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
                .text(options.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

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

      vis.append("image")
        .attr("x", 5)
        .attr("id", "heat_bath")
        .attr("y", 5)
        .attr("width", "3%")
        .attr("height", "3%")
        .attr("xlink:href", "../../resources/heatbath.gif")

      model.addPropertiesListener(["temperature_control"], updateHeatBath);
      updateHeatBath();

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

      if ( !options.fit_to_parent ) {
        d3.select(node).select("svg")
            .attr("width", cx)
            .attr("height", cy);
      }

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
      if (obstacle) {
        obstacle.attr("x", function(d, i) {return x(get_obstacle_x(i)); })
                .attr("y", function(d, i) {return y(get_obstacle_y(i) + get_obstacle_height(i)); })
                .attr("width", function(d, i) {return x(get_obstacle_width(i)); })
                .attr("height", function(d, i) {return y_flip(get_obstacle_height(i)); });
      }
      if (radialBond) {
/*
          radialBond.attr("x1", function(d, i) {return x(get_x(get_radial_bond_atom_1()) + get_radius(get_radial_bond_atom_1()))})
                    .attr("y1", function(d, i) {return y(get_x(get_radial_bond_atom_1()) - get_radius(get_radial_bond_atom_1()))})
                    .attr("x2", function(d, i) {return x(get_x(get_radial_bond_atom_2()) + get_radius(get_radial_bond_atom_2()))})
                    .attr("y2", function(d, i) {return y(get_x(get_radial_bond_atom_2()) - get_radius(get_radial_bond_atom_2()))})
                    .style("stroke-width", 2)
                    .style("stroke", "black")
*/
      }

      if (options.playback_controller) {
        playback_component.position(pc_xpos, pc_ypos, scale_factor);
      }
      redraw();

    }

    // Process options that always have to be recreated when container is reloaded
    d3.select('.model-controller').remove();

    switch (options.control_buttons) {
      case "play":
        playback_component = new PlayOnlyComponentSVG(vis1, model_player, pc_xpos, pc_ypos, scale_factor);
        break;
      case "play_reset":
        playback_component = new PlayResetComponentSVG(vis1, model_player, pc_xpos, pc_ypos, scale_factor);
        break;
      case "play_reset_step":
        playback_component = new PlaybackComponentSVG(vis1, model_player, pc_xpos, pc_ypos, scale_factor);
        break;
      default:
        playback_component = null;
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
      VDWLines_container = vis.append("g");
      VDWLines_container.attr("class", "VDWLines_container");

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
      create_radial_gradient("custom-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", gradient_container);

      element_gradient_array = ["green-grad", "purple-grad", "aqua-grad", "orange-grad"];
      bondColorArray = ["#538f2f", "#aa2bb1", "#2cb6af", "#b3831c", "#7781c2", "#ee7171"];
    }

    function create_radial_gradient(id, lightColor, medColor, darkColor, gradient_container) {
      gradient = gradient_container.append("defs")
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

      /*Function : updateHeatBath
       *
       * Controls display of Heat Bath icon based on value of temperature_control property for model.
       * */
      function updateHeatBath() {
          var heatBath = model.get('temperature_control');
          if (heatBath) {
              d3.select("#heat_bath").style("display","");
          }
          else {
              d3.select("#heat_bath").style("display","none");
          }
      }

    function updateMoleculeRadius() {
      vis.selectAll("circle").data(mock_atoms_array).attr("r",  function(d, i) { return x(get_radius(i)); });
      // vis.selectAll("text").attr("font-size", x(molRadius * 1.3) );
    }

    /**
      Call this wherever a d3 selection is being used to add circles for atoms
    */
    function circlesEnter(particle) {
      particle.enter().append("circle")
          .attr("class", "draggable")
          .attr("r",  function(d, i) { return x(get_radius(i)); })
          .attr("cx", function(d, i) { return x(get_x(i)); })
          .attr("cy", function(d, i) { return y(get_y(i)); })
          .style("fill", function(d, i) {
            if (chargeShadingMode()) {
                if (get_charge(i) > 0){
                    return  "url(#pos-grad)";
                }
                else if (get_charge(i) < 0){
                    return  "url(#neg-grad)";
                }
                else {
                    element = get_element(i) % 4;
                    grad = element_gradient_array[element];
                    return "url(#custom-grad)";
                }
            } else {
              element = get_element(i) % 4;
              grad = element_gradient_array[element];
              return "url('#"+grad+"')";
            }
          })
          .on("mousedown", molecule_mousedown)
          .on("mouseout", molecule_mouseout)
          .call(d3.behavior.drag()
            .on("dragstart", node_dragstart)
            .on("drag", node_drag)
            .on("dragend", node_dragend)
          );
    }

    function rectEnter(obstacle) {
      obstacle.enter().append("rect")
          .attr("x", function(d, i) {return x(get_obstacle_x(i)); })
          .attr("y", function(d, i) {return y(get_obstacle_y(i) + get_obstacle_height(i)); })
          .attr("width", function(d, i) {return x(get_obstacle_width(i)); })
          .attr("height", function(d, i) {return y_flip(get_obstacle_height(i)); })
          .style("fill", function(d, i) {
            return get_obstacle_visible(i) ? get_obstacle_color(i) : "rgba(128,128,128, 0)"; })
          .style("stroke-width", function(d, i) {return get_obstacle_visible(i) ? 0.2 : 0.0})
          .style("stroke", "black");
    }

    function radialBondEnter(radialBond) {
        radialBond.enter().append("line")
                    .attr("x1", function (d, i) {return x(get_x(get_radial_bond_atom_1(i)));})
                    .attr("y1", function (d, i) {return y(get_y(get_radial_bond_atom_1(i)));})
                    .attr("x2", function (d, i) {return ((x(get_x(get_radial_bond_atom_1(i)))+x(get_x(get_radial_bond_atom_2(i))))/2);})
                    .attr("y2", function (d, i) {return ((y(get_y(get_radial_bond_atom_1(i)))+y(get_y(get_radial_bond_atom_2(i))))/2);})
                    .attr("class", "radialbond")
                    .style("stroke-width", function (d, i) {return x(get_radius(get_radial_bond_atom_1(i)))*0.75})
                    .style("stroke", function(d, i) {
                if((Math.ceil(get_radial_bond_length(i) > 0.3 )) && (get_radial_bond_strength(i) < 2000 )){
                    return "#000000";
                }
                else {
                    if (chargeShadingMode()) {
                        if (get_charge(get_radial_bond_atom_1(i)) > 0){
                            return  bondColorArray[4];
                        }
                        else if (get_charge(get_radial_bond_atom_1(i)) < 0){
                            return  bondColorArray[5];
                        }
                        else {
                            //element = get_element(get_radial_bond_atom_1(i)) % 4;
                            //grad = bondColorArray[element];
                            return "#A4A4A4";
                        }
                    } else {
                        element = get_element(get_radial_bond_atom_1(i)) % 4;
                        grad = bondColorArray[element];
                        return grad;
                    }
                }
            })
            .style("stroke-dasharray", function (d, i) {if((Math.ceil(get_radial_bond_length(i) > 0.3 )) && (get_radial_bond_strength(i) < 2000 )) { return "5 5"} else {return "";}});
        radialBond.enter().append("line")
                    .attr("x2", function (d, i) {return ((x(get_x(get_radial_bond_atom_1(i)))+x(get_x(get_radial_bond_atom_2(i))))/2);})
                    .attr("y2", function (d, i) {return ((y(get_y(get_radial_bond_atom_1(i)))+y(get_y(get_radial_bond_atom_2(i))))/2);})
                    .attr("x1", function (d, i) {return x(get_x(get_radial_bond_atom_2(i)));})
                    .attr("y1", function (d, i) {return y(get_y(get_radial_bond_atom_2(i)));})
                    .attr("class", "radialbond1")
                    .style("stroke-width", function (d, i) {return x(get_radius(get_radial_bond_atom_2(i)))*0.75})
                    .style("stroke", function(d, i) {
                if((Math.ceil(get_radial_bond_length(i) > 0.3 )) && (get_radial_bond_strength(i) < 2000 )){
                    return "#000000";
                }
                else {
                    if (chargeShadingMode()) {
                        if (get_charge(get_radial_bond_atom_2(i)) > 0){
                            return  bondColorArray[4];
                        }
                        else if (get_charge(get_radial_bond_atom_2(i)) < 0){
                            return  bondColorArray[5];
                        }
                        else {
                            //element = get_element(get_radial_bond_atom_2(i)) % 4;
                            //grad = bondColorArray[element];
                            return "#A4A4A4";
                        }
                    } else {
                        element = get_element(get_radial_bond_atom_2(i)) % 4;
                        grad = bondColorArray[element];
                        return grad;
                    }
                }
    })
                    .style("stroke-dasharray", function (d, i) {if((Math.ceil(get_radial_bond_length(i) > 0.3 )) && (get_radial_bond_strength(i) < 2000 )) { return "5 5"} else {return "";}});
    }

    function drawAttractionForces(){
      VDWLines_container.selectAll("line.attractionforce").remove();
        for(var atom1 = 0;atom1 < mock_atoms_array.length;atom1++){
            for(var atom2 =0 ;atom2<atom1;atom2++) {
                var xs = (x(get_x(atom1))-x(get_x(atom2)));
                var ys = (y(get_y(atom1))-y(get_y(atom2)));
                var dist;
                xs = xs * xs;
                ys = ys * ys;
                dist =  Math.sqrt( xs + ys );
                if (dist <= 70 && !isChargeSame(atom1,atom2))
                {
                  VDWLines_container.append("line")
                        .attr("x1", x(get_x(atom1)))
                        .attr("y1", y(get_y(atom1)))
                        .attr("x2", x(get_x(atom2)))
                        .attr("y2", y(get_y(atom2)))
                        .attr("class", "attractionforce")
                        .style("stroke-width", 1)
                        .style("stroke", "#000000")
                        .style("stroke-dasharray", "5 3");
                }
            }
        }
    }

    function isChargeSame(atom1,atom2) {
      var atomCharge1 =  get_charge(atom1);
      var atomCharge2 =  get_charge(atom2);
      if((atomCharge1 > 0) &&  (atomCharge2 > 0) || (atomCharge1 < 0) &&  (atomCharge2 < 0)){
        return true;
      }
      else {
        return false;
      }
    }

    function setup_drawables() {
      setup_obstacles();
      if(model.get("showVDWLines")){
        drawAttractionForces();
      }
      setup_radial_bonds();
      setup_particles();
    }

    function setup_particles() {
      // The get_nodes option allows us to update 'nodes' array every model tick.
      get_nodes = options.get_nodes;
      nodes = get_nodes();

      get_num_atoms = options.get_num_atoms;
      mock_atoms_array.length = get_num_atoms();

      var ljf = model.getLJCalculator()[0][0].coefficients();
      // // molRadius = ljf.rmin * 0.5;
      // // model.set_radius(molRadius);

      gradient_container.selectAll("circle").remove();
      gradient_container.selectAll("g").remove();

      particle = gradient_container.selectAll("circle").data(mock_atoms_array);

      circlesEnter(particle);

      var font_size = x(ljf.rmin * 0.5 * 1.5);
      if (model.get('mol_number') > 100) { font_size *= 0.9; }

      label = gradient_container.selectAll("g.label")
          .data(mock_atoms_array);

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
            .attr("pointer-events", "none")
            .text(function(d) { return d.index; });
      } else {
        labelEnter.append("text")
            .attr("class", "index")
            .attr("font-size", font_size)
            .attr("style", "font-weight: bold; opacity: .7")
            .attr("x", "-0.31em")
            .attr("y", "0.31em")
            .attr("pointer-events", "none")
            .text(function(d, i) {
                if (chargeShadingMode()) {
                    if (get_charge(i) > 0){
                        return  "+";
                    } else if (get_charge(i) < 0){
                        return  "-";
                    } else {
                        return;
                    }
                }
            })
      }
    }

    function setup_obstacles() {
      gradient_container.selectAll("rect").remove();

      obstacles = get_obstacles();
      if (!obstacles) return;

      mock_obstacles_array.length = obstacles[0].length;

      obstacle = gradient_container.selectAll("rect").data(mock_obstacles_array);

      rectEnter(obstacle);
    }

    function setup_radial_bonds() {
      gradient_container.selectAll("line.radialbond").remove();
      gradient_container.selectAll("line.radialbond1").remove();

      radialBonds = getRadialBonds();

      if (!radialBonds) return;

      mock_radial_bond_array.length = radialBonds[0].length;

      radialBond = gradient_container.selectAll("line.radialbond").data(mock_radial_bond_array);

      radialBondEnter(radialBond);
    }

    function mousedown() {
      node.focus();
    }

    function molecule_mouseover(d) {
      // molecule_div.transition()
      //       .duration(250)
      //       .style("opacity", 1);
    }

    function molecule_mousedown(d, i) {
      node.focus();
      if (options.enableAtomTooltips) {
        if (atom_tooltip_on !== false) {
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

    function molecule_mousemove(d) {
    }

    function molecule_mouseout() {
      if (atom_tooltip_on === false) {
        molecule_div.style("opacity", 1e-6);
      }
    }

    function update_drawable_positions() {
      setup_obstacles();
      if(model.get("showVDWLines")){
        drawAttractionForces();
      }
      update_radial_bonds();
      update_molecule_positions();
      }

    function update_molecule_positions() {

      mock_atoms_array.length = get_num_atoms();
      nodes = get_nodes();

      // update model time display
      if (options.model_time_label) {
        time_label.text(modelTimeLabel());
      }

      label = elem.selectAll("g.label").data(mock_atoms_array);

      label.attr("transform", function(d, i) {
        return "translate(" + x(get_x(i)) + "," + y(get_y(i)) + ")";
      });

      particle = gradient_container.selectAll("circle").data(mock_atoms_array);
      if (mock_atoms_array.length !== gradient_container.selectAll("circle")[0].length){
        circlesEnter(particle);
      }
      particle
        .attr("cx", function(d, i) {return x(nodes[model.INDICES.X][i]); })
        .attr("cy", function(d, i) {return y(nodes[model.INDICES.Y][i]); })
        .attr("r",  function(d, i) {return x(nodes[model.INDICES.RADIUS][i]); });

      if (atom_tooltip_on === 0 || atom_tooltip_on > 0) {
        render_atom_tooltip(atom_tooltip_on);
      }
    }

    function update_radial_bonds() {
      gradient_container.selectAll("line.radialbond")
        .attr("x1", function (d, i) {return x(get_x(get_radial_bond_atom_1(i)));})
        .attr("y1", function (d, i) {return y(get_y(get_radial_bond_atom_1(i)));})
        .attr("x2", function (d, i) {return ((x(get_x(get_radial_bond_atom_1(i)))+x(get_x(get_radial_bond_atom_2(i))))/2);})
        .attr("y2", function (d, i) {return ((y(get_y(get_radial_bond_atom_1(i)))+y(get_y(get_radial_bond_atom_2(i))))/2);})

      gradient_container.selectAll("line.radialbond1")
        .attr("x2", function (d, i) {return ((x(get_x(get_radial_bond_atom_1(i)))+x(get_x(get_radial_bond_atom_2(i))))/2);})
        .attr("y2", function (d, i) {return ((y(get_y(get_radial_bond_atom_1(i)))+y(get_y(get_radial_bond_atom_2(i))))/2);})
        .attr("x1", function (d, i) {return x(get_x(get_radial_bond_atom_2(i)));})
        .attr("y1", function (d, i) {return y(get_y(get_radial_bond_atom_2(i)));})
    }

    function node_dragstart(d, i) {
      if (!is_stopped()) {
        // if we're running, add a spring force
        model.addSpringForce(i, get_x(i), get_y(i), 0.9);
      } else {
        // if we're stopped, drag the atom
        drag_origin = [get_x(i), get_y(i)];
      }
    }

    function node_drag(d, i){
      if (!is_stopped()) {
        var click_x = x.invert(d3.event.x),
            click_y = y.invert(d3.event.y);

        // here we just assume we are updating the one and only spring force.
        // This assumption will have to change if we can have more than one
        model.updateSpringForce(0, click_x, click_y);
        return;
      }

      var dragTarget = d3.select(this),
          new_x, new_y;

      dragTarget
        .attr("cx", function(){return d3.event.x})
        .attr("cy", function(){return d3.event.y});

      molecule_div
            .style("left", x(nodes[model.INDICES.X][i]) + offset_left + 16 + "px")
            .style("top",  y(nodes[model.INDICES.Y][i]) + offset_top - 30 + "px")

      new_x = x.invert(dragTarget.attr('cx'));
      new_y = y.invert(dragTarget.attr('cy'));
      set_position(i, new_x, new_y, false, true);

      update_drawable_positions();
    };

    function node_dragend(d, i){
      if (!is_stopped()) {
        // here we just assume we are removing the one and only spring force.
        // This assumption will have to change if we can have more than one
        model.removeSpringForce(0);
        return;
      }

      var dragTarget = d3.select(this),
          new_x, new_y;

      new_x = x.invert(dragTarget.attr('cx'));
      new_y = y.invert(dragTarget.attr('cy'));
      if (!set_position(i, new_x, new_y, true, true)) {
        alert("You can't drop the atom there");     // should be changed to a nice Lab alert box
        set_position(i, drag_origin[0], drag_origin[1], false, true);
      }

      update_drawable_positions();
    };

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
    container.setup_drawables = setup_drawables;
    container.update_drawable_positions = update_drawable_positions;
    container.scale = scale;
    container.playback_component = playback_component;
    container.options = options;
    container.processOptions = processOptions;
  }

  container.resize = function(w, h) {
    if ( !options.fit_to_parent ) container.scale(w, h);
    container();
    container.setup_drawables();
  };

  container.reset = function(newOptions) {
    container.processOptions(newOptions);
    container();
    container.setup_drawables();
    container.updateMoleculeRadius();
  };

 if (node) { container(); }

  return container;
};
// ------------------------------------------------------------
//
//   Lennard-Jones Potential Chart
//
// ------------------------------------------------------------

layout.potentialChart = function(e, model, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      padding, size,
      mw, mh, tx, ty, stroke,
      xScale = d3.scale.linear(), downx,
      yScale = d3.scale.linear(), downy,
      dragged, coefficient_dragged,
      vis, plot,
      ljCalculator,
      ljData = {},
      ljPotentialGraphData = [],
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

  ljData.variables = [];
  ljData.variables[0] = { coefficient: "epsilon", cursorStyle: "ns-resize" };
  ljData.variables[1] = { coefficient: "sigma", cursorStyle: "ew-resize" };

  updateLJData();

  // drag coefficients logic
  coefficient_dragged = false;
  coefficient_selected = ljData.variables[0];

  scale(cx, cy);

  tx = function(d, i) { return "translate(" + xScale(d) + ",0)"; };
  ty = function(d, i) { return "translate(0," + yScale(d) + ")"; };
  stroke = function(d, i) { return Math.abs(d) > 0.0001 ? "#ccc" : "#666"; };

  line = d3.svg.line()
      .x(function(d, i) { return xScale(ljPotentialGraphData[i][0]); })
      .y(function(d, i) { return yScale(ljPotentialGraphData[i][1]); });

  function updateLJData() {
    var sigma, epsilon, rmin, y, r, i;

    ljCalculator = model.getLJCalculator()[0][0];
    ljData.coefficients = ljCalculator.coefficients();
    sigma   = ljData.coefficients.sigma;
    epsilon = ljData.coefficients.epsilon;
    rmin    = ljData.coefficients.rmin;
    ljData.xmax    = sigma * 3;
    ljData.xmin    = Math.floor(sigma/2);
    ljData.ymax    = 0.4;
    ljData.ymin    = Math.ceil(epsilon*1) - 1.0;

    // update the positions of the circles for epsilon and sigma on the graph
    ljData.variables[0].x = rmin;
    ljData.variables[0].y = epsilon;
    ljData.variables[1].x = sigma;
    ljData.variables[1].y = 0;

    ljPotentialGraphData.length = 0;
    for(r = sigma * 0.5; r < ljData.xmax * 3;  r += 0.001) {
      y = -ljCalculator.potential(r, 0, 0);
      if (Math.abs(y) < 100) {
        ljPotentialGraphData.push([r, y]);
      }
    }
  }

  function scale(w, h) {
    cx = w;
    cy = h;
    // cx = elem.property("clientWidth");
    // cy = elem.property("clientHeight");
    node.style.width = cx +"px";
    node.style.height = cy +"px";
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
    xScale = d3.scale.linear()
      .domain([ljData.xmin, ljData.xmax]).range([0, mw]);

    // y-scale (inverted domain)
    yScale = d3.scale.linear()
      .domain([ljData.ymax, ljData.ymin]).range([0, mh]);

    // drag x-axis logic
    downx = Math.NaN;

    // drag y-axis logic
    downy = Math.NaN;
    dragged = null;
  }

  function container() {
    scale(cx, cy);
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
        .attr("pointer-events", "all");

      plot.call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 8]).on("zoom", redraw));

      vis.append("svg")
        .attr("class", "linebox")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height)
        .append("path")
            .attr("class", "line")
            .attr("d", line(ljPotentialGraphData));

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

      d3.select(this)
          .on("mousemove.drag", mousemove)
          .on("touchmove.drag", mousemove)
          .on("mouseup.drag",   mouseup)
          .on("touchend.drag",  mouseup);

      redraw();
    }

    function redraw() {
      if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
          d3.event.transform(x, y);
      }

      var fx = xScale.tickFormat(5),
          fy = yScale.tickFormat(5);

      // Regenerate x-ticks…
      var gx = vis.selectAll("g.x")
          .data(xScale.ticks(5), String)
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
              downx = xScale.invert(p[0]);
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
               downy = yScale.invert(p[1]);
               // d3.behavior.zoom().off("zoom", redraw);
          });

      gy.exit().remove();
      plot.call(d3.behavior.zoom().x(xScale).y(yScale).scaleExtent([1, 8]).on("zoom", redraw));
      update();
    }

    // ------------------------------------------------------------
    //
    // Draw the Lennard-Jones function
    //
    // ------------------------------------------------------------

    function update() {
      var epsilon_circle = vis.selectAll("circle")
          .data(ljData.variables, function(d) { return d; });

      var lines = vis.select("path").attr("d", line(ljPotentialGraphData)),
          x_extent = xScale.domain()[1] - xScale.domain()[0];

      epsilon_circle.enter().append("circle")
          .attr("class", function(d) { return d === coefficient_dragged ? "selected" : null; })
          .attr("cx",    function(d) { return xScale(d.x); })
          .attr("cy",    function(d) { return yScale(d.y); })
          .style("cursor", function(d) { return d.cursorStyle; })
          .attr("r", 8.0)
          .on("mousedown", function(d) {
            if (d.coefficient == "epsilon") {
              d.x = ljData.coefficients.rmin;
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

    function plot_drag() {
      elem.style("cursor", "move");
    }

    function mousemove() {
      var p = d3.svg.mouse(vis[0][0]),
          changex, changey, new_domain,
          t = d3.event.changedTouches;
      if (coefficient_dragged) {
        node.onselectstart = function(){ return false; };
        var m = d3.svg.mouse(vis.node()),
          newx, newy;
        if (coefficient_dragged.coefficient == "epsilon") {
          newx = ljData.coefficients.rmin;
          newy = yScale.invert(Math.max(0, Math.min(size.height, m[1])));
          if (newy > options.epsilon_max) { newy = options.epsilon_max; }
          if (newy < options.epsilon_min) { newy = options.epsilon_min; }
          model.set( { epsilon: newy } );
        } else {
          newy = 0;
          newx = xScale.invert(Math.max(0, Math.min(size.width, m[0])));
          if (newx < options.sigma_min) { newx = options.sigma_min; }
          if (newx > options.sigma_max) { newx = options.sigma_max; }
          model.set( { sigma: newx } );
        }
        coefficient_dragged.x = newx;
        coefficient_dragged.y = newy;
        update();
      }
      if (!isNaN(downx)) {
        d3.select('body').style("cursor", "ew-resize");
        xScale.domain(grapher.axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
        redraw();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
      if (!isNaN(downy)) {
        d3.select('body').style("cursor", "ns-resize");
        yScale.domain(grapher.axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
        redraw();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    function mouseup() {
      if (!isNaN(downx)) {
        node.onselectstart = function(){ return true; };
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

    // ------------------------------------------------------------
    //
    // Potential Chart axis scaling
    //
    // attach the mousemove and mouseup to the body
    // in case one wanders off the axis line
    //
    // ------------------------------------------------------------


    elem.on("mousemove", function(d) {
      document.onselectstart = function() { return true; };
      var p = d3.svg.mouse(vis[0][0]);
      if (!isNaN(downx)) {
        xScale.domain(grapher.axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
        redraw();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
      if (!isNaN(downy)) {
        yScale.domain(grapher.axis.axisProcessDrag(downy, yScale.invert(p[0]), yScale.domain()));
        redraw();
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    })
    .on("mouseup", function(d) {
        document.onselectstart = function() { return true; };
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
    container.node = node;
    container.scale = scale;
    container.updateLJData = updateLJData;
    container.update = update;
    container.redraw = redraw;
  }

  container.resize = function(width, height) {
    container.scale(width, height);
    container();
  };

  container.ljUpdate = function() {
    container.updateLJData();
    container.redraw();
  };

 if (node) { container(); }

  return container;
};
// ------------------------------------------------------------
//
//   Speed Distribution Histogram
//
// ------------------------------------------------------------

layout.speedDistributionChart = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      padding, size,
      mw, mh, tx, ty, stroke,
      xScale, downscalex, downx,
      yScale, downscaley, downy,
      barWidth, quantile, lineStep, yMax, speedMax,
      vis, plot, bars, line, speedData, fit, bins,
      default_options = {
        title    : "Distribution of Speeds",
        xlabel   : null,
        ylabel   : "Count",
        xmax     : 2,
        xmin     : 0,
        ymax     : 15,
        ymin     : 0,
        quantile : 0.01
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

  function generateSpeedData() {
    speedData = model.get_speed();
    options.xmax = d3.max(speedData);
    options.xmin = d3.min(speedData);
    options.quantile = d3.quantile(speedData, 0.1);
    yMax = options.ymax;
    // x-scale
    xScale = d3.scale.linear()
      .domain([options.xmin, options.xmax])
      .range([0, mw]);
    // y-scale
    yScale = d3.scale.linear()
        .domain([options.ymax, options.ymin])
        .nice()
        .range([0, mh]);
  }

  function updateSpeedBins() {
    if (speedData.length > 2) {
      // this is a hack for cases when all speeds are 0
      try {
        bins = d3.layout.histogram().frequency(false).bins(xScale.ticks(60))(speedData);
      } catch(e) {
        return;
      }

      barWidth = (size.width - bins.length)/bins.length;
      lineStep = (options.xmax - options.xmin)/bins.length;
      speedMax  = d3.max(bins, function(d) { return d.y; });
    }
  }

  function scale(w, h) {
    cx = w;
    cy = h;
    // cx = elem.property("clientWidth");
    // cy = elem.property("clientHeight");
    node.style.width = cx +"px";
    node.style.height = cy +"px";
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
    xScale = d3.scale.linear()
      .domain([options.xmin, options.xmax])
      .range([0, mw]);

    // y-scale (inverted domain)
    yScale = d3.scale.linear()
        .domain([options.ymax, options.ymin])
        .nice()
        .range([0, mh])
        .nice();

  generateSpeedData();
  updateSpeedBins();

  }

  function container() {
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
        .style("fill", "#EEEEEE");

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
                .text(options.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
      }

      redraw();

    } else {

      d3.select(node).select("svg")
          .attr("width", cx)
          .attr("height", cy);

      vis.select("rect.plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .style("fill", "#EEEEEE");

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

      var fy = yScale.tickFormat(10);

      // Regenerate y-ticks…
      var gy = vis.selectAll("g.y")
          .data(yScale.ticks(5), String)
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
    // Draw the Speed Distribution
    //
    // ------------------------------------------------------------

    function update() {
      generateSpeedData();
      if (speedData.length > 2) {
        kde = science.stats.kde().sample(speedData);
        xScale.domain([options.xmin, options.xmax]);
        try {
          bins = d3.layout.histogram().frequency(true).bins(xScale.ticks(60))(speedData);
        } catch (e) {
          return;
        }

        barWidth = (size.width - bins.length)/bins.length;
        lineStep = (options.xmax - options.xmin)/bins.length;
        speedMax  = d3.max(bins, function(d) { return d.y; });

        vis.selectAll("g.bar").remove();

        bars = vis.selectAll("g.bar")
            .data(bins);

        bars.enter().append("g")
            .attr("class", "bar")
            .attr("transform", function(d, i) {
              return "translate(" + xScale(d.x) + "," + (mh - yScale(yMax - d.y)) + ")";
            })
            .append("rect")
              .attr("class", "bar")
              .attr("fill", "steelblue")
              .attr("width", barWidth)
              .attr("height", function(d) {
                  return yScale(yMax - d.y);
                });
      }
    }


    // make these private variables and functions available
    container.node = node;
    container.scale = scale;
    container.update = update;
    container.redraw = redraw;
  }

  container.resize = function(width, height) {
    container.scale(width, height);
    // container.scale();
    container();
  };

  if (node) { container(); }
  return container;
};
// ------------------------------------------------------------
//
// Benchmarks
//
// ------------------------------------------------------------

var start_benchmarks = document.getElementById("start-benchmarks");
var benchmarks_table = document.getElementById("benchmarks-table");

var benchmarks_to_run = [
  {
    name: "molecules",
    run: function() {
      return model.get_num_atoms();
    }
  },
  {
    name: "temperature",
    run: function() {
      return model.get("temperature");
    }
  },
  {
    name: "100 Steps (steps/s)",
    run: function() {
      controller.modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        // advance model 1 tick, but don't paint the display
        model.tick(1, { dontDispatchTickEvent: true });
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  },
  {
    name: "100 Steps w/graphics",
    run: function() {
      controller.modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  }
];

if (start_benchmarks) {
  start_benchmarks.onclick = function() {
    benchmark.run(benchmarks_table, benchmarks_to_run)
  };
}

// ------------------------------------------------------------
//
// Data Table
//
// ------------------------------------------------------------

layout.datatable_visible = false;

var toggle_datatable = document.getElementById("toggle-datatable");
var datatable_table = document.getElementById("datatable-table");

layout.hide_datatable = function() {
  if (datatable_table) {
    datatable_table.style.display = "none";
  }
}

layout.render_datatable = function(reset) {
  datatable_table.style.display = "";
  var i,
      nodes = model.get_nodes(),
      atoms = [],
      titlerows = datatable_table.getElementsByClassName("title"),
      datarows = datatable_table.getElementsByClassName("data"),
      column_titles = ['PX', 'PY', 'X', 'Y', 'VX', 'VY', 'AX', 'AY', 'SPEED', 'CHARGE', 'RADIUS', 'ELEMENT'],
      i_formatter = d3.format(" 2d"),
      charge_formatter = d3.format(" 1.1f"),
      f_formatter = d3.format(" 3.4f"),
      formatters = [f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, charge_formatter, f_formatter, 
                    i_formatter];

  atoms.length = nodes[0].length;
  reset = reset || false;

  function empty_table() {
    return datatable_table.getElementsByTagName("tr").length == 0;
  }

  function add_row(kind) {
    kind = kind || "data";
    var row = datatable_table.appendChild(document.createElement("tr"));
    row.className = kind;
    return row
  }

  function add_data(row, content, el, colspan) {
    el = el || "td";
    colspan = colspan || 1;
    var d = row.appendChild(document.createElement(el));
    d.textContent = content;
    if (colspan > 1) { d.colSpan = colspan };
  }

  function add_data_row(row, data, el) {
    el = el || "td";
    var i;
    i = -1; while (++i < data.length) {
      add_data(row, data[i]);
    }
  }

  function add_molecule_data(row, index, el) {
    el = el || "td";
    var cells = row.getElementsByTagName(el),
        i = 0;
    if (cells.length > 0) {
      cells[0].textContent = index;
      while (++i < cells.length) {
        cells[i].textContent = formatters[i](nodes[model.INDICES[column_titles[i]]][index])
      }
    }
    i--;
    while (++i < column_titles.length) {
      add_data(row, formatters[i](nodes[model.INDICES[column_titles[i]]][index]));
    }
  }

  function add_column(title, data) {
    if (empty_table()) { add_data(add_row("title"), title, "th") };
    add_data(results_row, data)
  }

  function add_column_headings(title_row, titles, colspan) {
    colspan = colspan || 1;
    var i;
    i = -1; while (++i < titles.length) {
      add_data(title_row, titles[i], "th", colspan);
    }
  }

  function add_data_rows(n) {
    var i = -1, j = datarows.length;
    while (++i < n) {
      if (i >= datarows.length) { add_row() }
    }
    while (--j >= i) {
      datatable_table.removeChild(datarows[i])
    }
    return datatable_table.getElementsByClassName("data")
  }

  function add_data_elements(row, data) {
    var i = -1; while (++i < data.length) { add_data(row, data[i]) }
  }

  function add_column_data(title_rows, data_rows, title, data) {
    var i;
    i = -1; while (++i < data.length) {
      add_data_elements(data_rows[i], data[i])
    }
  }

  if (titlerows.length == 0) {
    var title_row = add_row("title");
    add_column_headings(title_row, column_titles)
    datarows = add_data_rows(atoms.length);
  }
  if (reset) { datarows = add_data_rows(model.get_num_atoms()); }
  i = -1; while (++i < atoms.length) {
    add_molecule_data(datarows[i], i);
  }
}

if (toggle_datatable) {
  toggle_datatable.onclick = function() {
    if (layout.datatable_visible) {
      layout.datatable_visible = false;
      toggle_datatable.textContent = "Show Data Table";
      datatable_table.style.display = "none";
    } else {
      layout.datatable_visible = true;
      toggle_datatable.textContent = "Hide Data Table";
      layout.render_datatable();
      datatable_table.style.display = "";
    }
  }
};
// ------------------------------------------------------------
//
// Temperature Selector
//
// ------------------------------------------------------------

var select_temperature = document.getElementById("select-temperature");
var select_temperature_display = document.createElement("span");

layout.setupTemperature = function(model) {
  if (select_temperature) {
    if (Modernizr['inputtypes']['range']) {
      var temp_range = document.createElement("input");
      temp_range.type = "range";
      temp_range.min = "0";
      temp_range.max = "5000";
      temp_range.step = "20";
      temp_range.value = model.get("temperature");
      select_temperature.parentNode.replaceChild(temp_range, select_temperature);
      temp_range.id = "select-temperature";
      select_temperature = temp_range;
      select_temperature_display.id = "select-temperature-display";
      select_temperature_display.innerText = temp_range.value + " K";
      select_temperature.parentNode.appendChild(select_temperature_display);
      select_temperature = document.getElementById("select-temperature");
    }
    select_temperature.onchange = selectTemperatureChange;
  }
};

function selectTemperatureChange() {
  var temperature = +select_temperature.value;
  if (select_temperature.type === "range") {
    select_temperature_display.innerText = d3.format("4.1f")(temperature) + " K";
  }
  model.set({ "temperature": temperature });
}


// ------------------------------------------------------------
//
// Temperature Control
//
// ------------------------------------------------------------

layout.temperature_control_checkbox = document.getElementById("temperature-control-checkbox");

layout.temperatureControlHandler = function () {
  if (layout.temperature_control_checkbox.checked) {
    model.set({ "temperature_control": true });
  } else {
    model.set({ "temperature_control": false });
  }
};

layout.temperatureControlUpdate = function () {
  var tc = model.get('temperature_control');

  layout.temperature_control_checkbox.checked = tc;
  select_temperature.disabled = !tc;
  select_temperature_display.hidden = !tc;
};

if (layout.temperature_control_checkbox) {
  layout.temperature_control_checkbox.onchange = layout.temperatureControlHandler;
}
// ------------------------------------------------------------
//
// Display Model Statistics
//
// ------------------------------------------------------------

var stats = document.getElementById("stats");

layout.displayStats = function() {
  var ke = model.ke(),
      pe = model.pe(),
      te = ke + pe;

  if (stats) {
    stats.textContent =
      "Time: "     + d3.format("5.2f")(model.getTime() / 1000) + " (ps), " +
      "KE: "       + d3.format("1.4f")(ke) + ", " +
      "PE: "       + d3.format("1.4f")(pe) + ", " +
      "TE: "       + d3.format("1.4f")(te) + ", " +
      "Pressure: " + d3.format("6.3f")(model.pressure()) + ", " +
      "Rate: " + d3.format("5.1f")(model.get_rate()) + " (steps/s)";
  }
}

layout.heatCoolButtons = function(heat_elem_id, cool_elem_id, min, max, model, callback) {
  var heat_button = new ButtonComponent(heat_elem_id, 'circlesmall-plus');
  var cool_button = new ButtonComponent(cool_elem_id, 'circlesmall-minus');

  heat_button.add_action(function() {
    var t = model.get('temperature');
    if (t < max) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 + 100;
      model.set({temperature: t});
      if (typeof callback === 'function') {
        callback(t)
      }
    } else {
      $(heat_elem_id).addClass('inactive');
    }
  });

  cool_button.add_action(function() {
    var t = model.get('temperature');
    if (t > min) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 - 100;
      model.set({temperature: t});
      if (typeof callback === 'function') {
        callback(t)
      }
    } else {
      $(cool_elem_id).addClass('inactive');
    }
  });
}
})();
