(function(){

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

layout = { version: "0.0.1" };

layout.selection = "";

layout.display = {};

layout.canonical = {
  width:  1280,
  height: 800
};

layout.regular_display = false;

layout.not_rendered = true;
layout.fontsize = false;
layout.cancelFullScreen = false;
layout.screen_factor = 1;
layout.checkbox_factor = 1.1;
layout.checkbox_scale = 1.1;

layout.canonical.width  = 1280;
layout.canonical.height = 800;

layout.getDisplayProperties = function(obj) {
  if (!arguments.length) {
    var obj = {};
  }
  obj.screen = {
      width:  screen.width,
      height: screen.height
  };
  obj.client = {
      width:  document.body.clientWidth,
      height: document.body.clientHeight
  };
  obj.window = {
      width:  document.width,
      height: document.height
  };
  obj.page = {
      width: layout.getPageWidth(),
      height: layout.getPageHeight()
  };
  return obj;
};

layout.checkForResize = function() {
  if ((layout.display.screen.width  != screen.width) ||
      (layout.display.screen.height != screen.height) ||
      (layout.display.window.width  != document.width) ||
      (layout.display.window.height != document.height)) {
    layout.setupScreen();
  }
};

layout.setupScreen = function(layout_selection) {
  var fullscreen = document.fullScreen ||
                   document.webkitIsFullScreen ||
                   document.mozFullScreen;

  layout.display = layout.getDisplayProperties();

  if (!layout.regular_display) {
    layout.regular_display = layout.getDisplayProperties();
  }


  if(fullscreen) {
    layout.screen_factor = layout.display.screen.width / layout.canonical.width;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    layout.bodycss.style.fontSize = layout.screen_factor + 'em';
    layout.not_rendered = true;
    switch (layout.selection) {

      case "simple-screen":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      case "simple-static-screen":
      if (layout.not_rendered) {
        setupSimpleFullScreenMoleculeContainer();
        setupDescriptionRight();
      }
      break;

      case "simple-iframe":
      setupSimpleFullScreenMoleculeContainer();
      setupFullScreenDescriptionRight();
      break;

      default:
      setupFullScreenMoleculeContainer();
      setupFullScreenPotentialChart();
      setupFullScreenSpeedDistributionChart();
      setupFullScreenKEChart();
      break;
    }
  } else {
    if (layout.cancelFullScreen) {
      layout.cancelFullScreen = false;
      layout.regular_display = layout.previous_display;
    } else {
      layout.regular_display = layout.getDisplayProperties();
    }
    layout.screen_factor = layout.regular_display.page.width / layout.canonical.width;
    layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
    switch (layout.selection) {

      case "simple-screen":
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupSimpleMoleculeContainer();
      setupDescriptionRight();
      break;

      case "simple-static-screen":
      if (layout.not_rendered) {
        layout.bodycss.style.fontSize = layout.screen_factor + 'em';
        setupSimpleMoleculeContainer();
        setupDescriptionRight();
        layout.not_rendered = false;
      }
      break;

      case "simple-iframe":
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupSimpleIFrameMoleculeContainer();
      break;

      case "full-static-screen":
      if (layout.not_rendered) {
        layout.bodycss.style.fontSize = layout.screen_factor + 'em';
        setupRegularScreenMoleculeContainer();
        setupRegularScreenPotentialChart();
        setupRegularSpeedDistributionChart();
        setupRegularScreenKEChart();
        layout.not_rendered = false;
      }
      break;

      default:
      layout.bodycss.style.fontSize = layout.screen_factor + 'em';
      setupRegularScreenMoleculeContainer();
      setupRegularScreenPotentialChart();
      setupRegularSpeedDistributionChart();
      setupRegularScreenKEChart();
      break;
    }
    layout.regular_display = layout.getDisplayProperties();
  }
  if (layout.transform) {
    $('input[type=checkbox]').css(layout.transform, 'scale(' + layout.checkbox_factor + ',' + layout.checkbox_factor + ')');
  }
  layout.setupTemperature();
  if (benchmarks_table) {
    benchmarks_table.style.display = "none";
  }

  //
  // Regular Screen Layout
  //
  function setupRegularScreenMoleculeContainer() {
    molecule_container.resize(layout.display.page.width * 0.42, layout.display.page.width * 0.40 - 4);
  }

  function setupRegularScreenPotentialChart() {
    lj_potential_chart.style.width = layout.display.page.width * 0.24 +"px";
    lj_potential_chart.style.height = layout.display.page.width * 0.18 +"px";
    layout.finishSetupPotentialChart();
  }

  function setupRegularSpeedDistributionChart() {
    speed_distribution_chart.style.width = layout.display.page.width * 0.23 +"px";
    speed_distribution_chart.style.height = layout.display.page.width * 0.18 +"px";
    layout.finishSetupSpeedDistributionChart();
  }

  function setupRegularScreenKEChart() {
    kechart.style.width = layout.display.page.width * 0.48  + 4 +"px";
    kechart.style.height = layout.display.page.width * 0.20 + 5 +"px";
    layout.finishSetupKEChart();
  }

  //
  // Full Screen Layout
  //
  function setupFullScreenMoleculeContainer() {
    molecule_container.resize(layout.display.page.width * 0.70, layout.display.page.width * 0.70);
  }

  function setupFullScreenPotentialChart() {
    lj_potential_chart.style.width = layout.display.page.width * 0.24 +"px";
    lj_potential_chart.style.height = layout.display.page.height * 0.28 +"px";
    layout.finishSetupPotentialChart();
  }

  function setupFullScreenSpeedDistributionChart() {
    speed_distribution_chart.style.width = layout.display.page.width * 0.22 +"px";
    speed_distribution_chart.style.height = layout.display.page.height * 0.28 +"px";
    layout.finishSetupSpeedDistributionChart();
  }

  function setupFullScreenKEChart() {
    kechart.style.width = layout.display.page.width * 0.47 + 5 + "px";
    kechart.style.height = layout.display.page.height * 0.40 + 0 +"px";
    layout.finishSetupKEChart();
  }

  //
  // Simple Screen Layout
  //
  function setupSimpleMoleculeContainer() {
    var size = layout.display.page.height * 0.74;
    molecule_container.resize(size, size);
  }

  function setupDescriptionRight() {
    var description_right = document.getElementById("description-right");
    if (description_right !== null) {
      description_right.style.width = Math.max(layout.display.page.width * 0.3,  layout.display.page.width - layout.display.page.height - 20) +"px";
    }
  }

  //
  // Simple iframe Screen Layout
  //
  function setupSimpleIFrameMoleculeContainer() {
    var size = layout.display.page.height * 0.78;
    molecule_container.resize(size, size);
  }

  //
  // Simple Full Screen Layout
  //
  function setupSimpleFullScreenMoleculeContainer() {
    var size = layout.display.page.height * 0.75;
    molecule_container.resize(size, size);
  }

  function setupFullScreenDescriptionRight() {
    var description_right = document.getElementById("description-right");
    if (description_right !== null) {
      description_right.style.width = layout.display.window.width * 0.30 +"px";
    }
  }
};

layout.getStyleForSelector = function(selector) {
  var rules, rule_lists = document.styleSheets;
  for(var i = 0; i < rule_lists.length; i++) {
    if (rule_lists[i]) {
      try {
         rules = rule_lists[i].rules || rule_lists[i].cssRules;
         if (rules) {
           for(var j = 0; j < rules.length; j++) {
             if (rules[j].selectorText == selector) {
               return rules[j];
             }
           }
         }
      }
      catch (e) {
      }
    }
  }
  return false;
};

// Adapted from getPageSize() by quirksmode.com
layout.getPageHeight = function() {
  var windowHeight;
  if (self.innerHeight) { // all except Explorer
    windowHeight = self.innerHeight;
  } else if (document.documentElement && document.documentElement.clientHeight) {
    windowHeight = document.documentElement.clientHeight;
  } else if (document.body) { // other Explorers
    windowHeight = layout.display.window.height;
  }
  return windowHeight;
};

layout.getPageWidth = function() {
  var windowWidth;
  if (self.innerWidth) { // all except Explorer
    windowWidth = self.innerWidth;
  } else if (document.documentElement && document.documentElement.clientWidth) {
    windowWidth = document.documentElement.clientWidth;
  } else if (document.body) { // other Explorers
    windowWidth = window.width;
  }
  return windowWidth;
};

// http://www.zachstronaut.com/posts/2009/02/17/animate-css-transforms-firefox-webkit.html
layout.getTransformProperty = function(element) {
    // Note that in some versions of IE9 it is critical that
    // msTransform appear in this list before MozTransform
    var properties = [
        'transform',
        'WebkitTransform',
        'msTransform',
        'MozTransform',
        'OTransform'
    ];
    var p;
    while (p = properties.shift()) {
        if (typeof element.style[p] != 'undefined') {
            return p;
        }
    }
    return false;
};

var description_right = document.getElementById("description-right");
if (description_right !== null) {
  layout.fontsize = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
}

layout.bodycss = layout.getStyleForSelector("body");
layout.transform = layout.getTransformProperty(document.body);

// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------

layout.moleculeContainer = function(e, options) {
  var elem = d3.select(e),
      node = elem.node(),
      cx = elem.property("clientWidth"),
      cy = elem.property("clientHeight"),
      vis1, vis, plot, 
      playback_component, time_label,
      padding, size,
      mw, mh, tx, ty, stroke,
      x, downscalex, downx,
      y, downscaley, downy,
      dragged,
      pc_xpos, pc_ypos,
      model_time_formatter = d3.format("5.3f"),
      ns_string_prefix = "time: ",
      ns_string_suffix = " (ns)",
      gradient_container,
      red_gradient,
      blue_gradient,
      green_gradient,
      atom_tooltip_on,
      offset_left, offset_top,
      particle, label, labelEnter, tail,
      molecule_div, molecule_div_pre,
      default_options = {
        title:                false,
        xlabel:               false,
        ylabel:               false,
        playback_controller:  false,
        play_only_controller: true,
        model_time_label:     false,
        grid_lines:           false,
        xunits:               false,
        yunits:               false,
        atom_mubers:          false,
        xmin:                 0,
        xmax:                 10,
        ymin:                 0,
        ymax:                 10
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

  tx = function(d, i) { return "translate(" + x(d) + ",0)"; };
  ty = function(d, i) { return "translate(0," + y(d) + ")"; };
  stroke = function(d, i) { return d ? "#ccc" : "#666"; };

  function scale(width, height) {
    cx = width;
    cy = height;
    node.style.width = width +"px";
    node.style.height = height +"px";
    padding = {
       "top":    options.title  ? 40 * layout.screen_factor : 20,
       "right":                    25,
       "bottom": options.xlabel ? 46  * layout.screen_factor : 20,
       "left":   options.ylabel ? 60  * layout.screen_factor : 25
    };

    if (options.playback_controller || options.play_only_controller) {
      padding.bottom += (30  * layout.screen_factor);
    }

    size = {
      "width":  cx - padding.left - padding.right,
      "height": cy - padding.top  - padding.bottom
    };

    offset_left = node.offsetLeft + padding.left;
    offset_top = node.offsetTop + padding.top;
    pc_xpos = size.width / 2 - 50;
    pc_ypos = size.height + (options.ylabel ? 75 * layout.screen_factor : 30);
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

  function modelTimeLabel() {
    return ns_string_prefix + model_time_formatter(model.stepCounter() * sample_time) + ns_string_suffix;
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
    if (node.clientWidth && node.clientHeight) {
      cx = node.clientWidth;
      cy = node.clientHeight;
      size.width  = cx - padding.left - padding.right;
      size.height = cy - padding.top  - padding.bottom;
    }

    if (vis === undefined) {
      vis1 = d3.select(node).append("svg")
        .attr("width", cx)
        .attr("height", cy);

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
      if (options.playback_controller) {
        playback_component = new PlaybackComponentSVG(vis1, model_player, pc_xpos, pc_ypos, layout.screen_factor);
      }
      if (options.play_only_controller) {
        playback_component = new PlayOnlyComponentSVG(vis1, model_player, pc_xpos, pc_ypos, layout.screen_factor);
      }

      molecule_div = d3.select("#viz").append("div")
          .attr("class", "tooltip")
          .style("opacity", 1e-6);

      molecule_div_pre = molecule_div.append("pre");

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
        update_molecule_radius();

        particle.attr("cx", function(d, i) { return x(get_x(i)); })
                .attr("cy", function(d, i) { return y(get_y(i)); })
                .attr("r",  function(d, i) { return x(get_radius(i)); });

        label.attr("transform", function(d, i) {
          return "translate(" + x(get_x(i)) + "," + y(get_y(i)) + ")";
        });
      }

      if (options.playback_controller || options.play_only_controller) {
        playback_component.position(pc_xpos, pc_ypos, layout.screen_factor);
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

      red_gradient = gradient_container.append("defs")
          .append("radialGradient")
          .attr("id", "neg-grad")
          .attr("cx", "50%")
          .attr("cy", "47%")
          .attr("r", "53%")
          .attr("fx", "35%")
          .attr("fy", "30%");
      red_gradient.append("stop")
          .attr("stop-color", "#ffefff")
          .attr("offset", "0%");
      red_gradient.append("stop")
          .attr("stop-color", "#fdadad")
          .attr("offset", "40%");
      red_gradient.append("stop")
          .attr("stop-color", "#e95e5e")
          .attr("offset", "80%");
      red_gradient.append("stop")
          .attr("stop-color", "#fdadad")
          .attr("offset", "100%");

      blue_gradient = gradient_container.append("defs")
          .append("radialGradient")
          .attr("id", "pos-grad")
          .attr("cx", "50%")
          .attr("cy", "47%")
          .attr("r", "53%")
          .attr("fx", "35%")
          .attr("fy", "30%");
      blue_gradient.append("stop")
          .attr("stop-color", "#dfffff")
          .attr("offset", "0%");
      blue_gradient.append("stop")
          .attr("stop-color", "#9abeff")
          .attr("offset", "40%");
      blue_gradient.append("stop")
          .attr("stop-color", "#767fbf")
          .attr("offset", "80%");
      blue_gradient.append("stop")
          .attr("stop-color", "#9abeff")
          .attr("offset", "100%");

      green_gradient = gradient_container.append("defs")
          .append("radialGradient")
          .attr("id", "neu-grad")
          .attr("cx", "50%")
          .attr("cy", "47%")
          .attr("r", "53%")
          .attr("fx", "35%")
          .attr("fy", "30%");
      green_gradient.append("stop")
          .attr("stop-color", "#dfffef")
          .attr("offset", "0%");
      green_gradient.append("stop")
          .attr("stop-color", "#75a643")
          .attr("offset", "40%");
      green_gradient.append("stop")
          .attr("stop-color", "#2a7216")
          .attr("offset", "80%");
      green_gradient.append("stop")
          .attr("stop-color", "#75a643")
          .attr("offset", "100%");
    }

    function update_molecule_radius() {
      var ljf = model.getLJCalculator().coefficients();
      var r = ljf.rmin * 0.5;
      // model.set_radius(r);
      vis.selectAll("circle")
          .data(atoms)
        .attr("r",  function(d, i) { return x(get_radius(i)); });
      vis.selectAll("text")
        .attr("font-size", x(r * 1.3) );
    }

    function setup_particles() {
      var ljf = model.getLJCalculator().coefficients();
      var r = ljf.rmin * 0.5;
      model.set_radius(r);

      gradient_container.selectAll("circle").remove();
      gradient_container.selectAll("g").remove();

      particle = gradient_container.selectAll("circle").data(atoms);

      particle.enter().append("circle")
          .attr("r",  function(d, i) { return x(get_radius(i)); })
          .attr("cx", function(d, i) { return x(get_x(i)); })
          .attr("cy", function(d, i) { return y(get_y(i)); })
          .style("cursor", "crosshair")
          .style("fill", function(d, i) {
            if (layout.coulomb_forces_checkbox.checked) {
              return (x(get_charge(i)) > 0) ? "url('#pos-grad')" : "url('#neg-grad')";
            } else {
              return "url('#neu-grad')";
            }
          })
          .on("mousedown", molecule_mousedown)
          .on("mouseout", molecule_mouseout);

      var font_size = x(ljf.rmin * 0.5 * 1.5);
      if (mol_number > 100) { font_size *= 0.9; }

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
            .attr("x", 0)
            .attr("y", "0.31em")
            .text(function(d, i) {
              if (layout.coulomb_forces_checkbox.checked) {
                return (x(get_charge(i)) > 0) ? "+" : "–";
              } else {
                return;    // ""
              }
            });
      }
    }

    function molecule_mouseover(d) {
      // molecule_div.transition()
      //       .duration(250)
      //       .style("opacity", 1);
    }

    function molecule_mousedown(d, i) {
      if (atom_tooltip_on) {
        molecule_div.style("opacity", 1e-6);
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
            .style("background", "rgba(100%, 100%, 100%, 0.5)")
            .style("left", x(nodes[model.INDICES.X][i]) + offset_left + 6 + "px")
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
      if (!atom_tooltip_on) {
        molecule_div.style("opacity", 1e-6);
      }
    }

    function update_molecule_positions() {
      // update model time display
      if (options.model_time_label) {
        time_label.text(modelTimeLabel());
      }

      label = elem.selectAll("g.label").data(atoms);

      label.attr("transform", function(d, i) {
          return "translate(" + x(get_x(i)) + "," + y(get_y(i)) + ")";
        });

      particle = elem.selectAll("circle").data(atoms);

      particle.attr("cx", function(d, i) {
          return x(nodes[model.INDICES.X][i]); })
        .attr("cy", function(d, i) {
          return y(nodes[model.INDICES.Y][i]); })
        .attr("r",  function(d, i) {
          return x(nodes[model.INDICES.RADIUS][i]); });
      if (atom_tooltip_on) {
        render_atom_tooltip(atom_tooltip_on);
      }
    }

    // make these private variables and functions available
    container.node = node;
    container.update_molecule_radius = update_molecule_radius;
    container.setup_particles = setup_particles;
    container.update_molecule_positions = update_molecule_positions;
    container.scale = scale;
    container.playback_component = playback_component;
  }

  container.resize = function(width, height) {
    container.scale(width, height);
    container();
    container.setup_particles();
  };


 if (node) { container(); }

  return container;
};
// ------------------------------------------------------------
//
//   Lennard-Jones Potential Chart
//
// ------------------------------------------------------------

var lj_potential_chart = document.getElementById("lj-potential-chart");

var lj_cx, lj_cy, lj_padding, lj_size, 
    lj_mw, lj_mh, lj_tx, lj_ty, lj_stroke,
    lj_x, lj_downx, 
    lj_y, lj_downy, 
    lj_dragged, coefficient_dragged,  
    lj_vis, lj_plot, lj_container;

layout.finishSetupPotentialChart = function() {
  lj_cx = lj_potential_chart.clientWidth,
  lj_cy = lj_potential_chart.clientHeight,
  lj_padding = {
     "top":    lj_graph.title  ? 36 : 20, 
     "right":                    30, 
     "bottom": lj_graph.xlabel ? 46 : 20,
     "left":   lj_graph.ylabel ? 60 : 45
  },
  lj_size = { 
    "width":  lj_cx - lj_padding.left - lj_padding.right, 
    "height": lj_cy - lj_padding.top  - lj_padding.bottom 
  },
  lj_mw = lj_size.width,
  lj_mh = lj_size.height,
  lj_tx = function(d) { return "translate(" + lj_x(d) + ",0)"; },
  lj_ty = function(d) { return "translate(0," + lj_y(d) + ")"; },
  lj_stroke = function(d) { return d ? "#ccc" : "#666"; };

  // x-scale
  lj_x = d3.scale.linear()
    .domain([lj_data.xmin, lj_data.xmax])
    .range([0, lj_mw]),

  // drag x-axis logic
  lj_downx = Math.NaN,

  // y-scale (inverted domain)
  lj_y = d3.scale.linear()
      .domain([lj_data.ymax, lj_data.ymin])
      .nice()
      .range([0, lj_mh])
      .nice(),

  lj_line = d3.svg.line()
      .x(function(d, i) { return lj_x(lennard_jones_potential[i][0]); })
      .y(function(d, i) { return lj_y(lennard_jones_potential[i][1]); }),

  // drag x-axis logic
  lj_downy = Math.NaN,
  lj_dragged = null,
  lj_selected = lj_data.variables[0],

  // drag coefficients logic
  coefficient_dragged, 
  coefficient_selected = lj_data.variables[0];
  
  if (undefined !== lj_vis) {
    d3.select(lj_potential_chart).select("svg")
        .attr("width", lj_cx)
        .attr("height", lj_cy);

    lj_vis.select("svg")
        .attr("width", lj_cx)
        .attr("height", lj_cy);

    lj_vis.select("rect.plot")
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .style("fill", "#EEEEEE");

    lj_vis.select("svg.container")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height);

    lj_vis.select("svg.linebox")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height);
    
    if (lj_graph.title) {
      lj_vis.select("text.title")
          .attr("x", lj_size.width/2)
          .attr("dy","-1em");
    }
    
    if (lj_graph.xlabel) {
      lj_vis.select("text.xlabel")
          .attr("x", lj_size.width/2)
          .attr("y", lj_size.height);
    }
    
    if (lj_graph.ylabel) {
      lj_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + lj_size.height/2+") rotate(-90)");
    }

    lj_vis.selectAll("g.x").remove();
    lj_vis.selectAll("g.y").remove();

  } else {

    lj_vis = d3.select(lj_potential_chart).append("svg:svg")
      .attr("width", lj_cx)
      .attr("height", lj_cy)
      .append("svg:g")
        .attr("transform", "translate(" + lj_padding.left + "," + lj_padding.top + ")");

    lj_plot = lj_vis.append("svg:rect")
      .attr("class", "plot")
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .style("fill", "#EEEEEE")
      .attr("pointer-events", "all")
      .call(d3.behavior.zoom().x(lj_x).y(lj_y).scaleExtent([1, 8]).on("zoom", layout.lj_redraw))
      .on("mousedown", function() {
        if (d3.event.altKey) {
            lj_points.push(lj_selected = lj_dragged = d3.svg.mouse(lj_vis.node()));
            lj_update();
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
      });

    lj_vis.append("svg:svg")
      .attr("class", "linebox")
      .attr("top", 0)
      .attr("left", 0)
      .attr("width", lj_size.width)
      .attr("height", lj_size.height)
      .attr("viewBox", "0 0 "+lj_size.width+" "+lj_size.height)
      .append("svg:path")
          .attr("class", "line")
          .attr("d", lj_line(lennard_jones_potential))

    // add Chart Title
    if (lj_graph.title) {
      lj_vis.append("svg:text")
          .attr("class", "title")
          .text(lj_graph.title)
          .attr("x", lj_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (lj_graph.xlabel) {
      lj_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(lj_graph.xlabel)
          .attr("x", lj_size.width/2)
          .attr("y", lj_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (lj_graph.ylabel) {
      lj_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text( lj_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + lj_size.height/2+") rotate(-90)");
    }
    
    lj_vis.on("mousemove", lj_mousemove)
          .on("mouseup", lj_mouseup);

  }
  layout.lj_redraw()
}

layout.lj_redraw = function() {

  var lj_fx = lj_x.tickFormat(10),
      lj_fy = lj_y.tickFormat(10);

  // Regenerate x-ticks…
  var lj_gx = lj_vis.selectAll("g.x")
      .data(lj_x.ticks(10), String)
      .attr("transform", lj_tx);

  lj_gx.select("text")
      .text(lj_fx);

  var lj_gxe = lj_gx.enter().insert("svg:g", "a")
      .attr("class", "x")
      .attr("transform", lj_tx);

  lj_gxe.append("svg:line")
      .attr("stroke", lj_stroke)
      .attr("y1", 0)
      .attr("y2", lj_size.height);

   lj_gxe.append("svg:text")
       .attr("y", lj_size.height)
       .attr("dy", "1em")
       .attr("text-anchor", "middle")
       .style("cursor", "ew-resize")
       .text(lj_fx)
       .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
       .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
       .on("mousedown", function(d) {
            var p = d3.svg.mouse(lj_vis[0][0]);
            lj_downx = lj_x.invert(p[0]);
            // d3.behavior.zoom().off("zoom", redraw);
       });


  lj_gx.exit().remove();

  // Regenerate y-ticks…
  var lj_gy = lj_vis.selectAll("g.y")
      .data(lj_y.ticks(10), String)
      .attr("transform", lj_ty);

  lj_gy.select("text")
      .text(lj_fy);

  var lj_gye = lj_gy.enter().insert("svg:g", "a")
      .attr("class", "y")
      .attr("transform", lj_ty)
      .attr("background-fill", "#FFEEB6");

  lj_gye.append("svg:line")
      .attr("stroke", lj_stroke)
      .attr("x1", 0)
      .attr("x2", lj_size.width);

  lj_gye.append("svg:text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .style("cursor", "ns-resize")
      .text(lj_fy)
      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
      .on("mousedown", function(d) {
           var p = d3.svg.mouse(lj_vis[0][0]);
           lj_downy = lj_y.invert(p[1]);
           // d3.behavior.zoom().off("zoom", redraw);
      });

  lj_gy.exit().remove();
  lj_update();

}

// ------------------------------------------------------------
//
// Draw the Lennard-Jones function
//
// ------------------------------------------------------------

function lj_update() {
  var epsilon_circle = lj_vis.selectAll("circle")
      .data(lj_data.variables, function(d) { return d });

  var lj_lines = lj_vis.select("path").attr("d", lj_line(lennard_jones_potential)),
      lj_x_extent = lj_x.domain()[1] - lj_x.domain()[0];
      
  epsilon_circle.enter().append("svg:circle")
      .attr("class", function(d) { return d === coefficient_dragged ? "selected" : null; })
      .attr("cx",    function(d) { return lj_x(d.x); })
      .attr("cy",    function(d) { return lj_y(d.y); })
      .attr("r", 8.0)
      .on("mousedown", function(d) {
        if (d.coefficient == "epsilon") {
          d.x = lj_data.coefficients.rmin;
        } else {
          d.y = 0
        }
        coefficient_selected = coefficient_dragged = d;
        lj_update();
      });

  epsilon_circle
      .attr("class", function(d) { return d === coefficient_selected ? "selected" : null; })
      .attr("cx",    function(d) { return lj_x(d.x); })
      .attr("cy",    function(d) { return lj_y(d.y); });

  epsilon_circle.exit().remove();

  if (d3.event && d3.event.keyCode) {
    d3.event.preventDefault();
    d3.event.stopPropagation();
  }
}

function lj_mousemove() {
  if (!coefficient_dragged) return;
  lj_potential_chart.onselectstart = function(){ return false; }
  var m = d3.svg.mouse(lj_vis.node()),
    newx, newy;
  if (coefficient_dragged.coefficient == "epsilon") {
    newx = lj_data.coefficients.rmin;
    newy = lj_y.invert(Math.max(0, Math.min(lj_size.height, m[1])));
    if (newy > lj_epsilon_max) { newy = lj_epsilon_max };
    if (newy < lj_epsilon_min) { newy = lj_epsilon_min };
    update_epsilon(newy);
  } else {
    newy = 0;
    newx = lj_x.invert(Math.max(0, Math.min(lj_size.width, m[0])));
    if (newx < lj_sigma_min) { newx = lj_sigma_min };
    if (newx > lj_sigma_max) { newx = lj_sigma_max };
    update_sigma(newx);
  }
  layout.update_molecule_radius();
  // model.resolve_collisions(molecules);
  model.tick();
  coefficient_dragged.x = newx;
  coefficient_dragged.y = newy;
  lj_update();
}

function lj_mouseup() {
    if (!isNaN(lj_downx)) {
        lj_potential_chart.onselectstart = function(){ return true; }
        layout.lj_redraw();
        lj_downx = Math.NaN;
        d3.event.preventDefault();
        d3.event.stopPropagation();
    }
    if (!isNaN(lj_downy)) {
        layout.lj_redraw();
        lj_downy = Math.NaN;
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

d3.select(lj_potential_chart)
  .on("mousemove", function(d) {
    var p = d3.svg.mouse(lj_vis[0][0]);
    if (!isNaN(lj_downx)) {
      var rupx = lj_x.invert(p[0]),
        xaxis1 = lj_x.domain()[0],
        xaxis2 = lj_x.domain()[1],
        xextent = xaxis2 - xaxis1;
      if (rupx !== 0) {
          var changex, dragx_factor, new_domain;
          dragx_factor = xextent/lj_downx;
          changex = 1 + (lj_downx / rupx - 1) * (xextent/(lj_downx-xaxis1))/dragx_factor;
          new_domain = [xaxis1, xaxis1 + (xextent * changex)];
          lj_x.domain(new_domain);
          layout.lj_redraw();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
    if (!isNaN(lj_downy)) {
        var rupy = lj_y.invert(p[1]),
        yaxis1 = lj_y.domain()[1],
        yaxis2 = lj_y.domain()[0],
        yextent = yaxis2 - yaxis1;
      if (rupy !== 0) {
          var changey, dragy_factor, new_range;
          dragy_factor = yextent/lj_downy;
          changey = 1 - (rupy / lj_downy - 1) * (yextent/(lj_downy-yaxis1))/dragy_factor;
          new_range = [yaxis1 + (yextent * changey), yaxis1];
          lj_y.domain(new_range);
          layout.lj_redraw();
      }
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }
  })
  .on("mouseup", function(d) {
      if (!isNaN(lj_downx)) {
          layout.lj_redraw();
          lj_downx = Math.NaN;
          d3.event.preventDefault();
          d3.event.stopPropagation();
      }
      if (!isNaN(lj_downy)) {
          layout.lj_redraw();
          lj_downy = Math.NaN;
          d3.event.preventDefault();
          d3.event.stopPropagation();
      }
  });
// ------------------------------------------------------------
//
//   Speed Distribution Histogram
//
// ------------------------------------------------------------

speed_distribution_chart = document.getElementById("speed-distribution-chart");

var speed_cx, speed_cy, speed_padding, speed_size,
    speed_mw, speed_mh, speed_tx, speed_ty, speed_stroke,
    speed_x, speed_y, speed_bar_width, speed_quantile, speed_line_step, speed_y_max,
    speed_vis, speed_plot, speed_bars, speed_line, speed_data, speed_fit;

function generate_speed_data() {
  speed_data = model.get_speed();
  speed_graph.xmax = d3.max(speed_data);
  speed_graph.xmin = d3.min(speed_data);
  speed_graph.quantile = d3.quantile(speed_data, 0.1);
  speed_y_max = speed_graph.ymax;
  // x-scale
  speed_x = d3.scale.linear()
    .domain([speed_graph.xmin, speed_graph.xmax])
    .range([0, speed_mw]);
  // y-scale
  speed_y = d3.scale.linear()
      .domain([speed_graph.ymax, speed_graph.ymin])
      .nice()
      .range([0, speed_mh]);
}

function update_speed_bins() {
  speed_bins = d3.layout.histogram().frequency(false).bins(speed_x.ticks(60))(speed_data);
  speed_bar_width = (speed_size.width - speed_bins.length)/speed_bins.length;
  speed_line_step = (speed_graph.xmax - speed_graph.xmin)/speed_bins.length;
  speed_max  = d3.max(speed_bins, function(d) { return d.y });
}

layout.finishSetupSpeedDistributionChart = function() {
  speed_cx = speed_distribution_chart.clientWidth,
  speed_cy = speed_distribution_chart.clientHeight,
  speed_padding = {
     "top":    speed_graph.title  ? 36 : 20, 
     "right":                     30,
     "bottom": speed_graph.xlabel ? 46 : 20,
     "left":   speed_graph.ylabel ? 60 : 45
  },
  speed_size = { 
    "width":  speed_cx - speed_padding.left - speed_padding.right, 
    "height": speed_cy - speed_padding.top  - speed_padding.bottom 
  },
  speed_mw = speed_size.width,
  speed_mh = speed_size.height,
  speed_tx = function(d) { return "translate(" + speed_x(d) + ",0)"; },
  speed_ty = function(d) { return "translate(0," + speed_y(d) + ")"; },
  speed_stroke = function(d) { return d ? "#ccc" : "#666"; };

  generate_speed_data();

  update_speed_bins();

  if (undefined !== speed_vis) {
    
    d3.select(speed_distribution_chart).select("svg")
      .attr("width", speed_cx)
      .attr("height", speed_cy);

    speed_vis.select("rect.plot")
      .attr("width", speed_size.width)
      .attr("height", speed_size.height);

    if (speed_graph.title) {
      speed_vis.select("text.title")
          .attr("x", speed_size.width/2)
          .attr("dy","-1em");
    }
    
    if (speed_graph.xlabel) {
      speed_vis.select("text.xlabel")
          .attr("x", speed_size.width/2)
          .attr("y", speed_size.height);
    }
    
    if (speed_graph.ylabel) {
      speed_vis.select("text.ylabel")
          .attr("transform","translate(" + -40 + " " + speed_size.height/2+") rotate(-90)");
    }
    
    speed_vis.selectAll("g.x").remove();
    speed_vis.selectAll("g.y").remove();

  } else {

    speed_vis = d3.select(speed_distribution_chart).append("svg:svg")
      .attr("width", speed_cx)
      .attr("height", speed_cy)
      .append("svg:g")
        .attr("transform", "translate(" + speed_padding.left + "," + speed_padding.top + ")");

    speed_plot = speed_vis.append("svg:rect")
      .attr("class", "plot")
      .attr("width", speed_size.width)
      .attr("height", speed_size.height)
      .style("fill", "#EEEEEE")

    // add Chart Title
    if (speed_graph.title) {
      speed_vis.append("svg:text")
          .attr("class", "title")
          .text(speed_graph.title)
          .attr("x", speed_size.width/2)
          .attr("dy","-1em")
          .style("text-anchor","middle");
    }

    // Add the x-axis label
    if (speed_graph.xlabel) {
      speed_vis.append("svg:text")
          .attr("class", "xlabel")
          .text(speed_graph.xlabel)
          .attr("x", speed_size.width/2)
          .attr("y", speed_size.height)
          .attr("dy","2.4em")
          .style("text-anchor","middle");
    }

    // add y-axis label
    if (speed_graph.ylabel) {
      speed_vis.append("svg:g")
          .append("svg:text")
              .attr("class", "ylabel")
              .text( speed_graph.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + speed_size.height/2+") rotate(-90)");
    }
  }
  layout.speed_redraw()
}

layout.speed_redraw = function() {
  if (d3.event && d3.event.transform && isNaN(speed_downx) && isNaN(speed_downy)) {
      d3.event.transform(speed_x, speed_y);
  };
  
  var speed_fx = speed_x.tickFormat(5),
      speed_fy = speed_y.tickFormat(5);

  // Regenerate x-ticks…
  // var speed_gx = speed_vis.selectAll("g.x")
  //     .data(speed_x.ticks(5), String)
  //     .attr("transform", speed_tx);
  // 
  // speed_gx.select("text")
  //     .text(speed_fx);
  // 
  // var speed_gxe = speed_gx.enter().insert("svg:g", "a")
  //     .attr("class", "x")
  //     .attr("transform", speed_tx);
  // 
  // speed_gxe.append("svg:line")
  //     .attr("stroke", speed_stroke)
  //     .attr("y1", 0)
  //     .attr("y2", speed_size.height);
  // 
  //  speed_gxe.append("svg:text")
  //      .attr("y", speed_size.height)
  //      .attr("dy", "1em")
  //      .attr("text-anchor", "middle")
  //      .text(speed_fx)
  //      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
  //      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
  //      .on("mousedown", function(d) {
  //           var p = d3.svg.mouse(speed_vis[0][0]);
  //           speed_downx = speed_x.invert(p[0]);
  //           speed_downscalex = null;
  //           speed_downscalex = speed_x.copy();
  //           // d3.behavior.zoom().off("zoom", redraw);
  //      });
  // 
  // speed_gx.exit().remove();
  
  // Regenerate y-ticks…
  var speed_gy = speed_vis.selectAll("g.y")
      .data(speed_y.ticks(5), String)
      .attr("transform", speed_ty);
  
  speed_gy.select("text")
      .text(speed_fy);
  
  var speed_gye = speed_gy.enter().insert("svg:g", "a")
      .attr("class", "y")
      .attr("transform", speed_ty)
      .attr("background-fill", "#FFEEB6");
  
  speed_gye.append("svg:line")
      .attr("stroke", speed_stroke)
      .attr("x1", 0)
      .attr("x2", speed_size.width);
  
  speed_gye.append("svg:text")
      .attr("x", -3)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(speed_fy)
      .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
      .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
      .on("mousedown", function(d) {
           var p = d3.svg.mouse(speed_vis[0][0]);
           speed_downy = speed_y.invert(p[1]);
           speed_downscaley = speed_y.copy();
           // d3.behavior.zoom().off("zoom", redraw);
      });
  
  speed_gy.exit().remove();
  layout.speed_update();

}

// ------------------------------------------------------------
//
// Draw the Speed Distribution
//
// ------------------------------------------------------------
layout.speed_update = function() {
  generate_speed_data();
  if (speed_data.length > 2) {
    speed_kde = science.stats.kde().sample(speed_data);
    speed_x.domain([speed_graph.xmin, speed_graph.xmax]);
    speed_bins = d3.layout.histogram().frequency(true).bins(speed_x.ticks(60))(speed_data);

    speed_bar_width = (speed_size.width - speed_bins.length)/speed_bins.length;
    speed_line_step = (speed_graph.xmax - speed_graph.xmin)/speed_bins.length;
    speed_max  = d3.max(speed_bins, function(d) { return d.y });

    speed_vis.selectAll("g.bar").remove();

    speed_bars = speed_vis.selectAll("g.bar")
        .data(speed_bins);

    speed_bars.enter().append("svg:g")
        .attr("class", "bar")
        .attr("transform", function(d, i) {
          return "translate(" + speed_x(d.x) + "," + (speed_mh - speed_y(speed_y_max - d.y)) + ")";
        })
        .append("svg:rect")
          .attr("class", "bar")
          .attr("fill", "steelblue")
          .attr("width", speed_bar_width)
          .attr("height", function(d) { 
              return speed_y(speed_y_max - d.y); 
            }); 
  }
}
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
      return mol_number
    }
  },
  {
    name: "temperature",
    run: function() {
      return temperature
    }
  },
  {
    name: "100 Steps (steps/s)",
    run: function() {
      model_controller.modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
      }
      elapsed = Date.now() - start;
      return d3.format("5.1f")(100/elapsed*1000)
    }
  },
  {
    name: "100 Steps w/graphics",
    run: function() {
      model_controller.modelStop();
      var start = +Date.now();
      var i = -1;
      while (i++ < 100) {
        model.tick();
        model_controller.modelListener();
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
      titlerows = datatable_table.getElementsByClassName("title"),
      datarows = datatable_table.getElementsByClassName("data"),
      column_titles = ['PX', 'PY', 'X', 'Y', 'VX', 'VY', 'AX', 'AY', 'SPEED', 'RADIUS', 'MASS', 'CHARGE'],
      i_formatter = d3.format(" 2d"),
      f_formatter = d3.format(" 3.4f"),
      formatters = [i_formatter, f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, f_formatter, f_formatter, 
                    f_formatter, f_formatter, f_formatter, f_formatter, 
                    i_formatter];

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
  if (reset) { datarows = add_data_rows(atoms.length); }
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
if (select_temperature == null) {
  layout.setupTemperature = function() {};
}
else {
  layout.setupTemperature = function() {
    if (Modernizr['inputtypes']['range']) {
      var temp_range = document.createElement("input");
      temp_range.type = "range";
      temp_range.min = "0";
      temp_range.max = "25";
      temp_range.step = "0.5";
      temp_range.value = +select_temperature.value;
      select_temperature.parentNode.replaceChild(temp_range, select_temperature);
      temp_range.id = "select-temperature";
      select_temperature = temp_range;
      select_temperature_display.id = "select-temperature-display"
      select_temperature_display.innerText = temperature;
      select_temperature.parentNode.appendChild(select_temperature_display);
      select_temperature = document.getElementById("select-temperature");
    }
    select_temperature.onchange = selectTemperatureChange;
  }

  function selectTemperatureChange() {
    temperature = +select_temperature.value;
    if (select_temperature.type === "range") {
      select_temperature_display.innerText = d3.format("4.1f")(temperature);
    }
    model.temperature(temperature);
  }

  if (select_temperature.type === "range") {
    select_temperature.value = temperature;
    select_temperature_display.innerText = d3.format("4.1f")(temperature);
  }

  // ------------------------------------------------------------
  //
  // Temperature Control
  //
  // ------------------------------------------------------------

  layout.temperature_control_checkbox = document.getElementById("temperature-control-checkbox");

  function temperatureControlHandler() {
      if (layout.temperature_control_checkbox.checked) {
        model.set_temperature_control(true);
      } else {
        model.set_temperature_control(false);
      };
  };

  layout.temperature_control_checkbox.onchange = temperatureControlHandler;
}
// ------------------------------------------------------------
//
// Force Interaction Controls
//
// ------------------------------------------------------------

layout.lennard_jones_forces_checkbox = document.getElementById("lennard-jones-forces-checkbox");

function lennardJonesInteractionHandler() {
    if (layout.lennard_jones_forces_checkbox.checked) {
      model.set_lennard_jones_forces(true);
    } else {
      model.set_lennard_jones_forces(false);
    };
};

if (layout.lennard_jones_forces_checkbox) {
  layout.lennard_jones_forces_checkbox.onchange = lennardJonesInteractionHandler;
}

layout.coulomb_forces_checkbox = document.getElementById("coulomb-forces-checkbox");

function coulombForcesInteractionHandler() {
    if (layout.coulomb_forces_checkbox.checked) {
      model.set_coulomb_forces(true);
    } else {
      model.set_coulomb_forces(false);
    };
    molecule_container.setup_particles()
};

if (layout.coulomb_forces_checkbox) {
  layout.coulomb_forces_checkbox.onchange = coulombForcesInteractionHandler;
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
      "Time: "     + d3.format("5.3f")(model.stepCounter() * sample_time) + " (ns), " +
      "KE: "       + d3.format("1.4f")(ke) + ", " +
      // "PE: "       + d3.format("1.6f")(pe) + ", " +
      "TE: "       + d3.format("1.4f")(te) + ", " +
      "Pressure: " + d3.format("6.3f")(model.pressure()) + ", " +
      "Rate: " + d3.format("5.1f")(model.get_rate()) + " (steps/s)";
  }
}

// ------------------------------------------------------------
//
// Fullscreen API
//
// ------------------------------------------------------------

/** do we have the querySelectorAll method? **/
if (document.querySelectorAll) {
  var fullScreenImage = document.querySelector ('#fullscreen');
  if (fullScreenImage) {
    fullScreenImage.style.cursor = "pointer";
    fullScreenImage.addEventListener ('click', function () {
      var el = document.documentElement;
      var request = el.requestFullScreen ||
                    el.webkitRequestFullScreen ||
                    el.mozRequestFullScreen;

      var fullscreen = document.fullScreen ||
                       document.webkitIsFullScreen ||
                       document.mozFullScreen;

      var cancel = document.cancelFullScreen ||
                   document.webkitCancelFullScreen ||
                   document.mozCancelFullScreen;

      if (request) {
        if (fullscreen) {
          layout.cancelFullScreen = true;
          cancel.call(document);
        } else {
          layout.cancelFullScreen = false;
          request.call(el);
        }
      } else {
        alert("You'll need to use a newer browser to use the\n" +
              "full-screen API.\n\n" +
              "Chrome v15 (beta)\n" +
              "http://www.google.com/landing/chrome/beta/\n\n" +
              "Chrome v17 Canary:\n" +
              "http://tools.google.com/dlpage/chromesxs\n\n" +
              "Safari v5.1.1:\n\n" +
              "FireFox v9 Aurora:\n" +
              "https://www.mozilla.org/en-US/firefox/channel/\n\n" +
              "FireFox v10 Nightly\n" +
              "http://nightly.mozilla.org/\n" +
              "Open 'about:config' and set: full-screen-api-enabled");
      }
    }, false);
  }
}
layout.heatCoolButtons = function(heat_elem_id, cool_elem_id, min, max) {
  var heat_button = new ButtonComponent(heat_elem_id, 'circlesmall-plus');
  var cool_button = new ButtonComponent(cool_elem_id, 'circlesmall-minus');

  heat_button.add_action(function() {
    var t = model.temperature();
    if (t < max) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 + 0.5;
      model.temperature(t);
    } else {
      $(heat_elem_id).addClass('inactive');
    }
  });

  cool_button.add_action(function() {
    var t = model.temperature();
    if (t > min) {
      $(heat_elem_id).removeClass('inactive');
      $(cool_elem_id).removeClass('inactive');
      t = Math.floor((t * 2))/2 - 0.5;
      model.temperature(t);
    } else {
      $(cool_elem_id).addClass('inactive');
    }
  });

}
})();
