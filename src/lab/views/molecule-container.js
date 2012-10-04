/*globals d3 */
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
      image_container_below,
      image_container_top,
      red_gradient,
      blue_gradient,
      green_gradient,
      gradientNameForElement,
      // Set of gradients used for Kinetic Energy Shading.
      gradientNameForKELevel = [],
      // Number of gradients used for Kinetic Energy Shading.
      KE_SHADING_STEPS = 25,
      atom_tooltip_on,
      offset_left, offset_top,
      particle, label, labelEnter, tail,
      molRadius,
      molecule_div, molecule_div_pre,
      get_num_atoms,
      results,
      radialBondResults,
      set_atom_properties,
      is_stopped,
      obstacle,
      obstacles,
      get_obstacles,
      mock_obstacles_array = [],
      mock_radial_bond_array = [],
      radialBond1, radialBond2,
      vdwLine,
      vdwPairs,
      chargeShadingMode,
      chargeShadingChars = ["+", "-", ""],
      keShadingMode,
      drawVdwLines,
      getRadialBonds,
      imageProp,
      textBoxes,
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
      },

      model,
      model_md2d_results_RADIUS,
      model_md2d_results_PX,
      model_md2d_results_PY,
      model_md2d_results_X,
      model_md2d_results_Y,
      model_md2d_results_VX,
      model_md2d_results_VY,
      model_md2d_results_SPEED,
      model_md2d_results_AX,
      model_md2d_results_AY,
      model_md2d_results_CHARGE,
      model_md2d_results_FRICTION,
      model_md2d_results_VISIBLE,
      model_md2d_results_MARKED,
      model_md2d_results_DRAGGABLE,
      model_md2d_results_ELEMENT,
      model_md2d_results_MASS;

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

    model = options.model;

    // The model function get_results() returns a 2 dimensional array
    // of atom indices and properties that is update everymodel tick.
    // This array is not garbage collected so the view can be assured that
    // the latest results will be in this array when the view is executing
    results = options.get_results();
    radialBondResults = options.get_radial_bond_results();

    get_obstacles = options.get_obstacles;
    getRadialBonds = options.get_radial_bonds;
    getVdwPairs = options.get_vdw_pairs;
    set_atom_properties = options.set_atom_properties;
    is_stopped = options.is_stopped;
    imageProp = options.images;
    textBoxes = options.textBoxes || [];
    if (options.interactiveUrl) {
      interactiveUrl = options.interactiveUrl;
      imagePath = interactiveUrl.slice(0,interactiveUrl.lastIndexOf("/")+1);
    }
    if (!options.showClock) {
      options.showClock = model.get("showClock");
    }

    model_md2d_results_RADIUS   = model.INDICES.RADIUS+1;
    model_md2d_results_PX       = model.INDICES.PX+1;
    model_md2d_results_PY       = model.INDICES.PY+1;
    model_md2d_results_X        = model.INDICES.X+1;
    model_md2d_results_Y        = model.INDICES.Y+1;
    model_md2d_results_VX       = model.INDICES.VX+1;
    model_md2d_results_VY       = model.INDICES.VY+1;
    model_md2d_results_SPEED    = model.INDICES.SPEED+1;
    model_md2d_results_AX       = model.INDICES.AX+1;
    model_md2d_results_AY       = model.INDICES.AY+1;
    model_md2d_results_CHARGE   = model.INDICES.CHARGE+1;
    model_md2d_results_FRICTION = model.INDICES.FRICTION+1;
    model_md2d_results_VISIBLE  = model.INDICES.VISIBLE+1;
    model_md2d_results_MARKED   = model.INDICES.MARKED+1;
    model_md2d_results_DRAGGABLE= model.INDICES.DRAGGABLE+1;
    model_md2d_results_ELEMENT  = model.INDICES.ELEMENT+1;
    model_md2d_results_MASS     = model.INDICES.MASS+1;
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
    return [cx, cy, width, height];
  }

  function modelTimeLabel() {
    return time_prefix + model_time_formatter(model.getTime()) + time_suffix;
  }

  function set_position(i, xpos, ypos, checkPosition, moveMolecule) {
    return set_atom_properties(i, {x: xpos, y: ypos}, checkPosition, moveMolecule);
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

      vis.append("image")
        .attr("x", 5)
        .attr("id", "heat_bath")
        .attr("y", 5)
        .attr("width", "3%")
        .attr("height", "3%")
        .attr("xlink:href", "../../resources/heatbath.gif");

      model.addPropertiesListener(["temperature_control"], updateHeatBath);
      model.addPropertiesListener(["keShading", "chargeShading"], updateParticleShading);

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
          // Scale used for Kinetic Energy Shading gradients.
      var medColorScale = d3.scale.linear()
            .interpolate(d3.interpolateRgb)
            .range(["#F2F2F2", "#FF8080"]),
          // Scale used for Kinetic Energy Shading gradients.
          darkColorScale = d3.scale.linear()
            .interpolate(d3.interpolateRgb)
            .range(["#A4A4A4", "#FF2020"]),
          gradientName,
          KELevel,
          i;

      image_container_below = vis.append("g");
      image_container_below.attr("class", "image_container_below");
      VDWLines_container = vis.append("g");
      VDWLines_container.attr("class", "VDWLines_container");

      gradient_container = vis.append("svg")
          .attr("class", "container")
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height);

      // Charge gradients
      create_radial_gradient("neg-grad", "#ffefff", "#fdadad", "#e95e5e", gradient_container);
      create_radial_gradient("pos-grad", "#dfffff", "#9abeff", "#767fbf", gradient_container);
      create_radial_gradient("neutral-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", gradient_container);

      // "Marked" atom gradient
      create_radial_gradient("mark-grad", "#FEE0D2", "#FC9272", "#DE2D26", gradient_container);

      // Element gradients
      create_radial_gradient("green-grad", "#dfffef", "#75a643", "#2a7216", gradient_container);
      create_radial_gradient("purple-grad", "#EED3F0", "#D941E0", "#84198A", gradient_container);
      create_radial_gradient("aqua-grad", "#DCF5F4", "#41E0D8", "#12827C", gradient_container);
      create_radial_gradient("orange-grad", "#F0E6D1", "#E0A21B", "#AD7F1C", gradient_container);

      // Kinetic Energy Shading gradients
      for (i = 0; i < KE_SHADING_STEPS; i++) {
        gradientName = "ke-shading-" + i;
        KELevel = i / KE_SHADING_STEPS;
        create_radial_gradient(gradientName, "#FFFFFF", medColorScale(KELevel),
          darkColorScale(KELevel), gradient_container);
        // Different from gradientNameForElement names convention, but
        // it allows to avoid constructing final string during each update
        // of atom shading.
        gradientNameForKELevel[i] = "url('#" + gradientName + "')";
      }

      gradientNameForElement = ["green-grad", "purple-grad", "aqua-grad", "orange-grad"];
      bondColorArray = ["#538f2f", "#aa2bb1", "#2cb6af", "#b3831c", "#7781c2", "#ee7171"];
      image_container_top = vis.append("g");
      image_container_top.attr("class", "image_container_top");
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

    // Returns gradient appropriate for a given atom.
    // d - atom data.
    function getParticleGradient(d) {
        var ke, keIndex, charge;

        if (d[model_md2d_results_MARKED]) return "url(#mark-grad)";

        if (keShadingMode) {
          ke  = model.getAtomKineticEnergy(d[0]),
          // Convert Kinetic Energy to [0, 1] range
          // using empirically tested transformations.
          // K.E. shading should be similar to the classic MW K.E. shading.
          keIndex = Math.min(5 * ke, 1);

          return gradientNameForKELevel[Math.round(keIndex * (KE_SHADING_STEPS - 1))];
        }

        if (chargeShadingMode) {
          charge = d[model_md2d_results_CHARGE];

          if (charge === 0) return "url(#neutral-grad)";
          return charge > 0 ? "url(#pos-grad)" : "url(#neg-grad)";
        }

        return "url('#"+gradientNameForElement[d[model_md2d_results_ELEMENT] % 4]+"')";
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

    // Update shading modes and redraws particles.
    function updateParticleShading() {
      // Update model properties related to shading.
      chargeShadingMode = model.get("chargeShading");
      keShadingMode = model.get("keShading");

      // Update style of each particle.
      particle.style("fill", getParticleGradient);
    }

    function updateMoleculeRadius() {
      vis.selectAll("circle").data(results).attr("r",  function(d) { return x(d[model_md2d_results_RADIUS]); });
      // vis.selectAll("text").attr("font-size", x(molRadius * 1.3) );
    }

    /**
      Call this wherever a d3 selection is being used to add circles for atoms
    */

    function particleEnter() {
      particle.enter().append("circle")
          .attr({
            "class": "draggable",
            "r":  function(d) { return x(d[model_md2d_results_RADIUS]); },
            "cx": function(d) { return x(d[model_md2d_results_X]); },
            "cy": function(d) { return y(d[model_md2d_results_Y]); }
          })
          .style({
            "fill-opacity": function(d) { return d[model_md2d_results_VISIBLE]; },
            "fill": getParticleGradient
          })
          .on("mousedown", molecule_mousedown)
          .on("mouseover", molecule_mouseover)
          .on("mouseout", molecule_mouseout)
          .call(d3.behavior.drag()
            .on("dragstart", node_dragstart)
            .on("drag", node_drag)
            .on("dragend", node_dragend)
          );
    }

    function obstacleEnter() {
      obstacle.enter().append("rect")
          .attr({
            "x": function(d, i) { return x(get_obstacle_x(i)); },
            "y": function(d, i) { return y(get_obstacle_y(i) + get_obstacle_height(i)); },
            "width": function(d, i) {return x(get_obstacle_width(i)); },
            "height": function(d, i) {return y_flip(get_obstacle_height(i)); }
          })
          .style({
            "fill": function(d, i) { return get_obstacle_visible(i) ? get_obstacle_color(i) : "rgba(128,128,128, 0)"; },
            "stroke-width": function(d, i) { return get_obstacle_visible(i) ? 0.2 : 0.0; },
            "stroke": function(d, i) { return get_obstacle_visible(i) ? get_obstacle_color(i) : "rgba(128,128,128, 0)"; }
          })
    }

    function radialBondEnter() {
      radialBond1.enter().append("path")
          .attr("d", function (d, i) {
            return findPoints(d,1);})
          .attr("class", "radialbond1")
          .style("stroke-width", function (d, i) {
            if (isSpringBond(d)) {
              return 0.3 * scaling_factor;
            } else {
              return x(results[d[1]][model_md2d_results_RADIUS]) * 0.75;
            }
          })
          .style("stroke", function(d, i) {
            var charge, element, grad;
            if (isSpringBond(d)) {
              return "#000000";
            } else {
              if (chargeShadingMode) {
                charge = results[d[1]][model_md2d_results_CHARGE];
                if (charge > 0) {
                    return  bondColorArray[4];
                } else if (charge < 0){
                    return  bondColorArray[5];
                } else {
                  return "#A4A4A4";
                }
              } else {
                element = results[d[1]][model_md2d_results_ELEMENT] % 4;
                grad = bondColorArray[element];
                return grad;
              }
            }
          })
          .style("fill", "none");

      radialBond2.enter().append("path")
          .attr("d", function (d) {
            return findPoints(d,2); })
          .attr("class", "radialbond2")
          .style("stroke-width", function (d, i) {
            if (isSpringBond(d)) {
              return 0.3 * scaling_factor;
            } else {
              return x(results[d[2]][model_md2d_results_RADIUS]) * 0.75;
            }
          })
          .style("stroke", function(d, i) {
            var charge, element, grad;
            if (isSpringBond(d)) {
              return "#000000";
            } else {
              if (chargeShadingMode) {
                charge = results[d[2]][model_md2d_results_CHARGE];
                if (charge > 0) {
                    return  bondColorArray[4];
                } else if (charge < 0){
                    return  bondColorArray[5];
                } else {
                  return "#A4A4A4";
                }
              } else {
                element = results[d[2]][model_md2d_results_ELEMENT] % 4;
                grad = bondColorArray[element];
                return grad;
              }
            }
          })
          .style("fill", "none");
    }

    function findPoints(d, num) {
      var pointX, pointY,
          j,
          dx, dy,
          x1, x2,
          y1, y2,
          lineTo,
          path,
          costheta,
          sintheta,
          length, numSpikes = 10;

      x1 = x(d[5]);
      y1 = y(d[6]);
      x2 = x(d[7]);
      y2 = y(d[8]);

      if (isSpringBond(d)) {
        dx = x2 - x1;
        dy = y2 - y1;
        length = Math.sqrt(dx*dx + dy*dy)/scaling_factor;
        costheta = dx / length;
        sintheta = dy / length;
        var delta = length / numSpikes;
        path = "M "+x1+","+y1+" " ;
        for (j = 0; j < numSpikes; j++) {
          if (j % 2 === 0) {
            pointX = x1 + (j + 0.5) * costheta * delta - 0.5 * sintheta * numSpikes;
            pointY = y1 + (j + 0.5) * sintheta * delta + 0.5 * costheta * numSpikes;
          }
          else {
            pointX = x1 + (j + 0.5) * costheta * delta + 0.5 * sintheta * numSpikes;
            pointY = y1 + (j + 0.5) * sintheta * delta - 0.5 * costheta * numSpikes;
          }
          lineTo = " L "+pointX+","+pointY;
          path += lineTo;
        }
        return path += " L "+x2+","+y2;
      } else {
        if (num === 1) {
          return "M "+x1+","+y1+" L "+((x2+x1)/2)+" , "+((y2+y1)/2);
        } else {
          return "M "+((x2+x1)/2)+" , "+((y2+y1)/2)+" L "+x2+","+y2;
        }
      }
    }

    function isSpringBond(d){
      if ((Math.ceil(d[4] > 0.3 )) && (d[4] < 2000 )) {
        return true;
      }
      else {
        return false;
      }
    }

    function drawAttractionForces() {
      if (!vdwPairs) return;

      var numVdwPairs = vdwPairs[model.VDW_INDICES.COUNT],
          atom1,
          atom2,
          i;

      for (i = 0; i < numVdwPairs; i++) {
        atom1 = get_vdw_line_atom_1(i);
        atom2 = get_vdw_line_atom_2(i);

        if (atom1 !== 0 || atom2 !== 0) {
          VDWLines_container.append("line")
            .attr("class", "attractionforce")
            .attr("x1", x(results[atom1][model_md2d_results_X]))
            .attr("y1", y(results[atom1][model_md2d_results_Y]))
            .attr("x2", x(results[atom2][model_md2d_results_X]))
            .attr("y2", y(results[atom2][model_md2d_results_Y]))
            .style("stroke-width", 2 * scaling_factor)
            .style("stroke-dasharray", 3 * scaling_factor + " " + 2 * scaling_factor);
        }
      }
    }

    function drawImageAttachment() {
      var img = [],
          img_height,
          img_width,
          imgHost,
          imgHostType,
          imglayer,
          imgX,
          img,
          i;

      image_container_top.selectAll("image").remove();
      image_container_below.selectAll("image").remove();

      if (!imageProp) return;

      for (i = 0; i < imageProp.length; i++) {
        img[i] = new Image();
        img[i].src = imagePath+imageProp[i].imageUri;
        img[i].onload = (function(i) {
          return function() {
            image_container_top.selectAll("image.image_attach"+i).remove();
            image_container_below.selectAll("image.image_attach"+i).remove();

            imgHost = results[imageProp[i].imageHostIndex];
            imgHostType = imageProp[i].imageHostType;
            imglayer = imageProp[i].imageLayer;
            imgX = imageProp[i].imageX;
            imgY = imageProp[i].imageY;
            img_width = img[i].width * scaling_factor;
            img_height = img[i].height * scaling_factor;

            if (imglayer === 1) {
              image_container_top.append("image")
                .attr("x", function() { if (imgHostType === "") { return imgX; } else { return (x(imgHost[model_md2d_results_X])-img_width/2); } })
                .attr("y", function() { if (imgHostType === "") { return imgY; } else { return (y(imgHost[model_md2d_results_Y])-img_height/2); } })
                .attr("class", "image_attach"+i+" draggable")
                .attr("xlink:href", img[i].src)
                .attr("width", img_width)
                .attr("height", img_height)
                .attr("pointer-events", "none");
            } else {
              image_container_below.append("image")
                .attr("x", function() { if (imgHostType === "") { return imgX; } else { return (x(imgHost[model_md2d_results_X])-img_width/2); } })
                .attr("y", function() { if (imgHostType === "") { return imgY; } else { return (y(imgHost[model_md2d_results_Y])-img_height/2); } })
                .attr("class", "image_attach"+i+" draggable")
                .attr("xlink:href", img[i].src)
                .attr("width", img_width)
                .attr("height", img_height)
                .attr("pointer-events", "none");
            }
          };
        })(i);
      }
    }

    function drawTextBoxes() {
      var htmlObjects, textBox, size;

      size = model.size();

      // Curiously, selector "foreignObject.textBox" doesn't return the foreignObjects
      htmlObjects = gradient_container.selectAll(".textBox").data(textBoxes);

      htmlObjects.enter().append("foreignObject")
        .attr("class", "textBox")
        .append("xhtml:body");

      htmlObjects.exit().remove();

      // For the time being, make all text boxes cover the screen
      htmlObjects.attr({
        width:  x(size[0]),
        height: y(-size[1])
      }).each(function(d) {
        d3.select(this).select("body")
          .attr("class", "textBoxBody")
          .html(d.text)
          // layout.js (used by embeddables) sets font-size of all 'body' elements.
          // The line below can be removed when layout is fiexed.
          .style("font-size", "inherit");
      });
    }

    function drawClock() {
      // add model time display
      vis.selectAll('.modelTimeLabel').remove();

      if (options.showClock) {
        time_label = vis.append("text")
          .attr("class", "modelTimeLabel")
          .text(modelTimeLabel())
          .attr("x", 10)
          .attr("y", size.height - 35)
          .attr("dy","2.4em")
          .style("text-anchor","start");
      }
    }

    function setup_drawables() {
      obstacles = get_obstacles();
      setup_obstacles();
      setup_vdw_pairs();
      setup_radial_bonds();
      setup_particles();
      updateHeatBath();
      drawImageAttachment();
      drawClock();
      drawTextBoxes();
    }

    function setup_particles() {
      var textShrinkFactor = results.length <= 100 ? 1 : 0.9;

      chargeShadingMode = model.get("chargeShading");
      keShadingMode = model.get("keShading");
      drawVdwLines = model.get("showVDWLines");

      gradient_container.selectAll("circle").remove();
      gradient_container.selectAll("g").remove();

      particle = gradient_container.selectAll("circle").data(results);

      particleEnter();

      label = gradient_container.selectAll("g.label")
          .data(results);

      labelEnter = label.enter().append("g")
          .attr("class", "label")
          .attr("transform", function(d) {
            return "translate(" + x(d[model_md2d_results_X]) + "," + y(d[model_md2d_results_Y]) + ")";
          });

      if (options.atom_mubers) {
        labelEnter.append("text")
            .attr("class", "index")
            .attr("font-size", function(d) { return 1.6 * textShrinkFactor * x(d[model_md2d_results_RADIUS]); })
            .attr("style", "font-weight: bold; opacity: .7")
            .attr("x", 0)
            .attr("y", "0.31em")
            .attr("pointer-events", "none")
            .text(d[0]);
      } else {
        labelEnter.append("text")
            .attr("class", "index")
            .attr("font-size", function(d) { return 1.6 * x(d[model_md2d_results_RADIUS]); })
            .attr("style", "font-weight: bold; opacity: .7")
            .attr("x", "-0.31em")
            .attr("y", "0.31em")
            .attr("pointer-events", "none")
            .text(function(d) {
                var charge = d[model_md2d_results_CHARGE];
                // Draw +/- signs also when KE shading is enabled.
                if (chargeShadingMode || keShadingMode) {
                    if (charge > 0){
                        return  "+";
                    } else if (charge < 0){
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
      if (obstacles) {
        mock_obstacles_array.length = obstacles[0].length;
        obstacle = gradient_container.selectAll("rect").data(mock_obstacles_array);
        obstacleEnter();
      }
    }

    function setup_radial_bonds() {
      gradient_container.selectAll("path.radialbond1").remove();
      gradient_container.selectAll("path.radialbond2").remove();
      radialBonds = getRadialBonds();
      radialBondResults = options.get_radial_bond_results();
      if (radialBondResults) {
        radialBond1 = gradient_container.selectAll("path.radialbond1").data(radialBondResults);
        radialBond2 = gradient_container.selectAll("path.radialbond2").data(radialBondResults);
        radialBondEnter();
      }
    }

    function setup_vdw_pairs() {
      update_vdw_pairs();
    }

    function update_vdw_pairs() {
      VDWLines_container.selectAll("line.attractionforce").remove();
      vdwPairs = getVdwPairs();
      drawAttractionForces();
    }

    function mousedown() {
      node.focus();
    }

    function molecule_mouseover(d, i) {
      if (options.enableAtomTooltips) {
        render_atom_tooltip(i);
      }
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
            .style("left", x(results[i][model_md2d_results_X]) + offset_left + 60 + "px")
            .style("top",  y(results[i][model_md2d_results_Y]) + offset_top - 30 + "px")
            .style("zIndex", 100)
            .transition().duration(250);

      molecule_div_pre.text(
          "atom: " + i + "\n" +
          "time: " + modelTimeLabel() + "\n" +
          "speed: " + d3.format("+6.3e")(results[i][model_md2d_results_SPEED]) + "\n" +
          "vx:    " + d3.format("+6.3e")(results[i][model_md2d_results_VX])    + "\n" +
          "vy:    " + d3.format("+6.3e")(results[i][model_md2d_results_VY])    + "\n" +
          "ax:    " + d3.format("+6.3e")(results[i][model_md2d_results_AX])    + "\n" +
          "ay:    " + d3.format("+6.3e")(results[i][model_md2d_results_AY])    + "\n"
        );
    }

    function molecule_mousemove(d) {
    }

    function molecule_mouseout() {
      if (!atom_tooltip_on && atom_tooltip_on !== 0) {
        molecule_div.style("opacity", 1e-6).style("zIndex" -1);
      }
    }

    function update_drawable_positions() {
      if (obstacles) {
        obstacle
            .attr("x", function(d, i) { return x(get_obstacle_x(i)); })
            .attr("y", function(d, i) { return y(get_obstacle_y(i) + get_obstacle_height(i)); });
      }

      if (drawVdwLines) {
        setup_vdw_pairs();
      }
      if (radialBondResults) {
        update_radial_bonds();
      }
      update_molecule_positions();
      if(imageProp && imageProp.length !== 0) {
        updateImageAttachment();
      }
    }

    // TODO: this function name seems to be inappropriate to
    // its content.
    function update_molecule_positions() {
      // update model time display
      if (options.showClock) {
        time_label.text(modelTimeLabel());
      }

      particle.attr({
        "cx": function(d) { return x(d[model_md2d_results_X]); },
        "cy": function(d) { return y(d[model_md2d_results_Y]); }
      });

      // When Kinetic Energy Shading is enabled, update style of atoms
      // during each frame.
      if (keShadingMode) {
        particle.style("fill", getParticleGradient);
      }

      label.attr("transform", function(d, i) {
        return "translate(" + x(d[model_md2d_results_X]) + "," + y(d[model_md2d_results_Y]) + ")";
      });

      if (atom_tooltip_on === 0 || atom_tooltip_on > 0) {
        render_atom_tooltip(atom_tooltip_on);
      }
    }

    function update_radial_bonds() {
      radialBond1.attr("d", function (d) { return findPoints(d,1); });
      radialBond2.attr("d", function (d) { return findPoints(d,2); });
    }

    function updateImageAttachment(){
      var numImages, img, img_height, img_width, imgHost, imgHostType, imglayer, imgX, imgY;
      numImages= imageProp.length;
      for(var i = 0;i < numImages;i++) {
        imgHost =  results[imageProp[i].imageHostIndex];
        imgHostType =  imageProp[i].imageHostType;
        imgX =  imageProp[i].imageX;
        imgY =  imageProp[i].imageY;
        imglayer =  imageProp[i].imageLayer;
        img = new Image();
        img.src =   imagePath+imageProp[i].imageUri;
        img_width = img.width*scaling_factor;
        img_height = img.height*scaling_factor;
        if(imglayer == 1) {
          image_container_top.selectAll("image.image_attach"+i)
          .attr("x",  function() { if (imgHostType === "") { return imgX; } else { return (x(imgHost[model_md2d_results_X])-img_width/2); } })
          .attr("y",  function() { if (imgHostType === "") { return imgY; } else { return (y(imgHost[model_md2d_results_Y])-img_height/2); } });
        } else {
          image_container_below.selectAll("image.image_attach"+i)
            .attr("x",  function() { if (imgHostType === "") { return imgX; } else { return (x(imgHost[model_md2d_results_X])-img_width/2); } })
            .attr("y",  function() { if (imgHostType === "") { return imgY; } else { return (y(imgHost[model_md2d_results_Y])-img_height/2); } });
        }
      }
    }

    function node_dragstart(d, i) {
      if ( is_stopped() ) {
        // cache the *original* atom position so we can go back to it if drag is disallowed
        drag_origin = [d[model_md2d_results_X], d[model_md2d_results_Y]];
      }
      else if ( d[model_md2d_results_DRAGGABLE] ) {
        model.liveDragStart(i);
      }
    }

    /**
      Given x, y, and a bounding box (object with keys top, left, bottom, and right relative to
      (x, y), returns an (x, y) constrained to keep the bounding box within the molecule container.
    */
    function dragBoundingBox(x, y, bbox) {
      if (bbox.left + x < options.xmin)   x = options.xmin - bbox.left;
      if (bbox.right + x > options.xmax)  x = options.xmax - bbox.right;
      if (bbox.bottom + y < options.ymin) y = options.ymin - bbox.bottom;
      if (bbox.top + y > options.ymax)    y = options.ymax - bbox.top;

      return { x: x, y: y };
    }

    function clip(value, min, max) {
      if (value < min) return min;
      if (value > max) return max;
      return value;
    }

    /**
      Given x, y, make sure that x and y are clipped to remain within the model container's
      boundaries
    */
    function dragPoint(x, y) {
      return { x: clip(x, options.xmin, options.xmax), y: clip(y, options.ymin, options.ymax) };
    }

    function node_drag(d, i) {
      var dragX = x.invert(d3.event.x),
          dragY = y.invert(d3.event.y),
          drag;

      if ( is_stopped() ) {
        drag = dragBoundingBox(dragX, dragY, model.getMoleculeBoundingBox(i));
        set_position(i, drag.x, drag.y, false, true);
        update_drawable_positions();
      }
      else if ( d[model_md2d_results_DRAGGABLE] ) {
        drag = dragPoint(dragX, dragY);
        model.liveDrag(drag.x, drag.y);
      }
    }

    function node_dragend(d, i) {
      var dragX,
          dragY;

      if ( is_stopped() ) {

        if (!set_position(i, d[model_md2d_results_X], d[model_md2d_results_Y], true, true)) {
          alert("You can't drop the atom there");     // should be changed to a nice Lab alert box
          set_position(i, drag_origin[0], drag_origin[1], false, true);
        }
        update_drawable_positions();
      }
      else if ( d[model_md2d_results_DRAGGABLE] ) {
        // here we just assume we are removing the one and only spring force.
        // This assumption will have to change if we can have more than one.
        model.liveDragEnd();
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
    container.processOptions();
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
