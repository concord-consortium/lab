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
      // in fit-to-parent mode, the d3 selection containing outermost container
      outerElement,
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      width, height,
      scale_factor,
      scaling_factor,
      vis1, vis, plot,
      playback_component, time_label,
      padding, size,
      mw, mh, tx, ty, stroke,
      x, downscalex, downx,
      y, downscaley, downy, y_flip,
      dragged,
      drag_origin,
      pc_xpos, pc_ypos,
      model_time_formatter = d3.format("5.0f"),
      time_prefix = "",
      time_suffix = " (fs)",
      gradient_container,
      VDWLines_container,
      image_container,
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
      mock_vdw_pairs_array = [],
      radialBond,
      vdwLine,
      getRadialBonds,
      imageProp,
      interactiveUrl,
      imagePath,
      getVdwPairs,
      bondColorArray,
      default_options = {
        fit_to_parent:        false,
        title:                false,
        xlabel:               false,
        ylabel:               false,
        controlButtons:      "play",
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
    getVdwPairs = options.get_vdw_pairs;
    set_atom_properties = options.set_atom_properties;
    is_stopped = options.is_stopped;
    imageProp = options.images;
    if(options.interactiveUrl) {
    interactiveUrl = options.interactiveUrl;
    imagePath = interactiveUrl.slice(0,interactiveUrl.lastIndexOf("/")+1);
    }
    if (!options.showClock) {
      options.showClock = model.get("showClock");
    }
  }

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

    if (options.xlabel) {
      padding.bottom += (35  * scale_factor);
    }

    if (options.controlButtons) {
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
    scaling_factor = (size.width/(modelSize[0]*100));
    offset_top  = node.offsetTop + padding.top;
    offset_left = node.offsetLeft + padding.left;

    switch (options.controlButtons) {
      case "play":
        pc_xpos = padding.left + (size.width - (75 * scale_factor))/2;
        break;
      case "play_reset":
        pc_xpos = padding.left + (size.width - (140 * scale_factor))/2;
        break;
      case "play_reset_step":
        pc_xpos = padding.left + (size.width - (230 * scale_factor))/2;
        break;
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
    return time_prefix + model_time_formatter(model.getTime()) + time_suffix;
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

  function get_visible(i) {
    return nodes[model.INDICES.VISIBLE][i];
  }

  function get_draggable(i) {
    return nodes[model.INDICES.DRAGGABLE][i];
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
  function get_vdw_line_atom_1(i) {
    return vdwPairs[model.VDW_INDICES.ATOM1][i];
  }

  function get_vdw_line_atom_2(i) {
    return vdwPairs[model.VDW_INDICES.ATOM2][i];
  }

  function chargeShadingMode() {
    if (model.get("chargeShading")) {
      return true;
    }
    else {
      return false;
    }
  }
  function drawVdwLines() {
    if (model.get("showVDWLines")) {
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
        outerElement = d3.select(e);
        elem = outerElement
          .append('div').attr('class', 'positioning-container')
          .append('div').attr('class', 'molecules-view-aspect-container')
            .attr('style', 'padding-top: ' + Math.round(cy/cx * 100) + '%')
          .append('div').attr('class', 'molecules-view-svg-container');

        node = elem.node();

        vis1 = d3.select(node).append("svg")
          .attr('viewBox', '0 0 ' + cx + ' ' + cy)
          .attr('preserveAspectRatio', 'xMinYMin meet');

      } else {
        outerElement = elem;
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
      if (options.showClock) {
        time_label = vis.append("text")
            .attr("class", "modelTimeLabel")
            .text(modelTimeLabel())
            .attr("x", 10)
            .attr("y", size.height - 35)
            .attr("dy","2.4em")
            .style("text-anchor","start");
      }

      vis.append("image")
        .attr("x", 5)
        .attr("id", "heat_bath")
        .attr("y", 5)
        .attr("width", "3%")
        .attr("height", "3%")
        .attr("xlink:href", "../../resources/heatbath.gif");

      model.addPropertiesListener(["temperature_control"], updateHeatBath);

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

      if (options.showClock) {
        time_label.text(modelTimeLabel())
            .attr("x", 10)
            .attr("y", size.height - 35);
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

    switch (options.controlButtons) {
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
        if (options.showClock) {
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
      image_container = vis.append("g");
      image_container.attr("class", "image_container");
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
          .style("fill-opacity", function(d, i) {
            if (get_visible(i)) {
              return 1;
            } else {
              return 0;
            }
          })
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
          .style("stroke-width", function(d, i) {return get_obstacle_visible(i) ? 0.2 : 0.0; })
          .style("stroke", "black");
    }

    function radialBondEnter(radialBond) {
      radialBond.enter().append("path")
          .attr("d", function (d, i) { return findPoints(i,1);})
          .attr("class", "radialbond")
          .style("stroke-width", function (d, i) {if (isSpringBond(i)) {return "0.2";}else return  x(get_radius(get_radial_bond_atom_1(i)))*0.75; })
          .style("stroke", function(d, i) {
              if(isSpringBond(i)) {
                return "#000000";
              } else {
                if (chargeShadingMode()) {
                    if (get_charge(get_radial_bond_atom_1(i)) > 0) {
                        return  bondColorArray[4];
                    } else if (get_charge(get_radial_bond_atom_1(i)) < 0){
                        return  bondColorArray[5];
                    } else {
                      return "#A4A4A4";
                    }
                } else {
                  element = get_element(get_radial_bond_atom_1(i)) % 4;
                  grad = bondColorArray[element];
                  return grad;
                }
              }
            })
        .style("fill", "none");

      radialBond.enter().append("path")
          .attr("d", function (d, i) { return findPoints(i,2);})
          .attr("class", "radialbond1")
          .style("stroke-width", function (d, i) {if (isSpringBond(i)) {return "0.2";}else return x(get_radius(get_radial_bond_atom_2(i)))*0.75; })
          .style("stroke", function(d, i) {
              if (isSpringBond(i)) {
                return "#A4A4A4";
              } else {
                if (chargeShadingMode()) {
                  if (get_charge(get_radial_bond_atom_2(i)) > 0) {
                      return  bondColorArray[4];
                  } else if (get_charge(get_radial_bond_atom_2(i)) < 0){
                      return  bondColorArray[5];
                  } else {
                    return "#A4A4A4";
                  }
                } else {
                  element = get_element(get_radial_bond_atom_2(i)) % 4;
                  grad = bondColorArray[element];
                  return grad;
                }
              }
          })
        .style("fill", "none");
    }

    function findPoints(i, num) {
      var pointX, pointY,dx, dy, x1, x2, y1, y2, lineTo, path, costheta, sintheta, length, numSpikes = 10*(layout.screen_factor*1.5);
      x1 = x(get_x(get_radial_bond_atom_1(i)));
      y1 = y(get_y(get_radial_bond_atom_1(i)));
      x2 = x(get_x(get_radial_bond_atom_2(i)));
      y2 = y(get_y(get_radial_bond_atom_2(i)));
      if (isSpringBond(i)) {
        dx = x2 - x1;
        dy = y2 - y1;
        length = Math.sqrt(dx*dx + dy*dy);
        costheta = dx / length;
        sintheta = dy / length;
        var delta = length / numSpikes;
        path = "M "+x1+","+y1+" " ;
        for (var i = 0; i < numSpikes; i++) {
          if (i % 2 == 0) {
            pointX = x1 + (i + 0.5) * costheta * delta - 0.5 * sintheta * numSpikes;
            pointY = y1 + (i + 0.5) * sintheta * delta + 0.5 * costheta * numSpikes;
          }
          else {
            pointX = x1 + (i + 0.5) * costheta * delta + 0.5 * sintheta * numSpikes;
            pointY = y1 + (i + 0.5) * sintheta * delta - 0.5 * costheta * numSpikes;
          }
          lineTo = " L "+pointX+","+pointY;
          path += lineTo
        }
        return path += " L "+x2+","+y2;
      }
      else {
        if(num ==1) {
          return "M "+x1+","+y1+" L "+((x2+x1)/2)+" , "+((y2+y1)/2);
        } else {
          return "M "+((x2+x1)/2)+" , "+((y2+y1)/2)+" L "+x2+","+y2;
        }
      }
    }

    function isSpringBond(i){
      if ((Math.ceil(get_radial_bond_length(i) > 0.3 )) && (get_radial_bond_strength(i) < 2000 )) {
        return true;
      }
      else {
        return false;
      }
    }

    function drawAttractionForces(){
      var vdwPairs = mock_vdw_pairs_array.length;
      var atom1;
      var atom2;
      for(var i = 0;i < vdwPairs;i++){
        atom1 = get_vdw_line_atom_1(i);
        atom2 = get_vdw_line_atom_2(i);
        if(!(atom1 === 0 && atom2 === 0)) {
          VDWLines_container.append("line")
            .attr("class", "attractionforce")
            .attr("x1", x(get_x(atom1)))
            .attr("y1", y(get_y(atom1)))
            .attr("x2", x(get_x(atom2)))
            .attr("y2", y(get_y(atom2)))
            .style("stroke-width", 2*scaling_factor)
            .style("stroke-dasharray", 3*scaling_factor+" "+2*scaling_factor);
        }
      }
    }

    function drawImageAttachment(){
      var imgHostIndex_i, img, img_height, img_width;
      var numImages = imageProp.length;
      for(var i = 0;i < numImages;i++) {
        imgHostIndex_i =  imageProp[i].imageHostIndex;
        img = new Image();
        img.src = imagePath+imageProp[i].imageUri;
          img.onload = function() {
            image_container.selectAll("image.image_attach").remove();
            img_width = img.width*scaling_factor;
            img_height = img.height*scaling_factor;
            image_container.append("image")
              .attr("x",  (x(get_x(imgHostIndex_i))-img_width/2))
              .attr("y",  (y(get_y(imgHostIndex_i))-img_height/2))
              .attr("class", "image_attach draggable")
              .attr("xlink:href", img.src)
              .attr("width", img_width)
              .attr("height", img_height)
              .attr("pointer-events", "none");
          }
      }
    }

    function setup_drawables() {
      setup_obstacles();
      if(drawVdwLines){
        setup_vdw_pairs();
      }
      setup_radial_bonds();
      setup_particles();
      updateHeatBath();
      if(imageProp && imageProp.length!=0){
        drawImageAttachment()
      }
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
            });
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
      gradient_container.selectAll("path.radialbond").remove();
      gradient_container.selectAll("path.radialbond1").remove();

      radialBonds = getRadialBonds();

      if (!radialBonds) return;

      mock_radial_bond_array.length = radialBonds[0].length;

      radialBond = gradient_container.selectAll("path.radialbond").data(mock_radial_bond_array);

      radialBondEnter(radialBond);
    }

    function setup_vdw_pairs() {
      VDWLines_container.selectAll("line.attractionforce").remove();

      vdwPairs = getVdwPairs();

      if (!vdwPairs) return;

      mock_vdw_pairs_array.length = vdwPairs[0].length;

      drawAttractionForces();
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
            .style("background", "rgba(100%, 100%, 100%, 0.7)")
            .style("left", x(nodes[model.INDICES.X][i]) + offset_left + 16 + "px")
            .style("top",  y(nodes[model.INDICES.Y][i]) + offset_top - 30 + "px")
            .style("zIndex", 100)
            .transition().duration(250);

      molecule_div_pre.text(
          "atom: " + i + "\n" +
          "time: " + modelTimeLabel() + "\n" +
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
        molecule_div.style("opacity", 1e-6).style("zIndex" -1);
      }
    }

    function update_drawable_positions() {
      setup_obstacles();
      if(drawVdwLines){
        setup_vdw_pairs();
      }
      update_radial_bonds();
      update_molecule_positions();
      if(imageProp && imageProp.length!=0){
      updateImageAttachment();
      }
      }

    function update_molecule_positions() {
      var gradientBoolean = gradient_container.selectAll("circle")[0].length;

      mock_atoms_array.length = get_num_atoms();
      nodes = get_nodes();

      // update model time display
      if (options.showClock) {
        time_label.text(modelTimeLabel());
      }

      label = elem.selectAll("g.label").data(mock_atoms_array);

      label.attr("transform", function(d, i) {
        return "translate(" + x(get_x(i)) + "," + y(get_y(i)) + ")";
      });

      particle = gradient_container.selectAll("circle").data(mock_atoms_array);
      if (mock_atoms_array.length !== gradientBoolean) {
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
      gradient_container.selectAll("path.radialbond")
        .attr("d", function (d, i) { return findPoints(i,1);});

      gradient_container.selectAll("path.radialbond1")
        .attr("d", function (d, i) { return findPoints(i,2);});
    }
    function updateImageAttachment(){
      var numImages, imgHostIndex_i, img;
        numImages= imageProp.length;
      for(var i = 0;i < numImages;i++) {
        imgHostIndex_i =  imageProp[i].imageHostIndex
        img = new Image();
        img.src =   imagePath+imageProp[i].imageUri;
        img_width = img.width*scaling_factor;
        img_height = img.height*scaling_factor;
        image_container.selectAll("image.draggable")
          .attr("x", (x(get_x(imgHostIndex_i))-img_width/2))
          .attr("y", (y(get_y(imgHostIndex_i))-img_height/2))
      }
    }

    function node_dragstart(d, i) {
      if (!is_stopped()) {
        // if we're running, add a spring force
        if (get_draggable(i)) {
          model.addSpringForce(i, get_x(i), get_y(i), 2000);
        }
      } else {
        // if we're stopped, drag the atom
        drag_origin = [get_x(i), get_y(i)];
      }
    }

    function node_drag(d, i){
      if (!is_stopped()) {
        if (get_draggable(i)) {
          var click_x = x.invert(d3.event.x),
              click_y = y.invert(d3.event.y);

          // here we just assume we are updating the one and only spring force.
          // This assumption will have to change if we can have more than one
          model.updateSpringForce(0, click_x, click_y);
        }
        return;
      }

      var dragTarget = d3.select(this),
          new_x, new_y;

      dragTarget
        .attr("cx", function(){return d3.event.x; })
        .attr("cy", function(){return d3.event.y; });

      molecule_div
            .style("left", x(nodes[model.INDICES.X][i]) + offset_left + 16 + "px")
            .style("top",  y(nodes[model.INDICES.Y][i]) + offset_top - 30 + "px");

      new_x = x.invert(dragTarget.attr('cx'));
      new_y = y.invert(dragTarget.attr('cy'));
      set_position(i, new_x, new_y, false, true);

      update_drawable_positions();
    }

    function node_dragend(d, i){
      if (!is_stopped()) {
        // here we just assume we are removing the one and only spring force.
        // This assumption will have to change if we can have more than one
        if (get_draggable(i)) {
          model.removeSpringForce(0);
        }
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
    container.outerNode = outerElement.node();
    container.updateMoleculeRadius = updateMoleculeRadius;
    container.setup_drawables = setup_drawables;
    container.update_drawable_positions = update_drawable_positions;
    container.scale = scale;
    container.playback_component = playback_component;
    container.options = options;
    container.processOptions = processOptions;
  }

  container.resize = function(w, h) {
    if (options.fit_to_parent) {
      outerElement.style('width', w+'px');
    } else {
      container.scale(w, h);
    }
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
